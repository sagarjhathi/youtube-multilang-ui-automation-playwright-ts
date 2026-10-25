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

/** The text in a form that can be compared: normalized and trimmed. Case is kept, so "Home" and "HOME" are different (same as the Java project). */
export function normalizeForCompare(text: string | null | undefined) {
    return normalizeText(text).trim();
}

/** YouTube shows "YouTube Music" and "YouTube TV" in the side menu in some runs and not in others, so both are removed before comparing. */
export function removeOptionalEntries(text: string) {
    return normalizeText(text).replace(/\s*YouTube\s+(Music|TV)\b/g, "").replace(/\s+/g, " ").trim();
}

/** The word as a whole word (not part of a longer word), case insensitive. */
function wholeWord(word: string) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp("(?<![\\p{L}\\p{M}\\p{N}])" + escaped + "(?![\\p{L}\\p{M}\\p{N}])", "iu");
}

/**
 * Makes the expected side menu text match what the page shows in the Hype / Live slot, so the rest is compared as it is.
 * YouTube shows the Hype entry, the Live entry, or none in that slot, and the expected data may hold either one (it holds
 * the Hype word today, and could hold the Live word after a refresh). The words of each language come from
 * data/HypeLiveWords.json. Per language, "expected word" is the one of the two found in the expected text and "page word"
 * is the one found in the page text:
 * - the texts are equal: nothing is changed
 * - the page word is the other word: the expected word is replaced by the page word, so the entry must also be in the
 *   same place
 * - the page shows neither word: the expected word is removed from the expected text (the page left the entry out)
 * Anything else (both words on one side, a different entry in the slot, a language that is not in the file) is compared
 * as it is and fails with the full texts.
 */
export function alignHypeOrLive(hypeLiveRows: { [column: string]: string }[], langText: string, sideMenuText: string, expectedText: string) {
    const actual = removeOptionalEntries(sideMenuText);
    let expected = removeOptionalEntries(expectedText);
    let slot = "texts equal";      // what happened to the Hype / Live slot, shown in the log

    const row = hypeLiveRows.find(candidate => candidate["Applied Language"] === langText);
    if (!row) {
        console.log("No Hype/Live words for " + langText + ", the side menu is compared as it is");
        return { expected, actual, slot: "language not in the word list" };
    }
    if (actual === expected) {
        return { expected, actual, slot };
    }
    slot = "not adjusted";

    const words = [normalizeText(row["Hype"]).trim(), normalizeText(row["Live"]).trim()].filter(word => word !== "");
    const wordsInExpected = words.filter(word => wholeWord(word).test(expected));
    const wordsInPage = words.filter(word => wholeWord(word).test(actual));
    if (wordsInExpected.length !== 1 || wordsInPage.length > 1) {
        return { expected, actual, slot };
    }

    const expectedWord = wordsInExpected[0];
    if (wordsInPage.length === 0) {
        console.log("The page shows neither Hype nor Live, '" + expectedWord + "' removed from the expected text");
        expected = expected.replace(wholeWord(expectedWord), " ").replace(/\s+/g, " ").trim();
        slot = "entry missing";
    } else if (wordsInPage[0] !== expectedWord) {
        console.log("The page shows '" + wordsInPage[0] + "', expected '" + expectedWord + "' replaced by it");
        expected = expected.replace(wholeWord(expectedWord), () => wordsInPage[0]);
        slot = (wordsInPage[0] === normalizeText(row["Live"]).trim() ? "Live" : "Hype") + " '" + wordsInPage[0] + "'";
    }
    return { expected, actual, slot };
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
export function checkDetectedLanguage(langText: string, textFromPage: string, expectedLanguage: string, source: string): boolean {
    const detectedLanguage = detectLanguage(removeEnglishWordsForNonEnglish(textFromPage, langText));
    console.log(langText + "  detected language: " + detectedLanguage + "  expected language: " + expectedLanguage);

    if (LANGUAGES_NOT_SUPPORTED_BY_ELD.includes(langText)) {
        console.log("Skipping the detected language check for " + langText + " (eld cannot detect it)");
        return false;
    }
    expect.soft(detectedLanguage.toLowerCase(), 'Language of the ' + source + ' text is wrong after switching to "' + langText + '"')
        .toBe(expectedLanguage.toLowerCase());
    return true;
}

/** One log line for a text comparison, so the report shows what was compared and whether it matched. */
export function logComparison(what: string, langText: string, actual: string, expected: string, extra: string = "") {
    console.log(what + " | " + langText + " | " + (actual === expected ? "match" : "MISMATCH") + " | " + actual.length + " chars" + extra);
}

/** Checks the lang attribute of the <html> tag. */
export function checkLanguageAttribute(langText: string, detectedAttribute: string | null, expectedAttribute: string) {
    console.log(langText + "  detected lang attribute: " + detectedAttribute + "  expected lang attribute: " + expectedAttribute);

    expect.soft((detectedAttribute || "").toLowerCase(), '<html lang> attribute is wrong after switching to "' + langText + '"')
        .toBe(expectedAttribute.toLowerCase());
}
