import { Locator, test, expect } from "@playwright/test";
import GenericUtility from "../utils/GenericUtility";
import YtLandingPage from "../pages/YtLandingPage";
import { readJson } from "../utils/ReadJSON";
import {checkLanguage, detectLanguage} from "../eld-language-detection/languageDetector.mjs"
import { read } from "fs";

// YouTube lists "YouTube Music" in the side menu in some runs and not in others, so it is left out of the comparison.
const withoutYoutubeMusic = (text: string): string => text.replace(/\s*YouTube\s+Music/g, "").trim();

// Languages (as shown in YouTube's language list) that eld cannot detect.
const LANGUAGES_NOT_SUPPORTED_BY_ELD: string[] = ["Afrikaans", "Bahasa Indonesia", "Bosanski", "Dansk"];



test("verifyingSideMenuLanguageAsInSettings", async ({ page }, testInfo) => {

    const landingPage = new YtLandingPage(page, testInfo);
    const genericUtility = new GenericUtility(page);
    const testName: string = testInfo.title;

    const rows = readJson("verifyingSideMenuLanguageAsInSettings.json");

    await landingPage.openingLandingPage();
    await landingPage.clickingSettingEllipsesButton();
    await landingPage.clickingLanguageDropdownButton();

    const languagesRowCount: number = genericUtility.resolveLanguageIterationCount(rows.length);

    // about a minute per language is plenty; the default 30s limit is too short for a loop
    test.setTimeout(languagesRowCount * 60000 + 60000);

    for (let languageIndex = 0; languageIndex < languagesRowCount; languageIndex++) {

        const langText: string = rows[languageIndex]["Applied Language"];
        console.log("[" + testName + "] " + langText + " lang text from the data file, row " + languageIndex);

        await genericUtility.capture(testInfo);

        await landingPage.clickingLanguageByName(langText);
        await landingPage.waitForPageToLoad();

        // await landingPage.clickingSettingEllipsesButton();
        // await genericUtility.capture(testInfo);
        // await landingPage.clickingSettingEllipsesButton();

        await landingPage.expandSideMenuIfCollapsed();

        const listOfSideMenu: Locator[] = await landingPage.gettingSideMenuExpandedList();
        let sideMenuItems: string = "";
        for (let sideMenuItem = 0; sideMenuItem < listOfSideMenu.length; sideMenuItem++) {
            sideMenuItems += await listOfSideMenu[sideMenuItem].innerText();
            if (sideMenuItem !== listOfSideMenu.length - 1) {
                sideMenuItems += " ";
            }
        }

        console.log("[" + testName + "] Side menu text read from the page: " + sideMenuItems);

        // soft assertion: a mismatch is reported at the end of the test and the loop keeps going
        expect.soft(withoutYoutubeMusic(sideMenuItems), 'Side menu text is wrong after switching to "' + langText + '"')
            .toBe(withoutYoutubeMusic(rows[languageIndex]["Expected Data"]));

        await landingPage.clickingSettingEllipsesButton();
        await landingPage.clickingLanguageDropdownButton();

        // // before the next language is picked: the page must be loaded and the language list fully read
        // await landingPage.waitForPageToLoad();
        // await landingPage.waitForLanguageListToStabilize();


    }
});






	test('verifyingSideMenuLanguageAsInSettingsLingua', async ({page},testInfo)=> {



		let landingPage=new YtLandingPage(page,testInfo);
		let genericUtility=new GenericUtility(page);



		await landingPage.openingLandingPage();




		await landingPage.clickingSettingEllipsesButton();

		await landingPage.clickingLanguageDropdownButton();

		let testName:string = testInfo.title;
        
        
       const rows = readJson("ApplicableLanguageExpectedLanguage.json");
       const attribute= readJson("ApplicableLanguageExpectedAttibute.json")
		let LanguagesRowCount :number= rows.length;

	
		LanguagesRowCount = genericUtility.resolveLanguageIterationCount(LanguagesRowCount);


		for(let languageIndex=0;languageIndex<LanguagesRowCount;languageIndex++) {

			let langText:string=rows[languageIndex]['Applicable Language'];
            
			console.log(langText+" lang text from the sheet   "+languageIndex);






			await landingPage.clickingLanguageByName(langText);
			await landingPage.waitForPageToLoad();
            
			// await landingPage.clickingSettingEllipsesButton();
			// genericUtility.isElementInViewport(landingPage.languageDropdownUnderSettings);
			// await genericUtility.capture(testInfo);
			// await landingPage.clickingSettingEllipsesButton();


			let listOfSideMenu:Locator[]=await landingPage.gettingSideMenuExpandedList();

			// StringBuilder sideMenuItems=new StringBuilder();
            let sideMenuItems:string='';
			for(let sideMenuItem=0;sideMenuItem<listOfSideMenu.length;sideMenuItem++) {
				console.log(await listOfSideMenu[sideMenuItem].innerText());
                sideMenuItems+=await listOfSideMenu[sideMenuItem].innerText();
				if(sideMenuItem!=listOfSideMenu.length-1) {
					sideMenuItems+=" ";
				}

			}




			let applicableLanguage:string=rows[languageIndex]['Applicable Language'];
			let detectedLanguage:string=detectLanguage(sideMenuItems.toString());
			let expectedLanguage:string=rows[languageIndex]['Expected Language'];


			let expectedLanguageAttribute:string =attribute[languageIndex]['Expected Attribute'];
			let detectedLanguageAttribute :string|null =await genericUtility.getLangAttribute();

			console.log("ApplicableLanguage  "+applicableLanguage+"     "+"Detected Language   "+detectedLanguage+"  "+"Expected Language  "+expectedLanguage);
			console.log("ApplicableLanguage  "+applicableLanguage+"     "+"Detected Language attribute   "+detectedLanguageAttribute+"  "+"Expected Language attribute "+expectedLanguageAttribute);


            // eld has no model for these, so its answer is unreliable; the lang attribute check below still covers them
            if (LANGUAGES_NOT_SUPPORTED_BY_ELD.includes(langText)) {
                console.log("Skipping detected language check for " + langText + " (not supported by eld)");
            } else {
                await expect.soft(
                    detectedLanguage.toLowerCase(),
                    `Language of the side menu text is wrong after switching to "${langText}"`
                ).toBe(expectedLanguage.toLowerCase());
            }

await expect.soft(
  detectedLanguageAttribute?.toLowerCase(),
  `<html lang> attribute is wrong after switching to "${langText}"`
).toBe(expectedLanguageAttribute.toLowerCase());

			await landingPage.clickingSettingEllipsesButton();

			await landingPage.clickingLanguageDropdownButton();

		}

	});




    

	test('verifyingSideMenuCollapsedLangAsInSettings',async({page},testInfo)=>{



           
		let landingPage=new YtLandingPage(page,testInfo);
		let genericUtility=new GenericUtility(page);
	



		// FileReader verifyingSideMenuCollapsedLangAsInSettingsDataReader=new FileReader();
		// verifyingSideMenuCollapsedLangAsInSettingsDataReader.loadWorkbook("data/verifyingSideMenuCollapsedLangAsInSettings.xlsx");
		// verifyingSideMenuCollapsedLangAsInSettingsDataReader.loadSheet("verifyingSideMenuCollapsedLangA");

        const verifyingSideMenuCollapsedLangAsInSettingsDataReader = readJson("verifyingSideMenuCollapsedLangAsInSettings.json");



		// FileReader applicableExpectedReader=new FileReader();
		// applicableExpectedReader.loadWorkbook("data/ApplicableLanguageExpectedLanguage.xlsx");
		// applicableExpectedReader.loadSheet("AppVExpectLanguages");

        const applicableExpectedReader = readJson("ApplicableLanguageExpectedLanguage.json");


		let LanguagesRowCount :number= verifyingSideMenuCollapsedLangAsInSettingsDataReader.length;
		let testName:string = testInfo.title;

		await landingPage.openingLandingPage();
		await landingPage.clickingLeftEllipses();



		await landingPage.clickingSettingEllipsesButton();

		await landingPage.clickingLanguageDropdownButton();


	
		

		LanguagesRowCount = genericUtility.resolveLanguageIterationCount(LanguagesRowCount);


		for(let languageIndex=0;languageIndex<LanguagesRowCount;languageIndex++) {

			let langText:string= await verifyingSideMenuCollapsedLangAsInSettingsDataReader[languageIndex]['Applied Language'];
			console.log(langText+"    "+languageIndex);


			await landingPage.clickingLanguageByName(langText);
			await landingPage.waitForPageToLoad();
		//	waitUtility.waitForElementReady(landingPage.sideMenuCollapsedList);
          //  await landingPage.gettingSideMenuCollapsedList();
			// await landingPage.clickingSettingEllipsesButton();
			// genericUtility.isElementInViewport(landingPage.languageDropdownUnderSettings);
			// await genericUtility.capture( testInfo);
			// await landingPage.clickingSettingEllipsesButton();

			await genericUtility.getLangAttribute();

			let listOfSideMenu:Locator[]=await landingPage.gettingSideMenuCollapsedList();

			// StringBuilder sideMenuItems=new StringBuilder();
            let sideMenuItems:string='';
			for(let sideMenuItem=0;sideMenuItem<listOfSideMenu.length;sideMenuItem++) {
				console.log(await listOfSideMenu[sideMenuItem].innerText());
				//sideMenuItems.append(listOfSideMenu.get(sideMenuItem).getText());
                sideMenuItems+=await listOfSideMenu[sideMenuItem].innerText();

				if(sideMenuItem!=listOfSideMenu.length-1) {
					sideMenuItems+=' ';
				}
			}

			let expectedData:string =	verifyingSideMenuCollapsedLangAsInSettingsDataReader[languageIndex]['Expected Data'];
			let actualData:string = sideMenuItems.toString();


			//softAssert.assertEquals(actualData.trim(),expectedData.trim(),"Mismatch in the Actual and Expected data for language="+langText);

             // soft assertion: a mismatch is reported at the end of the test and the loop keeps going
        expect.soft(sideMenuItems.trim().toLowerCase(), 'Collapsed side menu text is wrong after switching to "' + langText + '"')
            .toBe(verifyingSideMenuCollapsedLangAsInSettingsDataReader[languageIndex]["Expected Data"].trim().toLowerCase());


			await landingPage.clickingSettingEllipsesButton();

			await landingPage.clickingLanguageDropdownButton();



            
		}

	


    });

	
	









	test('verifyingSideMenuCollapsedLangAsInSettingsLingua', async ({page},testInfo)=>{



 
		let landingPage=new YtLandingPage(page,testInfo);
		let genericUtility=new GenericUtility(page);
	




		// FileReader applicableExpectedReader=new FileReader();
		// applicableExpectedReader.loadWorkbook("data/ApplicableLanguageExpectedLanguage.xlsx");
		// applicableExpectedReader.loadSheet("AppVExpectLanguages");
 
        let  applicableExpectedReader= readJson("ApplicableLanguageExpectedLanguage.json");

		// FileReader applicableExpectedAttributeReader=new FileReader();
		// applicableExpectedAttributeReader.loadWorkbook("data/ApplicableLanguageExpectedAttibute.xlsx");
		// applicableExpectedAttributeReader.loadSheet("Attribute");
        let applicableExpectedAttributeReader= readJson("ApplicableLanguageExpectedAttibute.json");



		let LanguagesRowCount:number= applicableExpectedReader.length;
		let testName:string = testInfo.title;
		await landingPage.openingLandingPage();





		//List<Integer> sizes=genericUtility.getWindowHeightWidth();
		await landingPage.clickingLeftEllipses();


		await landingPage.clickingSettingEllipsesButton();


		await landingPage.clickingLanguageDropdownButton();


		LanguagesRowCount = genericUtility.resolveLanguageIterationCount(LanguagesRowCount);

		for(let languageIndex=0;languageIndex<LanguagesRowCount;languageIndex++) {

			let langText:string=applicableExpectedReader[languageIndex]['Applicable Language'];
			console.log(langText+"    "+languageIndex);


			await landingPage.clickingLanguageByName(langText);
			await landingPage.waitForPageToLoad();

			// await landingPage.clickingSettingEllipsesButton();
		//	genericUtility.isElementInViewport(landingPage.languageDropdownUnderSettings);
			// await genericUtility.capture(testInfo);
			// await landingPage.clickingSettingEllipsesButton();

			await genericUtility.getLangAttribute();

			let listOfSideMenu:Locator[]=await landingPage.gettingSideMenuCollapsedList();

		//	StringBuilder sideMenuItems=new StringBuilder();
        let sideMenuItems:string='';
			for(let sideMenuItem=0;sideMenuItem<listOfSideMenu.length;sideMenuItem++) {
				console.log(listOfSideMenu[sideMenuItem].innerText());
                sideMenuItems+=await listOfSideMenu[sideMenuItem].innerText();
				if(sideMenuItem!=listOfSideMenu.length-1) {
					sideMenuItems+=' ';
				}
			}



			let applicableLanguage:string=applicableExpectedReader[languageIndex]['Applicable Language'];
			let detectedLanguage:string =detectLanguage(sideMenuItems.toString());
			console.log("text sent to lingua is "+"      "+sideMenuItems.toString());
			let expectedLanguage:string=applicableExpectedReader[languageIndex]['Expected Language'];


			let expectedLanguageAttribute=applicableExpectedAttributeReader[languageIndex]['Expected Attribute'];

			let detectedLanguageAttribute:string|null =await genericUtility.getLangAttribute();

			console.log("ApplicableLanguage  "+applicableLanguage+"     "+"Detected Language   "+detectedLanguage+"  "+"Expected Language  "+expectedLanguage);
			console.log("ApplicableLanguage  "+applicableLanguage+"     "+"Detected Language attribute   "+detectedLanguageAttribute+"  "+"Expected Language attribute "+expectedLanguageAttribute);



			// softAssert.assertEquals(detectedLanguage, expectedLanguage, "Language detection mismatch for language="+langText);
			// softAssert.assertEquals(detectedLanguageAttribute, expectedLanguageAttribute, "Language attributr mismatch for language="+langText);



               // eld has no model for these, so its answer is unreliable; the lang attribute check below still covers them
            if (LANGUAGES_NOT_SUPPORTED_BY_ELD.includes(langText)) {
                console.log("Skipping detected language check for " + langText + " (not supported by eld)");
            } else {
                await expect.soft(
                    detectedLanguage.toLowerCase(),
                    `Language of the collapsed side menu text is wrong after switching to "${langText}"`
                ).toBe(expectedLanguage.toLowerCase());
            }

await expect.soft(
  detectedLanguageAttribute?.toLowerCase(),
  `<html lang> attribute is wrong after switching to "${langText}"`
).toBe(expectedLanguageAttribute.toLowerCase());


			await landingPage.clickingSettingEllipsesButton();

			await landingPage.clickingLanguageDropdownButton();

		}
	


    });	
	


    test('verifyingSettingOptionsLang', async({page},testInfo)=>{




		let landingPage=new YtLandingPage(page,testInfo);
		let genericUtility=new GenericUtility(page);





		// FileReader applicableExpectedLangReader=new FileReader();
		// applicableExpectedLangReader.loadWorkbook("data/ApplicableLanguageExpectedLanguage.xlsx");
		// applicableExpectedLangReader.loadSheet("AppVExpectLanguages");
            let applicableExpectedLangReader=readJson("ApplicableLanguageExpectedLanguage.json");



		// FileReader applicableExpectedAttributeReader=new FileReader();
		// applicableExpectedAttributeReader.loadWorkbook("data/ApplicableLanguageExpectedAttibute.xlsx");
		// applicableExpectedAttributeReader.loadSheet("Attribute");
            let applicableExpectedAttributeReader=readJson("ApplicableLanguageExpectedAttibute.json");



		let testName:string = testInfo.title;


		let LanguagesRowCount:number= applicableExpectedLangReader.length;

		await landingPage.openingLandingPage();
		await landingPage.clickingSettingEllipsesButton();

		await landingPage.clickingLanguageDropdownButton();



		LanguagesRowCount = genericUtility.resolveLanguageIterationCount(LanguagesRowCount);

		for(let languageIndex=1;languageIndex<LanguagesRowCount;languageIndex++) {

			let langText:string =applicableExpectedLangReader[languageIndex]['Applicable Language'];
			console.log(langText+"    "+languageIndex);


			await landingPage.clickingLanguageByName(langText);
			await landingPage.waitForPageToLoad();

			// await landingPage.clickingSettingEllipsesButton();
		//	genericUtility.isElementInViewport(landingPage.languageDropdownUnderSettings);
			// await genericUtility.capture(testInfo);
			// await landingPage.clickingSettingEllipsesButton();



			await landingPage.clickingSettingEllipsesButton();

			let languageFromSettings:string =await landingPage.getsettingEllipsesOptionsListLandingPage();
			await landingPage.clickingSettingEllipsesButton();


			let applicableLanguage:string=applicableExpectedLangReader[languageIndex]['Applicable Language'];
			let detectedLanguage:string=detectLanguage(languageFromSettings);
			let expectedLanguage:string=applicableExpectedLangReader[languageIndex]['Expected Language'];


		    let expectedLanguageAttribute:string=await applicableExpectedAttributeReader[languageIndex]['Expected Attribute'];
		    let detectedLanguageAttribute:string |null=await genericUtility.getLangAttribute();

			console.log("ApplicableLanguage  "+applicableLanguage+"     "+"Detected Language   "+detectedLanguage+"  "+"Expected Language  "+expectedLanguage);
			console.log("ApplicableLanguage  "+applicableLanguage+"     "+"Detected Language attribute   "+detectedLanguageAttribute+"  "+"Expected Language attribute "+expectedLanguageAttribute);

			// softAssert.assertEquals(detectedLanguage, expectedLanguage, "Language detection mismatch for language="+langText);
			// softAssert.assertEquals(detectedLanguageAttribute, expectedLanguageAttribute, "Language attributr mismatch for language="+langText);


             if (LANGUAGES_NOT_SUPPORTED_BY_ELD.includes(langText)) {
                console.log("Skipping detected language check for " + langText + " (not supported by eld)");
            } else {
                await expect.soft(
                    detectedLanguage.toLowerCase(),
                    `Language of the settings menu text is wrong after switching to "${langText}"`
                ).toBe(expectedLanguage.toLowerCase());
            }

await expect.soft(
  detectedLanguageAttribute?.toLowerCase(),
  `<html lang> attribute is wrong after switching to "${langText}"`
).toBe(expectedLanguageAttribute.toLowerCase());


			await landingPage.clickingSettingEllipsesButton();

			await landingPage.clickingLanguageDropdownButton();


		}



    })


	




	test('verifyCountryCodeAsBasedOnRegion', async({page},testInfo)=>{



        
	//	FileReader reader=new FileReader();

 
		let landingPage=new YtLandingPage(page,testInfo);
		let genericUtility=new GenericUtility(page);
	

		// reader.loadWorkbook("data/Country_Name_Code.xlsx");
		// reader.loadSheet("CountryNameCode");

        let reader=readJson("Country_Name_Code.json");


		await landingPage.openingLandingPage();

		await landingPage.clickingSettingEllipsesButton();

		await landingPage.clickingLocationDropdownUnderSettings();




		let locationList:Locator[]=await landingPage.getLocationList();
		let locationListSize:number=locationList.length;



	    let testName=testInfo.title;


	
		

		locationListSize = genericUtility.resolveCountryIterationCount(locationListSize);





		for(let locationIndex=1;locationIndex<locationListSize;locationIndex++) {
			locationList=await landingPage.getLocationList();
		    let locationText :string = await locationList[locationIndex].innerText();


			console.log(locationText+"    "+locationIndex);

		    let locationTextFromSheet:string=reader[locationIndex]['Country Name'];
			console.log(locationTextFromSheet+"  location text from sheet  "+locationIndex);




			await locationList[locationIndex].click();
			await landingPage.waitForPageToLoad();

			// await landingPage.clickingSettingEllipsesButton();
			//genericUtility.isElementInViewport(landingPage.locationDropdownUnderSettings);
			// await genericUtility.capture(testInfo);
			// await landingPage.clickingSettingEllipsesButton();


            let applicableLocation:string =locationText;
			let expectedCountryCode:string =reader[locationIndex]['Country Code'];
			let  detectedCountryCode:string=await landingPage.getCountryCode();

			console.log("applicable location is ==  "+applicableLocation+" Expected location  =="+expectedCountryCode+"  detected country code"+detectedCountryCode);
			//softAssert.assertEquals(detectedCountryCode, expectedCountryCode,"Country code mismacth for location="+locationText);


             expect.soft(detectedCountryCode.trim().toLowerCase(), 'Country code is wrong after choosing location "' + locationText + '"')
            .toBe(expectedCountryCode.trim().toLowerCase());


			await landingPage.clickingSettingEllipsesButton();

			await landingPage.clickingLocationDropdownUnderSettings();



		}
	
    })

	



	test('verifyingGlobalFilterLandingPage', async({page},testInfo)=>{






        
    const landingPage = new YtLandingPage(page, testInfo);
    const genericUtility = new GenericUtility(page);
    const testName: string = testInfo.title;



		// FileReader verifyingGlobalFilterLandingPageDataReader=new FileReader();
		// verifyingGlobalFilterLandingPageDataReader.loadWorkbook("data/verifyingGlobalFilterLandingPage.xlsx");
		// verifyingGlobalFilterLandingPageDataReader.loadSheet("verifyingGlobalFilterLandingPag");
let verifyingGlobalFilterLandingPageDataReader=readJson("verifyingGlobalFilterLandingPage.json");

		await landingPage.openingLandingPage();
		await landingPage.givingInputUnderSearchBar("youtube");
		await genericUtility.clickEnter(landingPage.searchInputLandinfPage);

		let LanguagesRowCount:number= verifyingGlobalFilterLandingPageDataReader.length;




	

		LanguagesRowCount = genericUtility.resolveLanguageIterationCount(LanguagesRowCount);

		for(let languageIndex=1;languageIndex<LanguagesRowCount;languageIndex++) {

			await landingPage.clickingSettingEllipsesButton();

			await landingPage.clickingLanguageDropdownButton();


		   let langText :string =verifyingGlobalFilterLandingPageDataReader[languageIndex]['Applied Language'];
			console.log(langText+"    "+languageIndex);


		//	genericUtility.smoothScrollToElement(landingPage.getLanguageElementByNameBy(langText));
			await landingPage.clickingLanguageByName(langText);	
			await landingPage.waitForPageToLoad();

			// await landingPage.clickingSettingEllipsesButton();
			//genericUtility.isElementInViewport(landingPage.languageDropdownUnderSettings);
			// await genericUtility.capture(testInfo);
			// await landingPage.clickingSettingEllipsesButton();



			await landingPage.clickingGlobalFilterButton();
		//	genericUtility.isElementInViewport(landingPage.globalFilterData);
			await genericUtility.capture(testInfo);
			let globalSettingText:string= await landingPage.getDataFromGlobalFilterPopup();
			await landingPage.closeGlobalFilterPopup();

	      let  expectedData:string=verifyingGlobalFilterLandingPageDataReader[languageIndex]['Expected Data'];
			let actualValue:string =globalSettingText;


    // soft assertion: a mismatch is reported at the end of the test and the loop keeps going
        expect.soft(actualValue.trim().toLowerCase(), 'Search filter text is wrong after switching to "' + langText + '"')
            .toBe(expectedData.trim().toLowerCase());



		}



    })







	test('verifyingGlobalFilterLandingPageLingua', async({page},testInfo)=>{






        
    const landingPage = new YtLandingPage(page, testInfo);
    const genericUtility = new GenericUtility(page);
    const testName: string = testInfo.title;


		// FileReader applicableExpectedLangReader=new FileReader();
		// applicableExpectedLangReader.loadWorkbook("data/ApplicableLanguageExpectedLanguage.xlsx");
		// applicableExpectedLangReader.loadSheet("AppVExpectLanguages");

        let applicableExpectedLangReader= readJson("ApplicableLanguageExpectedLanguage.json");

		// FileReader applicableExpectedAttributeReader=new FileReader();
		// applicableExpectedAttributeReader.loadWorkbook("data/ApplicableLanguageExpectedAttibute.xlsx");
		// applicableExpectedAttributeReader.loadSheet("Attribute");

        let applicableExpectedAttributeReader=readJson("ApplicableLanguageExpectedAttibute.json");
		let LanguagesRowCount:number = applicableExpectedLangReader.length;


	 


		await landingPage.openingLandingPage();
		await landingPage.givingInputUnderSearchBar("youtube");
		await genericUtility.clickEnter(landingPage.searchInputLandinfPage);


		

		LanguagesRowCount = genericUtility.resolveLanguageIterationCount(LanguagesRowCount);


		for(let languageIndex=1;languageIndex<LanguagesRowCount;languageIndex++) {

			await landingPage.clickingSettingEllipsesButton();

			await landingPage.clickingLanguageDropdownButton();


	let  langText:string =applicableExpectedLangReader[languageIndex]['Applicable Language'];
			console.log(langText+"    "+languageIndex);


			await landingPage.clickingLanguageByName(langText);	
			await landingPage.waitForPageToLoad();

			// await landingPage.clickingSettingEllipsesButton();
			//genericUtility.isElementInViewport(landingPage.languageDropdownUnderSettings);
			// await genericUtility.capture(testInfo);
			// await landingPage.clickingSettingEllipsesButton();



			await landingPage.clickingGlobalFilterButton();
		//	genericUtility.isElementInViewport(landingPage.globalFilterData);
			await genericUtility.capture(testInfo);
		   let globalSettingText:string =await landingPage.getDataFromGlobalFilterPopup();
			await landingPage.closeGlobalFilterPopup();


            let applicableLanguage=applicableExpectedLangReader[languageIndex]['Applicable Language'];
			let  detectedLanguage=detectLanguage(globalSettingText);
			let  expectedLanguage=applicableExpectedLangReader[languageIndex]['Expected Language'];

		    let expectedLanguageAttribute:string=applicableExpectedAttributeReader[languageIndex]['Expected Attribute'];
		    let detectedLanguageAttribute:string |null =await genericUtility.getLangAttribute();

			console.log("ApplicableLanguage  "+applicableLanguage+"     "+"Detected Language   "+detectedLanguage+"  "+"Expected Language  "+expectedLanguage);
			console.log("ApplicableLanguage  "+applicableLanguage+"     "+"Detected Language attribute   "+detectedLanguageAttribute+"  "+"Expected Language attribute "+expectedLanguageAttribute);

			// softAssert.assertEquals(detectedLanguage, expectedLanguage, "Language detection mismatch for language="+langText);
			// softAssert.assertEquals(detectedLanguageAttribute, expectedLanguageAttribute, "Language attributr mismatch for language"+langText);


                  if (LANGUAGES_NOT_SUPPORTED_BY_ELD.includes(langText)) {
                console.log("Skipping detected language check for " + langText + " (not supported by eld)");
            } else {
                await expect.soft(
                    detectedLanguage.toLowerCase(),
                    `Language of the search filter text is wrong after switching to "${langText}"`
                ).toBe(expectedLanguage.toLowerCase());
            }

await expect.soft(
  detectedLanguageAttribute?.toLowerCase(),
  `<html lang> attribute is wrong after switching to "${langText}"`
).toBe(expectedLanguageAttribute.toLowerCase());



		}

	





    });



	