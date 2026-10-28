import { expect } from "@playwright/test";

/**
 * Soft checks that wait until the language / location they belong to is finished (see LoopGuard).
 * If that item throws and is run again, the checks of the failed attempt are dropped and the retry decides.
 * Only the failed checks are kept, a passing check needs no record.
 * Without an active LoopGuard it behaves like a plain expect.soft(actual, message).toBe(expected).
 */
type FailedCheck = { actual: unknown; expected: unknown; message: string };

let collecting = false;
let pending: FailedCheck[] = [];

export function softCheck<T>(actual: T, message: string, expected: T): void {
    if (!collecting) {
        expect.soft(actual, message).toBe(expected);
        return;
    }
    if (!Object.is(actual, expected)) {
        pending.push({ actual, expected, message });
    }
}

/** LoopGuard starts collecting when it is created. */
export function startCollecting(): void {
    collecting = true;
    pending = [];
}

/** Reports the failed checks collected so far as real soft failures. Returns how many there were. */
export function commitPendingChecks(): number {
    const failed = pending;
    pending = [];
    failed.forEach(check => expect.soft(check.actual, check.message).toBe(check.expected));
    return failed.length;
}

/** Drops the failed checks collected so far (the attempt is run again). Returns how many there were. */
export function discardPendingChecks(): number {
    const dropped = pending.length;
    pending = [];
    return dropped;
}

/** Reports what is left and goes back to plain soft checks. */
export function stopCollecting(): void {
    commitPendingChecks();
    collecting = false;
}
