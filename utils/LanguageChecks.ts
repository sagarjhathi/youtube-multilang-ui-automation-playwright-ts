import { softCheck } from "./SoftChecks";
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

/** YouTube shows "YouTube Music", "YouTube TV" and "YouTube Labs" in the side menu in some runs and not in others, so they are removed before comparing. */
export function removeOptionalEntries(text: string) {
    return normalizeText(text).replace(/\s*YouTube\s+(Music|TV|Labs)\b/g, "").replace(/\s+/g, " ").trim();
}

/** One allowed version of the side menu text, with a short description of the options it was built from (for the log). */
export type Version = { text: string; description: string };

/**
 * Every text the side menu is allowed to show.
 * The base text has {placeholders} where YouTube changes the menu (for example {slot} and {premium}), and "alternatives"
 * lists the allowed texts of each placeholder ("" means that the entry is missing).
 * Each placeholder is filled with each of its options in turn: 3 options for {slot} and 2 for {premium} give 6 texts.
 * Every text is cleaned the same way as the text from the page, so the two can be compared with ===.
 */
export function acceptedTexts(base: string, alternatives: { [placeholder: string]: string[] }) {
    let versions: Version[] = [{ text: base, description: "" }];

    for (const placeholder of Object.keys(alternatives)) {
        const filled: Version[] = [];
        for (const version of versions) {
            for (const option of alternatives[placeholder]) {
                filled.push({
                    text: version.text.replace("{" + placeholder + "}", option),
                    description: version.description + placeholder + "=" + (option === "" ? "(none)" : option) + " ",
                });
            }
        }
        versions = filled;
    }

    return versions.map(version => ({ text: removeOptionalEntries(version.text), description: version.description.trim() }));
}

/** The attribute file is read by row number, so its row must be for the same language as the language file. */
export function checkAttributeRowIsForLanguage(langText: string, attributeRowLanguage: string, row: number) {
    softCheck(attributeRowLanguage, "Sheet rows out of sync | attribute row " + row + " is not \"" + langText + "\"", langText);
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
    softCheck(detectedLanguage.toLowerCase(), 'Language of the ' + source + ' text is wrong after switching to "' + langText + '"', expectedLanguage.toLowerCase());
    return true;
}

/** One log line for a text comparison, so the report shows what was compared and whether it matched. */
export function logComparison(what: string, langText: string, actual: string, expected: string, extra: string = "") {
    console.log(what + " | " + langText + " | " + (actual === expected ? "match" : "MISMATCH") + " | " + actual.length + " chars" + extra);
}

/** Checks the lang attribute of the <html> tag. */
export function checkLanguageAttribute(langText: string, detectedAttribute: string | null, expectedAttribute: string) {
    console.log(langText + "  detected lang attribute: " + detectedAttribute + "  expected lang attribute: " + expectedAttribute);

    softCheck((detectedAttribute || "").toLowerCase(), '<html lang> attribute is wrong after switching to "' + langText + '"', expectedAttribute.toLowerCase());
}
