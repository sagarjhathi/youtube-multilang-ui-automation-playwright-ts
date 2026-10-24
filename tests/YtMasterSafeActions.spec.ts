import { test, expect } from "@playwright/test";
import GenericUtility from "../utils/GenericUtility";
import YtLandingPage from "../pages/YtLandingPage";
import { readJson } from "../utils/ReadJSON";
import { LoopGuard } from "../utils/LoopGuard";
import { checkAttributeRowIsForLanguage, checkDetectedLanguage, checkLanguageAttribute, normalizeForCompare, removeHypeOrLive } from "../utils/LanguageChecks";

// If a test fails, run it once more in a fresh browser (like the TestNG retry in the Java project).
// On top of that, a failing language / location is retried on its own inside the loop (see LoopGuard).
test.describe.configure({ retries: 1 });


// ------------------------------------------------------------ test data

const sideMenuRows = readJson("verifyingSideMenuLanguageAsInSettings.json");
const collapsedMenuRows = readJson("verifyingSideMenuCollapsedLangAsInSettings.json");
const languageRows = readJson("ApplicableLanguageExpectedLanguage.json");
const attributeRows = readJson("ApplicableLanguageExpectedAttibute.json");
const globalFilterRows = readJson("verifyingGlobalFilterLandingPage.json");
const countryRows = readJson("Country_Name_Code.json");


// ------------------------------------------------------------ recovery after a failed language / location
// They bring the page back to the state the loop starts from.

async function reopenLanguageList(landingPage: YtLandingPage) {
    await landingPage.openingLandingPage();
    await landingPage.openLanguageList();
}

async function reopenCollapsedLanguageList(landingPage: YtLandingPage) {
    await landingPage.openingLandingPage();
    await landingPage.clickLeftMenuButton();
    await landingPage.openLanguageList();
}

async function reopenLocationList(landingPage: YtLandingPage) {
    await landingPage.openingLandingPage();
    await landingPage.openLocationList();
}

async function reopenSearchResults(landingPage: YtLandingPage, genericUtility: GenericUtility) {
    await landingPage.openingLandingPage();
    await landingPage.givingInputUnderSearchBar("youtube");
    await genericUtility.clickEnter(landingPage.searchInputLandinfPage);
}


// ------------------------------------------------------------ expanded side menu

test("verifyingSideMenuLanguageAsInSettings", async ({ page }, testInfo) => {
    const landingPage = new YtLandingPage(page, testInfo);
    const genericUtility = new GenericUtility(page);

    await landingPage.openingLandingPage();
    await landingPage.openLanguageList();

    const languageCount = genericUtility.resolveLanguageIterationCount(sideMenuRows.length);

    // about a minute per language, the default test timeout is too short for a loop
    test.setTimeout(languageCount * 60000 + 60000);

    const guard = new LoopGuard();
    for (let i = 0; i < languageCount && !guard.shouldStop(); i++) {
        let langText = sideMenuRows[i]["Applied Language"];

        if(i==5){
            langText+='h';
        }
        try {
            console.log(langText + "  row " + i);

            await genericUtility.capture(testInfo);
            await landingPage.pickLanguage(langText);
            await landingPage.expandSideMenuIfCollapsed();

            // the Hype / Live entry is removed from both sides, YouTube swaps the word between runs
            const { expected, actual } = removeHypeOrLive(await landingPage.readExpandedSideMenuItems(), sideMenuRows[i]["Expected Data"]);

            // soft assertion: a mismatch is reported at the end, the loop keeps going
            expect.soft(actual, 'Side menu text is wrong after switching to "' + langText + '"')
                .toBe(expected);

            await landingPage.openLanguageList();
            guard.passed(langText);
        } catch (e) {
            if (await guard.retryAfterFailure(langText, e, () => reopenLanguageList(landingPage))) {
                i--;    // run the same language again
            }
        }
    }
});


test("verifyingSideMenuLanguageAsInSettingsLingua", async ({ page }, testInfo) => {
    const landingPage = new YtLandingPage(page, testInfo);
    const genericUtility = new GenericUtility(page);

    await landingPage.openingLandingPage();
    await landingPage.openLanguageList();

    const languageCount = genericUtility.resolveLanguageIterationCount(languageRows.length);

    const guard = new LoopGuard();
    for (let i = 0; i < languageCount && !guard.shouldStop(); i++) {
        const langText = languageRows[i]["Applicable Language"];
        try {
            console.log(langText + "  row " + i);

            await landingPage.pickLanguage(langText);
            await landingPage.expandSideMenuIfCollapsed();

            const sideMenuText = await landingPage.readExpandedSideMenu();

            checkAttributeRowIsForLanguage(langText, attributeRows[i]["Applicable Language"], i);
            checkDetectedLanguage(langText, sideMenuText, languageRows[i]["Expected Language"], "side menu");
            checkLanguageAttribute(langText, await genericUtility.getLangAttribute(), attributeRows[i]["Expected Attribute"]);

            await landingPage.openLanguageList();
            guard.passed(langText);
        } catch (e) {
            if (await guard.retryAfterFailure(langText, e, () => reopenLanguageList(landingPage))) {
                i--;
            }
        }
    }
});


