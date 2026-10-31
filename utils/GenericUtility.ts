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

	public async readHtmlLang():Promise<string |null> {
        console.log("readHtmlLang() - locating <html> and reading lang property");
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












	/** Row-count override for the language-driven tests (runconfig.json: runForAllLanguages / languageCount). */
	public languageCountToRun(fullRowCount :number):number {
		const isCron:boolean = RunConfig.isCron();
		const suffix:string = RunConfig.keySuffix();

		const runForAllLanguages:boolean = RunConfig.getBoolean("runForAllLanguages" + suffix, false);
		const languageCount:number = RunConfig.getInt("languageCount" + suffix);

		return this.resolveIterationCount(isCron, runForAllLanguages, languageCount, fullRowCount);
	}

	/** Row-count override for the location-driven tests (runconfig.json: runForAllLocations / locationCount). */
	public locationCountToRun(fullRowCount:number):number {
		const isCron:boolean = RunConfig.isCron();
		const suffix:string = RunConfig.keySuffix();

		const runForAllLocations:boolean = RunConfig.getBoolean("runForAllLocations" + suffix, false);
		const locationCount:number = RunConfig.getInt("locationCount" + suffix);

		return this.resolveIterationCount(isCron, runForAllLocations, locationCount, fullRowCount);
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
