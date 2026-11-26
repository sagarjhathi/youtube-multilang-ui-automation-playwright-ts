# CLAUDE.md

Project rules for every AI session in this repository (TypeScript + Playwright). This file is tracked in git, so a fresh clone starts with the rules. Facts were checked on 2026-11-22 against the repo, `git log`, `npx tsc --noEmit -p .` (clean) and `npx playwright test --list`. Anything not run or read is marked UNVERIFIED.

## 0. Start-of-session habit

1. Read this file.
2. Read `docs/STATUS.md` and `docs/LESSONS.md`. Read `docs/DECISIONS.md` when you are about to change how something works.
3. `docs/` is git-ignored (local notes only). If it is missing on this machine, say so and do not invent history; work from this file, the code and `git log`.
4. Run `git status -sb` and `git log --oneline -5` yourself. Do NOT trust a status snapshot given at the start of a conversation; it can be stale.

## 1. Project purpose

- **What it is:** end-to-end tests that switch the YouTube interface language (and region) again and again on the **live** youtube.com, signed out, in a real browser, and check that the UI shows the right text for each one. Nothing is mocked.
- **Who it is for:** the owner (GitHub `sagarjhathi`), as a portfolio and learning project. It is an educational test project, not a scraper or a load tool. It uses the public site the way a visitor does. UNVERIFIED: the owner has not written a terms-of-use position; the project keeps runs small (see rules 3 and section 7).
- **End goal:** a suite whose failures are real. YouTube changes menus without notice, so the suite tolerates known harmless variations (allowed versions), retries one bad item without hiding the rest (LoopGuard), proves it can fail (canary), and says clearly when a CI run is incomplete (coverage check).
- **Sister project (other stack):** Java + Selenium + TestNG + Maven, at `C:\Sagar\youtube-multi-language-ui-validator-automation`, GitHub `sagarjhathi/youtube-multilang-ui-automation-selenium-java`, remote named `origin`. **This repo's sessions never edit it.** Read-only is fine. Changes go there through a written prompt (skill `port-to-java-prompt`).
- **This repo on GitHub:** `sagarjhathi/youtube-multilang-ui-automation-playwright-ts` (renamed; the old name redirects, and the old Pages URL returns 404). The local git remote is still named `youtube-multi-language-ui-validator-automation-play`, **not** `origin`.
- **Live report hub:** https://sagarjhathi.github.io/youtube-multilang-ui-automation-playwright-ts/ (HTTP 200 checked 2026-11-22). Playwright report: `.../playwright/index.html`. Canary runs publish under `canary/`.

## 2. Tech stack

| Item | Value | Source |
|---|---|---|
| Node.js | 24 (CI `node-version: 24`) | workflow, README |
| Language | TypeScript, `strict`, target es2022, `module: nodenext`, `noEmit` | `tsconfig.json` |
| Module type | `"type": "commonjs"`; `eld-language-detection/languageDetector.mts` is ESM | package.json |
| Test framework | `@playwright/test ^1.64.0` | package.json |
| Language detection | `eld ^2.1.0` | package.json |
| Reporting | HTML (local), blob (CI, merged), Allure: `allure-playwright ^3.13.0`, `allure-commandline ^2.46.1` | package.json, config |
| Types | `@types/node ^26.6.5` | package.json |
| Logging | `console.log` lines, one per item, plus a `Summary | ...` line | code |
| CI | GitHub Actions, workflow `Playwright tests`: checkout@v7, setup-node@v7, upload-artifact@v7, download-artifact@v8, setup-java@v6 (Java 17 temurin, for Allure, in `merge-reports`) | `.github/workflows/playwright.yml` |
| Hosting of reports | GitHub Pages from the `gh-pages` branch | workflow |
| Notifications | Discord webhook, secret `YT_PLAYWRIGHT` | workflow |
| License | MIT | LICENSE |