// ------------------------------------------------------------ collapsed side menu

test("verifyingSideMenuCollapsedLangAsInSettings", async ({ page }, testInfo) => {
    const landingPage = new YtLandingPage(page, testInfo);
    const genericUtility = new GenericUtility(page);

    await landingPage.openingLandingPage();
    await landingPage.clickLeftMenuButton();
    await landingPage.openLanguageList();

    const languageCount = genericUtility.resolveLanguageIterationCount(collapsedMenuRows.length);

    const guard = new LoopGuard();
    for (let i = 0; i < languageCount && !guard.shouldStop(); i++) {
        const langText = collapsedMenuRows[i]["Applied Language"];
        try {
            console.log(langText + "  row " + i);

            await landingPage.pickLanguage(langText);

            const actualText = await landingPage.readCollapsedSideMenu();
            const expectedText = collapsedMenuRows[i]["Expected Data"];

            expect.soft(normalizeForCompare(actualText), 'Collapsed side menu text is wrong after switching to "' + langText + '"')
                .toBe(normalizeForCompare(expectedText));

            await landingPage.openLanguageList();
            guard.passed(langText);
        } catch (e) {
            if (await guard.retryAfterFailure(langText, e, () => reopenCollapsedLanguageList(landingPage))) {
                i--;
            }
        }
    }
});


test("verifyingSideMenuCollapsedLangAsInSettingsLingua", async ({ page }, testInfo) => {
    const landingPage = new YtLandingPage(page, testInfo);
    const genericUtility = new GenericUtility(page);

    await landingPage.openingLandingPage();
    await landingPage.clickLeftMenuButton();
    await landingPage.openLanguageList();

    const languageCount = genericUtility.resolveLanguageIterationCount(languageRows.length);

    const guard = new LoopGuard();
    for (let i = 0; i < languageCount && !guard.shouldStop(); i++) {
        const langText = languageRows[i]["Applicable Language"];
        try {
            console.log(langText + "  row " + i);

            await landingPage.pickLanguage(langText);

            const sideMenuText = await landingPage.readCollapsedSideMenu();

            checkAttributeRowIsForLanguage(langText, attributeRows[i]["Applicable Language"], i);
            checkDetectedLanguage(langText, sideMenuText, languageRows[i]["Expected Language"], "collapsed side menu");
            checkLanguageAttribute(langText, await genericUtility.getLangAttribute(), attributeRows[i]["Expected Attribute"]);

            await landingPage.openLanguageList();
            guard.passed(langText);
        } catch (e) {
            if (await guard.retryAfterFailure(langText, e, () => reopenCollapsedLanguageList(landingPage))) {
                i--;
            }
        }
    }
});


// ------------------------------------------------------------ settings menu options (starts at row 1, like the Java test)

test("verifyingSettingOptionsLang", async ({ page }, testInfo) => {
    const landingPage = new YtLandingPage(page, testInfo);
    const genericUtility = new GenericUtility(page);

    await landingPage.openingLandingPage();
    await landingPage.openLanguageList();

    const languageCount = genericUtility.resolveLanguageIterationCount(languageRows.length);

    const guard = new LoopGuard();
    for (let i = 1; i < languageCount && !guard.shouldStop(); i++) {
        const langText = languageRows[i]["Applicable Language"];
        try {
            console.log(langText + "  row " + i);

            await landingPage.pickLanguage(langText);

            const settingsText = await landingPage.readSettingsMenuText();

            checkAttributeRowIsForLanguage(langText, attributeRows[i]["Applicable Language"], i);
            checkDetectedLanguage(langText, settingsText, languageRows[i]["Expected Language"], "settings menu");
            checkLanguageAttribute(langText, await genericUtility.getLangAttribute(), attributeRows[i]["Expected Attribute"]);

            await landingPage.openLanguageList();
            guard.passed(langText);
        } catch (e) {
            if (await guard.retryAfterFailure(langText, e, () => reopenLanguageList(landingPage))) {
                i--;
            }
        }
    }
});


