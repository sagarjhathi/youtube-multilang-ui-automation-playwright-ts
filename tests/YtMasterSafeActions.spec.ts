import { test } from "@playwright/test";
import GenericUtility from "../utils/GenericUtility";
import YtLandingPage from "../pages/YtLandingPage";
import { readJson, readJsonByName } from "../utils/ReadJSON";
import { LoopGuard } from "../utils/LoopGuard";
import { canary } from "../utils/Canary";
import { softCheck } from "../utils/SoftChecks";
import {
    checkDetectedLanguage, checkLanguageAttribute, normalizeForCompare,
    allowedVersions, removeOptionalEntries, logComparison,
} from "../utils/LanguageChecks";

// Retries: a failing language / location is retried on its own inside the loop (see LoopGuard), and a test that still
// fails is run once more in a fresh browser. The second one is set in playwright.config.ts (off in a canary run).


// ------------------------------------------------------------ test data

// languages.json is the one list of languages the loops go through: the language eld has to detect, the <html lang> value and whether
// detection is skipped (eld cannot detect those). The expected texts of a language are looked up by its name, so the order of their rows does not matter.
const languages = readJson("languages.json");
const expectedSideMenus = readJsonByName("expectedSideMenuExpanded.json");
const expectedCollapsedMenus = readJsonByName("expectedSideMenuCollapsed.json");
const expectedSearchFilters = readJsonByName("expectedSearchFilter.json");
const expectedCountries = readJsonByName("countryCodes.json", "Country Name");     // the country code of a location is found by the location's name


// ------------------------------------------------------------ expanded side menu

test("verifyingSideMenuText_Expanded", async ({ page }, testInfo) => {
    const landingPage = new YtLandingPage(page);
    const genericUtility = new GenericUtility(page);

    await landingPage.openLandingPage();
    await landingPage.openLanguageList();

    const languageCount = genericUtility.languageCountToRun(languages.length);

    const guard = new LoopGuard();
    for (let i = 0; i < languageCount && !guard.shouldStop(); i++) {
        const language = languages[i]["Language"];
        try {
            console.log(language + "  row " + i);

            await genericUtility.capture(testInfo);
            await landingPage.pickLanguage(language);
            await landingPage.expandSideMenuIfCollapsed();

            // YouTube changes this menu in known ways (the "Alternatives" of the data file): the page text has to equal one of the allowed versions
            const expectedRow = expectedSideMenus.get(language);
            const versions = allowedVersions(canary(expectedRow["Expected Text"], i, 0), expectedRow["Alternatives"] ?? {});
            const actual = removeOptionalEntries(await landingPage.readExpandedSideMenu());
            const matched = versions.find(version => version.text === actual);
            const expected = matched ? actual : versions[0].text;      // nothing matches: the failure shows the difference to the usual version
            logComparison("Side menu", language, actual, expected, " | version: " + (matched ? matched.description : "none of the " + versions.length + " matches"));
            if (!matched) {
                guard.countForSummary("unknown version");
            } else if (matched === versions[0]) {
                guard.countForSummary("usual version");
            } else {
                guard.countForSummary("other version");
            }

            // soft assertion: a mismatch is reported at the end, the loop keeps going
            softCheck(actual, expected, 'Side menu text is wrong after switching to "' + language + '"');

            await landingPage.openLanguageList();
            guard.itemPassed(language);
        } catch (e) {
            if (await guard.retryAfterFailure(language, e, () => landingPage.reopenLanguageList())) {
                i--;    // run the same language again
            }
        }
    }

    guard.logSummary(languageCount);
});


