import test, { expect, Locator, Page, TestInfo } from "@playwright/test";
import SafeActions from "../utils/SafeActions";
import GenericUtility from "../utils/GenericUtility";

class YtLandingPage {

    private page: Page;

    private testInfo: TestInfo;

    private safeActions: SafeActions;

    private genericUtility: GenericUtility;

    // after a language is picked the page can take a while to load, wait up to 2 minutes (like Selenium, which waits for the whole page)
    private static LANGUAGE_PAGE_LOAD_TIMEOUT = 120000;

    // a menu is read again until 3 reads in a row match, at most this many extra reads, this many ms apart
    private static MENU_STABLE_READS = 10;
    private static MENU_STABLE_WAIT = 500;

    private sideMenu: Locator;

    public sideMenuExpandedList: Locator;

    public settingEllipsesButton: Locator;

    public languageDropdownUnderSettings: Locator;

    private languageList: Locator;

    public ellipsesYtLandingPageTopLeft: Locator;

    public sideMenuCollapsedList: Locator;

    private countryCodeOnYtLogoLandingPage: Locator;

    private settingEllipsesOptionsListLandingPage: Locator;

    
    private languageListUpdated: Locator;

    public searchInputLandinfPage: Locator;

    //Cannot use this directly as this banner wouldnt show if yt does not have a search histroy so to show these recommendation banner
    private horizontalScrollBarLandingPage: Locator;

    public locationDropdownUnderSettings: Locator;

    public locationList: Locator;

    public globalFilterButton: Locator;

    private globalFilterData: Locator;

    public closeButtonGlobalFilterPopup: Locator;

    public spinnerUnderSetting:Locator;

    private centerTitle: Locator;

    constructor(page: Page, testInfo: TestInfo) {
        this.page = page;
        this.testInfo = testInfo;
        this.safeActions = new SafeActions(page);
        this.genericUtility = new GenericUtility(page);

        this.sideMenu = page.locator("//div[@class='style-scope ytd-mini-guide-renderer']");
        this.sideMenuExpandedList = page.locator("//ytd-guide-entry-renderer[@class='style-scope ytd-guide-section-renderer']").filter({ visible: true });
     //   this.settingEllipsesButton = page.locator("//ytd-topbar-menu-button-renderer[@class='style-scope ytd-masthead style-default']");
     
        // the host element, same locator as the Java project (the inner <a> is not always in the page)
        this.settingEllipsesButton = page.locator("//ytd-topbar-menu-button-renderer[@class='style-scope ytd-masthead style-default']").first();

        this.languageDropdownUnderSettings = page.locator("(//div[@id='content-icon'])[2]");
        this.languageList = page.locator("//yt-multi-page-menu-section-renderer[@class='style-scope ytd-multi-page-menu-renderer']//ytd-compact-link-renderer").filter({ visible: true });
        this.ellipsesYtLandingPageTopLeft = page.locator("//ytd-topbar-logo-renderer[@id='logo']/preceding-sibling::*[@id='guide-button']");
        this.sideMenuCollapsedList = page.locator("//ytd-mini-guide-renderer[@class='style-scope ytd-app']//ytd-mini-guide-entry-renderer");
        this.countryCodeOnYtLogoLandingPage = page.locator("(//span[@id='country-code'])[1]");
        this.settingEllipsesOptionsListLandingPage = page.locator("//ytd-multi-page-menu-renderer");
        this.languageListUpdated = page.locator("//ytd-multi-page-menu-renderer[@slot='dropdown-content']");
        this.searchInputLandinfPage = page.locator("//input[@class='ytSearchboxComponentInput yt-searchbox-input title']");
        this.horizontalScrollBarLandingPage = page.locator("//div[@id='scroll-container']");
        this.locationDropdownUnderSettings = page.locator("(//div[@id='content-icon'])[4]");
        this.locationList = page.locator("//yt-multi-page-menu-section-renderer[@class='style-scope ytd-multi-page-menu-renderer']//ytd-compact-link-renderer").filter({ visible: true });
        this.globalFilterButton = page.locator("//div[@id='filter-button']");
        this.globalFilterData = page.locator("//ytd-search-filter-options-dialog-renderer[@class='style-scope ytd-popup-container']");
        this.closeButtonGlobalFilterPopup = page.locator("//yt-icon[@icon='close']");
        this.spinnerUnderSetting=page.locator("(//div[@id='spinner']//div[@id='spinnerContainer'])[1]");
        this.centerTitle = page.locator("//h2[@id='title-container']");

    }

