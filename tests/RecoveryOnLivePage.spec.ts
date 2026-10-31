import { test, expect, Page } from "@playwright/test";
import YtLandingPage from "../pages/YtLandingPage";
import SafeActions from "../utils/SafeActions";
import { LoopGuard } from "../utils/LoopGuard";
import { softCheck, stopCollecting } from "../utils/SoftChecks";
import { readJson } from "../utils/ReadJSON";
import GenericUtility from "../utils/GenericUtility";

/**
 * Recovery tests on the REAL youtube.com: a fault is put into the live page on purpose, so that a recovery path has to act.
 * The same recoveries are tested on fake pages in FallbackMechanisms.spec.ts; this file shows they also work on the real site.
 * Each test checks two things: the recovery really ran (its log line), and the page ended up in the right state.
 *
 * Run with:  npx playwright test tests/RecoveryOnLivePage.spec.ts
 * On CI: Actions > Playwright tests > Run workflow > tick "recovery". The reports go to the recovery/ folder of gh-pages.
 * The nightly run does not include this file, it is not a check of the site but of our own safety layers.
 *
 *   R1 settings click missed       R2 settings menu slow to open   R3 side menu does not collapse   R4 side menu does not expand
 *   R5 side menu fills up slowly   R6 a language that cannot be picked: SafeActions refresh + LoopGuard retry + dropped checks
 *   R7 the network is down: LoopGuard stops after 3 environment failures, and a recovery that fails is logged
 *   R8 an element is missing: LoopGuard stops after 5 element failures in a row
 *   R9 the location list is missing for one location: LoopGuard retries it, over all locations (like R6 for languages)
 *
 * R6 to R9 go through as many languages / locations as the other tests (runconfig.json: all 53 and 111 when "run for all" is on).
 *
 * A fault is a click listener that swallows the first click(s) on a button, or a style that hides part of the page for a while.
 * It is put in with addInitScript / evaluate, so nothing of the project code is changed or switched off.
 */

// The first run of a test must be the truth: a retry could hide a recovery that did not work.
test.describe.configure({ retries: 0 });

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
const countLogged = (text: string) => logs.filter(line => line.includes(text)).length;

