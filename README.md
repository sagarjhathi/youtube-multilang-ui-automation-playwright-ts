# YouTube Multi-Language UI Validator (Playwright)

End-to-end tests that switch the YouTube interface language (and region) again and again, and check that the UI shows the right text for each one. Written with Playwright and TypeScript. It is the Playwright version of a Java and Selenium project that does the same checks.

The tests run against the **live** youtube.com, signed out, in a real browser. Nothing is mocked.

## What is checked

| Test | What it verifies |
|---|---|
| `verifyingSideMenuLanguageAsInSettings` | Expanded side-menu text for each language equals the expected text in the data sheet |
| `verifyingSideMenuLanguageAsInSettingsLingua` | The side-menu text is detected as the expected language, and `<html lang>` has the expected value |
| `verifyingSideMenuCollapsedLangAsInSettings` | Collapsed side-menu text for each language equals the expected text |
| `verifyingSideMenuCollapsedLangAsInSettingsLingua` | Detected language and `<html lang>` for the collapsed menu |
| `verifyingSettingOptionsLang` | Detected language of the settings menu, and `<html lang>` |
| `verifyCountryCodeAsBasedOnRegion` | The country code on the YouTube logo for each region in the location list |
| `verifyingGlobalFilterLandingPage` | Search-filter popup text on the results page for each language |
| `verifyingGlobalFilterLandingPageLingua` | Detected language of the filter popup, and `<html lang>` |

The tests whose name ends in `Lingua` use the `eld` language detector instead of an exact text match. They are named after Lingua, the detector the Java project uses.

Text comparisons use **soft assertions**, so one wrong language is reported at the end and the loop keeps going.

## Requirements

- Node.js 24
- Windows, macOS or Linux

## Setup

```
npm install
npx playwright install chromium
```

## Running the tests

Run the safe-actions spec, the one used on CI:

```
npx playwright test tests/YtMasterSafeActions.spec.ts
```

Useful variants:

```
npx playwright test tests/YtMasterSafeActions.spec.ts -g "verifyingGlobalFilterLandingPage$"   # one test by name
npx playwright test --last-failed                                                              # only what failed last time
npx playwright test --workers=1                                                                # one test at a time
npx playwright show-report                                                                     # open the HTML report
```

Notes:
- `npx playwright test` with no file runs every spec in `tests/`: both `YtMaster.spec.ts` and `YtMasterSafeActions.spec.ts`, plus the scratch file `test-1.spec.ts`. Give a file path to run only one.
- A full run of all languages takes a while: each long test needs about 20 to 30 minutes.
- Headless is on by default (`headless: true` in `playwright.config.ts`). Set it to `false` to watch the browser.

## Reports

Every run writes two reports:

- **Playwright HTML report**: `playwright-report/`, open with `npm run report`.
- **Allure results**: `allure-results/`. Turn them into a report with:

  ```
  npm run allure:generate     # builds allure-report/
  npm run allure:open         # opens it in the browser
  npm run allure:serve        # or: generate and serve in one step
  ```

  Allure needs Java on the machine (the command line tool is a Java program).

## Project layout

```
tests/
  YtMaster.spec.ts              original version, plain Playwright clicks and waits
  YtMasterSafeActions.spec.ts   same tests using the SafeActions helper (the maintained one)
pages/YtLandingPage.ts          page object: locators and page methods
utils/
  SafeActions.ts                safe click / find element / find elements with waits and retries
  GenericUtility.ts             html lang attribute, Enter key, screenshots, iteration counts
  ReadJSON.ts                   reads and writes the data files in data/
configs/
  runconfig.json                run settings (language count, countries, URL)
  RunConfig.ts                  reads runconfig.json, environment variables win
eld-language-detection/
  languageDetector.mts          language detection helpers on top of the eld library
data/                           expected results, one JSON file per check
.github/workflows/playwright.yml  CI: sharded run with one merged report
docs/                           working notes (local only, git-ignored)
```

### Data files (`data/`)

| File | Used for |
|---|---|
| `verifyingSideMenuLanguageAsInSettings.json` | Expected expanded side-menu text per language |
| `verifyingSideMenuCollapsedLangAsInSettings.json` | Expected collapsed side-menu text per language |
| `ApplicableLanguageExpectedLanguage.json` | Expected detected language per language |
| `ApplicableLanguageExpectedAttibute.json` | Expected `<html lang>` value per language (the file name keeps its original spelling) |
| `Country_Name_Code.json` | Expected country code per region |
| `verifyingGlobalFilterLandingPage.json` | Expected search-filter popup text per language |
| `LanguagesList.json` | List of languages |

The expected text comes from the live site, so it goes out of date when YouTube changes its menus. When a check starts failing on many languages at once with the same small difference, the sheet is probably stale.

## Configuration

### `configs/runconfig.json`

| Key | Meaning |
|---|---|
| `runForAllLanguages` | `true` runs every language row; `false` runs only `overideLanguageCount` rows |
| `overideLanguageCount` | How many languages to run when `runForAllLanguages` is `false` |
| `runForAllCountries`, `overideCountriesCount` | The same two settings for the country test |
| `Url` | Start page |
| keys ending in `CI` | The same settings for scheduled runs (see below) |

Every key can be overridden with an environment variable of the same name, and the variable wins over the file. For a quick run of 10 languages:

```
# PowerShell
$env:runForAllLanguages = "false"; $env:overideLanguageCount = "10"; npx playwright test tests/YtMasterSafeActions.spec.ts

# Git Bash / Linux / macOS
runForAllLanguages=false overideLanguageCount=10 npx playwright test tests/YtMasterSafeActions.spec.ts
```

Setting `IS_CRON=true` makes the tests read the `...CI` keys instead.

### `playwright.config.ts`