    async open(): Promise<void> {
        await this.page.goto("https://www.youtube.com/");
    }

    /** Text of every entry in the collapsed (mini) side menu. */
    async getCollapsedSideMenuTexts(): Promise<string[]> {
        await this.sideMenuCollapsedList.first().waitFor();
        return (await this.sideMenuCollapsedList.allInnerTexts()).map(t => t.trim());
    }

    /** Opens the hamburger menu so the expanded side menu is visible. */
    async expandSideMenu(): Promise<void> {
        await this.ellipsesYtLandingPageTopLeft.click();
        await this.sideMenuExpandedList.first().waitFor();
    }

    /** Text of every entry in the expanded side menu. */
    async getExpandedSideMenuTexts(): Promise<string[]> {
        await this.sideMenuExpandedList.first().waitFor();
        return (await this.sideMenuExpandedList.allInnerTexts()).map(t => t.trim());
    }

    async openSettingsMenu(): Promise<void> {
        await this.settingEllipsesButton.click();
        await this.settingEllipsesOptionsListLandingPage.first().waitFor();
    }

    async openLanguageDropdown(): Promise<void> {
        await this.openSettingsMenu();
        await this.languageDropdownUnderSettings.click();
        await this.languageListUpdated.waitFor();
    }

    /** Text of every language offered in the language dropdown. */
    async getLanguageOptions(): Promise<string[]> {
        await this.languageList.first().waitFor();
        return (await this.languageList.allInnerTexts()).map(t => t.trim());
    }

    /** Picks a language from the open dropdown by its visible name, e.g. "Deutsch". */
    async selectLanguage(languageName: string): Promise<void> {
        await this.languageList.filter({ hasText: languageName }).first().click();
    }

    async getCountryCodee(): Promise<string> {
        return (await this.countryCodeOnYtLogoLandingPage.innerText()).trim();
    }

    async openLocationDropdown(): Promise<void> {
        await this.openSettingsMenu();
        await this.locationDropdownUnderSettings.click();
        await this.locationList.first().waitFor();
    }

    async searchFor(text: string): Promise<void> {
        await this.searchInputLandinfPage.fill(text);
        await this.searchInputLandinfPage.press("Enter");
    }

    async openGlobalFilter(): Promise<void> {
        await this.globalFilterButton.click();
        await this.globalFilterData.waitFor();
    }

    async closeGlobalFilter(): Promise<void> {
        await this.closeButtonGlobalFilterPopup.click();
    }








     public getLanguageElementByName(name:string):Locator {
		let languageLocator:Locator=this.page.locator("//yt-multi-page-menu-section-renderer[@class='style-scope ytd-multi-page-menu-renderer']//yt-formatted-string[@id='label' and text()='" + name + "']");
		console.log("Looking for language element with name: " + name);
		
		return languageLocator;
	}
	
	

		

	public async  clickingUnderSearchInput() :Promise<void>{
		console.log("Clicking into the search bar...");
	
        await this.searchInputLandinfPage.click();
	}

	public async givingInputUnderSearchBar(input :string):Promise<void> {
		console.log("Giving input into the search bar with input as = "+input);
        await this.searchInputLandinfPage.click();
        await this.searchInputLandinfPage.fill(input);
        
	}


	public async clickingGlobalFilterButton():Promise<void> {
		console.log("Clicking on global filter button in landing page..");
        await this.globalFilterButton.click();
	}


	public async clickingLocationDropdownUnderSettings() :Promise<void>{
		console.log("Clicking on location dropdown under settings..");
        await this.locationDropdownUnderSettings.click();


	}





	public async closeGlobalFilterPopup():Promise<void> {
		console.log("Closing the global filter pop-up in landing page..");
        await this.closeButtonGlobalFilterPopup.click();
	}


	public async getLocationList():Promise<Locator[] >{
		console.log("Fetching the location list ...");
		await this.locationList.first().waitFor();
		const allLocations:Locator[] = await this.locationList.all();
		const cleanedList:Locator[] = [];

		for (const location of allLocations) {
			const text = (await location.innerText()).trim();
			if (text !== "") {
				cleanedList.push(location);
			}
		}

		console.log("Fetched the location list, count = " + cleanedList.length);
		return cleanedList;

	}


