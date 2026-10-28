import { expect, test } from "@playwright/test";
import { commitPendingChecks, discardPendingChecks, startCollecting, stopCollecting } from "./SoftChecks";

/** Error messages that mean the browser, network or site is broken, not just one element missing. */
const ENVIRONMENT_MESSAGES = [
    "net::ERR_", "Target closed", "has been closed", "Browser closed", "Page crashed", "Protocol error",
];

/** A soft check that always fails and shows only the given text (no "Expected: true / Received: false" lines). */
const failureExpect = expect.extend({
    failedItem(_received: unknown, text: string) {
        return { pass: false, message: () => text };
    },
});

const MAX_ENVIRONMENT_FAILURES = 3;
const MAX_OTHER_FAILURES = 5;

/** Steps that bring the page back to the state the loop starts from. */
type Recovery = () => Promise<void>;

/**
 * Keeps a language/location loop going when one iteration throws (ported from the Java LoopGuard).
 *
 * In the loop: call passed() at the end of the iteration and retryAfterFailure() in the catch
 * (true means run the same item again). The loop condition uses shouldStop().
 *
 * Rules: a failed item is retried once, and recorded as a failure only if the retry fails too. The loop stops
 * after 3 environment failures in a row (browser/network/site broken) or 5 other failures in a row
 * (element, Playwright, code). A passing item resets the count.
 */
export class LoopGuard {

    private retrying = false;
    private stop = false;
    private environmentFailures = 0;
    private otherFailures = 0;

    // for the summary line at the end of the test
    private passedItems = 0;
    private passedOnRetry = 0;
    private failedItems = 0;
    private counts = new Map<string, number>();
    private itemCounts = new Map<string, number>();     // counted while the item runs, added to counts only when the item finishes
    private discardedChecks = 0;

    constructor() {
        startCollecting();      // the failed checks of an item are kept back until the item is finished
    }

    public shouldStop(): boolean {
        return this.stop;
    }

    public passed(item: string): void {
        this.passedItems++;
        commitPendingChecks();
        this.itemCounts.forEach((amount, label) => this.counts.set(label, (this.counts.get(label) || 0) + amount));
        this.itemCounts.clear();
        if (this.retrying) {
            this.passedOnRetry++;
            console.log(item + " passed on the retry");
        }
        this.retrying = false;
        this.environmentFailures = 0;
        this.otherFailures = 0;
    }

    /** @returns true if the same item should be run again, false to move on to the next one */
    public async retryAfterFailure(item: string, error: unknown, recovery: Recovery): Promise<boolean> {
        console.log(item + " failed | " + this.describe(error));

        try {
            await recovery();
        } catch (recoveryError) {
            console.log("Could not recover the page | " + this.describe(recoveryError));
        }

        // first failure: run the same item once more, its checks are done again, so those of this attempt are dropped
        if (!this.retrying) {
            const dropped = discardPendingChecks();
            if (dropped > 0) {
                this.discardedChecks += dropped;
                console.log(item + " | " + dropped + " failed check(s) of the first attempt dropped, the item is checked again");
            }
            this.itemCounts.clear();
            this.retrying = true;
            return true;
        }

        // failed on the retry as well: record it and move on (the checks of this attempt are kept as evidence)
        commitPendingChecks();
        this.itemCounts.clear();
        this.retrying = false;
        this.failedItems++;
        this.fail("Failed at " + item + " (also failed on retry) | " + this.describe(error));
        this.countFailure(item, this.isEnvironmentFailure(error));
        return false;
    }

    private countFailure(item: string, environment: boolean): void {
        if (environment) {
            this.environmentFailures++;
        } else {
            this.otherFailures++;
        }

        if (this.environmentFailures >= MAX_ENVIRONMENT_FAILURES || this.otherFailures >= MAX_OTHER_FAILURES) {
            this.fail("Aborted at " + item + " | failures in a row: environment=" + this.environmentFailures
                + ", element/code=" + this.otherFailures + ", remaining items not checked");
            this.stop = true;
        }
    }

    /** Counts something worth showing in the summary, for example "detection skipped". */
    public count(label: string): void {
        this.itemCounts.set(label, (this.itemCounts.get(label) || 0) + 1);
    }

    /** One line at the end of the test: how many items passed out of how many, what was retried, skipped or adjusted. */
    public logSummary(totalItems: number): void {
        stopCollecting();       // reports anything still waiting
        // "completed" = the item ran to its end without an error, whether its checks passed is the "checks failed" part
        const parts = ["completed " + this.passedItems + " of " + totalItems];
        const failedChecks = test.info().errors.length;
        if (failedChecks > 0) {
            parts.push("checks failed: " + failedChecks);
        }
        if (this.passedOnRetry > 0) {
            parts.push(this.passedOnRetry + " passed on the retry");
        }
        if (this.discardedChecks > 0) {
            parts.push("failed checks of first attempts dropped: " + this.discardedChecks);
        }
        if (this.failedItems > 0) {
            parts.push(this.failedItems + " items failed");
        }
        if (this.stop) {
            parts.push("stopped early");
        }
        this.counts.forEach((amount, label) => parts.push(label + ": " + amount));

        const summary = parts.join(" | ");
        console.log("Summary | " + summary);
        test.info().annotations.push({ type: "summary", description: summary });
    }

    /** Soft failure: it is reported at the end of the test and the loop keeps going. */
    private fail(message: string): void {
        failureExpect.soft(true).failedItem(message);
    }

    private isEnvironmentFailure(error: unknown): boolean {
        const message = error instanceof Error ? error.message : String(error);
        return ENVIRONMENT_MESSAGES.some(environmentMessage => message.includes(environmentMessage));
    }

    /** Error type plus the first line of its message (Playwright adds a long call log after it). */
    private describe(error: unknown): string {
        const name = error instanceof Error ? error.name : "Error";
        const message = error instanceof Error ? error.message : String(error);
        let firstLine = message.split(/\r?\n/, 1)[0];
        if (firstLine.length > 300) {
            firstLine = firstLine.substring(0, 300) + "...";
        }
        return (name === "Error" ? "" : name + ": ") + firstLine;
    }
}
