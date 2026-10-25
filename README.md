# YouTube Multi-Language UI Validator (Playwright)

[![Playwright tests](https://github.com/sagarjhathi/youtube-multi-language-ui-validator-automation-play/actions/workflows/playwright.yml/badge.svg)](https://github.com/sagarjhathi/youtube-multi-language-ui-validator-automation-play/actions/workflows/playwright.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

End-to-end tests that switch the YouTube interface language (and region) again and again, and check that the UI shows the right text for each one. Written with Playwright and TypeScript. It is the Playwright version of a Java and Selenium project that does the same checks.

The tests run against the **live** youtube.com, signed out, in a real browser. Nothing is mocked.

## What is checked

| Test | What it verifies |
|---|---|
| `verifyingSideMenuLanguageAsInSettings` | Expanded side-menu text for each language equals the expected text in the data sheet (YouTube Music and YouTube TV are left out, and the Hype / Live entry is matched to what the page shows, see Known issues) |
| `verifyingSideMenuLanguageAsInSettingsLingua` | The side-menu text is detected as the expected language, and `<html lang>` has the expected value |
| `verifyingSideMenuCollapsedLangAsInSettings` | Collapsed side-menu text for each language equals the expected text |
| `verifyingSideMenuCollapsedLangAsInSettingsLingua` | Detected language and `<html lang>` for the collapsed menu |
| `verifyingSettingOptionsLang` | Detected language of the settings menu, and `<html lang>` |
| `verifyCountryCodeAsBasedOnRegion` | The country code on the YouTube logo for each region in the location list |
| `verifyingGlobalFilterLandingPage` | Search-filter popup text on the results page for each language |
| `verifyingGlobalFilterLandingPageLingua` | Detected language of the filter popup, and `<html lang>` |

The tests whose name ends in `Lingua` use the `eld` language detector instead of an exact text match. They are named after Lingua, the detector the Java project uses.

Text comparisons use **soft assertions**, so one wrong language is reported at the end and the loop keeps going. A language or location that throws an error is retried once on its own (see [Per-item retry](#per-item-retry-loopguard)). The `Lingua` tests also check that the attribute data file has the same language on each row as the language data file.

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
- `npx playwright test` with no file runs every spec in `tests/`: both `YtMaster.spec.ts` and `YtMasterSafeActions.spec.ts`. Give a file path to run only one.
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
  LoopGuard.ts                  retries one failed language or location, keeps the rest of the loop going
  LanguageChecks.ts             text normalising, language and lang attribute checks, assertion messages
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
| `retries` | 0 | 1 (`YtMasterSafeActions.spec.ts` sets `retries: 1` itself, so it retries once locally too) |
| `forbidOnly` (fail if `test.only` is left in) | off | on |
| `globalTimeout` (limit for the whole run) | none | 80 minutes, so the 90-minute job still has time to upload the reports |
| `trace` | kept on failure | kept only for the first run of a test, and only if it failed (the retry is not traced; set to `'off'` for smaller artifacts) |
| `video` | kept on failure | off |
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

### Per-item retry (LoopGuard)

Every test is a long loop over about 50 languages or locations, and each step reloads the whole page. One slow page or one missing element used to end the loop at that point, so the languages after it were never checked, and the only recovery was to run the whole test again. `utils/LoopGuard.ts` (ported from the Java project) handles this one item at a time:

1. Each language or location runs in its own `try/catch`.
2. If it throws, the page is brought back to where the loop starts (reload, reopen the language list), and **only that item is run again**.
3. If the retry passes, it is only logged (`passed on the retry`). If it fails again, one failure is recorded for that item (`Failed at Dansk (also failed on retry) | ...`) and the loop moves on to the next one.
4. A passing item resets the failure counts. The loop stops early after 3 environment failures in a row (network error, browser closed) or 5 other failures in a row (missing element, code error), and records `Aborted at X | ... remaining items not checked`.

**Why it is a good addition**

- **Nothing is lost:** the languages already checked and the failures already recorded are kept. The retry repeats one item, not the whole loop, so a failure at language 40 no longer costs the other 39 or the 10 after it.
- **Only real failures are reported:** a one-off hiccup that passes on the retry does not fail the test. A language that fails twice is listed by name with the error type, the element, the reason and the page URL.
- **Quick stop when the environment is broken:** if the network or browser is down, the loop does not spend the test timeout trying every remaining language.
- **Cheaper than a whole-test retry:** repeating one item takes seconds, repeating the loop takes about half an hour.

The test-level `retries: 1` is still on, and it works together with LoopGuard. LoopGuard covers a failing item inside a loop. The test retry covers a failure outside it (opening the page, the first language list). On CI the trace is kept for the first failed run of a test and not for its retry, and no video is recorded, so the artifacts stay small.

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
- Long loops of many language switches can fail at a different place from run to run. LoopGuard (above) retries the failed language once and keeps going, so one bad language no longer hides the rest.
- YouTube shows the Hype entry, the Live entry, or neither in one slot of the side menu, and each is translated differently in every language. The expected data holds the Hype word. `data/HypeLiveWords.json` lists both words for each language, and the expanded side-menu test first compares the texts as they are. If they differ and the page shows the Live word, the Hype word in the expected text is replaced by the Live word (so the entry must also be in the right place). If the page shows neither word, the Hype word is removed from the expected text. Anything else, or a language missing from the file, fails the comparison. The Live words came from one CI run, so correct the file when a language fails on them.

The notes in `docs/` (local only, not committed) list every failure type seen, everything that was tried, and the run results. Start with `docs/README.md`.

## License

MIT. See [LICENSE](LICENSE).