	/** Waits until the page has finished loading and the top bar is usable. Pass a timeout (ms) to wait longer than the defaults. */
	public async waitForPageToLoad(timeoutMs?:number) :Promise<void>{
		await this.page.waitForLoadState("load", { timeout: timeoutMs });
		await this.searchInputLandinfPage.waitFor({ timeout: timeoutMs });
		await this.settingEllipsesButton.waitFor({ timeout: timeoutMs });
	}

	public async openingLandingPage():Promise<void> {

		// String url=ConfigManager.get("Url");
		// driver.get(url);
       await this.page.goto('https://www.youtube.com/');
		await this.waitForPageToLoad();
		console.log("Opened YouTube landing page.");
	}


	/** Clicks a language in the open list with a DOM click, so the click does not wait for the page navigation it starts. */
	public async clickingLanguageByName(name:string) :Promise<void> {
		const language:Locator = this.getLanguageElementByName(name);
		await language.waitFor({ state: "visible" });
		await language.evaluate(element => (element as HTMLElement).click());
	}

	public async clickingSettingEllipsesButton() :Promise<void> {
		console.log("Clicking settings ellipses button...");
		// the click waits up to the 20s action timeout; if the button is still not usable, refresh the page and try again, 2 refreshes at most
		for (let attempt = 1; attempt <= 3; attempt++) {
			try {
				await this.settingEllipsesButton.click();
				return;
			} catch (e) {
				if (attempt === 3) throw e;
				console.log("Settings ellipses button not clickable, refreshing the page, refresh " + attempt + " of 2");
				await this.page.reload({ waitUntil: "domcontentloaded" });
				await this.waitForPageToLoad();
			}
		}

	}

	public async clickingLanguageDropdownButton() :Promise<void> {
		console.log("Clicking language dropdown...");
        await this.languageDropdownUnderSettings.click();
	}

	public async gettingLanguageList():Promise<Locator[]> {
		console.log("Fetching available language list...");
		
        await this.languageList.first().waitFor();
        const languageList:Locator[]= await (this.languageList.all());
        const cleanedLanguageList:Locator[]=[];

        for(const language of languageList){
            let text:string= (await language.innerText()).trim();
            if(text!==""){
              cleanedLanguageList.push(language);
            }
        }

        return cleanedLanguageList;

	}


	public async getsettingEllipsesOptionsListLandingPage():Promise<string> {
		console.log("Getting the setting ellipses options");
        const settingEllipsesoptionsListLandingPage:string=(await this.settingEllipsesOptionsListLandingPage.innerText()).trim();
		return settingEllipsesoptionsListLandingPage;
	}


	public async gettingSideMenuExpandedList() :Promise<Locator[]>{
		console.log("Fetching the side menu in expanded view");
        await this.sideMenuExpandedList.first().waitFor();
        const sideMenuList:Locator[]=await this.sideMenuExpandedList.all();
		return sideMenuList;
	}


	public async gettingSideMenuCollapsedList() :Promise<Locator[]>{
		console.log("Fetching the side menu in collapsed view");
        await this.sideMenuCollapsedList.first().waitFor();
        const sideMenuList= await this.sideMenuCollapsedList.all();
		return sideMenuList;
	}


	/** Clicks the hamburger only when the side menu is collapsed (its button has aria-pressed="true" while the menu is open), so an open menu is never closed. */
	public async expandSideMenuIfCollapsed() :Promise<void>{
		const menuButton:Locator = this.ellipsesYtLandingPageTopLeft.locator("button");
		for (let attempt = 1; attempt <= 2; attempt++) {
			if ((await menuButton.getAttribute("aria-pressed")) === "true") {
				return;
			}
			console.log("Side menu is collapsed, expanding it, attempt " + attempt);
			await this.ellipsesYtLandingPageTopLeft.click();
			await this.sideMenuExpandedList.first().waitFor({ timeout: 5000 }).catch(() => {});
		}
	}

	public async clickingLeftEllipses() :Promise<void>{
		console.log("Clicking left ellipses in the landing page");
        await this.ellipsesYtLandingPageTopLeft.click();
	}






