import { test, expect } from "@playwright/test";
import GenericUtility from "../utils/GenericUtility";
import YtLandingPage from "../pages/YtLandingPage";
import { readJson } from "../utils/ReadJSON";
import { checkDetectedLanguage, checkLanguageAttribute, removeOptionalEntries } from "../utils/LanguageChecks";
import { detectLanguage } from "../eld-language-detection/languageDetector.mjs";

// If a test fails, run it once more in a fresh browser (like the TestNG retry in the Java project).
test.describe.configure({ retries: 1 });


// ------------------------------------------------------------ test data

const sideMenuRows = readJson("verifyingSideMenuLanguageAsInSettings.json");
const collapsedMenuRows = readJson("verifyingSideMenuCollapsedLangAsInSettings.json");
const languageRows = readJson("ApplicableLanguageExpectedLanguage.json");
const attributeRows = readJson("ApplicableLanguageExpectedAttibute.json");
const globalFilterRows = readJson("verifyingGlobalFilterLandingPage.json");
const countryRows = readJson("Country_Name_Code.json");


// ------------------------------------------------------------ expanded side menu

test("verifyingSideMenuLanguageAsInSettings", async ({ page }, testInfo) => {
    const landingPage = new YtLandingPage(page, testInfo);
    const genericUtility = new GenericUtility(page);

    await landingPage.openingLandingPage();
    await landingPage.openLanguageList();

    const languageCount = genericUtility.resolveLanguageIterationCount(sideMenuRows.length);

    // about a minute per language, the default test timeout is too short for a loop
    test.setTimeout(languageCount * 60000 + 60000);

    for (let i = 0; i < languageCount; i++) {
        const langText = sideMenuRows[i]["Applied Language"];
        console.log(langText + "  row " + i);

        await genericUtility.capture(testInfo);
        await landingPage.pickLanguage(langText);
        await landingPage.expandSideMenuIfCollapsed();

        const actualText = await landingPage.readExpandedSideMenu();
        const expectedText = sideMenuRows[i]["Expected Data"];

        // soft assertion: a mismatch is reported at the end, the loop keeps going
        expect.soft(removeOptionalEntries(actualText), "Mismatch in the Actual and Expected data for language=" + langText)
            .toBe(removeOptionalEntries(expectedText));

        await landingPage.openLanguageList();
    }
});