/** Failures that a scenario is SUPPOSED to produce: returns their first lines and takes them out of the test result. */
function takeExpectedFailures(): string[] {
    const errors = test.info().errors;
    const messages = errors.map(error => (error.message ?? "").replace(/\u001b\[[0-9;]*m/g, "").split("\n")[0].replace(/^Error: /, "").trim());
    errors.splice(0, errors.length);
    test.info().status = "passed";          // the first soft failure set the status to failed, these failures were expected
    return messages;
}

/** The languages the loops of these tests go through: as many as the other tests use (runconfig.json: all 53 when "run for all" is on). */
function languagesToCheck(page: Page): string[] {
    const rows = readJson("ApplicableLanguageExpectedLanguage.json");
    const count = new GenericUtility(page).resolveLanguageIterationCount(rows.length);
    expect(count, "these tests need at least 7 languages (R7 and R8 stop after 3 and 5 failed ones)").toBeGreaterThanOrEqual(7);
    return rows.slice(0, count).map((row: any) => row["Applicable Language"]);
}

/**
 * Puts click traps for the settings button and the menu button (top left) into every page load of this test.
 * A trap is armed later with arm(): "swallow" = how many of the next clicks do nothing, "hideMenuMs" = the settings menu
 * stays hidden for that long after the next click (a menu that is slow to open). clicks() says how many clicks reached the button.
 */
async function installTraps(page: Page) {
    await page.addInitScript(() => {
        const w = window as any;
        w.__traps = { settings: { swallow: 0, hideMenuMs: 0, clicks: 0 }, guide: { swallow: 0, hideMenuMs: 0, clicks: 0 } };
        document.addEventListener("click", (event: Event) => {
            const target = event.target as Element;
            const kind = target.closest?.('button[aria-label="Settings"]') ? "settings" : target.closest?.("#guide-button") ? "guide" : "";
            if (kind === "") {
                return;
            }
            const trap = w.__traps[kind];
            trap.clicks++;
            if (trap.swallow > 0) {
                trap.swallow--;
                event.stopImmediatePropagation();
                event.preventDefault();
            } else if (trap.hideMenuMs > 0) {
                const style = document.createElement("style");
                style.textContent = "ytd-multi-page-menu-renderer { visibility: hidden !important; }";
                document.head.appendChild(style);
                setTimeout(() => style.remove(), trap.hideMenuMs);
                trap.hideMenuMs = 0;
            }
        }, true);
    });
}

async function arm(page: Page, kind: "settings" | "guide", settings: { swallow?: number; hideMenuMs?: number }) {
    await page.evaluate(([kind, settings]) => {
        Object.assign((window as any).__traps[kind], settings);
    }, [kind, settings] as const);
}

async function clicks(page: Page, kind: "settings" | "guide"): Promise<number> {
    return await page.evaluate(kind => (window as any).__traps[kind].clicks, kind);
}

async function openLandingPage(page: Page, testInfo: any) {
    await installTraps(page);
    const landingPage = new YtLandingPage(page, testInfo);
    await landingPage.openingLandingPage();
    return landingPage;
}

async function isSideMenuExpanded(landingPage: YtLandingPage): Promise<boolean> {
    return (await landingPage.ellipsesYtLandingPageTopLeft.locator("button").getAttribute("aria-pressed")) === "true";
}

// ---------------------------------------------------------------- R1 to R4: page-state helpers

test("R1 settings menu: the first click on the settings button is missed -> the recovery clicks again", async ({ page }, testInfo) => {
    const landingPage = await openLandingPage(page, testInfo);
    await arm(page, "settings", { swallow: 1 });

    await landingPage.openLanguageList();               // click (swallowed), recovery, click again, then the language dropdown

    expect(logged("Settings menu is not open after the click, clicking the settings button again"), "the recovery did not run").toBe(true);
    expect(logged("still not open after the second click"), "the second click did not open the menu").toBe(false);
    expect(await clicks(page, "settings"), "clicks that reached the settings button").toBe(2);
    expect(await landingPage.isSettingsMenuOpen(), "the settings menu should be open at the end").toBe(true);
});

test("R2 settings menu: slow to open (hidden for 8 s) -> the recovery waits and does NOT click a second time", async ({ page }, testInfo) => {
    const landingPage = await openLandingPage(page, testInfo);
    await arm(page, "settings", { hideMenuMs: 8000 });

    await landingPage.openLanguageList();

    // a second click would have closed the menu that was about to appear (this was the finding 8 risk)
    expect(await clicks(page, "settings"), "clicks that reached the settings button (a second click closes the menu)").toBe(1);
    expect(logged("clicking the settings button again"), "the recovery clicked although the menu was only slow").toBe(false);
    expect(await landingPage.isSettingsMenuOpen(), "the settings menu should be open at the end").toBe(true);
});

test("R3 side menu: the click on the menu button is missed -> the menu is collapsed by a second click", async ({ page }, testInfo) => {
    const landingPage = await openLandingPage(page, testInfo);
    expect(await isSideMenuExpanded(landingPage), "the test needs the side menu to start expanded").toBe(true);
    await arm(page, "guide", { swallow: 1 });

    await landingPage.collapseSideMenuIfExpanded();

    expect(logged("Side menu did not collapse after the click, clicking the menu button again"), "the recovery did not run").toBe(true);
    expect(await clicks(page, "guide"), "clicks that reached the menu button").toBe(2);
    expect(await isSideMenuExpanded(landingPage), "the side menu should be collapsed at the end").toBe(false);
});

test("R4 side menu: the click on the menu button is missed -> the menu is expanded by a second click", async ({ page }, testInfo) => {
    const landingPage = await openLandingPage(page, testInfo);
    await landingPage.collapseSideMenuIfExpanded();     // normal click, no trap armed yet
    expect(await isSideMenuExpanded(landingPage), "the test needs the side menu to start collapsed").toBe(false);
    await arm(page, "guide", { swallow: 1 });
    const clicksBefore = await clicks(page, "guide");

    await landingPage.expandSideMenuIfCollapsed();

    expect(logged("Side menu is collapsed, expanding it, attempt 2"), "the second attempt did not run").toBe(true);
    expect(await clicks(page, "guide") - clicksBefore, "clicks that reached the menu button after the trap was armed").toBe(2);
    expect(await isSideMenuExpanded(landingPage), "the side menu should be expanded at the end").toBe(true);
});

// ---------------------------------------------------------------- R5: stable read

test("R5 side menu read: the entries appear one by one (every 0.4 s) -> the read waits and returns the full menu", async ({ page }, testInfo) => {
    const landingPage = await openLandingPage(page, testInfo);
    const fullMenu = await landingPage.readExpandedSideMenu();
    expect(fullMenu.length, "the menu read without any fault").toBeGreaterThan(50);
    logs = [];

    // show only the first entry of each group, then one more entry per group every 0.4 s until all of them are back
    await page.evaluate(() => {
        const style = document.createElement("style");
        document.head.appendChild(style);
        let shown = 1;
        const timer = setInterval(() => {
            shown++;
            style.textContent = "ytd-guide-entry-renderer.style-scope.ytd-guide-section-renderer:nth-child(n+" + (shown + 1) + ") { display: none !important; }";
            if (shown > 40) {
                clearInterval(timer);
                style.remove();
            }
        }, 400);
        style.textContent = "ytd-guide-entry-renderer.style-scope.ytd-guide-section-renderer:nth-child(n+2) { display: none !important; }";
    });

    const text = await landingPage.readExpandedSideMenu();

    expect(logged("The menu was still changing"), "the menu was not changing while it was read, so the fault did not work").toBe(true);
    expect(text, "the text returned must be the full menu, not a partial one").toBe(fullMenu);
});

// ---------------------------------------------------------------- R6: the whole chain

test("R6 language that cannot be picked: SafeActions refreshes, LoopGuard retries the language, the failed check of the first attempt is dropped", async ({ page }, testInfo) => {
    const languages = languagesToCheck(page);       // the second one gets the fault
    const faulted = languages[1];
    const landingPage = await openLandingPage(page, testInfo);
    // The fault: the language is missing from the list until the page has been loaded twice more (a refresh and a new visit).
    // The state is kept in sessionStorage, because every page load runs the script again.
    await page.addInitScript((target: string) => {
        const armed = () => sessionStorage.getItem("faultArmed") === "1";
        if (armed()) {
            sessionStorage.setItem("faultLoads", String(Number(sessionStorage.getItem("faultLoads") || "0") + 1));
        }
        setInterval(() => {
            if (!armed() || Number(sessionStorage.getItem("faultLoads") || "0") >= 2) {
                return;
            }
            document.querySelectorAll("yt-formatted-string#label").forEach(label => {
                if (label.textContent?.trim() === target) {
                    (label.closest("ytd-compact-link-renderer") as HTMLElement | null)?.style.setProperty("display", "none");
                }
            });
        }, 100);
    }, faulted);
    await landingPage.openLanguageList();

    const guard = new LoopGuard();
    let firstAttemptOfFaulted = true;
    for (let i = 0; i < languages.length && !guard.shouldStop(); i++) {
        const language = languages[i];
        try {
            console.log(language + "  row " + i);
            if (language === faulted && firstAttemptOfFaulted) {
                firstAttemptOfFaulted = false;
                softCheck("wrong on the first attempt", "Fault test: this failed check of the first attempt must be dropped", "right");
                await page.evaluate(() => {
                    sessionStorage.setItem("faultLoads", "0");
                    sessionStorage.setItem("faultArmed", "1");
                });
            }
            await landingPage.pickLanguage(language);
            const settingsText = await landingPage.readSettingsMenuText();
            softCheck(settingsText.length > 0, "Settings menu text of " + language + " is empty", true);
            await page.evaluate(() => sessionStorage.removeItem("faultArmed"));
            await landingPage.openLanguageList();
            guard.passed(language);
        } catch (e) {
            if (await guard.retryAfterFailure(language, e, async () => {
                await landingPage.openingLandingPage();
                await landingPage.openLanguageList();
            })) {
                i--;
            }
        }
    }
    guard.logSummary(languages.length);

    expect(logged("refreshing the page to recover"), "SafeActions did not refresh the page").toBe(true);
    expect(logged(faulted + " failed |"), "the faulted language did not fail on the first attempt, so the fault did not work").toBe(true);
    expect(logged(faulted + " passed on the retry"), "LoopGuard did not retry the language").toBe(true);
    expect(logged("failed check(s) of the first attempt dropped"), "the failed check of the first attempt was not dropped").toBe(true);
    expect(logged("also failed on retry"), "a language failed on the retry as well").toBe(false);
    expect(logs.some(line => line.startsWith("Summary | completed " + languages.length + " of " + languages.length) && line.includes("1 passed on the retry")), "summary line").toBe(true);
    expect(countLogged("Summary |"), "one summary").toBe(1);
    expect(test.info().errors.length, "failed checks left on the test").toBe(0);
});

// ---------------------------------------------------------------- R7: the network is down

test("R7 network down: every page load fails -> 3 items fail on the retry, the loop stops, a failed recovery is logged", async ({ page }, testInfo) => {
    const landingPage = await openLandingPage(page, testInfo);
    const languages = languagesToCheck(page);
    // Page loads fail at once with net::ERR_FAILED (an environment failure for LoopGuard), the page already open is not touched.
    await page.route("**/*", route => route.request().isNavigationRequest() ? route.abort("failed") : route.continue());

    const guard = new LoopGuard();
    for (let i = 0; i < languages.length && !guard.shouldStop(); i++) {
        try {
            console.log(languages[i] + "  row " + i);
            await landingPage.openingLandingPage();         // the work of the item: a page load, which fails
            guard.passed(languages[i]);
        } catch (e) {
            if (await guard.retryAfterFailure(languages[i], e, async () => {
                await landingPage.openingLandingPage();     // the recovery needs a page load too, so it fails as well
                await landingPage.openLanguageList();
            })) {
                i--;
            }
        }
    }
    guard.logSummary(languages.length);
    await page.unroute("**/*");

    expect(countLogged("Could not recover the page | "), "the failed recovery is logged once for every failed attempt (3 items x 2)").toBe(6);
    expect(countLogged("net::ERR_FAILED"), "the environment error is shown").toBeGreaterThan(0);
    expect(logged(languages[3] + "  row 3"), "item 3 must not be tried after the stop").toBe(false);
    expect(logged(languages[4] + "  row 4"), "item 4 must not be tried after the stop").toBe(false);
    expect(logs.some(line => line.startsWith("Summary | completed 0 of " + languages.length) && line.includes("3 items failed") && line.includes("stopped early")), "summary line").toBe(true);

    const failures = takeExpectedFailures();
    expect(failures.filter(failure => failure.startsWith("Failed at ")).length, "items recorded as failed").toBe(3);
    expect(failures[failures.length - 1], "the last failure").toBe("Aborted at " + languages[2] + " | failures in a row: environment=3, element/code=0, remaining items not checked");
});

// ---------------------------------------------------------------- R8: element failures in a row

test("R8 element missing: 5 items in a row fail on the retry -> the loop stops and the rest is not tried", async ({ page }, testInfo) => {
    const landingPage = await openLandingPage(page, testInfo);
    // The real SafeActions (3 attempts, a refresh after the 2nd), with 1 s per attempt instead of 20 s so the test takes about a minute.
    // The element does not exist, so every item fails with SafeActions' one-line error, which is not an environment error.
    const shortSafeActions = new SafeActions(page, 1000, 3);
    const items = languagesToCheck(page);

    const guard = new LoopGuard();
    for (let i = 0; i < items.length && !guard.shouldStop(); i++) {
        try {
            console.log(items[i] + "  row " + i);
            await shortSafeActions.safeClick(page.locator("#this-element-does-not-exist"));
            guard.passed(items[i]);
        } catch (e) {
            if (await guard.retryAfterFailure(items[i], e, async () => await landingPage.openingLandingPage())) {
                i--;
            }
        }
    }
    guard.logSummary(items.length);

    expect(countLogged("Could not recover the page"), "the recovery (a normal page load) works, so it never fails").toBe(0);
    expect(logged(items[5] + "  row 5"), "item 5 must not be tried after the stop").toBe(false);
    expect(logged(items[6] + "  row 6"), "item 6 must not be tried after the stop").toBe(false);
    expect(logs.some(line => line.startsWith("Summary | completed 0 of " + items.length) && line.includes("5 items failed") && line.includes("stopped early")), "summary line").toBe(true);

    const failures = takeExpectedFailures();
    expect(failures.filter(failure => failure.startsWith("Failed at ")).length, "items recorded as failed").toBe(5);
    expect(failures[0], "the error of a failed item is one line with action, element and reason").toContain("(also failed on retry) | Click failed after 3 attempts | element=locator('#this-element-does-not-exist')");
    expect(failures[failures.length - 1], "the last failure").toBe("Aborted at " + items[4] + " | failures in a row: environment=0, element/code=5, remaining items not checked");
});

// ---------------------------------------------------------------- R9: the whole chain for the locations

test("R9 location list missing: LoopGuard recovers and retries the location, over all locations, the failed check of the first attempt is dropped", async ({ page }, testInfo) => {
    const countryRows = readJson("Country_Name_Code.json");
    const landingPage = await openLandingPage(page, testInfo);
    // The fault: while it is on, the rows of the open list are hidden, so the list of locations is empty until the next page load.
    // The state is kept in sessionStorage, because every page load runs the script again.
    await page.addInitScript(() => {
        const armed = () => sessionStorage.getItem("locationFaultArmed") === "1";
        if (armed()) {
            sessionStorage.setItem("locationFaultLoads", String(Number(sessionStorage.getItem("locationFaultLoads") || "0") + 1));
        }
        setInterval(() => {
            if (!armed() || Number(sessionStorage.getItem("locationFaultLoads") || "0") >= 1) {
                return;
            }
            document.querySelectorAll("ytd-compact-link-renderer").forEach(row => (row as HTMLElement).style.setProperty("display", "none"));
        }, 100);
    });
    await landingPage.openLocationList();
    const locationCount = new GenericUtility(page).resolveCountryIterationCount((await landingPage.getLocationList()).length);
    expect(locationCount, "R9 needs at least 2 locations, the second one gets the fault").toBeGreaterThanOrEqual(2);

    const guard = new LoopGuard();
    let faulted = "";
    let firstAttemptOfFaulted = true;
    for (let i = 0; i < locationCount && !guard.shouldStop(); i++) {
        let locationText = "location #" + i;
        try {
            if (i === 1 && firstAttemptOfFaulted) {
                firstAttemptOfFaulted = false;
                softCheck("wrong on the first attempt", "Fault test: this failed check of the first attempt must be dropped", "right");
                await page.evaluate(() => {
                    sessionStorage.setItem("locationFaultLoads", "0");
                    sessionStorage.setItem("locationFaultArmed", "1");
                });
            }
            locationText = await landingPage.pickLocation(i);
            if (i === 1) {
                faulted = locationText;
            }
            await page.evaluate(() => sessionStorage.removeItem("locationFaultArmed"));
            const detectedCode = await landingPage.getCountryCode();
            console.log(locationText + "  row " + i + "  detected code: " + detectedCode + "  expected code: " + countryRows[i]["Country Code"]);
            softCheck(detectedCode.trim(), 'Country code is wrong after choosing location "' + locationText + '"', countryRows[i]["Country Code"].trim());
            await landingPage.openLocationList();
            guard.passed(locationText);
        } catch (e) {
            if (await guard.retryAfterFailure(locationText, e, async () => {
                await landingPage.openingLandingPage();
                await landingPage.openLocationList();
            })) {
                i--;
            }
        }
    }
    guard.logSummary(locationCount);

    expect(logged("location #1 failed |"), "location 1 did not fail on the first attempt, so the fault did not work").toBe(true);
    expect(faulted, "the name of location 1 is known after its retry").not.toBe("");
    expect(logged(faulted + " passed on the retry"), "LoopGuard did not retry the location").toBe(true);
    expect(logged("failed check(s) of the first attempt dropped"), "the failed check of the first attempt was not dropped").toBe(true);
    expect(logged("also failed on retry"), "a location failed on the retry as well").toBe(false);
    expect(logs.some(line => line.startsWith("Summary | completed " + locationCount + " of " + locationCount) && line.includes("1 passed on the retry")), "summary line").toBe(true);
    expect(test.info().errors.length, "failed checks left on the test").toBe(0);
});
