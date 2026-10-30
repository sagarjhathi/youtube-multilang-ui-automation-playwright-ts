import { test, Page, TestInfo } from "@playwright/test";
import GenericUtility from "../utils/GenericUtility";
import YtLandingPage from "../pages/YtLandingPage";
import { readJson } from "../utils/ReadJSON";
import { LoopGuard } from "../utils/LoopGuard";
import { canary } from "../utils/Canary";
import { softCheck } from "../utils/SoftChecks";
import {
    checkAttributeRowIsForLanguage, checkDetectedLanguage, checkLanguageAttribute, normalizeForCompare,
    acceptedTexts, removeOptionalEntries, logComparison,
} from "../utils/LanguageChecks";

// Retries: a failing language / location is retried on its own inside the loop (see LoopGuard), and a test that still
// fails is run once more in a fresh browser. The second one is set in playwright.config.ts (off in a canary run).


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
    // Old code: await landingPage.clickLeftMenuButton(); (blind toggle, no check that the menu collapsed)
    await landingPage.collapseSideMenuIfExpanded();
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

    const guard = new LoopGuard();
    for (let i = 0; i < languageCount && !guard.shouldStop(); i++) {
        const langText = sideMenuRows[i]["Applied Language"];
        try {
            console.log(langText + "  row " + i);

            await genericUtility.capture(testInfo);
            await landingPage.pickLanguage(langText);
            await landingPage.expandSideMenuIfCollapsed();

            // YouTube changes this menu in known ways (the "Alternatives" of the data file): the page text has to equal one of the allowed versions
            const row = sideMenuRows[i];
            const versions = acceptedTexts(canary(row["Expected Data"], i, 0), row["Alternatives"] ?? {});
            const actual = removeOptionalEntries(await landingPage.readExpandedSideMenu());
            const matched = versions.find(version => version.text === actual);
            const expected = matched ? actual : versions[0].text;      // nothing matches: the failure shows the difference to the usual version
            logComparison("Side menu", langText, actual, expected, " | version: " + (matched ? matched.description : "none of the " + versions.length + " matches"));
            if (!matched) {
                guard.count("unknown version");
            } else if (matched === versions[0]) {
                guard.count("usual version");
            } else {
                guard.count("other version");
            }

            // soft assertion: a mismatch is reported at the end, the loop keeps going
            softCheck(actual, 'Side menu text is wrong after switching to "' + langText + '"', expected);

            await landingPage.openLanguageList();
            guard.passed(langText);
        } catch (e) {
            if (await guard.retryAfterFailure(langText, e, () => reopenLanguageList(landingPage))) {
                i--;    // run the same language again
            }
        }
    }

    guard.logSummary(languageCount);
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

            checkAttributeRowIsForLanguage(langText, canary(attributeRows[i]["Applicable Language"], i, 3), i);
            if (!checkDetectedLanguage(langText, sideMenuText, canary(languageRows[i]["Expected Language"], i, 1), "side menu")) {
                guard.count("detection skipped");
            }
            checkLanguageAttribute(langText, await genericUtility.getLangAttribute(), canary(attributeRows[i]["Expected Attribute"], i, 2));

            await landingPage.openLanguageList();
            guard.passed(langText);
        } catch (e) {
            if (await guard.retryAfterFailure(langText, e, () => reopenLanguageList(landingPage))) {
                i--;
            }
        }
    }

    guard.logSummary(languageCount);
});


// ------------------------------------------------------------ collapsed side menu

test("verifyingSideMenuCollapsedLangAsInSettings", async ({ page }, testInfo) => {
    const landingPage = new YtLandingPage(page, testInfo);
    const genericUtility = new GenericUtility(page);

    await landingPage.openingLandingPage();
    // Old code: await landingPage.clickLeftMenuButton(); (blind toggle, no check that the menu collapsed)
    await landingPage.collapseSideMenuIfExpanded();
    await landingPage.openLanguageList();

    const languageCount = genericUtility.resolveLanguageIterationCount(collapsedMenuRows.length);

    const guard = new LoopGuard();
    for (let i = 0; i < languageCount && !guard.shouldStop(); i++) {
        const langText = collapsedMenuRows[i]["Applied Language"];
        try {
            console.log(langText + "  row " + i);

            await landingPage.pickLanguage(langText);

            const actualText = await landingPage.readCollapsedSideMenu();
            const expectedText = canary(collapsedMenuRows[i]["Expected Data"], i, 0);

            logComparison("Collapsed side menu", langText, normalizeForCompare(actualText), normalizeForCompare(expectedText));
            softCheck(normalizeForCompare(actualText), 'Collapsed side menu text is wrong after switching to "' + langText + '"', normalizeForCompare(expectedText));

            await landingPage.openLanguageList();
            guard.passed(langText);
        } catch (e) {
            if (await guard.retryAfterFailure(langText, e, () => reopenCollapsedLanguageList(landingPage))) {
                i--;
            }
        }
    }

    guard.logSummary(languageCount);
});


