import { Locator, Page } from "@playwright/test";
import SafeActions from "../utils/SafeActions";
import GenericUtility from "../utils/GenericUtility";

class YtLandingPage {

    private page: Page;
    private safeActions: SafeActions;
    private genericUtility: GenericUtility;

    // after a language is picked the page can take a while to load, wait up to 2 minutes (like Selenium, which waits for the whole page)
    private static LANGUAGE_PAGE_LOAD_TIMEOUT = 120000;

    // a menu is read again until 3 reads in a row match, at most this many extra reads, this many ms apart
    private static MENU_STABLE_READS = 10;
    private static MENU_STABLE_WAIT = 500;

    // top bar
    public settingsButton: Locator;               // the Settings button at the top right
    public sideMenuButton: Locator;               // the hamburger button at the top left (opens and closes the side menu)
    public searchBox: Locator;
    private countryCodeLabel: Locator;            // the country code next to the YouTube logo

    // side menu
    public expandedSideMenuEntries: Locator;
    public collapsedSideMenuEntries: Locator;

    // settings menu (the popup of the Settings button)
    private settingsMenu: Locator;                // the whole popup
    public settingsMenuRow: Locator;              // one row of it, visible only while the menu is open
    public languageRow: Locator;                  // the "Language" row of the settings menu
    public locationRow: Locator;                  // the "Location" row of the settings menu
    public locationRows: Locator;                 // the rows of the open location list

    // search filter popup on the search results page
    public searchFilterButton: Locator;
    private searchFilterPopup: Locator;
    public searchFilterCloseButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.safeActions = new SafeActions(page);
        this.genericUtility = new GenericUtility(page);

        this.settingsButton = page.locator("//ytd-topbar-menu-button-renderer[@class='style-scope ytd-masthead style-default']").first();     // the host element, same locator as the Java project (the inner <a> is not always in the page)
        this.sideMenuButton = page.locator("//ytd-topbar-logo-renderer[@id='logo']/preceding-sibling::*[@id='guide-button']");
        this.searchBox = page.locator("//input[@class='ytSearchboxComponentInput yt-searchbox-input title']");
        this.countryCodeLabel = page.locator("(//span[@id='country-code'])[1]");

        this.expandedSideMenuEntries = page.locator("//ytd-guide-entry-renderer[@class='style-scope ytd-guide-section-renderer']").filter({ visible: true });
        this.collapsedSideMenuEntries = page.locator("//ytd-mini-guide-renderer[@class='style-scope ytd-app']//ytd-mini-guide-entry-renderer");

        this.settingsMenu = page.locator("//ytd-multi-page-menu-renderer");
        this.settingsMenuRow = page.locator("//ytd-multi-page-menu-renderer//ytd-compact-link-renderer").filter({ visible: true }).first();     // language independent
        this.languageRow = page.locator("(//div[@id='content-icon'])[2]");
        this.locationRow = page.locator("(//div[@id='content-icon'])[4]");
        this.locationRows = page.locator("//yt-multi-page-menu-section-renderer[@class='style-scope ytd-multi-page-menu-renderer']//ytd-compact-link-renderer").filter({ visible: true });