test("verifyingSideMenuLanguage_Expanded", async ({ page }, testInfo) => {
    const landingPage = new YtLandingPage(page);
    const genericUtility = new GenericUtility(page);

    await landingPage.openLandingPage();
    await landingPage.openLanguageList();

    const languageCount = genericUtility.languageCountToRun(languages.length);

    const guard = new LoopGuard();
    for (let i = 0; i < languageCount && !guard.shouldStop(); i++) {
        const language = languages[i]["Language"];
        try {
            console.log(language + "  row " + i);

            await landingPage.pickLanguage(language);
            await landingPage.expandSideMenuIfCollapsed();

            const sideMenuText = await landingPage.readExpandedSideMenu();

            checkDetectedLanguage(language, sideMenuText, canary(languages[i]["Expected Language"], i, 1), "side menu", languages[i]["Detection Skipped"]);
            if (languages[i]["Detection Skipped"]) {
                guard.countForSummary("detection skipped");
            }
            checkLanguageAttribute(language, await genericUtility.readHtmlLang(), canary(languages[i]["Expected Attribute"], i, 2));

            await landingPage.openLanguageList();
            guard.itemPassed(language);
        } catch (e) {
            if (await guard.retryAfterFailure(language, e, () => landingPage.reopenLanguageList())) {
                i--;
            }
        }
    }

    guard.logSummary(languageCount);
});


// ------------------------------------------------------------ collapsed side menu

test("verifyingSideMenuText_Collapsed", async ({ page }, testInfo) => {
    const landingPage = new YtLandingPage(page);
    const genericUtility = new GenericUtility(page);

    await landingPage.openLandingPage();
    await landingPage.collapseSideMenuIfExpanded();
    await landingPage.openLanguageList();

    const languageCount = genericUtility.languageCountToRun(languages.length);

    const guard = new LoopGuard();
    for (let i = 0; i < languageCount && !guard.shouldStop(); i++) {
        const language = languages[i]["Language"];
        try {
            console.log(language + "  row " + i);

            await landingPage.pickLanguage(language);

            const actualText = await landingPage.readCollapsedSideMenu();
            const expectedText = canary(expectedCollapsedMenus.get(language)["Expected Text"], i, 0);

            logComparison("Collapsed side menu", language, normalizeForCompare(actualText), normalizeForCompare(expectedText));
            softCheck(normalizeForCompare(actualText), normalizeForCompare(expectedText), 'Collapsed side menu text is wrong after switching to "' + language + '"');

            await landingPage.openLanguageList();
            guard.itemPassed(language);
        } catch (e) {
            if (await guard.retryAfterFailure(language, e, () => landingPage.reopenCollapsedLanguageList())) {
                i--;
            }
        }
    }

    guard.logSummary(languageCount);
});


test("verifyingSideMenuLanguage_Collapsed", async ({ page }, testInfo) => {
    const landingPage = new YtLandingPage(page);
    const genericUtility = new GenericUtility(page);

    await landingPage.openLandingPage();
    await landingPage.collapseSideMenuIfExpanded();
    await landingPage.openLanguageList();

    const languageCount = genericUtility.languageCountToRun(languages.length);

    const guard = new LoopGuard();
    for (let i = 0; i < languageCount && !guard.shouldStop(); i++) {
        const language = languages[i]["Language"];
        try {
            console.log(language + "  row " + i);

            await landingPage.pickLanguage(language);

            const sideMenuText = await landingPage.readCollapsedSideMenu();

            checkDetectedLanguage(language, sideMenuText, canary(languages[i]["Expected Language"], i, 1), "collapsed side menu", languages[i]["Detection Skipped"]);
            if (languages[i]["Detection Skipped"]) {
                guard.countForSummary("detection skipped");
            }
            checkLanguageAttribute(language, await genericUtility.readHtmlLang(), canary(languages[i]["Expected Attribute"], i, 2));

            await landingPage.openLanguageList();
            guard.itemPassed(language);
        } catch (e) {
            if (await guard.retryAfterFailure(language, e, () => landingPage.reopenCollapsedLanguageList())) {
                i--;
            }
        }
    }

    guard.logSummary(languageCount);
});


// ------------------------------------------------------------ settings menu options

