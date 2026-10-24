import { defineConfig, devices, ReporterDescription, PlaywrightWorkerOptions } from '@playwright/test';

// GitHub Actions sets CI=true. To try the CI settings on your machine: CI=true npx playwright test
const isCI = !!process.env.CI;

// Allure writes its raw results to this folder. `npm run allure:generate` turns them into a report.
const ALLURE: ReporterDescription = ['allure-playwright', { resultsDir: 'allure-results' }];


// ------------------------------------------------------------------
// The settings that are different in a local run and in a CI run.
// Both objects have the same keys, so the two runs can be compared side by side.
// ------------------------------------------------------------------
type RunSettings = {
  forbidOnly: boolean;                         // fail the run if a test.only was left in the code
  retries: number;                             // how many times a failed test is run again
  globalTimeout: number;                       // limit for the whole run in ms, 0 = no limit
  trace: 'off' | 'on' | 'retain-on-failure' | 'retain-on-first-failure';   // when to keep the Playwright trace
  reporter: ReporterDescription[];
  video: PlaywrightWorkerOptions['video'];     // when to keep a video of the test, can also set the video size
};

const local: RunSettings = {
  forbidOnly: false,
  retries: 0,
  globalTimeout: 0,
  trace: 'retain-on-failure',
  // open: 'never' keeps the terminal free after a failure. Open the report yourself with: npm run report
  reporter: [['html', { open: 'never' }], ALLURE],
  video: 'retain-on-failure',                  // 'on' would also keep a video of every passing test
};

const ci: RunSettings = {
  forbidOnly: true,
  retries: 1,
  // The CI job is stopped after 90 minutes and a stopped job builds no report.
  // Ending the run at 80 minutes ourselves leaves time to upload the results.
  globalTimeout: 80 * 60 * 1000,
  trace: 'retain-on-first-failure',            // trace of the first run only, if it failed; the retry is not traced. Use 'off' to keep CI artifacts small
  // blob reports of all the shards are merged into one HTML report after the run
  reporter: [['blob'], ALLURE],
  video: 'off',                                // no video on CI, keeps the artifacts and the published report small
};

const run = isCI ? ci : local;


// ------------------------------------------------------------------
// Browsers. Pick them with the BROWSERS environment variable:
//   BROWSERS=firefox            one browser
//   BROWSERS=chromium,webkit    several browsers
//   BROWSERS=all                every browser in the list below
// Nothing set = chromium only. Every chosen browser runs every test, so 2 browsers take twice as long.
// ------------------------------------------------------------------
const BROWSERS = {
  chromium: { device: devices['Desktop Chrome'], chromiumBased: true },                          // Playwright's own Chromium
  chrome:   { device: { ...devices['Desktop Chrome'], channel: 'chrome' }, chromiumBased: true },  // Google Chrome installed on the machine
  edge:     { device: { ...devices['Desktop Edge'], channel: 'msedge' }, chromiumBased: true },    // Microsoft Edge installed on the machine
  firefox:  { device: devices['Desktop Firefox'], chromiumBased: false },
  webkit:   { device: devices['Desktop Safari'], chromiumBased: false },
};

// These flags exist only in Chromium based browsers, so Firefox and WebKit do not get them.
const CHROMIUM_ARGS = [
  '--start-maximized',
  '--disable-translate',
  '--disable-features=Translate,TranslateUI',
  '--disable-blink-features=AutomationControlled',     // hides the "controlled by automation" flag from the page
];

type BrowserName = keyof typeof BROWSERS;

function chosenBrowsers(): BrowserName[] {
  const value = (process.env.BROWSERS || 'chromium').toLowerCase();
  const names = value === 'all' ? Object.keys(BROWSERS) : value.split(',').map(name => name.trim()).filter(name => name !== '');

  const unknown = names.filter(name => !(name in BROWSERS));
  if (unknown.length > 0) {
    throw new Error('Unknown browser in BROWSERS: ' + unknown.join(', ') + '. Use: ' + Object.keys(BROWSERS).join(', ') + ' or all');
  }
  return [...new Set(names)] as BrowserName[];     // a name written twice runs once
}


// ------------------------------------------------------------------
// Everything below is the same for a local run and a CI run.
// ------------------------------------------------------------------
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,

  forbidOnly: run.forbidOnly,
  retries: run.retries,
  globalTimeout: run.globalTimeout,
  reporter: run.reporter,

  // Number of tests that run at the same time. Change it for one run with PW_WORKERS=3
  workers: Number(process.env.PW_WORKERS) || 2,

  // One test goes through all the languages, so it needs a long time (40 minutes).
  timeout: 40 * 60 * 1000,

  use: {
    trace: run.trace,
    screenshot: 'off',
    video: run.video,

    headless: true,                            // set to false to watch the browser
    actionTimeout: 30 * 1000,                  // one click or one wait
  },

  // one project for every chosen browser
  projects: chosenBrowsers().map(name => ({
    name: name,
    use: {
      ...BROWSERS[name].device,
      // A headless browser has no window to maximize, so the size is fixed.
      viewport: { width: 1920, height: 1080 },
      launchOptions: {
        args: BROWSERS[name].chromiumBased ? CHROMIUM_ARGS : [],
        slowMo: 500,                           // pause 0.5 s between actions so YouTube has time to finish loading
      },
    },
  })),
});
