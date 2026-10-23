import { expect } from "@playwright/test";

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

    public shouldStop(): boolean {
        return this.stop;
    }

    public passed(item: string): void {
        if (this.retrying) {
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

        // first failure: run the same item once more
        if (!this.retrying) {
            this.retrying = true;
            return true;
        }

        // failed on the retry as well: record it and move on
        this.retrying = false;
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
