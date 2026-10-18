import { expect } from "@playwright/test";

/** Languages (as shown in YouTube's language list) that eld cannot detect. Only their html lang attribute is checked. */
export const LANGUAGES_NOT_SUPPORTED_BY_ELD = ["Afrikaans", "Bahasa Indonesia", "Bosanski", "Dansk"];

/** YouTube shows "YouTube Music" and "YouTube TV" in the side menu in some runs and not in others, so both are removed before comparing. */
export function removeOptionalEntries(text: string) {
    return text.replace(/\s*YouTube\s+(Music|TV)\b/g, "").trim();
}

/** Checks the language found by eld, unless eld cannot detect that language. */
export function checkDetectedLanguage(langText: string, detectedLanguage: string, expectedLanguage: string) {
    console.log(langText + "  detected language: " + detectedLanguage + "  expected language: " + expectedLanguage);

    if (LANGUAGES_NOT_SUPPORTED_BY_ELD.includes(langText)) {
        console.log("Skipping the detected language check for " + langText + " (eld cannot detect it)");
        return;
    }
    expect.soft(detectedLanguage.toLowerCase(), "Detected language mismatch for language=" + langText)
        .toBe(expectedLanguage.toLowerCase());
}

/** Checks the lang attribute of the <html> tag. */
export function checkLanguageAttribute(langText: string, detectedAttribute: string | null, expectedAttribute: string) {
    console.log(langText + "  detected lang attribute: " + detectedAttribute + "  expected lang attribute: " + expectedAttribute);

    expect.soft((detectedAttribute || "").toLowerCase(), "Language attribute mismatch for language=" + langText)
        .toBe(expectedAttribute.toLowerCase());
}
