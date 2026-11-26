import { Page, test, TestInfo } from "@playwright/test";
import { isCanary } from "./Canary";

/**
 * Screenshots as evidence of a failure (the plan and the reasons are in docs/31-screenshot-evidence-plan.md).
 *
 * Rules, so the picture shows the step that went wrong:
 *   - A shot is taken only where something went wrong, never for a passing item.
 *   - It is taken right after the page was read (or right after the error) and BEFORE the next click or reload.
 *   - It is awaited on the spot, never started in the background, so a fast script cannot click past it.
 *   - It never fails the test: a closed page, a hung page or a missing test is only logged.
 *
 * Next to every picture goes a small text note (time, item, attempt, url, title, readyState, html lang) that shows which step it belongs to.
 * File name: s<number>_<item>_<kind>_a<attempt>, for example s03_Deutsch_check-failed_a1. The number counts the pictures of the test,
 * so the files sort in the order they were taken. The test folder of Playwright already holds the test name, the browser and the test retry.
 */

const MAX_SHOTS = 15;               // per test run, so a bad night cannot fill the report
const MAX_SHOTS_CANARY = 3;         // every test fails on purpose in a canary run
const SHOT_TIMEOUT = 5000;          // ms, a hung page must not cost the 30 s action timeout for every item

const shotsPerTest = new Map<string, number>();     // how many pictures each test run has attached so far


/** Letters and digits only, everything else becomes "-", at most 30 characters (safe in a file name on Windows and Linux). */
export function cleanName(text: string): string {
    const name = text.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
    return name.slice(0, 30) || "item";
}

/** Takes the screenshot into memory. Returns null when that is not possible. Never throws. */
export async function takeShot(page: Page): Promise<Buffer | null> {
    if (page.isClosed()) {
        return null;
    }
    try {
        return await page.screenshot({ type: "jpeg", quality: 70, animations: "disabled", timeout: SHOT_TIMEOUT });
    } catch (e) {
        console.log("Screenshot failed (not fatal): " + String(e).split("\n")[0]);
        return null;
    }
}

/** What the page says about itself right now, one fact per line. Never throws. */
async function readPageFacts(page: Page): Promise<string> {
    const unreadable = "page facts not readable";
    if (page.isClosed()) {
        return unreadable;
    }
    const read = page.evaluate(() => "title=" + document.title + "\nreadyState=" + document.readyState + "\nhtml lang=" + document.documentElement.lang);
    const giveUp = new Promise<string>(resolve => setTimeout(() => resolve(unreadable), SHOT_TIMEOUT));
    return await Promise.race([read, giveUp]).catch(() => unreadable);
}

/** The next number for a picture of this test run, or 0 when the limit is reached. */
function nextNumber(testInfo: TestInfo): number {
    const key = testInfo.testId + "-" + testInfo.retry;
    const number = (shotsPerTest.get(key) ?? 0) + 1;
    const limit = isCanary() ? MAX_SHOTS_CANARY : MAX_SHOTS;
    if (number > limit) {
        return 0;
    }
    shotsPerTest.set(key, number);
    return number;
}

/**
 * Attaches a picture of the page, with its text note, to the running test.
 * @param kind     what went wrong, one of: check-failed, failed-before-recovery, recovery-failed, loop-aborted, menu-not-open, menu-collapse-failed, menu-not-stable, lang-attr-unreadable
 * @param item     the language or location, or a word like "page" when the problem belongs to no item
 * @param attempt  1 = first try of the item, 2 = the retry, 0 = not part of an item loop
 * @param held     a picture taken earlier (the page has changed since), used instead of a new one
 */
export async function attachShot(page: Page, kind: string, item: string, attempt: number = 0, held: Buffer | null = null): Promise<void> {
    try {
        const testInfo = test.info();
        const number = nextNumber(testInfo);
        if (number === 0) {
            console.log("Screenshot limit reached for this test, no picture for " + kind + " | " + item);
            return;
        }

        const picture = held ?? await takeShot(page);       // first, so nothing else comes between the failure and the picture
        if (!picture) {
            return;
        }
        const facts = await readPageFacts(page);

        const name = "s" + String(number).padStart(2, "0") + "_" + cleanName(item) + "_" + kind + (attempt > 0 ? "_a" + attempt : "");
        const note = "time=" + new Date().toISOString() + "\nkind=" + kind + "\nitem=" + item + "\nattempt=" + attempt
            + "\nurl=" + page.url() + "\n" + facts + (held ? "\n(the picture was taken earlier in the item)" : "");
        await testInfo.attach(name, { body: picture, contentType: "image/jpeg" });
        await testInfo.attach(name + "_note", { body: note, contentType: "text/plain" });
        console.log("Screenshot kept | " + name);
    } catch (e) {
        console.log("Could not attach the picture (not fatal): " + String(e).split("\n")[0]);
    }
}
