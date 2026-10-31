# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: YtMasterSafeActions.spec.ts >> verifyingSideMenuCollapsedLangAsInSettingsLingua
- Location: tests/YtMasterSafeActions.spec.ts:185:5

# Error details

```
Error: Language of the collapsed side menu text is wrong after switching to "Azərbaycan"

expect(received).toBe(expected) // Object.is equality

Expected: "azerbaijani canary"
Received: "azerbaijani"
```

```
Error: <html lang> attribute is wrong after switching to "Bahasa Indonesia"

expect(received).toBe(expected) // Object.is equality

Expected: "id-id canary"
Received: "id-id"
```

# Page snapshot

```yaml
- generic [ref=f160e1]:
  - generic [ref=f160e2]:
    - banner [ref=f160e4]:
      - generic [ref=f160e6]:
        - generic [ref=f160e7]:
          - button "가이드" [ref=f160e9] [cursor=pointer]
          - link "YouTube 홈" [ref=f160e14] [cursor=pointer]:
            - /url: /
          - button "탐색 건너뛰기" [ref=f160e23] [cursor=pointer]
        - generic [ref=f160e27]:
          - search [ref=f160e28]:
            - generic [ref=f160e30]:
              - generic [ref=f160e31]:
                - combobox "검색" [expanded] [ref=f160e33]
                - button [ref=f160e36] [cursor=pointer]
              - button "Search" [ref=f160e37] [cursor=pointer]
          - generic [ref=f160e42]:
            - button "음성으로 검색" [ref=f160e44] [cursor=pointer]
            - tooltip "tooltip"
        - generic [ref=f160e49]:
          - generic [ref=f160e52] [cursor=pointer]:
            - button "설정" [ref=f160e54]
            - tooltip "tooltip"
          - link "로그인" [ref=f160e60] [cursor=pointer]:
            - /url: https://accounts.google.com/ServiceLogin?service=youtube&uilel=3&passive=true&continue=https%3A%2F%2Fwww.youtube.com%2Fsignin%3Faction_handle_signin%3Dtrue%26app%3Ddesktop%26hl%3Dko%26next%3Dhttps%253A%252F%252Fwww.youtube.com%252F&hl=ko&ec=65620
    - navigation [ref=f160e64]:
      - generic [ref=f160e65]:
        - link "홈" [ref=f160e67] [cursor=pointer]:
          - /url: /
        - link "Shorts" [ref=f160e73] [cursor=pointer]:
          - /url: /shorts/
        - link "구독" [ref=f160e79] [cursor=pointer]:
          - /url: /feed/subscriptions
        - link "내 페이지" [ref=f160e85] [cursor=pointer]:
          - /url: /feed/you
    - generic [ref=f160e90]:
      - main [ref=f160e91]:
        - generic [ref=f160e101]:
          - heading "검색하여 시작하기" [level=2] [ref=f160e102]
          - generic [ref=f160e103]: 내가 좋아할 만한 동영상 피드를 받을 수 있도록 동영상 시청을 시작해 보세요
      - text: •
  - generic [ref=f160e108]:
    - generic [ref=f160e110]:
      - button "뒤로" [ref=f160e113] [cursor=pointer]
      - heading "표시 언어" [level=2] [ref=f160e117]
    - generic [ref=f160e121]:
      - generic [ref=f160e122]: 이 브라우저의 버튼 및 표시 텍스트
      - link "Afrikaans" [ref=f160e125] [cursor=pointer]
      - link "Azərbaycan" [ref=f160e131] [cursor=pointer]
      - link "Bahasa Indonesia" [ref=f160e137] [cursor=pointer]
      - link "Bahasa Malaysia" [ref=f160e143] [cursor=pointer]
      - link "Bosanski" [ref=f160e149] [cursor=pointer]
      - link "Català" [ref=f160e155] [cursor=pointer]
      - link "Čeština" [ref=f160e161] [cursor=pointer]
      - link "Dansk" [ref=f160e167] [cursor=pointer]
      - link "Deutsch" [ref=f160e173] [cursor=pointer]
      - link "Eesti" [ref=f160e179] [cursor=pointer]
      - link "English (India)" [ref=f160e185] [cursor=pointer]
      - link "English (UK)" [ref=f160e191] [cursor=pointer]
      - link "English (US)" [ref=f160e197] [cursor=pointer]
      - link "Español (España)" [ref=f160e203] [cursor=pointer]
      - link "Español (Latinoamérica)" [ref=f160e209] [cursor=pointer]
      - link "Español (US)" [ref=f160e215] [cursor=pointer]
      - link "Euskara" [ref=f160e221] [cursor=pointer]
      - link "Filipino" [ref=f160e227] [cursor=pointer]
      - link "Français" [ref=f160e233] [cursor=pointer]
      - link "Français (Canada)" [ref=f160e239] [cursor=pointer]
      - link "Galego" [ref=f160e245] [cursor=pointer]
      - link "Hrvatski" [ref=f160e251] [cursor=pointer]
      - link "IsiZulu" [ref=f160e257] [cursor=pointer]
      - link "Íslenska" [ref=f160e263] [cursor=pointer]
      - link "Italiano" [ref=f160e269] [cursor=pointer]
      - link "Kiswahili" [ref=f160e275] [cursor=pointer]
      - link "Latviešu valoda" [ref=f160e281] [cursor=pointer]
      - link "Lietuvių" [ref=f160e287] [cursor=pointer]
      - link "Magyar" [ref=f160e293] [cursor=pointer]
      - link "Nederlands" [ref=f160e299] [cursor=pointer]
      - link "Norsk" [ref=f160e305] [cursor=pointer]
      - link "O‘zbek" [ref=f160e311] [cursor=pointer]
      - link "Polski" [ref=f160e317] [cursor=pointer]
      - link "Português" [ref=f160e323] [cursor=pointer]
      - link "Português (Brasil)" [ref=f160e329] [cursor=pointer]
      - link "Română" [ref=f160e335] [cursor=pointer]
      - link "Shqip" [ref=f160e341] [cursor=pointer]
      - link "Slovenčina" [ref=f160e347] [cursor=pointer]
      - link "Slovenščina" [ref=f160e353] [cursor=pointer]
      - link "Srpski" [ref=f160e359] [cursor=pointer]
      - link "Suomi" [ref=f160e365] [cursor=pointer]
      - link "Svenska" [ref=f160e371] [cursor=pointer]
      - link "Tiếng Việt" [ref=f160e377] [cursor=pointer]
      - link "Türkçe" [ref=f160e383] [cursor=pointer]
      - link "Беларуская" [ref=f160e389] [cursor=pointer]
      - link "Български" [ref=f160e395] [cursor=pointer]
      - link "Кыргызча" [ref=f160e401] [cursor=pointer]
      - link "Қазақ Тілі" [ref=f160e407] [cursor=pointer]
      - link "Македонски" [ref=f160e413] [cursor=pointer]
      - link "Монгол" [ref=f160e419] [cursor=pointer]
      - link "Русский" [ref=f160e425] [cursor=pointer]
      - link "Српски" [ref=f160e431] [cursor=pointer]
      - link "Українська" [ref=f160e437] [cursor=pointer]
      - link "Ελληνικά" [ref=f160e443] [cursor=pointer]
      - link "Հայերեն" [ref=f160e449] [cursor=pointer]
      - link "עברית" [ref=f160e455] [cursor=pointer]
      - link "اردو" [ref=f160e461] [cursor=pointer]
      - link "العربية" [ref=f160e467] [cursor=pointer]
      - link "فارسی" [ref=f160e473] [cursor=pointer]
      - link "नेपाली" [ref=f160e479] [cursor=pointer]
      - link "मराठी" [ref=f160e485] [cursor=pointer]
      - link "हिन्दी" [ref=f160e491] [cursor=pointer]
      - link "অসমীয়া" [ref=f160e497] [cursor=pointer]
      - link "বাংলা" [ref=f160e503] [cursor=pointer]
      - link "ਪੰਜਾਬੀ" [ref=f160e509] [cursor=pointer]
      - link "ગુજરાતી" [ref=f160e515] [cursor=pointer]
      - link "ଓଡ଼ିଆ" [ref=f160e521] [cursor=pointer]
      - link "தமிழ்" [ref=f160e527] [cursor=pointer]
      - link "తెలుగు" [ref=f160e533] [cursor=pointer]
      - link "ಕನ್ನಡ" [ref=f160e539] [cursor=pointer]
      - link "മലയാളം" [ref=f160e545] [cursor=pointer]
      - link "සිංහල" [ref=f160e551] [cursor=pointer]
      - link "ภาษาไทย" [ref=f160e557] [cursor=pointer]
      - link "ລາວ" [ref=f160e563] [cursor=pointer]
      - link "ဗမာ" [ref=f160e569] [cursor=pointer]
      - link "ქართული" [ref=f160e575] [cursor=pointer]
      - link "አማርኛ" [ref=f160e581] [cursor=pointer]
      - link "ខ្មែរ" [ref=f160e587] [cursor=pointer]
      - link "中文 (简体)" [ref=f160e593] [cursor=pointer]
      - link "中文 (繁體)" [ref=f160e599] [cursor=pointer]
      - link "中文 (香港)" [ref=f160e605] [cursor=pointer]
      - link "日本語" [ref=f160e611] [cursor=pointer]
      - link "한국어" [ref=f160e617] [cursor=pointer]
```

