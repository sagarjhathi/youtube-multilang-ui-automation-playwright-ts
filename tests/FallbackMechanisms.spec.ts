import * as fs from "fs";
import { test, expect, Page } from "@playwright/test";
import SafeActions from "../utils/SafeActions";
import { LoopGuard } from "../utils/LoopGuard";
import { softCheck, stopCollecting } from "../utils/SoftChecks";
import { allowedVersions, removeOptionalEntries } from "../utils/LanguageChecks";
import { readJson, readJsonByName } from "../utils/ReadJSON";
import YtLandingPage from "../pages/YtLandingPage";

/**
 * Offline tests: they make every fallback mechanism of the project actually run, on purpose, and check what it does.
 * No YouTube and no network: the pages are small fakes with the same tags the locators use, so it takes about a minute.
 * Run with:  npx playwright test tests/FallbackMechanisms.spec.ts
 * (CI runs this file first, in the offline-checks job; the shards of YtMasterSafeActions.spec.ts start only if it passes.)
 *
 *   M = SafeActions   L = LoopGuard / SoftChecks   P = page-state helpers   H = allowed side menu versions   W = whole-test retry
 *   D = the data files (not a fallback, but cheap to check here and it gates CI the same way)
 *
 * How the tests work:
 *   - M, L and P use a fake page that is served at https://fake.test/ (or put in with page.setContent). The fake page breaks on purpose
 *     (an element that is late, a click that is ignored, a menu that fills up slowly) and the test checks how the code reacts.
 *   - The code writes a log line when a fallback fires, so a test often asserts that line (logged("...")). If you change a log
 *     message in utils/ or pages/, the test that looks for it has to change too, that is on purpose: it proves the fallback fired.
 *   - Some tests wait for real time (a late element, a slow menu). The delays are chosen with a wide margin; they are explained where used.
 *   - References like "run #47" or "Java 10-28 17:30" are CI runs and Java reports, explained in docs/26 and docs/29.
 */

test.use({ launchOptions: { slowMo: 0 }, actionTimeout: 3000 });     // the fakes are fast, no slowMo needed
test.describe.configure({ retries: 1 });                             // same as the CI spec, W1 relies on it

// ---------------------------------------------------------------- helpers

let logs: string[] = [];
const originalLog = console.log;

test.beforeEach(() => {
    logs = [];
    console.log = (...args: unknown[]) => {
        logs.push(args.join(" "));
        originalLog(...args);
    };
});

test.afterEach(() => {
    console.log = originalLog;
    stopCollecting();
});