// ------------------------------------------------------------ country code next to the logo (starts at row 1, like the Java test)

test("verifyCountryCodeAsBasedOnRegion", async ({ page }, testInfo) => {
    const landingPage = new YtLandingPage(page, testInfo);
    const genericUtility = new GenericUtility(page);

    await landingPage.openingLandingPage();
    await landingPage.openLocationList();

    const allLocations = await landingPage.getLocationList();
    const locationCount = genericUtility.resolveCountryIterationCount(allLocations.length);

    const guard = new LoopGuard();
    for (let i = 1; i < locationCount && !guard.shouldStop(); i++) {
        let locationText = "location #" + i;     // replaced by the real name once the location is picked
        try {
            locationText = await landingPage.pickLocation(i);

            const detectedCode = await landingPage.getCountryCode();
            const expectedCode = countryRows[i]["Country Code"];
            console.log(locationText + "  row " + i + "  detected code: " + detectedCode + "  expected code: " + expectedCode);

            expect.soft(detectedCode.trim().toLowerCase(), 'Country code is wrong after choosing location "' + locationText + '"')
                .toBe(expectedCode.trim().toLowerCase());

            await landingPage.openLocationList();
            guard.passed(locationText);
        } catch (e) {
            if (await guard.retryAfterFailure(locationText, e, () => reopenLocationList(landingPage))) {
                i--;
            }
        }
    }
});


// ------------------------------------------------------------ global filter popup on the search results (starts at row 1, like the Java test)

test("verifyingGlobalFilterLandingPage", async ({ page }, testInfo) => {
    const landingPage = new YtLandingPage(page, testInfo);
    const genericUtility = new GenericUtility(page);

    await landingPage.openingLandingPage();
    await landingPage.givingInputUnderSearchBar("youtube");
    await genericUtility.clickEnter(landingPage.searchInputLandinfPage);

    const languageCount = genericUtility.resolveLanguageIterationCount(globalFilterRows.length);

    const guard = new LoopGuard();
    for (let i = 1; i < languageCount && !guard.shouldStop(); i++) {
        const langText = globalFilterRows[i]["Applied Language"];
        try {
            console.log(langText + "  row " + i);

            await landingPage.openLanguageList();
            await landingPage.pickLanguage(langText);

            await landingPage.openGlobalFilterPopup();
            await genericUtility.capture(testInfo);
            const filterText = await landingPage.getDataFromGlobalFilterPopup();
            await landingPage.dismissGlobalFilterPopup();

            expect.soft(normalizeForCompare(filterText), 'Search filter text is wrong after switching to "' + langText + '"')
                .toBe(normalizeForCompare(globalFilterRows[i]["Expected Data"]));

            guard.passed(langText);
        } catch (e) {
            if (await guard.retryAfterFailure(langText, e, () => reopenSearchResults(landingPage, genericUtility))) {
                i--;
            }
        }
    }
});


test("verifyingGlobalFilterLandingPageLingua", async ({ page }, testInfo) => {
    const landingPage = new YtLandingPage(page, testInfo);
    const genericUtility = new GenericUtility(page);

    await landingPage.openingLandingPage();
    await landingPage.givingInputUnderSearchBar("youtube");
    await genericUtility.clickEnter(landingPage.searchInputLandinfPage);

    const languageCount = genericUtility.resolveLanguageIterationCount(languageRows.length);

    const guard = new LoopGuard();
    for (let i = 1; i < languageCount && !guard.shouldStop(); i++) {
        const langText = languageRows[i]["Applicable Language"];
        try {
            console.log(langText + "  row " + i);

            await landingPage.openLanguageList();
            await landingPage.pickLanguage(langText);

            await landingPage.openGlobalFilterPopup();
            await genericUtility.capture(testInfo);
            const filterText = await landingPage.getDataFromGlobalFilterPopup();
            await landingPage.dismissGlobalFilterPopup();

            checkAttributeRowIsForLanguage(langText, attributeRows[i]["Applicable Language"], i);
            checkDetectedLanguage(langText, filterText, languageRows[i]["Expected Language"], "search filter");
            checkLanguageAttribute(langText, await genericUtility.getLangAttribute(), attributeRows[i]["Expected Attribute"]);

            guard.passed(langText);
        } catch (e) {
            if (await guard.retryAfterFailure(langText, e, () => reopenSearchResults(landingPage, genericUtility))) {
                i--;
            }
        }
    }
});