test("verifyingSideMenuCollapsedLangAsInSettingsLingua", async ({ page }, testInfo) => {
    const landingPage = new YtLandingPage(page, testInfo);
    const genericUtility = new GenericUtility(page);

    await landingPage.openingLandingPage();
    // Old code: await landingPage.clickLeftMenuButton(); (blind toggle, no check that the menu collapsed)
    await landingPage.collapseSideMenuIfExpanded();
    await landingPage.openLanguageList();

    const languageCount = genericUtility.resolveLanguageIterationCount(languageRows.length);

    const guard = new LoopGuard();
    for (let i = 0; i < languageCount && !guard.shouldStop(); i++) {
        const langText = languageRows[i]["Applicable Language"];
        try {
            console.log(langText + "  row " + i);

            await landingPage.pickLanguage(langText);

            const sideMenuText = await landingPage.readCollapsedSideMenu();

            checkAttributeRowIsForLanguage(langText, canary(attributeRows[i]["Applicable Language"], i, 3), i);
            if (!checkDetectedLanguage(langText, sideMenuText, canary(languageRows[i]["Expected Language"], i, 1), "collapsed side menu")) {
                guard.count("detection skipped");
            }
            checkLanguageAttribute(langText, await genericUtility.getLangAttribute(), canary(attributeRows[i]["Expected Attribute"], i, 2));

            await landingPage.openLanguageList();
            guard.passed(langText);
        } catch (e) {
            if (await guard.retryAfterFailure(langText, e, () => reopenCollapsedLanguageList(landingPage))) {
                i--;
            }
        }
    }

    guard.logSummary(languageCount);
});


// ------------------------------------------------------------ settings menu options

test("verifyingSettingOptionsLang", async ({ page }, testInfo) => {
    const landingPage = new YtLandingPage(page, testInfo);
    const genericUtility = new GenericUtility(page);

    await landingPage.openingLandingPage();
    await landingPage.openLanguageList();

    const languageCount = genericUtility.resolveLanguageIterationCount(languageRows.length);

    const guard = new LoopGuard();
    for (let i = 0; i < languageCount && !guard.shouldStop(); i++) {
        const langText = canary(languageRows[i]["Applicable Language"], i, 4, "Canary Language");
        try {
            console.log(langText + "  row " + i);

            await landingPage.pickLanguage(langText);

            const settingsText = await landingPage.readSettingsMenuText();

            checkAttributeRowIsForLanguage(langText, canary(attributeRows[i]["Applicable Language"], i, 3), i);
            if (!checkDetectedLanguage(langText, settingsText, canary(languageRows[i]["Expected Language"], i, 1), "settings menu")) {
                guard.count("detection skipped");
            }
            checkLanguageAttribute(langText, await genericUtility.getLangAttribute(), canary(attributeRows[i]["Expected Attribute"], i, 2));

            await landingPage.openLanguageList();
            guard.passed(langText);
        } catch (e) {
            if (await guard.retryAfterFailure(langText, e, () => reopenLanguageList(landingPage))) {
                i--;
            }
        }
    }

    guard.logSummary(languageCount);
});


// ------------------------------------------------------------ country code next to the logo
// 111 locations in one test took about 12 minutes, so the list is split in two tests that run side by side.
// The index i is the position in the location list and the row in Country_Name_Code.json, so the two tests
// only differ in where the loop starts and ends.

async function checkCountryCodes(page: Page, testInfo: TestInfo, half: "first" | "second") {
    const landingPage = new YtLandingPage(page, testInfo);
    const genericUtility = new GenericUtility(page);

    await landingPage.openingLandingPage();
    await landingPage.openLocationList();

    const allLocations = await landingPage.getLocationList();
    const locationCount = genericUtility.resolveCountryIterationCount(allLocations.length);

    const middle = Math.ceil(locationCount / 2);
    const [start, end] = half === "first" ? [0, middle] : [middle, locationCount];
    console.log("Country codes, " + half + " half: locations " + start + " to " + (end - 1) + " of " + locationCount);

    const guard = new LoopGuard();
    for (let i = start; i < end && !guard.shouldStop(); i++) {
        let locationText = "location #" + i;     // replaced by the real name once the location is picked
        try {
            locationText = await landingPage.pickLocation(i);

            const detectedCode = await landingPage.getCountryCode();
            const position = i - start;          // 0 for the first location of this test: the canary spoils the first two of each half
            let expectedCode = canary(countryRows[i]["Country Code"], position, 0);
            expectedCode = canary(expectedCode, position, 1, "");
            console.log(locationText + "  row " + i + "  detected code: " + detectedCode + "  expected code: " + expectedCode);

            // only the United States has no code next to the logo, an empty expected code anywhere else is a data mistake
            if (expectedCode.trim() === "") {
                softCheck(countryRows[i]["Country Name"], 'Expected country code is empty for "' + locationText + '", only "United States" has none', "United States");
                guard.count("no code expected");
            }

            softCheck(detectedCode.trim(), 'Country code is wrong after choosing location "' + locationText + '"', expectedCode.trim());

            await landingPage.openLocationList();
            guard.passed(locationText);
        } catch (e) {
            if (await guard.retryAfterFailure(locationText, e, () => reopenLocationList(landingPage))) {
                i--;
            }
        }
    }

    guard.logSummary(end - start);
}