test("verifyingSideMenuLanguageAsInSettingsLingua", async ({ page }, testInfo) => {
    const landingPage = new YtLandingPage(page, testInfo);
    const genericUtility = new GenericUtility(page);

    await landingPage.openingLandingPage();
    await landingPage.openLanguageList();

    const languageCount = genericUtility.resolveLanguageIterationCount(languageRows.length);

    for (let i = 0; i < languageCount; i++) {
        const langText = languageRows[i]["Applicable Language"];
        console.log(langText + "  row " + i);

        await landingPage.pickLanguage(langText);
        await landingPage.expandSideMenuIfCollapsed();

        const sideMenuText = await landingPage.readExpandedSideMenu();

        checkDetectedLanguage(langText, detectLanguage(sideMenuText), languageRows[i]["Expected Language"]);
        checkLanguageAttribute(langText, await genericUtility.getLangAttribute(), attributeRows[i]["Expected Attribute"]);

        await landingPage.openLanguageList();
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

    for (let i = 0; i < languageCount; i++) {
        const langText = collapsedMenuRows[i]["Applied Language"];
        console.log(langText + "  row " + i);

        await landingPage.pickLanguage(langText);

        const actualText = await landingPage.readCollapsedSideMenu();
        const expectedText = collapsedMenuRows[i]["Expected Data"];

        expect.soft(actualText.trim().toLowerCase(), "Mismatch in the Actual and Expected data for language=" + langText)
            .toBe(expectedText.trim().toLowerCase());

        await landingPage.openLanguageList();
    }
});


test("verifyingSideMenuCollapsedLangAsInSettingsLingua", async ({ page }, testInfo) => {
    const landingPage = new YtLandingPage(page, testInfo);
    const genericUtility = new GenericUtility(page);

    await landingPage.openingLandingPage();
    await landingPage.clickLeftMenuButton();
    await landingPage.openLanguageList();

    const languageCount = genericUtility.resolveLanguageIterationCount(languageRows.length);

    for (let i = 0; i < languageCount; i++) {
        const langText = languageRows[i]["Applicable Language"];
        console.log(langText + "  row " + i);

        await landingPage.pickLanguage(langText);

        const sideMenuText = await landingPage.readCollapsedSideMenu();

        checkDetectedLanguage(langText, detectLanguage(sideMenuText), languageRows[i]["Expected Language"]);
        checkLanguageAttribute(langText, await genericUtility.getLangAttribute(), attributeRows[i]["Expected Attribute"]);

        await landingPage.openLanguageList();
    }
});


// ------------------------------------------------------------ settings menu options (starts at row 1, like the Java test)

test("verifyingSettingOptionsLang", async ({ page }, testInfo) => {
    const landingPage = new YtLandingPage(page, testInfo);
    const genericUtility = new GenericUtility(page);

    await landingPage.openingLandingPage();
    await landingPage.openLanguageList();

    const languageCount = genericUtility.resolveLanguageIterationCount(languageRows.length);

    for (let i = 1; i < languageCount; i++) {
        const langText = languageRows[i]["Applicable Language"];
        console.log(langText + "  row " + i);

        await landingPage.pickLanguage(langText);

        const settingsText = await landingPage.readSettingsMenuText();

        checkDetectedLanguage(langText, detectLanguage(settingsText), languageRows[i]["Expected Language"]);
        checkLanguageAttribute(langText, await genericUtility.getLangAttribute(), attributeRows[i]["Expected Attribute"]);

        await landingPage.openLanguageList();
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

    for (let i = 1; i < locationCount; i++) {
        const locationText = await landingPage.pickLocation(i);

        const detectedCode = await landingPage.getCountryCode();
        const expectedCode = countryRows[i]["Country Code"];
        console.log(locationText + "  row " + i + "  detected code: " + detectedCode + "  expected code: " + expectedCode);

        expect.soft(detectedCode.trim().toLowerCase(), "Mismatch in the Actual and Expected data for location=" + locationText)
            .toBe(expectedCode.trim().toLowerCase());

        await landingPage.openLocationList();
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

    for (let i = 1; i < languageCount; i++) {
        const langText = globalFilterRows[i]["Applied Language"];
        console.log(langText + "  row " + i);

        await landingPage.openLanguageList();
        await landingPage.pickLanguage(langText);

        await landingPage.openGlobalFilterPopup();
        await genericUtility.capture(testInfo);
        const filterText = await landingPage.getDataFromGlobalFilterPopup();
        await landingPage.dismissGlobalFilterPopup();

        expect.soft(filterText.trim().toLowerCase(), "Mismatch in the Actual and Expected data for language=" + langText)
            .toBe(globalFilterRows[i]["Expected Data"].trim().toLowerCase());
    }
});


test("verifyingGlobalFilterLandingPageLingua", async ({ page }, testInfo) => {
    const landingPage = new YtLandingPage(page, testInfo);
    const genericUtility = new GenericUtility(page);

    await landingPage.openingLandingPage();
    await landingPage.givingInputUnderSearchBar("youtube");
    await genericUtility.clickEnter(landingPage.searchInputLandinfPage);

    const languageCount = genericUtility.resolveLanguageIterationCount(languageRows.length);

    for (let i = 1; i < languageCount; i++) {
        const langText = languageRows[i]["Applicable Language"];
        console.log(langText + "  row " + i);

        await landingPage.openLanguageList();
        await landingPage.pickLanguage(langText);

        await landingPage.openGlobalFilterPopup();
        await genericUtility.capture(testInfo);
        const filterText = await landingPage.getDataFromGlobalFilterPopup();
        await landingPage.dismissGlobalFilterPopup();

        checkDetectedLanguage(langText, detectLanguage(filterText), languageRows[i]["Expected Language"]);
        checkLanguageAttribute(langText, await genericUtility.getLangAttribute(), attributeRows[i]["Expected Attribute"]);
    }
});
