import { expect } from "@playwright/test";
import { detectLanguage } from "../eld-language-detection/languageDetector.mjs";

/** Languages (as shown in YouTube's language list) that eld cannot detect. Only their html lang attribute is checked. */
export const LANGUAGES_NOT_SUPPORTED_BY_ELD = ["Afrikaans", "Bahasa Indonesia", "Bosanski", "Dansk"];

/** Words YouTube leaves in English in the menu of every language. They are removed before the language is detected. */
const UNTRANSLATED_ENGLISH_WORDS = ["YouTube", "Shorts", "Music", "Premium", "Kids", "Studio", "TV"];


/**
 * Makes the text from the page and the text from the data file comparable (same rules as the Java project):
 * - non-breaking and other horizontal spaces become a plain space (new lines are kept)
 * - invisible format characters are removed (for example the left-to-right mark)
 * - the Turkish and Azeri dotted capital I becomes a plain I, because the page shows it as I
 * - the accent (tonos) the page adds on capital Greek letters is removed, the data file has none
 */
export function normalizeText(text: string | null | undefined) {
    if (!text) {
        return "";
    }
    const cleaned = text
        .replace(/[\t  ᠎ -   　]/g, " ")
        .replace(/\p{Cf}/gu, "")
        .replace(/İ/g, "I");

    const withoutGreekAccents = cleaned.normalize("NFD").replace(/(?<=\p{Script=Greek})́/gu, "");
    return withoutGreekAccents.normalize("NFC");
}

/** The text in a form that can be compared: normalized, trimmed and in lower case. */
export function normalizeForCompare(text: string | null | undefined) {
    return normalizeText(text).trim().toLowerCase();
}

/** YouTube shows "YouTube Music" and "YouTube TV" in the side menu in some runs and not in others, so both are removed before comparing. */
export function removeOptionalEntries(text: string) {
    return normalizeText(text).replace(/\s*YouTube\s+(Music|TV)\b/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Removes the Hype/Live entry from both the side menu text and the expected text, so the rest can be compared as is.
 * YouTube shows either word in that slot, it changes between runs and differs per language, so it can't be removed
 * by keyword. It is also not found by position or by a neighbour, which can move. Instead the side menu items are
 * matched against the expected text from the start and from the end, item by item. If exactly one item is left in
 * the middle, that is the Hype/Live slot and it is ignored (and logged). Anything else is left alone, so the
 * comparison fails and shows the full texts.
 */
export function removeHypeOrLive(sideMenuItems: string[], expectedText: string) {
    const expected = removeOptionalEntries(expectedText);
    const items = sideMenuItems.map(item => removeOptionalEntries(item)).filter(item => item !== "");
    const actual = items.join(" ");
    if (actual === expected) {
        return { expected, actual };
    }

    let left = expected;
    let start = 0;
    while (start < items.length && (left === items[start] || left.startsWith(items[start] + " "))) {
        left = left.slice(items[start].length).trim();
        start++;
    }
    let end = items.length;
    while (end > start && (left === items[end - 1] || left.endsWith(" " + items[end - 1]))) {
        left = left.slice(0, left.length - items[end - 1].length).trim();
        end--;
    }

    if (end - start !== 1 || left === "") {
        return { expected, actual };
    }
    console.log("Ignored the Hype/Live entry | page: \"" + items[start] + "\" | expected: \"" + left + "\"");
    const withoutEntry = [...items.slice(0, start), ...items.slice(end)].join(" ");
    return { expected: withoutEntry, actual: withoutEntry };
}

/** The attribute file is read by row number, so its row must be for the same language as the language file. */
export function checkAttributeRowIsForLanguage(langText: string, attributeRowLanguage: string, row: number) {
    expect.soft(attributeRowLanguage, "Sheet rows out of sync | attribute row " + row + " is not \"" + langText + "\"")
        .toBe(langText);
}

/** Removes the words YouTube leaves untranslated, so they do not confuse the language detector. English pages keep them. */
export function removeEnglishWordsForNonEnglish(text: string, langText: string) {
    if (langText.trim().toLowerCase().startsWith("english")) {
        return text;
    }
    let result = text;
    for (const word of UNTRANSLATED_ENGLISH_WORDS) {
        result = result.replace(new RegExp("(?<![\\p{L}\\p{N}])" + word + "(?![\\p{L}\\p{N}])", "giu"), " ");
    }
    result = result.replace(/\s+/g, " ").trim();
    return result === "" ? text : result;       // never hand the detector an empty text
}


/** Finds the language of the text from the page ("source" names the part of the page, used in the error message) and checks it, unless eld cannot detect that language. */
export function checkDetectedLanguage(langText: string, textFromPage: string, expectedLanguage: string, source: string) {
    const detectedLanguage = detectLanguage(removeEnglishWordsForNonEnglish(textFromPage, langText));
    console.log(langText + "  detected language: " + detectedLanguage + "  expected language: " + expectedLanguage);

    if (LANGUAGES_NOT_SUPPORTED_BY_ELD.includes(langText)) {
        console.log("Skipping the detected language check for " + langText + " (eld cannot detect it)");
        return;
    }
    expect.soft(detectedLanguage.toLowerCase(), 'Language of the ' + source + ' text is wrong after switching to "' + langText + '"')
        .toBe(expectedLanguage.toLowerCase());
}

/** Checks the lang attribute of the <html> tag. */
export function checkLanguageAttribute(langText: string, detectedAttribute: string | null, expectedAttribute: string) {
    console.log(langText + "  detected lang attribute: " + detectedAttribute + "  expected lang attribute: " + expectedAttribute);

    expect.soft((detectedAttribute || "").toLowerCase(), '<html lang> attribute is wrong after switching to "' + langText + '"')
        .toBe(expectedAttribute.toLowerCase());
}