	public async getDataFromGlobalFilterPopup() :Promise<string>{
		console.log("Fetching the data from the global filter in landing page");
        const globalFilterData:string =(await this.globalFilterData.innerText()).trim();
		return globalFilterData;
	}





	public async getCountryCode() :Promise<string>{
		console.log("Retrieving country code from YouTube logo...");
        const countryCode=(await this.countryCodeOnYtLogoLandingPage.innerText()).trim();
		console.log("Detected country code: " + countryCode);
		return countryCode;
	}



    // ------------------------------------------------------------------
    // Steps that use the safe actions (used by YtMasterSafeActions.spec.ts)
    // ------------------------------------------------------------------

    /** Opens the settings menu, then its language list. */
    public async openLanguageList() :Promise<void> {
        await this.safeActions.safeClick(this.settingEllipsesButton);
        await this.safeActions.safeClick(this.languageDropdownUnderSettings);
    }

    /** Opens the settings menu, then its location list. */
    public async openLocationList() :Promise<void> {
        await this.safeActions.safeClick(this.settingEllipsesButton);
        await this.safeActions.safeClick(this.locationDropdownUnderSettings);
    }

    /** Opens the settings menu if it is closed, closes it if it is open. */
    public async toggleSettingsMenu() :Promise<void> {
        await this.safeActions.safeClick(this.settingEllipsesButton);
    }

    /** Clicks the menu button at the top left. */
    public async clickLeftMenuButton() :Promise<void> {
        await this.safeActions.safeClick(this.ellipsesYtLandingPageTopLeft);
    }

    /** Clicks the language in the open list and waits for the page to load in that language. */
    public async pickLanguage(name:string) :Promise<void> {
        await this.safeActions.safeDomClick(this.getLanguageElementByName(name));
        await this.waitForPageToLoad(YtLandingPage.LANGUAGE_PAGE_LOAD_TIMEOUT);
    }

    /** Clicks the location at this position in the open list, waits for the page to load, and returns the name of the location. */
    public async pickLocation(index:number) :Promise<string> {
        const locations = await this.getLocationList();
        const locationText = await locations[index].innerText();
        await this.safeActions.safeClick(locations[index]);
        await this.waitForPageToLoad();
        return locationText;
    }

    /**
     * Text of a menu, all the items joined with a space. After a language switch the menu can still be filling up
     * (a read once returned only the first 5 entries), so it is read again until the text is the same on 3 reads in a row (about a second).
     */
    private async readStableMenuText(menuItems:Locator) :Promise<string> {
        let previous = await this.genericUtility.joinTexts(await this.safeActions.safeFindElements(menuItems));
        let sameReads = 1;
        for (let attempt = 1; attempt <= YtLandingPage.MENU_STABLE_READS; attempt++) {
            await this.page.waitForTimeout(YtLandingPage.MENU_STABLE_WAIT);
            const current = await this.genericUtility.joinTexts(await this.safeActions.safeFindElements(menuItems));
            if (current === previous) {
                sameReads++;
                if (sameReads >= 3) {
                    return current;
                }
            } else {
                console.log("The menu was still changing (" + previous.length + " then " + current.length + " characters), reading it again");
                previous = current;
                sameReads = 1;
            }
        }
        return previous;
    }

    /** Text of the expanded side menu, all the items joined with a space. */
    public async readExpandedSideMenu() :Promise<string> {
        return await this.readStableMenuText(this.sideMenuExpandedList);
    }

    /** Text of the collapsed side menu, all the items joined with a space. */
    public async readCollapsedSideMenu() :Promise<string> {
        return await this.readStableMenuText(this.sideMenuCollapsedList);
    }

    /** Opens the settings menu, reads the text of its options, closes it again. */
    public async readSettingsMenuText() :Promise<string> {
        await this.safeActions.safeClick(this.settingEllipsesButton);
        const settingsText = await this.getsettingEllipsesOptionsListLandingPage();
        await this.safeActions.safeClick(this.settingEllipsesButton);
        return settingsText;
    }

    /** Opens the global filter popup on the search results page. */
    public async openGlobalFilterPopup() :Promise<void> {
        await this.safeActions.safeClick(this.globalFilterButton);
    }

    /** Closes the global filter popup. */
    public async dismissGlobalFilterPopup() :Promise<void> {
        await this.safeActions.safeClick(this.closeButtonGlobalFilterPopup);
    }
}
export default YtLandingPage;