const logged = (text: string) => logs.some(line => line.includes(text));
const strip = (text: string) => text.replace(/\u001b\[[0-9;]*m/g, "");

/**
 * Failures that a scenario is SUPPOSED to produce: returns their first lines and takes them out of the test result.
 *
 * Why this exists: softCheck and LoopGuard report a problem by recording a failure on the running test (like expect.soft).
 * A scenario such as "an item fails twice" therefore makes the test itself fail, although that is exactly what it checks.
 * So the scenario reads the recorded failures, asserts on them, and then clears them and sets the status back to passed.
 * Anything that is NOT cleared this way (for example a failure from a different line) still fails the test.
 */
function takeExpectedFailures(): string[] {
    const errors = test.info().errors;
    const messages = errors.map(error => strip(error.message ?? "").split("\n")[0].replace(/^Error: /, "").trim());
    errors.splice(0, errors.length);
    test.info().status = "passed";          // the first soft failure set the status to failed, these failures were expected
    return messages;
}

/** Serves a fake page at https://fake.test/ ; the function gets the number of the load (1 = first load, 2 = after a reload). */
async function serveFake(page: Page, html: (load: number) => string) {
    let loads = 0;
    await page.route("https://fake.test/**", route => {
        loads++;
        return route.fulfill({ contentType: "text/html", body: html(loads) });
    });
    await page.goto("https://fake.test/");
    return { loads: () => loads };
}

/** Page script for the fake pages: counts the clicks on the element with id "b" in window.clicks (read it with clicks(page)). */
const COUNT_CLICKS_ON_B = "window.clicks = 0; document.getElementById('b').addEventListener('click', () => window.clicks++);";

/** How often the element with id "b" was clicked on the fake page (0 when the page has no counter). */
const clicks = (page: Page) => page.evaluate(() => (window as unknown as { clicks?: number }).clicks ?? 0);

/** Runs an action that has to fail and returns its error; the test fails here if the action passes. */
async function failureOf(action: Promise<unknown>): Promise<Error> {
    let failure = undefined as Error | undefined;
    await action.catch(error => { failure = error as Error; });
    if (!failure) {
        throw new Error("The action was expected to fail, but it passed");
    }
    return failure;
}

/** Asserts that nothing was recorded as a failure of the running test (no failed soft check, no failed item). */
function expectNoFailures() {
    expect(test.info().errors.length, "no failure should be recorded for this scenario").toBe(0);
}

/**
 * The loop of the CI spec, in short: try the item; if it passes tell LoopGuard; if it fails ask LoopGuard whether to run it again
 * (it runs the recovery first). Each item gets at most one retry, and the loop stops when LoopGuard says so.
 * The body gets the item and the attempt number (1 = first try, 2 = the retry). Returns how often each item ran.
 */
async function runLoop(guard: LoopGuard, items: string[], body: (item: string, attempt: number) => Promise<void>, recovery: () => Promise<void> = async () => {}) {
    const ran: Record<string, number> = {};
    let index = 0;
    while (index < items.length && !guard.shouldStop()) {
        const item = items[index];
        ran[item] = (ran[item] ?? 0) + 1;
        try {
            await body(item, ran[item]);
            guard.itemPassed(item);
            index++;                                            // done, go to the next item
        } catch (error) {
            const runAgain = await guard.retryAfterFailure(item, error, recovery);
            if (!runAgain) {
                index++;                                        // failed for good, go to the next item
            }                                                   // otherwise the same index runs again
        }
    }
    return ran;
}


// ================================================================ M: SafeActions

test("M1 SafeActions: an element that shows up late is clicked on a later attempt (no refresh needed)", async ({ page }) => {
    await serveFake(page, () => `<button id="b" style="display:none">go</button><script>${COUNT_CLICKS_ON_B}</script>`);
    await page.evaluate(() => { setTimeout(() => { document.getElementById("b")!.style.display = "block"; }, 1200); });      // appears 1.2 s from now

    // each attempt waits 700 ms and the button shows up after 1200 ms, so the first attempt fails and a later one clicks it
    await new SafeActions(page, 700, 3).safeClick(page.locator("#b"));

    expect(await clicks(page)).toBe(1);
    expect(logged("Click failed (attempt 1)")).toBe(true);
    expect(logged("refreshing the page")).toBe(false);
});

test("M2 SafeActions: the page is refreshed after the second failed attempt and the third attempt works", async ({ page }) => {
    // the first load has no button, every load after the reload has it
    const site = await serveFake(page, load => load < 2
        ? `<div>nothing here yet</div>`
        : `<button id="b">go</button><script>${COUNT_CLICKS_ON_B}</script>`);

    await new SafeActions(page, 500, 3).safeClick(page.locator("#b"));

    expect(logged("Attempt 2 failed, refreshing the page")).toBe(true);
    expect(site.loads()).toBe(2);
    expect(await clicks(page)).toBe(1);
});

test("M3 SafeActions: a native click that is blocked falls back to a DOM click", async ({ page }) => {
    // an invisible full-size div (z-index 9) covers the button, so a real mouse click lands on the div and Playwright refuses it
    await serveFake(page, () => `<button id="b" style="position:absolute;left:10px;top:10px">go</button>
        <div style="position:absolute;left:0;top:0;width:300px;height:200px;z-index:9"></div>
        <script>${COUNT_CLICKS_ON_B}</script>`);

    await new SafeActions(page, 1000, 3).safeClick(page.locator("#b"));

    expect(logged("Native click failed (attempt 1), trying a DOM click")).toBe(true);
    expect(await clicks(page)).toBe(1);
});

test("M4 SafeActions: when every attempt fails the error is ONE line with action, element, reason and page", async ({ page }) => {
    await serveFake(page, () => `<div>no button</div>`);

    const error = await failureOf(new SafeActions(page, 300, 2).safeClick(page.locator("#nope")));

    const message = error.message;
    expect(message.includes("\n")).toBe(false);
    expect(message).toContain("Click failed after 2 attempts");
    expect(message).toContain("| element=");
    expect(message).toContain("| reason=");
    expect(message).toContain("| page=https://fake.test/");
});

test("M5 SafeActions: safeFindElements returns only the elements that are ready, and throws when none is", async ({ page }) => {
    await serveFake(page, () => `<ul><li class="e">a</li><li class="e" style="display:none">b</li><li class="e">c</li></ul>`);
    const safe = new SafeActions(page, 500, 2);

    const ready = await safe.safeFindElements(page.locator(".e"));
    expect(ready.length).toBe(2);

    const error = await failureOf(safe.safeFindElements(page.locator(".missing")));
    expect(error.message).toContain("Find elements failed after 2 attempts");
});

test("M6 SafeActions: safeDomClick clicks even when the element is covered", async ({ page }) => {
    await serveFake(page, () => `<button id="b">go</button><div style="position:fixed;inset:0;z-index:9"></div>
        <script>${COUNT_CLICKS_ON_B}</script>`);

    await new SafeActions(page, 1000, 2).safeDomClick(page.locator("#b"));

    expect(await clicks(page)).toBe(1);
});


// ================================================================ L: LoopGuard and SoftChecks

test("L1 LoopGuard: an item that fails once is repeated after the recovery and passes on the retry", async () => {
    const guard = new LoopGuard();
    let recoveries = 0;

    const ran = await runLoop(guard, ["a", "b", "c"], async (item, attempt) => {
        if (item === "b" && attempt === 1) throw new Error("click timed out");
    }, async () => { recoveries++; });
    guard.logSummary(3);

    expect(ran).toEqual({ a: 1, b: 2, c: 1 });
    expect(recoveries).toBe(1);
    expect(logged("b passed on the retry")).toBe(true);
    expect(logged("Summary | completed 3 of 3 | 1 passed on the retry")).toBe(true);
    expectNoFailures();
});

test("L2 SoftChecks: the failed check of an attempt that is run again is dropped (the Vietnamese case)", async () => {
    const guard = new LoopGuard();

    await runLoop(guard, ["vi"], async (_item, attempt) => {
        softCheck(attempt === 1 ? "unknown" : "vietnamese", "vietnamese", "detection wrong for vi");   // fails on the first attempt only
        if (attempt === 1) throw new Error("click timed out after the check");
    });
    guard.logSummary(1);

    expect(logged("1 failed check(s) of the first attempt dropped")).toBe(true);
    expect(logged("failed checks of first attempts dropped: 1")).toBe(true);
    expectNoFailures();
});

test("L3 SoftChecks: a failed check on an attempt that finishes is NOT dropped and fails the test", async () => {
    const guard = new LoopGuard();

    await runLoop(guard, ["x"], async () => { softCheck("wrong text", "right text", "Side menu text is wrong for x"); });
    guard.logSummary(1);

    expect(takeExpectedFailures()).toEqual(["Side menu text is wrong for x"]);
});

test("L4 LoopGuard: an item that fails twice is recorded with its error, and the loop goes on", async () => {
    const guard = new LoopGuard();

    const ran = await runLoop(guard, ["a", "bad", "c"], async item => {
        if (item === "bad") throw new Error("Click failed after 3 attempts | element=x | reason=y | page=z");
    });
    guard.logSummary(3);

    expect(ran).toEqual({ a: 1, bad: 2, c: 1 });
    const failures = takeExpectedFailures();
    expect(failures).toEqual(["Failed at bad (also failed on retry) | Click failed after 3 attempts | element=x | reason=y | page=z"]);
    expect(logged("completed 2 of 3")).toBe(true);
    expect(logged("1 items failed")).toBe(true);
});

test("L5 LoopGuard: 5 failures in a row (element or code) stop the loop", async () => {
    const guard = new LoopGuard();

    const ran = await runLoop(guard, ["1", "2", "3", "4", "5", "6", "7"], async () => { throw new Error("element not found"); });
    guard.logSummary(7);

    expect(guard.shouldStop()).toBe(true);
    expect(Object.keys(ran)).toEqual(["1", "2", "3", "4", "5"]);          // items 6 and 7 were never tried
    const failures = takeExpectedFailures();
    expect(failures.filter(f => f.startsWith("Failed at")).length).toBe(5);
    expect(failures[failures.length - 1]).toBe("Aborted at 5 | failures in a row: environment=0, element/code=5, remaining items not checked");
});

test("L6 LoopGuard: 3 environment failures in a row stop the loop earlier", async () => {
    const guard = new LoopGuard();

    const ran = await runLoop(guard, ["1", "2", "3", "4", "5"], async () => { throw new Error("page.goto: net::ERR_INTERNET_DISCONNECTED at https://www.youtube.com/"); });
    guard.logSummary(5);

    expect(guard.shouldStop()).toBe(true);
    expect(Object.keys(ran)).toEqual(["1", "2", "3"]);
    const failures = takeExpectedFailures();
    expect(failures[failures.length - 1]).toBe("Aborted at 3 | failures in a row: environment=3, element/code=0, remaining items not checked");
});

test("L7 LoopGuard: a passing item resets the count, so 4 + 4 failures in a row do not abort", async () => {
    const guard = new LoopGuard();
    const failing = new Set(["f1", "f2", "f3", "f4", "g1", "g2", "g3", "g4"]);

    await runLoop(guard, ["f1", "f2", "f3", "f4", "ok", "g1", "g2", "g3", "g4", "last"], async item => {
        if (failing.has(item)) throw new Error("element not found");
    });
    guard.logSummary(10);

    expect(guard.shouldStop()).toBe(false);
    const failures = takeExpectedFailures();
    expect(failures.length).toBe(8);
    expect(failures.some(f => f.startsWith("Aborted"))).toBe(false);
});

test("L8 LoopGuard: a recovery that itself fails is logged and does not stop the loop", async () => {
    const guard = new LoopGuard();

    await runLoop(guard, ["a"], async (_item, attempt) => {
        if (attempt === 1) throw new Error("first try fails");
    }, async () => { throw new Error("reload failed too"); });
    guard.logSummary(1);

    expect(logged("Could not recover the page | reload failed too")).toBe(true);
    expect(logged("a passed on the retry")).toBe(true);
    expectNoFailures();
});

test("L9 LoopGuard: counters are kept per item, a retried item is counted once", async () => {
    const guard = new LoopGuard();

    await runLoop(guard, ["a"], async (_item, attempt) => {
        guard.countForSummary("detection skipped");
        if (attempt === 1) throw new Error("boom");
    });
    guard.logSummary(1);

    expect(logged("detection skipped: 1")).toBe(true);
    expect(logged("detection skipped: 2")).toBe(false);
});


// ================================================================ P: page-state helpers (fake YouTube page)

/**
 * Fake of the top bar Settings button and its popup menu (same tag names as the real page, so the locators of YtLandingPage work).
 *   ignoreFirstClick  true = the first click on the gear does nothing (the "missed click" that happens on the real page)
 *   openDelay         ms between the click and the menu rows showing up (0 = at once)
 * A click on an open menu closes it, like the real page; that is why a needless second click would be a bug.
 * The ${...} parts below are filled in by TypeScript before the page runs, so the page sees plain true / false / numbers.
 */
const settingsPage = (opts: { ignoreFirstClick: boolean; openDelay: number }) => `
<ytd-topbar-menu-button-renderer class="style-scope ytd-masthead style-default" id="gear" style="display:block;width:40px;height:20px">gear</ytd-topbar-menu-button-renderer>
<div id="host"></div>
<script>
  window.clicks = 0;
  document.getElementById('gear').addEventListener('click', () => {
    window.clicks++;
    const host = document.getElementById('host');
    if (host.dataset.open === '1') { host.innerHTML = ''; host.dataset.open = '0'; return; }      // a click on an open menu closes it
    if (${opts.ignoreFirstClick} && window.clicks === 1) return;                                  // the first click is missed
    setTimeout(() => { host.dataset.open = '1';
      host.innerHTML = '<ytd-multi-page-menu-renderer><ytd-compact-link-renderer style="display:block;width:100px;height:20px">Language</ytd-compact-link-renderer></ytd-multi-page-menu-renderer>'; }, ${opts.openDelay});
  });
</script>`;

test("P1 settings menu: already open -> no click; slow to open -> waits, no second click; missed click -> clicks again", async ({ page }) => {
    const landing = new YtLandingPage(page);

    await page.setContent(settingsPage({ ignoreFirstClick: false, openDelay: 0 }));
    await page.locator("#gear").click();
    await expect(landing.settingsMenuRow).toBeVisible();
    await landing.recoverSettingsMenuIfClosed();
    expect(await clicks(page)).toBe(1);                       // open: nothing was clicked

    await page.setContent(settingsPage({ ignoreFirstClick: false, openDelay: 1500 }));
    await page.locator("#gear").click();
    await landing.recoverSettingsMenuIfClosed();
    expect(await landing.isSettingsMenuOpen()).toBe(true);
    expect(await clicks(page)).toBe(1);                       // slow: waited, did not click again (that would close it)

    await page.setContent(settingsPage({ ignoreFirstClick: true, openDelay: 0 }));
    await page.locator("#gear").click();                      // missed
    await landing.recoverSettingsMenuIfClosed();
    expect(await landing.isSettingsMenuOpen()).toBe(true);
    expect(await clicks(page)).toBe(2);                       // clicked once more
    expect(logged("Settings menu is not open after the click, clicking the settings button again")).toBe(true);
});

/**
 * Fake of the hamburger button, the logo and the collapsed side menu ("mini guide").
 *   startPressed      true = the page starts with the side menu expanded (aria-pressed="true"), false = it starts collapsed
 *   ignoreFirstClick  true = the first click on the button does nothing (a missed click)
 *   miniDelay         ms until the collapsed entries show up after collapsing (a slow page)
 * Clicking toggles aria-pressed; expanded = no mini entries, collapsed = the mini entries are there.
 */
const guidePage = (opts: { startPressed: boolean; ignoreFirstClick: boolean; miniDelay: number }) => `
<div id="guide-button" style="display:block;width:40px;height:20px"><button id="b" aria-pressed="${opts.startPressed}" style="width:40px;height:20px">menu</button></div>
<ytd-topbar-logo-renderer id="logo">logo</ytd-topbar-logo-renderer>
<ytd-mini-guide-renderer class="style-scope ytd-app" id="mini"></ytd-mini-guide-renderer>
<script>(() => {
  window.clicks = 0;
  const b = document.getElementById('b'), mini = document.getElementById('mini');
  const fill = () => { mini.innerHTML = '<ytd-mini-guide-entry-renderer style="display:block;width:50px;height:20px">Home</ytd-mini-guide-entry-renderer>'; };
  if (${!opts.startPressed}) fill();
  document.getElementById('guide-button').addEventListener('click', () => {
    window.clicks++;
    if (${opts.ignoreFirstClick} && window.clicks === 1) return;
    const pressed = b.getAttribute('aria-pressed') === 'true';
    b.setAttribute('aria-pressed', pressed ? 'false' : 'true');
    if (pressed) setTimeout(fill, ${opts.miniDelay}); else mini.innerHTML = '';
  });
})();</script>`;

test("P2 side menu collapse: already collapsed -> no click; slow mini guide -> no second click; missed click -> clicks again", async ({ page }) => {
    const landing = new YtLandingPage(page);

    await page.setContent(guidePage({ startPressed: false, ignoreFirstClick: false, miniDelay: 0 }));
    await landing.collapseSideMenuIfExpanded();
    expect(await clicks(page)).toBe(0);                       // already collapsed

    // 4000 ms is longer than the 3 s that collapseSideMenuIfExpanded waits for the collapsed entries (a constant in YtLandingPage.ts):
    // the helper has to give up waiting, see that the menu IS collapsed (aria-pressed false), and NOT click again. Change both together.
    await page.setContent(guidePage({ startPressed: true, ignoreFirstClick: false, miniDelay: 4000 }));
    await landing.collapseSideMenuIfExpanded();
    expect(await clicks(page)).toBe(1);                       // collapsed, the entries are only slow: no second click
    expect(await page.locator("#b").getAttribute("aria-pressed")).toBe("false");

    await page.setContent(guidePage({ startPressed: true, ignoreFirstClick: true, miniDelay: 0 }));
    await landing.collapseSideMenuIfExpanded();
    expect(await clicks(page)).toBe(2);                       // first click missed, clicked once more
    expect(await page.locator("#b").getAttribute("aria-pressed")).toBe("false");
    expect(logged("Side menu did not collapse after the click, clicking the menu button again")).toBe(true);
});

test("P3 stable read: a side menu that is still filling up is read in full, not after the first 5 entries", async ({ page }) => {
    await page.setContent(`<div id="m"></div><script>(() => {
      const names = ['Home','Shorts','Subs','You','History','Music','Movies','Premium','Kids','Notifications'];
      let i = 0;
      const add = () => { const e = document.createElement('ytd-guide-entry-renderer'); e.className = 'style-scope ytd-guide-section-renderer';
        e.textContent = names[i++]; document.getElementById('m').appendChild(e);
        if (i < 5) setTimeout(add, 10); else if (i < names.length) setTimeout(add, 300); };
      add();
    })();</script>`);

    const text = await new YtLandingPage(page).readExpandedSideMenu();

    expect(text).toBe("Home Shorts Subs You History Music Movies Premium Kids Notifications");
    expect(logged("The menu was still changing")).toBe(true);
});

/**
 * Fake of the Settings button whose menu opens with an EMPTY row.
 *   growing  true = the row fills in later ("Language" after 0.7 s, "Language Location" after 1.2 s), so a good read has to wait for the final text
 *            false = the row stays empty for ever (readSettingsMenuText has to give up with an error)
 */
const settingsTextPage = (growing: boolean) => `
<ytd-topbar-menu-button-renderer class="style-scope ytd-masthead style-default" id="gear" style="display:block;width:40px;height:20px">gear</ytd-topbar-menu-button-renderer>
<div id="host"></div>
<script>(() => {
  let open = false;
  document.getElementById('gear').addEventListener('click', () => {
    const host = document.getElementById('host');
    if (open) { host.innerHTML = ''; open = false; return; }
    open = true;
    host.innerHTML = '<ytd-multi-page-menu-renderer><ytd-compact-link-renderer style="display:block;width:100px;height:20px"> </ytd-compact-link-renderer></ytd-multi-page-menu-renderer>';
    const row = host.querySelector('ytd-compact-link-renderer');
    if (${growing}) { setTimeout(() => { row.textContent = 'Language'; }, 700); setTimeout(() => { row.textContent = 'Language Location'; }, 1200); }
  });
})();</script>`;

test("P4 settings text: read until it is not empty and stable; a text that stays empty is an error", async ({ page }) => {
    const landing = new YtLandingPage(page);

    await page.setContent(settingsTextPage(true));
    expect(await landing.readSettingsMenuText()).toBe("Language Location");

    await page.setContent(settingsTextPage(false));
    const error = await failureOf(landing.readSettingsMenuText());
    expect(error.message).toContain("Read the settings menu text but it is empty");
});

test("P5 the item loop, end to end: an empty settings read plus a failing click are repeated and the test passes", async ({ page }) => {
    // the Vietnamese case of run #47 on a fake page: attempt 1 reads an empty text (failed check) and then a click fails
    const landing = new YtLandingPage(page);
    const guard = new LoopGuard();

    await runLoop(guard, ["vi"], async (_item, attempt) => {
        await page.setContent(settingsTextPage(attempt > 1));
        let text = "";
        try { text = await landing.readSettingsMenuText(); } catch { text = ""; }
        softCheck(text !== "" ? "vietnamese" : "unknown", "vietnamese", "Language of the settings menu text is wrong for vi");
        if (attempt === 1) await new SafeActions(page, 300, 1).safeClick(page.locator("#not-there"));     // the click that times out
    });
    guard.logSummary(1);

    expect(logged("failed check(s) of the first attempt dropped")).toBe(true);
    expectNoFailures();
});


// ================================================================ H: allowed versions of the side menu text

const sideMenuRows = readJson("expectedSideMenuExpanded.json");

/** The allowed texts of a language, built from its row in the data file. */
function allowedTexts(language: string): string[] {
    const row = sideMenuRows.find((candidate: { [column: string]: string }) => candidate["Language"] === language);
    return allowedVersions(row["Expected Text"], row["Alternatives"]).map(version => version.text);
}

/** True when the page text equals one of the allowed texts (the page text is cleaned the way the test cleans it). */
const isAllowed = (language: string, pageText: string) => allowedTexts(language).includes(removeOptionalEntries(pageText));

test("H1 allowedVersions: every placeholder is filled with every option (3 x 2 = 6 texts)", async () => {
    const versions = allowedVersions("Home Shorts {slot} {premium} Kids", {
        slot: ["Live", "Hype", ""],
        premium: ["YouTube Premium", "Try Premium for $0"],
    });

    expect(versions.map(version => version.text)).toEqual([
        "Home Shorts Live YouTube Premium Kids",
        "Home Shorts Live Try Premium for $0 Kids",
        "Home Shorts Hype YouTube Premium Kids",
        "Home Shorts Hype Try Premium for $0 Kids",
        "Home Shorts YouTube Premium Kids",              // the slot is missing: no double space is left
        "Home Shorts Try Premium for $0 Kids",
    ]);
    expect(versions[0].description).toBe("slot=Live premium=YouTube Premium");
    expect(versions[4].description).toBe("slot=(none) premium=YouTube Premium");
});

test("H2 optional entries (YouTube Music, TV, Labs) are removed, other entries stay", async () => {
    expect(removeOptionalEntries("Home YouTube Music Shorts YouTube TV YouTube Labs Kids")).toBe("Home Shorts Kids");
    expect(removeOptionalEntries("Home YouTube Premium YouTube Kids")).toBe("Home YouTube Premium YouTube Kids");
});

test("H3 the texts really seen on the page (CI and Java reports) are allowed: Afrikaans", async () => {
    const start = "Tuis Kortvideo's Intekeninge Myne Geskiedenis Musiek Flieks en TV";
    const end = "YouTube Kids Aangeegeskiedenis";
    const plain = "YouTube Premium";
    const promo = "Probeer Premium vir $0";
    const withLabs = "YouTube Kids YouTube Labs Aangeegeskiedenis";

    // [where this text was seen, the text]: the label shows in the failure message
    const seenOnThePage: [string, string][] = [
        ["V1 the old data (slot word Ophef)",                  `${start} Ophef ${plain} ${end}`],
        ["V2 Live in the slot (CI runs #39 to #53)",           `${start} Regstreeks ${plain} ${end}`],
        ["V3 with Labs (Java report 10-28 17:30)",             `${start} Regstreeks ${plain} ${withLabs}`],
        ["V4 promo + Labs (Java report 10-28 22:27)",          `${start} Regstreeks ${promo} ${withLabs}`],
        ["V5 promo (the sheet of Java 10-29)",                 `${start} Regstreeks ${promo} ${end}`],
        ["slot entry missing (TS run #40, other languages)",   `${start} ${plain} ${end}`],
    ];
    for (const [seen, pageText] of seenOnThePage) {
        expect(isAllowed("Afrikaans", pageText), "should be allowed: " + seen).toBe(true);
    }
});

test("H4 the texts really seen on the page: English (US) and Français (Canada)", async () => {
    const us = "Home Shorts Subscriptions You History Music Movies & TV";
    const canada = "Accueil Shorts Abonnements Vous Historique Musique Films et émissions de télévision";

    // [language, where this text was seen, the text]
    const seenOnThePage: [string, string, string][] = [
        ["English (US)",      "slot word Hype",                    `${us} Hype YouTube Premium YouTube Kids Report history`],
        ["English (US)",      "Live + Labs",                       `${us} Live YouTube Premium YouTube Kids YouTube Labs Report history`],
        ["English (US)",      "Live + promo + Labs",               `${us} Live Try Premium for $0 YouTube Kids YouTube Labs Report history`],
        ["Français (Canada)", "old data (Applaudissement)",        `${canada} Applaudissement YouTube Premium YouTube Kids Historique des rapports`],
        ["Français (Canada)", "Java report 10-28 17:30",           `${canada} Jeux vidéo YouTube Premium YouTube Kids YouTube Labs Historique des rapports`],
        ["Français (Canada)", "Java report 10-28 22:27 (promo)",   `${canada} Jeux vidéo Essayez Premium pour 0 USD YouTube Kids YouTube Labs Historique des rapports`],
        ["Français (Canada)", "slot missing (TS run #40)",         `${canada} YouTube Premium YouTube Kids Historique des rapports`],
    ];
    for (const [language, seen, pageText] of seenOnThePage) {
        expect(isAllowed(language, pageText), language + " should be allowed: " + seen).toBe(true);
    }
});

test("H5 texts that are NOT allowed fail: new wording, another entry, a changed word, a cut menu", async () => {
    const start = "Tuis Kortvideo's Intekeninge Myne Geskiedenis Musiek Flieks en TV";
    const end = "YouTube Kids Aangeegeskiedenis";

    // [why it must be rejected, the text]
    const mustBeRejected: [string, string][] = [
        ["a new promo wording",                       `${start} Regstreeks Probeer Premium vir $1 ${end}`],
        ["another entry in the slot",                 `${start} Gaming YouTube Premium ${end}`],
        ["both slot words",                           `${start} Regstreeks Ophef YouTube Premium ${end}`],
        ["a changed word elsewhere",                  `${start.replace("Tuis", "Home")} Regstreeks YouTube Premium ${end}`],
        ["a cut menu (Eesti, run #40)",               "Tuis Kortvideo's Intekeninge Myne Geskiedenis"],
        ["the slot word in the wrong place",          `${start} YouTube Premium Regstreeks ${end}`],
    ];
    for (const [why, pageText] of mustBeRejected) {
        expect(isAllowed("Afrikaans", pageText), "should be rejected: " + why).toBe(false);
    }
});

test("H6 data check: every language has its placeholders once, no empty group, no duplicate texts", async () => {
    const problems: string[] = [];

    for (const row of sideMenuRows) {
        const language = row["Language"];
        const alternatives = row["Alternatives"] as { [placeholder: string]: string[] };
        for (const placeholder of Object.keys(alternatives)) {
            const count = row["Expected Text"].split("{" + placeholder + "}").length - 1;
            if (count !== 1) problems.push(language + ": {" + placeholder + "} appears " + count + " times in the base text");
            if (alternatives[placeholder].length === 0) problems.push(language + ": no options for " + placeholder);
        }
        const texts = allowedTexts(language);
        if (new Set(texts).size !== texts.length) problems.push(language + ": two versions give the same text");
        if (texts.some(text => text.includes("{") || text.includes("}"))) problems.push(language + ": a placeholder was not filled");
    }

    expect(sideMenuRows.length).toBe(53);
    expect(problems).toEqual([]);
});


// ================================================================ W: whole-test retry

test("W1 whole-test retry: a test that fails on its first run is run again from the start (shows as flaky)", async ({}, testInfo) => {
    console.log("WHOLE-TEST RETRY | attempt number " + testInfo.retry + (testInfo.retry === 0 ? " (fails on purpose)" : " (the retry)"));
    expect(testInfo.retry, "fails on purpose on the first run, the retry has to pass").toBeGreaterThan(0);
});


// ================================================================ D: the data files (the expected data is looked up by language name)

const TEXT_FILES = [
    "expectedSideMenuExpanded.json",
    "expectedSideMenuCollapsed.json",
    "expectedSearchFilter.json",
];

test("D1 every language of languages.json has exactly one row in every expected-text file, with nothing extra", async () => {
    const languages = readJson("languages.json");
    const names: string[] = languages.map((row: { [column: string]: string }) => row["Language"]);
    expect(names.length).toBe(53);
    expect(new Set(names).size, "languages.json has a language twice").toBe(names.length);

    for (const fileName of TEXT_FILES) {
        const rows = readJsonByName(fileName);       // throws if a language is in the file twice
        for (const name of names) {
            expect(() => rows.get(name), name + " in " + fileName).not.toThrow();
        }
        expect(readJson(fileName).length, fileName + " has a language that is not in languages.json").toBe(names.length);
    }
});

test("D2 languages.json: every row is complete and the detection skip list is the 2 known languages", async () => {
    const languages = readJson("languages.json");
    for (const row of languages) {
        expect(Object.keys(row).sort(), row["Language"]).toEqual(["Detection Skipped", "Expected Attribute", "Expected Language", "Language"]);
        expect(row["Expected Language"].trim(), row["Language"] + " has no expected language").not.toBe("");
        expect(row["Expected Attribute"].trim(), row["Language"] + " has no expected lang attribute").not.toBe("");
        expect(typeof row["Detection Skipped"], row["Language"]).toBe("boolean");
    }
    expect(languages.filter((row: { [column: string]: unknown }) => row["Detection Skipped"]).map((row: { [column: string]: unknown }) => row["Language"]))
        .toEqual(["Afrikaans", "Bahasa Indonesia"]);
});

test("D3 a name that has no row, or two rows, stops with an error that names the file", async () => {
    expect(() => readJsonByName("languages.json", "Language").get("Klingon")).toThrow("No row for Klingon in languages.json");
    // "Expected Language" is not a name column (several languages share a value), so indexing by it finds a duplicate
    expect(() => readJsonByName("languages.json", "Expected Language")).toThrow(/Two rows for .* in languages.json/);
});

test("D4 countryCodes.json: every location name once, a code for all but the United States", async () => {
    const rows = readJson("countryCodes.json");
    expect(rows.length).toBe(111);
    readJsonByName("countryCodes.json", "Country Name");         // throws if a location is in the file twice
    for (const row of rows) {
        expect(row["Country Name"].trim(), "a location name is empty").not.toBe("");
        if (row["Country Name"] !== "United States") {
            expect(row["Country Code"].trim(), row["Country Name"] + " has no code").not.toBe("");
        }
    }
});

test("D5 the country tests are named after the first and last country of their half (names are written in the spec)", async () => {
    const names: string[] = readJson("countryCodes.json").map((row: { [column: string]: string }) => row["Country Name"]);
    const middle = Math.ceil(names.length / 2);
    const spec = fs.readFileSync("tests/YtMasterSafeActions.spec.ts", "utf8");
    const expected = [
        "verifyingCountryCodeOnLogo_" + names[0] + "_to_" + names[middle - 1],
        "verifyingCountryCodeOnLogo_" + names[middle] + "_to_" + names[names.length - 1],
    ];
    for (const name of expected) {
        expect(spec, "the spec has no country test named " + name + " (the data file or the middle of the list changed: rename the test)").toContain('test("' + name.replace(/ /g, "") + '"');
    }
});