The settings that differ between a local run and a CI run sit side by side in two objects, `local` and `ci`, at the top of the file. Everything else is shared.

| Setting | Local | CI (`CI=true`) |
|---|---|---|
| `retries` | 0 | 1 |
| `forbidOnly` (fail if `test.only` is left in) | off | on |
| `globalTimeout` (limit for the whole run) | none | 80 minutes, so the 90-minute job still has time to upload the reports |
| `trace` | kept on failure | kept on failure (set to `'off'` for smaller artifacts) |
| `video` | kept on failure | kept on failure, at 640x360 to keep the published report light |
| Reporters | HTML (never opens by itself) and Allure | blob (merged into one HTML report afterwards) and Allure |

Shared by both: one project per chosen browser (see Browsers below) at 1920x1080, headless, 2 workers (`PW_WORKERS=3` changes it for one run), a 40-minute test timeout, a 30-second action timeout, `slowMo` of 500 ms, screenshots off.

To try the CI settings on your machine: `CI=true npx playwright test` (PowerShell: `$env:CI = "true"; npx playwright test`). Open the local HTML report with `npm run report`.

When the `CI` environment variable is set, the screenshot helper `GenericUtility.capture()` also does nothing.

### Browsers

By default the tests run in Playwright's Chromium only. Choose others with the `BROWSERS` environment variable:

| Value | Runs |
|---|---|
| (not set) | `chromium` |
| `firefox` | one browser |
| `chromium,webkit` | several browsers (names are not case sensitive, spaces are ignored, a repeated name runs once) |
| `all` | `chromium`, `chrome`, `edge`, `firefox` and `webkit` |

```
# PowerShell
$env:BROWSERS = "firefox"; npx playwright test tests/YtMasterSafeActions.spec.ts

# Git Bash / Linux / macOS
BROWSERS=chromium,webkit npx playwright test tests/YtMasterSafeActions.spec.ts
```

- Every chosen browser runs every test, so two browsers take twice as long. With `all` the safe spec lists 40 tests (8 per browser).
- An unknown name stops the run with a message that lists the valid ones.
- `chrome` and `edge` use the Google Chrome and Microsoft Edge installed on the machine. `chromium`, `firefox` and `webkit` need `npm run install:browsers` once.
- The `--disable-blink-features=AutomationControlled` flag exists only in Chromium based browsers, so only `chromium`, `chrome` and `edge` get it.
- The expected data was captured in Chromium, so Firefox and WebKit can show small differences in text or layout. CI installs only Chromium. To run other browsers there, set `BROWSERS` in the workflow's `env:` and install them in the install step.

## How the tests work

1. Open youtube.com, open the settings menu, open the language list.
2. For each language row: pick the language, wait for the page to reload, read the part of the UI that the test checks (side menu, settings menu, filter popup or logo), and compare it with the expected data or detect its language.
3. Open the language list again for the next language.

`SafeActions` (a port of the Java class of the same name) is used for clicks and for reading element lists in the safe spec. It waits until an element is visible and enabled, tries up to 3 times, refreshes the page between the later attempts, falls back to a DOM click, and throws a clear error when everything fails. `safeDomClick` is used for language clicks, so Playwright does not wait for the page navigation the click starts.

### Language detection

Detection uses the [`eld`](https://www.npmjs.com/package/eld) library through `eld-language-detection/languageDetector.mts`. `eld` has no model for Afrikaans, Bahasa Indonesia and Bosanski, and mixes up Dansk, so those four are in a skip list in the spec and only their `<html lang>` value is checked.

## CI (GitHub Actions)

`.github/workflows/playwright.yml` runs `tests/YtMasterSafeActions.spec.ts` on push and pull request to `main` or `master`, on manual run, and every night at 01:30 IST (cron `0 20 * * *`, since GitHub cron uses UTC). The nightly run sets `IS_CRON=true`, so it reads the `...CI` keys in `runconfig.json`. It splits the tests into 4 shards, uploads each shard's blob report, then merges them into a single HTML report that is uploaded as the **`playwright-report`** artifact. Each shard also uploads its Allure results; a final step puts them together and uploads one **`allure-report`** artifact (download it, unzip it and open the folder with `npx allure open <unzipped folder>`; Allure pages do not work when opened straight from the file system).

### Published reports (GitHub Pages)

On a push to `main` or `master`, a manual run or the nightly run, the merge job also publishes the reports to the `gh-pages` branch (pull requests only build them):

- `index.html`: a landing page with links to both reports and the run number, commit and time (from `.github/pages/index.html`)
- `allure/`: the Allure report. Before it is generated, the `history` folder of the previous published report is copied in, so the trend graphs carry over from run to run
- `playwright/`: the merged Playwright HTML report

Each publish replaces the whole branch with one new commit, so `gh-pages` never grows. One-time setup: in the repository go to Settings, Pages, choose "Deploy from a branch", branch `gh-pages`, folder `/ (root)`. The first run creates the branch. The merge job has `contents: write` permission (set in the workflow file) to push it. Pages on a private repository depends on the GitHub plan.

The expected data was captured from India. GitHub's runners are in the US, so menus, wording and country codes can differ there.

## Known issues

This tests a page that the project does not control, so some failures are not bugs in the tests:

- YouTube changes menus without notice. For example "YouTube Music" and "YouTube TV" appear in the side menu in some runs and not in others, so the first test leaves both out of its comparison.
- A language switch reloads the whole page, and some languages (Greek in particular) sometimes load slowly or hang.
- Long loops of many language switches can fail at a different place from run to run.

The notes in `docs/` (local only, not committed) list every failure type seen, everything that was tried, and the run results. Start with `docs/README.md`.

## License

MIT. See [LICENSE](LICENSE).