test("verifyingSettingsMenuLanguage", async ({ page }, testInfo) => {
    const landingPage = new YtLandingPage(page);
    const genericUtility = new GenericUtility(page);

    await landingPage.openLandingPage();
    await landingPage.openLanguageList();

    const languageCount = genericUtility.languageCountToRun(languages.length);

    const guard = new LoopGuard();
    for (let i = 0; i < languageCount && !guard.shouldStop(); i++) {
        const language = canary(languages[i]["Language"], i, 4, "Canary Language");
        try {
            console.log(language + "  row " + i);

            await landingPage.pickLanguage(language);

            const settingsText = await landingPage.readSettingsMenuText();

            checkDetectedLanguage(language, settingsText, canary(languages[i]["Expected Language"], i, 1), "settings menu", languages[i]["Detection Skipped"]);
            if (languages[i]["Detection Skipped"]) {
                guard.countForSummary("detection skipped");
            }
            checkLanguageAttribute(language, await genericUtility.readHtmlLang(), canary(languages[i]["Expected Attribute"], i, 2));

            await landingPage.openLanguageList();
            guard.itemPassed(language);
        } catch (e) {
            if (await guard.retryAfterFailure(language, e, () => landingPage.reopenLanguageList())) {
                i--;
            }
        }
    }

    guard.logSummary(languageCount);
});


// ------------------------------------------------------------ country code next to the logo
// 111 locations in one test took about 12 minutes, so the list is split in two tests that run side by side.
// The tests are named after the first and last country of their half, written out on purpose: the name shows what the test covers
// and changes only when somebody changes it. The fallback test D5 fails if a name no longer matches the data.

// The index i is the position in the location list on the page, so the two tests only differ in where the loop starts and ends
// (first half: 0 to the middle, second half: the middle to the end).
// The expected code is found by the name of the location that was picked (countryCodes.json), not by the position.

test("verifyingCountryCodeOnLogo_Algeria_to_Liechtenstein", async ({ page }, testInfo) => {
    const landingPage = new YtLandingPage(page);
    const genericUtility = new GenericUtility(page);

    await landingPage.openLandingPage();
    await landingPage.openLocationList();

    const allLocations = await landingPage.getLocationRows();
    const locationCount = genericUtility.locationCountToRun(allLocations.length);

    const middle = Math.ceil(locationCount / 2);
    const [start, end] = [0, middle];
    console.log("Country codes, first half: locations " + start + " to " + (end - 1) + " of " + locationCount);

    const guard = new LoopGuard();
    for (let i = start; i < end && !guard.shouldStop(); i++) {
        let locationName = "location #" + i;     // replaced by the real name once the location is picked
        try {
            locationName = await landingPage.pickLocation(i);

            const detectedCode = await landingPage.readCountryCode();
            const position = i - start;          // 0 for the first location of this test: the canary spoils the first two of each half
            const country = expectedCountries.get(locationName.trim());     // a location that is new on the page has no row: "No row for X in countryCodes.json"
            let expectedCode = canary(country["Country Code"], position, 0);
            expectedCode = canary(expectedCode, position, 1, "");
            console.log(locationName + "  row " + i + "  detected code: " + detectedCode + "  expected code: " + expectedCode);

            // only the United States has no code next to the logo, an empty expected code anywhere else is a data mistake
            if (expectedCode.trim() === "") {
                softCheck(country["Country Name"], "United States", 'Expected country code is empty for "' + locationName + '", only "United States" has none');
                guard.countForSummary("no code expected");
            }

            softCheck(detectedCode.trim(), expectedCode.trim(), 'Country code is wrong after choosing location "' + locationName + '"');

            await landingPage.openLocationList();
            guard.itemPassed(locationName);
        } catch (e) {
            if (await guard.retryAfterFailure(locationName, e, () => landingPage.reopenLocationList())) {
                i--;
            }
        }
    }

    guard.logSummary(end - start);
});