# Test source

```ts
  1  | import { expect } from "@playwright/test";
  2  | 
  3  | /**
  4  |  * Soft checks that wait until the language / location they belong to is finished (see LoopGuard).
  5  |  * If that item throws and is run again, the checks of the failed attempt are dropped and the retry decides.
  6  |  * Only the failed checks are kept, a passing check needs no record.
  7  |  * Without an active LoopGuard it behaves like a plain expect.soft(actual, message).toBe(expected).
  8  |  */
  9  | type FailedCheck = { actual: unknown; expected: unknown; message: string };
  10 | 
  11 | let collecting = false;
  12 | let pending: FailedCheck[] = [];
  13 | 
  14 | export function softCheck<T>(actual: T, message: string, expected: T): void {
  15 |     if (!collecting) {
  16 |         expect.soft(actual, message).toBe(expected);
  17 |         return;
  18 |     }
  19 |     if (!Object.is(actual, expected)) {
  20 |         pending.push({ actual, expected, message });
  21 |     }
  22 | }
  23 | 
  24 | /** LoopGuard starts collecting when it is created. */
  25 | export function startCollecting(): void {
  26 |     collecting = true;
  27 |     pending = [];
  28 | }
  29 | 
  30 | /** Reports the failed checks collected so far as real soft failures. Returns how many there were. */
  31 | export function commitPendingChecks(): number {
  32 |     const failed = pending;
  33 |     pending = [];
> 34 |     failed.forEach(check => expect.soft(check.actual, check.message).toBe(check.expected));
     |                                                                      ^ Error: <html lang> attribute is wrong after switching to "Bahasa Indonesia"
  35 |     return failed.length;
  36 | }
  37 | 
  38 | /** Drops the failed checks collected so far (the attempt is run again). Returns how many there were. */
  39 | export function discardPendingChecks(): number {
  40 |     const dropped = pending.length;
  41 |     pending = [];
  42 |     return dropped;
  43 | }
  44 | 
  45 | /** Reports what is left and goes back to plain soft checks. */
  46 | export function stopCollecting(): void {
  47 |     commitPendingChecks();
  48 |     collecting = false;
  49 | }
  50 | 
```