Ranges are from `package.json`; exact installed versions are in `package-lock.json`. TypeScript `^7.0.2` is a declared dev dependency since 2026-11-22 (before that, `tsc` ran from a global install on the owner's PC and was not declared). `package.json` `name` is `youtube-multilang-ui-automation-playwright-ts`.

## 3. Folder map

```
CLAUDE.md                          this file (tracked)
README.md                          public description, data files, allowed versions, CI explanation
playwright.config.ts               local vs CI settings, browsers, slowMo 250
tsconfig.json
configs/runconfig.json, RunConfig.ts    run settings; an environment variable with the same name wins
data/                              languages.json, expectedSideMenuExpanded.json, expectedSideMenuCollapsed.json,
                                   expectedSearchFilter.json, countryCodes.json
eld-language-detection/languageDetector.mts   the only file of the detector wrapper
pages/YtLandingPage.ts             page object (most locators private)
utils/SafeActions.ts               click/find with waits, retries, refresh, DOM-click fallback
utils/LoopGuard.ts                 per-item retry, abort rules for the language/location loops
utils/SoftChecks.ts                soft-check buffer tied to LoopGuard
utils/LanguageChecks.ts            normalizing, allowed versions, detection helpers
utils/ReadJSON.ts                  readJson, readJsonByName (rows found by NAME)
utils/Canary.ts                    canary mode
utils/GenericUtility.ts            small shared helpers on a Page
utils/Evidence.ts                  screenshots of failures (kept only where something went wrong, with a text note)
tests/YtMasterSafeActions.spec.ts  the 9 LIVE tests (run on CI in 4 shards)
tests/FallbackMechanisms.spec.ts   37 OFFLINE tests on fake pages (no network)
.github/workflows/playwright.yml   CI: offline-checks -> test (4 shards) -> merge-reports (+ notify-offline-failure)
.github/pages/index.html           landing page of the report hub
docs/                              GIT-IGNORED local notes: STATUS, DECISIONS, LESSONS and 30 older notes
.claude/                           GIT-IGNORED local: settings.json, skills, agents
```

**Test counts** (from `npx playwright test --list`, run 2026-11-22): 46 tests in 2 files = 9 live + 37 offline (4 new on 2026-11-26). With `BROWSERS=all` the live spec lists 45 (9 per browser). A real CI report of 2026-11-20 showed 9 of 9 live tests (read from the published Playwright report).

**Git-ignored:** `docs/`, `.claude/`, `CLAUDE.local.md`, `.env`, `.env.*`, `node_modules/`, `test-results/`, `playwright-report/`, `blob-report/`, `allure-results/`, `allure-report/`. **Tracked:** everything else, including `CLAUDE.md`. Nothing under `docs/` or `.claude/` is tracked (checked with `git ls-files` and `git ls-files -ci --exclude-standard`, both empty on 2026-11-22). Only `CLAUDE.md` is tracked of the agent setup files; the rest are local and ignored, so where they live does not matter.

## 4. Commands

Run from the repo root. Status: **verified** = run on 2026-11-22; otherwise UNVERIFIED today.

| Purpose | Command | Status |
|---|---|---|
| Typecheck | `npm run typecheck` (= `tsc --noEmit -p .`, local TypeScript 7.0.2) | **verified**, exit 0 |
| Lint | none. The repo has no lint tool and no lint script | verified by reading `package.json` |
| Unit tests | none separate; the OFFLINE suite is the fast check: `npm run offline-checks` (= `playwright test tests/FallbackMechanisms.spec.ts`) | **verified** 2026-11-26: 36 passed + 1 flaky (W1, on purpose), 35.5 s |
| One offline test | `npx playwright test tests/FallbackMechanisms.spec.ts -g "H4b"` | **verified** (passed) |
| List tests | `npm run list-tests` (= `playwright test --list`, 46); `npx playwright test tests/YtMasterSafeActions.spec.ts --list` (9) | **verified** |
| One live case | `npx playwright test tests/YtMasterSafeActions.spec.ts -g "verifyingSearchFilterText$"` | UNVERIFIED today; LIVE, ask first |
| A shard | `npx playwright test tests/YtMasterSafeActions.spec.ts --shard=1/4` | UNVERIFIED today; LIVE, ask first (this is what CI runs) |
| Whole live suite | `npx playwright test tests/YtMasterSafeActions.spec.ts` | LIVE, 20-30 min per long test locally; never run it to "check" |
| Canary (every test must FAIL) | `CANARY=true npx playwright test tests/YtMasterSafeActions.spec.ts -g "<test>$"` (PowerShell: `$env:CANARY = "true"; ...`); or tick `canary` in Actions > Playwright tests > Run workflow. LIVE: ask first. Details and expected failures: README "Canary run" | README, UNVERIFIED today |
| Failed only | `npx playwright test --last-failed` | README |
| Reports | `npm run report`; `npm run allure:generate`, `allure:open`, `allure:serve` (Allure needs Java) | package.json |
| Install | `npm install`, `npx playwright install chromium` | README |

Machine notes: no `python`, `jq` or `gh` on the owner's PC; use `node` and `curl`. The public GitHub API is rate-limited (about 60 calls an hour without a token); call it once and save the result. Job logs need a login. Bash tool = Git Bash (`VAR=x cmd`); PowerShell tool needs `$env:VAR='x'; cmd`.

**Settings, variables and defaults** (read from the code):

| Name | Default | Effect |
|---|---|---|
| `CANARY` (env or `"CANARY"` in runconfig.json) | false | one value per test is spoiled; every test must fail; retries off; trace off |
| `BROWSERS` | `chromium` | `firefox`, `chromium,webkit`, `all` (chromium, chrome, edge, firefox, webkit) |
| `PW_WORKERS` | 2 | parallel tests |
| `CI` | unset | set by GitHub Actions: CI settings (blob+Allure reporters, `forbidOnly`, video off, 80 min global timeout, trace on first failure) vs local (HTML+Allure, video on failure) |
| `IS_CRON` | false unless the value is `true`; the workflow sets it to true only for the nightly (`schedule`) run | selects the `...CI` keys of runconfig.json (so a push run on CI uses the normal keys) |
| runconfig keys | `runForAllLanguages` true, `languageCount` 50; `runForAllLocations` **false**, `locationCount` **10**; CI keys (nightly only): `runForAllLanguagesCI` true, `languageCountCI` 2, `runForAllLocationsCI` true, `locationCountCI` 111 (all locations; unused while the all-flag is true) | how many rows a run goes through. Owner decision 2026-11-22: a local run and a push/PR run on CI check 10 locations (5 per half); the nightly cron checks all. When a `runForAll...` key is true its count key is ignored (`GenericUtility.resolveIterationCount`). Do not change without asking |
| `Url` | `https://www.youtube.com/` | start page |
| Test timeout / action timeout | 40 min / 30 s | `playwright.config.ts` |
| `retries` | 1 (0 in canary) | a failed test runs again in a fresh browser; LoopGuard retries an item before that |
| `slowMo` | 250 ms | pause between actions so YouTube can finish loading; do not remove blindly |

## 5. Conventions

- **Layers:** tests -> page object (`pages/`) -> safe wrappers (`utils/SafeActions.ts`) -> Playwright / utilities (`utils/`) -> reporting (config reporters, `Summary |` log lines). Each layer calls only the one below. Tests do not call raw locator actions that SafeActions covers.
- **Naming:** live tests `verifying...` (e.g. `verifyingSideMenuText_Expanded`); offline tests `<group letter><number>` (M, L, P, H, W, D; H4b is the Deutsch wording test). Utilities `PascalCase.ts`, data files `camelCase.json`. Test names are read by other code (offline test D5, the CI coverage check): search the whole repo before renaming one.
- **Style:** 2-space indent, semicolons, `strict`. No formatter or linter is configured; do not add one unasked. Comments explain WHY in full sentences. The owner wants changes kept simple, with easy to understand syntax.
- **Page object:** locators used only inside the class are `private`.
- **Test patterns:**
  - One test goes through all languages or locations. Use `softCheck(...)` inside loops (a wrong value is reported at the end and the loop continues). Use hard `expect` only outside loops.
  - Each item runs inside `LoopGuard` (`itemPassed()`, `retryAfterFailure()`, `shouldStop()`): one retry per item; abort after 3 environment or 5 other failures in a row.
  - All loops start at row 0. Rows are found by NAME (`readJsonByName`); a duplicate name stops the test.
  - Missing data or a missing page option throws an error that names it; it never silently passes. A skipped detection (`Detection Skipped` in `languages.json`: Afrikaans, Bahasa Indonesia) is logged as skipped and the `<html lang>` check still runs. The code has no `test.skip` (grep, 2026-11-22).
  - Text compares are case-sensitive after normalization (`normalizeForCompare`). The expanded menu compares against **allowed versions**: base text with `{placeholders}`; the row's `Alternatives` object lists the options (`""` = entry missing); every combination is allowed.
- **Git:** branches seen: `master` (used) and `recovery` (old, merged by PRs #1 and #2); remote also has `gh-pages` (published reports; never touch by hand). The workflow triggers on `main` and `master`, but no `main` exists. **The owner makes every commit and push.** No commit-message format or branching convention is defined here.
- **CI:** workflow `Playwright tests`. Jobs: `offline-checks` (runs the offline suite first; if it fails the rest is skipped) -> `test` (matrix of 4 shards, `--shard=i/4`, `fail-fast` off) -> `merge-reports` (merges blob reports, Allure, coverage check, publishes to `gh-pages`, stays green) plus `notify-offline-failure`. Triggers: push and pull_request on main/master, manual run with switches `canary`, `check_failed_tests`, `check_lost_shard`, and nightly cron `13 4 * * *` UTC (09:43 IST). `concurrency` group per ref cancels older runs; publishing has its own lock `gh-pages-publish`; pull requests build reports but never publish. Discord messages (secret `YT_PLAYWRIGHT`): each shard start, the merge-reports result, offline-check failure; all `continue-on-error: true`.

## 6. Rules for agents

1. Read docs/STATUS.md and docs/LESSONS.md at the start of every session (section 0).
2. Never guess. If unsure, search the code, run it, or ask. A command, path, number, version or date must come from something you read or ran.
3. Run code and tests before claiming something works, and report the real output. Offline checks are cheap; a live run loads the real site: ask the owner first, then run one case only.
4. Verify version-sensitive facts against official docs and cite them. If you did not look it up in this session, mark it UNVERIFIED.
5. Make focused changes. Do not touch unrelated files, do not reformat, do not refactor on the side.
6. Ask before deleting files, changing configs, changing workflows, or anything hard to reverse or outward-facing (publishing, force-pushing, secrets, notifications). Approval for one thing does not extend to the next.
7. Never run git commit or git push (settings deny them). Make the edit, show the diff or git status, let the owner commit. Read-only git is fine.
8. Report what a CI run really did. A green run with skipped tests checked nothing. Always give passed / failed / skipped / broken counts and the skip reasons (skill assess-ci-run).
9. Do not name a cause you did not see. Say "UNVERIFIED" or "likely", and say what you could not read (CI job logs need a login; the gh CLI may not be installed).
10. Deferred work goes in docs/STATUS.md, Backlog section, with the date.
11. Porting: the other project is a separate repo and stack. Do not edit it from here. Write a prompt for its own session in ITS terms (skill port-to-java-prompt); never call files by this stack's names, never assume a file exists there.
12. At the end of a session: update docs/STATUS.md (done, next step, known issues), add decisions to docs/DECISIONS.md and new lessons to docs/LESSONS.md, then tell the owner the changes are ready to review and commit.

## 7. Do-not list

- **Never evade the live site's bot detection.** No stealth settings, user-agent or fingerprint changes, proxies, challenge solving or human-like input tricks. Handling is: click the site's own "continue" button, reload once, otherwise skip with the reason. The flag `--disable-blink-features=AutomationControlled` (it hid the automation flag) was removed from `playwright.config.ts` on the owner's decision (2026-11-22); do not add it back or anything like it. UNVERIFIED: no live run was done after the removal, so whether YouTube behaves differently is not known yet.
- No loops, big parallel batches or data collection with live runs. One case, after asking.
- A skip is not a pass, and a green workflow is not proof of testing. (The test step has no `continue-on-error`; only the three Discord steps do. Checked by grep.)
- Never leave a test that could not check something by a silent early exit or a bare return: throw an error that names the problem, or `test.skip` with a reason.
- Never put a value that can carry free text (`github.ref_name`, `github.actor`, `github.head_ref`, PR titles, commit messages) inside a workflow `run:` script; pass it through `env:` and read it as a shell variable (a branch name can contain `$(...)`). Values that cannot carry text (`github.run_number`, `github.run_id`, `github.repository`) are safe in `run:`. The workflow has three plain uses (lines 268, 398, 418: `github.token`, `github.repository`, `github.run_number`); none carries free text, so they are optional cleanup, not a rule violation. Do not fix them unasked.
- No secrets or webhook URLs in any file or log. Never print the `YT_PLAYWRIGHT` value.
- No "TEMPORARY" triggers or temp files left on master.
- Do not count every `*.zip` in the blob-report folder as shards; `merge-reports` unpacks trace zips into the same folder. Count `-maxdepth 1 -name 'report*.zip'`.
- Do not use `secrets.*` in a step `if:`; check for an empty value inside the script. Keep `continue-on-error: true` on Discord steps. Use the POSIX zone `TZ='IST-5:30'`, not `Asia/Kolkata`, in scripts that may run in Git Bash on Windows.
- Do not leave `"CANARY": true` in `configs/runconfig.json`.
- Never run two Playwright runs in this folder at the same time (they share `test-results/`), and after stopping a run check that its processes are really gone (docs/LESSONS.md L33). Live runs are limited to a few languages unless the owner asks for more: `runForAllLanguages=false languageCount=5`.
- Do not widen a comparison so far that a wrong text can pass; every widening needs a negative test (H4b rejects "Filme & Videos").
- Do not rely on `.gitignore` to untrack a file: a tracked file stays tracked (`git ls-files`, `git check-ignore -v` on the REAL file).
- Do not rename packages, remove dependencies or edit `package.json`, `playwright.config.ts` or the workflow as a side effect of another task.
- Do not let the README drift: update it in the same session as the code.
- No `git push --force`, `git reset --hard` or branch deletion unasked.
- Policy decisions that were deliberate: the Hype/Live swapping side-menu entry is deferred (backlog); the loops are left as 8 repeated copies on purpose (owner, 2026-10-30); do not change SafeActions or the recovery logic without CI evidence.
- Do not modify the Java repo from here.

## 8. Glossary

| Term | Meaning |
|---|---|
| eld | the `eld` language-detection library; cannot detect Afrikaans and Bahasa Indonesia, so those rows skip detection |
| allowed versions | the set of accepted side-menu texts: base text with `{placeholders}` filled with every combination of its alternatives |
| slot (Live / Hype) | the side-menu entry that YouTube shows as Live, Hype or not at all (`{slot}`) |
| Premium flip | the "YouTube Premium" entry sometimes replaced by a localized promo with a price (`{premium}`) |
| SafeActions | click/find helpers with waits, retry, refresh, DOM-click fallback |
| LoopGuard | per-item retry and abort rules for a language/location loop |
| SoftChecks | soft-assertion buffer; a failed attempt's failed checks are dropped when the item is retried |
| canary | a run where one value per test is spoiled on purpose; every test must fail |
| shard | one of 4 parallel CI jobs (`--shard=i/4`); each uploads a blob `report-N.zip` |
| coverage check | `merge-reports` step: shards found vs expected, tests with a result vs tests in the spec, failed tests; shown as a red box, annotation and run summary; never blocks the publish |
| report hub | the GitHub Pages landing page with links to both reports |
| offline checks | `tests/FallbackMechanisms.spec.ts` and the CI job that runs it first |
| health-check switches | manual inputs `check_failed_tests`, `check_lost_shard` that fail things on purpose to prove the gates |
| CI keys | runconfig keys ending in `CI`, used by scheduled runs |
| run-info | the run number, commit and time line written into the hub page by `merge-reports` |
| landing page | `.github/pages/index.html` |

## 9. Pointers

- Local notes: `docs/STATUS.md` (where we are), `docs/DECISIONS.md` (why), `docs/LESSONS.md` (mistakes). Older notes: `docs/README.md` is the index (start with `docs/00-start-here.md`, `25`, `27`); they are history and may be out of date. The code and this file win.
- Skills (`.claude/skills/`, local): `assess-ci-run`, `merge-readiness`, `port-to-java-prompt`, `update-allowed-wording`.
- Agents (`.claude/agents/`, local): `code-reviewer` (read-only), `test-runner`.
- Settings: `.claude/settings.json` (local): allows offline checks and read-only git, asks before live runs and installs, denies commit, push and reading `.env`.
- External docs: Playwright https://playwright.dev/docs/intro, Playwright sharding and reporters https://playwright.dev/docs/test-sharding and https://playwright.dev/docs/test-reporters, TypeScript https://www.typescriptlang.org/docs/, GitHub Actions https://docs.github.com/actions. (Pages given as pointers, not looked up this session.)

## 10. Ongoing habit

- **Start of each session:** section 0.
- **End of each session:** update `docs/STATUS.md` (done, next step, known issues), add decisions to `docs/DECISIONS.md`, add lessons to `docs/LESSONS.md`, then tell the owner the changes are ready to review and commit. Never commit yourself.
- Personal notes that must not be committed go in `CLAUDE.local.md` (git-ignored).
