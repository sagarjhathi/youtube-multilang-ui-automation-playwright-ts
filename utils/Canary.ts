/**
 * Canary mode (CANARY=true): on purpose, one value in every test is made wrong, so every test has to FAIL.
 * A test that still passes in canary mode is not really checking what it says.
 * Normal runs are not affected: without CANARY=true every value comes back unchanged.
 */
const CANARY_ON = process.env.CANARY === "true";

export function isCanary(): boolean {
    return CANARY_ON;
}

/** In canary mode the value is spoiled on the given row (and logged), otherwise it is returned as it is. */
export function canary(value: string, row: number, spoiledRow: number, spoiledValue: string = value + " CANARY"): string {
    if (CANARY_ON && row === spoiledRow) {
        console.log("CANARY | row " + row + " | '" + value + "' spoiled on purpose to '" + spoiledValue + "', this check has to fail");
        return spoiledValue;
    }
    return value;
}