test("verifyCountryCodeAsBasedOnRegion_FirstHalfOfLocations", async ({ page }, testInfo) => {
    await checkCountryCodes(page, testInfo, "first");
});

test("verifyCountryCodeAsBasedOnRegion_SecondHalfOfLocations", async ({ page }, testInfo) => {
    await checkCountryCodes(page, testInfo, "second");
});


// ------------------------------------------------------------ global filter popup on the search results

test("verifyingGlobalFilterLandingPage", async ({ page }, testInfo) => {
    const landingPage = new YtLandingPage(page, testInfo);
    const genericUtility = new GenericUtility(page);

    await landingPage.openingLandingPage();
    await landingPage.givingInputUnderSearchBar("youtube");
    await genericUtility.clickEnter(landingPage.searchInputLandinfPage);

    const languageCount = genericUtility.resolveLanguageIterationCount(globalFilterRows.length);

    const guard = new LoopGuard();
    for (let i = 0; i < languageCount && !guard.shouldStop(); i++) {
        const langText = globalFilterRows[i]["Applied Language"];
        try {
            console.log(langText + "  row " + i);

            await landingPage.openLanguageList();
            await landingPage.pickLanguage(langText);

            await landingPage.openGlobalFilterPopup();
            await genericUtility.capture(testInfo);
            const filterText = await landingPage.getDataFromGlobalFilterPopup();
            await landingPage.dismissGlobalFilterPopup();

            const expectedFilterText = canary(globalFilterRows[i]["Expected Data"], i, 0);
            logComparison("Search filter", langText, normalizeForCompare(filterText), normalizeForCompare(expectedFilterText));
            softCheck(normalizeForCompare(filterText), 'Search filter text is wrong after switching to "' + langText + '"', normalizeForCompare(expectedFilterText));

            guard.passed(langText);
        } catch (e) {
            if (await guard.retryAfterFailure(langText, e, () => reopenSearchResults(landingPage, genericUtility))) {
                i--;
            }
        }
    }

    guard.logSummary(languageCount);
});


test("verifyingGlobalFilterLandingPageLingua", async ({ page }, testInfo) => {
    const landingPage = new YtLandingPage(page, testInfo);
    const genericUtility = new GenericUtility(page);

    await landingPage.openingLandingPage();
    await landingPage.givingInputUnderSearchBar("youtube");
    await genericUtility.clickEnter(landingPage.searchInputLandinfPage);

    const languageCount = genericUtility.resolveLanguageIterationCount(languageRows.length);

    const guard = new LoopGuard();
    for (let i = 0; i < languageCount && !guard.shouldStop(); i++) {
        const langText = languageRows[i]["Applicable Language"];
        try {
            console.log(langText + "  row " + i);

            await landingPage.openLanguageList();
            await landingPage.pickLanguage(langText);

            await landingPage.openGlobalFilterPopup();
            await genericUtility.capture(testInfo);
            const filterText = await landingPage.getDataFromGlobalFilterPopup();
            await landingPage.dismissGlobalFilterPopup();

            checkAttributeRowIsForLanguage(langText, canary(attributeRows[i]["Applicable Language"], i, 3), i);
            if (!checkDetectedLanguage(langText, filterText, canary(languageRows[i]["Expected Language"], i, 1), "search filter")) {
                guard.count("detection skipped");
            }
            checkLanguageAttribute(langText, await genericUtility.getLangAttribute(), canary(attributeRows[i]["Expected Attribute"], i, 2));

            guard.passed(langText);
        } catch (e) {
            if (await guard.retryAfterFailure(langText, e, () => reopenSearchResults(landingPage, genericUtility))) {
                i--;
            }
        }
    }

    guard.logSummary(languageCount);
});