test("verifyingCountryCodeOnLogo_Lithuania_to_Zimbabwe", async ({ page }, testInfo) => {
    const landingPage = new YtLandingPage(page);
    const genericUtility = new GenericUtility(page);

    await landingPage.openLandingPage();
    await landingPage.openLocationList();

    const allLocations = await landingPage.getLocationRows();
    const locationCount = genericUtility.locationCountToRun(allLocations.length);

    const middle = Math.ceil(locationCount / 2);
    const [start, end] = [middle, locationCount];
    console.log("Country codes, second half: locations " + start + " to " + (end - 1) + " of " + locationCount);

    const guard = new LoopGuard();
    for (let i = start; i < end && !guard.shouldStop(); i++) {
        let locationName = "location #" + i;     // replaced by the real name once the location is picked
        try {
            locationName = await landingPage.pickLocation(i);

            const detectedCode = await landingPage.readCountryCode();
            const position = i - start;          // 0 for the first location of this test: the canary spoils the first two of each half
            const country = expectedCountries.get(locationName.trim());     // a location that is new on the page has no row: "No row for X in countryCodes.json"
            let expectedCode = canary(country["Country Code"], position, 0);
            expectedCode = canary(expectedCode, position, 1, "");
            console.log(locationName + "  row " + i + "  detected code: " + detectedCode + "  expected code: " + expectedCode);

            // only the United States has no code next to the logo, an empty expected code anywhere else is a data mistake
            if (expectedCode.trim() === "") {
                softCheck(country["Country Name"], "United States", 'Expected country code is empty for "' + locationName + '", only "United States" has none');
                guard.countForSummary("no code expected");
            }

            softCheck(detectedCode.trim(), expectedCode.trim(), 'Country code is wrong after choosing location "' + locationName + '"');

            await landingPage.openLocationList();
            guard.itemPassed(locationName);
        } catch (e) {
            if (await guard.retryAfterFailure(locationName, e, () => landingPage.reopenLocationList())) {
                i--;
            }
        }
    }

    guard.logSummary(end - start);
});


// ------------------------------------------------------------ global filter popup on the search results

test("verifyingSearchFilterText", async ({ page }, testInfo) => {
    const landingPage = new YtLandingPage(page);
    const genericUtility = new GenericUtility(page);

    await landingPage.openLandingPage();
    await landingPage.typeInSearchBox("youtube");
    await genericUtility.clickEnter(landingPage.searchBox);

    const languageCount = genericUtility.languageCountToRun(languages.length);

    const guard = new LoopGuard();
    for (let i = 0; i < languageCount && !guard.shouldStop(); i++) {
        const language = languages[i]["Language"];
        try {
            console.log(language + "  row " + i);

            await landingPage.openLanguageList();
            await landingPage.pickLanguage(language);

            await landingPage.openSearchFilter();
            await genericUtility.capture(testInfo);
            const filterText = await landingPage.readSearchFilterText();
            await landingPage.closeSearchFilter();

            const expectedFilterText = canary(expectedSearchFilters.get(language)["Expected Text"], i, 0);
            logComparison("Search filter", language, normalizeForCompare(filterText), normalizeForCompare(expectedFilterText));
            softCheck(normalizeForCompare(filterText), normalizeForCompare(expectedFilterText), 'Search filter text is wrong after switching to "' + language + '"');

            guard.itemPassed(language);
        } catch (e) {
            if (await guard.retryAfterFailure(language, e, () => landingPage.reopenSearchResults())) {
                i--;
            }
        }
    }

    guard.logSummary(languageCount);
});


test("verifyingSearchFilterLanguage", async ({ page }, testInfo) => {
    const landingPage = new YtLandingPage(page);
    const genericUtility = new GenericUtility(page);

    await landingPage.openLandingPage();
    await landingPage.typeInSearchBox("youtube");
    await genericUtility.clickEnter(landingPage.searchBox);

    const languageCount = genericUtility.languageCountToRun(languages.length);

    const guard = new LoopGuard();
    for (let i = 0; i < languageCount && !guard.shouldStop(); i++) {
        const language = languages[i]["Language"];
        try {
            console.log(language + "  row " + i);

            await landingPage.openLanguageList();
            await landingPage.pickLanguage(language);

            await landingPage.openSearchFilter();
            await genericUtility.capture(testInfo);
            const filterText = await landingPage.readSearchFilterText();
            await landingPage.closeSearchFilter();

            checkDetectedLanguage(language, filterText, canary(languages[i]["Expected Language"], i, 1), "search filter", languages[i]["Detection Skipped"]);
            if (languages[i]["Detection Skipped"]) {
                guard.countForSummary("detection skipped");
            }
            checkLanguageAttribute(language, await genericUtility.readHtmlLang(), canary(languages[i]["Expected Attribute"], i, 2));

            guard.itemPassed(language);
        } catch (e) {
            if (await guard.retryAfterFailure(language, e, () => landingPage.reopenSearchResults())) {
                i--;
            }
        }
    }

    guard.logSummary(languageCount);
});
