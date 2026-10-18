import test, { Locator, Page, TestInfo } from "@playwright/test";
import RunConfig from "../configs/RunConfig";


class GenericUtility{


    private page:Page;

    constructor(page:Page){
        this.page=page;
    }

    /** Title of the running test, used as a prefix in log messages. "no-test" outside a test. */
    private testName():string {
        try {
            return test.info().title;
        } catch {
            return "no-test";
        }
    }


	/** Joins the text of all the items into one string, separated by a space. */
	public async joinTexts(items:Locator[]):Promise<string> {
        const texts:string[]=[];
        for(const item of items){
            texts.push(await item.innerText());
        }
        return texts.join(" ");
    }

	public async getLangAttribute():Promise<string |null> {
        console.log("getLangAttribute() - locating <html> and reading lang property");
        try {
            const html:Locator = this.page.locator("//html");
            const langProp :string |null = await html.getAttribute("lang");
            console.log("Language attribute read: " + langProp);
            return langProp;

        } catch (error) {
            console.error("Failed to read html lang attribute: " + error);
            return null;
        }
    }



	// ---- convenience methods ----
    public async clickEnter(locator:Locator):Promise<void> {
        console.log("clickEnter(" + locator + ")");

        if (locator != null) {
            await locator.press('Enter');
            console.log("Sent ENTER to " + locator);
        } else {
            console.warn("clickEnter - element not found: " + locator);
        }
    }



    public async getWindowHeightWidth() :Promise<number[]>{

        const viewport = this.page.viewportSize();
        const arr:number[] = [];
        if (viewport != null) {
            arr.push(viewport.height);
            arr.push(viewport.width);
        }
        return arr;

    }



    public async smoothScrollToElement( locator:Locator):Promise<void> {
        console.log("[" + this.testName() + "] Within smoothScrollToElement method");

        try {

            if (locator != null) {
                await locator.evaluate(el => el.scrollIntoView({ behavior: 'smooth' }));
                await this.page.waitForTimeout(1000); // let the scroll finish
                console.log("[" + this.testName() + "] Successfully scrolled to element: " + locator);
            } else {
                console.warn("[" + this.testName() + "] Element not found for locator: " + locator);
            }

        } catch (error) {
            console.error("[" + this.testName() + "] Error while scrolling to element: " + locator + " - " + error);
        }
    }


    public async scrollDownByPixel( scrollDownPixel:number):Promise<void> {

        console.log("[" + this.testName() + "] Within scrollByPixel method");
        await this.page.mouse.wheel(0,scrollDownPixel);
    }




	/** Row-count override for the language-driven tests (runconfig.json: runForAllLanguages / overideLanguageCount*). */
	public resolveLanguageIterationCount(fullRowCount :number):number {
		const isCron:boolean = RunConfig.isCron();
		const suffix:string = RunConfig.keySuffix();

		const runForAllLanguages:boolean = RunConfig.getBoolean("runForAllLanguages" + suffix, false);
		const defaultLanguageCount :number = RunConfig.getInt("overideLanguageCountDefault" + suffix);
		const overrideLanguageCount:number = RunConfig.getInt("overideLanguageCount" + suffix, defaultLanguageCount);

		return this.resolveIterationCount(isCron, runForAllLanguages, overrideLanguageCount, fullRowCount);
	}

	/** Row-count override for the country-driven tests (runconfig.json: runForAllCountries / overideCountriesCount*). */
	public resolveCountryIterationCount(fullRowCount:number):number {
		const isCron:boolean = RunConfig.isCron();
		const suffix:string = RunConfig.keySuffix();

		const runForAllCountries:boolean = RunConfig.getBoolean("runForAllCountries" + suffix, false);
		const defaultCountriesCount:number = RunConfig.getInt("overideCountriesCountDefault" + suffix);
		const overrideCountriesCount:number = RunConfig.getInt("overideCountriesCount" + suffix, defaultCountriesCount);

		return this.resolveIterationCount(isCron, runForAllCountries, overrideCountriesCount, fullRowCount);
	}

	/**
	 * Applies the "run for all" override toggle to an already-resolved count. The caller
	 * fetches and names its own isCron/runForAll/override values so it's clear at each call
	 * site exactly which runconfig.json keys were read.
	 */
	private resolveIterationCount(isCron:boolean, runForAll:boolean, overrideCount:number, fullRowCount:number):number {
		console.log("[" + this.testName() + "] Execution is "
				+ (isCron ? "scheduled type /CRON Job on CI" : "Not CRON Job")
				+ " Hence referring to " + (isCron ? "CI" : "normal") + " keys from runconfig.json");

		if (runForAll) {
			console.log("[" + this.testName() + "] Run for all is on, row count is == " + fullRowCount);
			return fullRowCount;
		}

		console.log("[" + this.testName() + "] Row count is == " + overrideCount);
		return overrideCount;
	}



    public async capture(testInfo:TestInfo ,...names:string[]){
        // no screenshots on CI runs, only the trace is kept
        if (process.env.CI) {
            return "";
        }
        try{
                const inputNames=names.join("_");
                const fileName=`${inputNames || "screenshot"}_${Date.now()}.png`;
                const filePath = testInfo.outputPath(fileName);

                 await this.page.screenshot({ path: filePath });

    await testInfo.attach(inputNames || "screenshot", {
      path: filePath,
      contentType: "image/png",
    });

    return filePath;
        }catch (error) {
    console.error(`Screenshot capture failed: ${error}`);
    return "";
  }

    }


    }

export default GenericUtility;