        this.searchFilterButton = page.locator("//div[@id='filter-button']");
        this.searchFilterPopup = page.locator("//ytd-search-filter-options-dialog-renderer[@class='style-scope ytd-popup-container']");
        this.searchFilterCloseButton = page.locator("//yt-icon[@icon='close']");
    }

    // ------------------------------------------------------------------
    // Opening the page and the lists
    // ------------------------------------------------------------------

    /** Waits until the page has finished loading and the top bar is usable. Pass a timeout (ms) to wait longer than the defaults. */
    public async waitForPageToLoad(timeoutMs?: number): Promise<void> {
        await this.page.waitForLoadState("load", { timeout: timeoutMs });
        await this.searchBox.waitFor({ timeout: timeoutMs });
        await this.settingsButton.waitFor({ timeout: timeoutMs });
    }

    public async openLandingPage(): Promise<void> {
        await this.page.goto("https://www.youtube.com/");
        await this.waitForPageToLoad();
        console.log("Opened YouTube landing page.");
    }

    /** Opens the settings menu, then its language list. */
    public async openLanguageList(): Promise<void> {
        await this.safeActions.safeClick(this.settingsButton);
        await this.recoverSettingsMenuIfClosed();
        await this.safeActions.safeClick(this.languageRow);
    }

    /** Opens the settings menu, then its location list. */
    public async openLocationList(): Promise<void> {
        await this.safeActions.safeClick(this.settingsButton);
        await this.recoverSettingsMenuIfClosed();
        await this.safeActions.safeClick(this.locationRow);
    }

    /** True while the settings menu is open (at least one of its rows is visible). */
    public async isSettingsMenuOpen(): Promise<boolean> {
        return await this.settingsMenuRow.isVisible();
    }

    /**
     * The rows of the settings menu exist only while the menu is open, but the click on the settings button is
     * sometimes missed (for example right after a page load). Then the click on the language or location row can never succeed,
     * because its retries reload the page, which closes the menu again. So: do nothing if the menu is open, wait for its rows to
     * show up (the wait comes first, so a menu that is just opening is not closed by a second click), and only then click again.
     * The settings button has no aria-pressed / aria-expanded (checked on the live page), so the visible rows are the only
     * signal. No number is written here: the wait is Playwright's action timeout from playwright.config.ts (30 s).
     */
    public async recoverSettingsMenuIfClosed(): Promise<void> {
        if (await this.isSettingsMenuOpen()) {
            return;
        }
        try {
            await this.settingsMenuRow.waitFor({ state: "visible" });
            return;
        } catch {
            // still closed, handled below
        }
        console.log("Settings menu is not open after the click, clicking the settings button again");
        await this.safeActions.safeClick(this.settingsButton);
        await this.settingsMenuRow.waitFor({ state: "visible" }).catch(() => {
            console.log("Settings menu is still not open after the second click");
        });
    }

    // ------------------------------------------------------------------
    // Side menu
    // ------------------------------------------------------------------

    /** Clicks the hamburger only when the side menu is collapsed (its button has aria-pressed="true" while the menu is open), so an open menu is never closed. */
    public async expandSideMenuIfCollapsed(): Promise<void> {
        const menuButton: Locator = this.sideMenuButton.locator("button");
        for (let attempt = 1; attempt <= 2; attempt++) {
            if ((await menuButton.getAttribute("aria-pressed")) === "true") {
                return;
            }
            console.log("Side menu is collapsed, expanding it, attempt " + attempt);
            await this.sideMenuButton.click();
            await this.expandedSideMenuEntries.first().waitFor({ timeout: 5000 }).catch(() => {});
        }
    }

    /**
     * Collapses the side menu, and only when it is expanded (its button has aria-pressed="true" while the menu is open, same
     * signal as expandSideMenuIfCollapsed), so it is safe to repeat and does nothing when the page starts collapsed.
     * The click is sometimes missed, so the collapsed entries are given 3 seconds to show up; if they do not and the menu
     * is still expanded, it is clicked once more. A menu that did collapse is never clicked again, that would open it.
     */
    public async collapseSideMenuIfExpanded(): Promise<void> {
        const menuButton: Locator = this.sideMenuButton.locator("button");
        if ((await menuButton.getAttribute("aria-pressed")) !== "true") {
            return;
        }
        await this.safeActions.safeClick(this.sideMenuButton);
        try {
            await this.collapsedSideMenuEntries.first().waitFor({ state: "visible", timeout: 3000 });
            return;
        } catch {
            // the collapsed entries are not there yet
        }
        if ((await menuButton.getAttribute("aria-pressed")) === "true") {
            console.log("Side menu did not collapse after the click, clicking the menu button again");
            await this.safeActions.safeClick(this.sideMenuButton);
        }
    }

    // ------------------------------------------------------------------
    // Picking a language or a location
    // ------------------------------------------------------------------

    /** The text of a language in the open list, as a locator. */
    public languageByName(name: string): Locator {
        return this.page.locator("//yt-multi-page-menu-section-renderer[@class='style-scope ytd-multi-page-menu-renderer']//yt-formatted-string[@id='label' and text()='" + name + "']");
    }

    /** Clicks the language in the open list and waits for the page to load in that language. */
    public async pickLanguage(name: string): Promise<void> {
        console.log("Picking the language " + name);
        await this.safeActions.safeDomClick(this.languageByName(name));
        await this.waitForPageToLoad(YtLandingPage.LANGUAGE_PAGE_LOAD_TIMEOUT);
    }

    /** All rows of the open location list that have a text. */
    public async getLocationRows(): Promise<Locator[]> {
        await this.locationRows.first().waitFor();
        const allRows: Locator[] = await this.locationRows.all();
        const rowsWithText: Locator[] = [];
        for (const row of allRows) {
            if ((await row.innerText()).trim() !== "") {
                rowsWithText.push(row);
            }
        }
        console.log("Fetched the location list, count = " + rowsWithText.length);
        return rowsWithText;
    }

    /** Clicks the location at this position in the open list, waits for the page to load, and returns the name of the location. */
    public async pickLocation(index: number): Promise<string> {
        const locations = await this.getLocationRows();
        const locationName = await locations[index].innerText();
        await this.safeActions.safeClick(locations[index]);
        await this.waitForPageToLoad();
        return locationName;
    }

    // ------------------------------------------------------------------
    // Reading the page
    // ------------------------------------------------------------------

    /**
     * Reads a menu text again and again until it is not empty and the same on 3 reads in a row (about a second).
     * After a language switch a menu can still be filling up (a read once returned only the first 5 entries) or not be open yet.
     * Returns the last text read, also when it never became stable (the caller decides if that is an error).
     */
    private async readUntilStable(read: () => Promise<string>): Promise<string> {
        let previous = await read();
        let sameReads = 1;
        for (let attempt = 1; attempt <= YtLandingPage.MENU_STABLE_READS && sameReads < 3; attempt++) {
            await this.page.waitForTimeout(YtLandingPage.MENU_STABLE_WAIT);
            const current = await read();
            if (current !== previous) {
                console.log("The menu was still changing (" + previous.length + " then " + current.length + " characters), reading it again");
            }
            sameReads = current !== "" && current === previous ? sameReads + 1 : 1;
            previous = current;
        }
        return previous;
    }

    /** Text of a side menu, all the items joined with a space. */
    private async readSideMenuText(menuItems: Locator): Promise<string> {
        return await this.readUntilStable(async () => await this.genericUtility.joinTexts(await this.safeActions.safeFindElements(menuItems)));
    }

    /** Text of the expanded side menu, all the items joined with a space. */
    public async readExpandedSideMenu(): Promise<string> {
        return await this.readSideMenuText(this.expandedSideMenuEntries);
    }

    /** Text of the collapsed side menu, all the items joined with a space. */
    public async readCollapsedSideMenu(): Promise<string> {
        return await this.readSideMenuText(this.collapsedSideMenuEntries);
    }

    /** The text of the open settings menu, read once. */
    private async readSettingsMenuOnce(): Promise<string> {
        console.log("Reading the settings menu");
        return (await this.settingsMenu.innerText()).trim();
    }

    /**
     * Opens the settings menu, reads the text of its options, closes it again.
     * The text is read until it is not empty and the same on 3 reads in a row. An empty text (the menu did not open or is still
     * opening) is an error, so LoopGuard checks the language again; before it went on to the language detection as "Unknown".
     */
    public async readSettingsMenuText(): Promise<string> {
        await this.safeActions.safeClick(this.settingsButton);
        await this.recoverSettingsMenuIfClosed();
        const text = await this.readUntilStable(() => this.readSettingsMenuOnce());
        if (text === "") {
            throw new Error("Read the settings menu text but it is empty | page=" + this.page.url());
        }
        await this.safeActions.safeClick(this.settingsButton);
        return text;
    }

    /** The code written next to the YouTube logo. */
    public async readCountryCode(): Promise<string> {
        const countryCode = (await this.countryCodeLabel.innerText()).trim();
        console.log("Detected country code: " + countryCode);
        return countryCode;
    }

    // ------------------------------------------------------------------
    // Search box and search filter popup (search results page)
    // ------------------------------------------------------------------

    public async typeInSearchBox(text: string): Promise<void> {
        console.log("Typing into the search box: " + text);
        await this.searchBox.click();
        await this.searchBox.fill(text);
    }

    /** Opens the search filter popup on the search results page. */
    public async openSearchFilter(): Promise<void> {
        await this.safeActions.safeClick(this.searchFilterButton);
    }

    public async readSearchFilterText(): Promise<string> {
        return (await this.searchFilterPopup.innerText()).trim();
    }

    /** Closes the search filter popup. */
    public async closeSearchFilter(): Promise<void> {
        await this.safeActions.safeClick(this.searchFilterCloseButton);
    }

    // ------------------------------------------------------------------
    // Recovery after a failed language / location: LoopGuard runs one of these before it runs the item again.
    // They bring the page back to the state the loop starts from.
    // ------------------------------------------------------------------

    /** Page reloaded, language list open (the loops of the expanded side menu and the settings menu). */
    public async reopenLanguageList(): Promise<void> {
        await this.openLandingPage();
        await this.openLanguageList();
    }

    /** Page reloaded, side menu collapsed, language list open (the loops of the collapsed side menu). */
    public async reopenCollapsedLanguageList(): Promise<void> {
        await this.openLandingPage();
        await this.collapseSideMenuIfExpanded();
        await this.openLanguageList();
    }

    /** Page reloaded, location list open (the country code loops). */
    public async reopenLocationList(): Promise<void> {
        await this.openLandingPage();
        await this.openLocationList();
    }

    /** Page reloaded, search for "youtube" done (the search filter loops). */
    public async reopenSearchResults(): Promise<void> {
        await this.openLandingPage();
        await this.typeInSearchBox("youtube");
        await this.genericUtility.clickEnter(this.searchBox);
    }
}

export default YtLandingPage;
