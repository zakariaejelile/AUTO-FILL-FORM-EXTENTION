# Newsletter Auto-Fill Pro

A Chrome extension  that walks through a list of websites, opens each one in a background tab, fills newsletter / contact forms with your saved details, and submits them automatically. It keeps its state and activity log across popup closes, and lets you pause, resume or stop a run at any time.


> **Use responsibly.** This tool submits forms on third-party websites using your own details. Only run it on sites where you have permission or a legitimate reason to subscribe, respect each site's terms and anti-spam rules, and never use it with addresses or identities you do not own. The author of this repository is not responsible for misuse.

---

## Table of contents

- [Features](#features)
- [How it works](#how-it-works)
- [Install](#install)
- [Usage](#usage)
- [Saved fields](#saved-fields)
- [Popup controls](#popup-controls)
- [Settings](#settings)
- [Form detection details](#form-detection-details)
- [Project structure](#project-structure)
- [State and storage](#state-and-storage)
- [Permissions and privacy](#permissions-and-privacy)
- [Known limitations](#known-limitations)
- [Troubleshooting](#troubleshooting)

---

## Features

- **Bulk site list**: paste one URL per line and process the whole list in order.
- **Background processing**: each site opens in an inactive tab, is handled, then closed automatically.
- **Persistent state**: sites, progress, credentials, settings and log are saved to `chrome.storage.local`, so closing the popup does not lose your data.
- **Full run control**: Start, Pause, Resume, Stop and Clear.
- **Live progress and log**: progress bar (`current / total`) plus a timestamped, color-coded activity log (last 100 entries).
- **Rich field set**: email, first name, last name, phone, ZIP/postal code, custom message, job title, company name and website URL.
- **Smart field matching**: dozens of selector fallbacks per field, including `name`, `id`, `placeholder`, `aria-label`, `autocomplete`, `data-testid` and `data-cy` attributes.
- **Full-name handling**: fills separate first/last fields when present, otherwise a combined full-name field, with a guard so the email input is never overwritten.
- **Popup form support**: detects modal/dialog newsletter popups and fills them first, then falls back to the main page.
- **Consent checkbox handling**: automatically ticks consent, terms, privacy and newsletter checkboxes.
- **Overlay bypass**: tries to close cookie/GDPR/age-gate overlays that block the form.
- **Honeypot avoidance**: skips hidden inputs, `display:none`, `visibility:hidden` and `type=hidden` fields.
- **Multiple submit strategies**: click, synthetic mouse/touch events, focus + click, `form.submit()`, Enter key, and inline `onclick`.
- **Adjustable timeout**: site timeout slider from 5 to 30 seconds (default 15).
- **No content script in the manifest**: `content.js` is injected on demand with `chrome.scripting`, so it only runs on pages being processed.

---

## How it works

1. You paste a list of sites and click **Start**.
2. `background.js` normalizes each entry to an `http`/`https` URL and stores the run in `extensionState`.
3. For each site it:
   - creates an inactive tab (`active: false`),
   - waits for the tab's `complete` status,
   - waits an extra **5 seconds** for late scripts and popups,
   - injects `content.js` into the tab,
   - sends the saved user data with `AUTOFILL_FORM`,
   - starts a **12 second** form-processing timeout,
   - closes the tab and moves to the next site after a **3 second** gap.
4. `content.js`:
   - looks for a visible newsletter popup/modal (up to 3 seconds),
   - otherwise processes the main page,
   - fills email and any matching fields,
   - ticks consent checkboxes,
   - scrolls the form into view,
   - clicks the best submit button it can find,
   - reports back with `SCRIPT_COMPLETE`.
5. The service worker logs the result and advances the queue. When the list is exhausted the status becomes `completed`.

If a page never finishes loading, the site timeout fires and the run moves on. If a tab lands on a `chrome://` or `about:` page, it is logged as an error and skipped.

---

## Install

1. Download or clone this folder and keep it somewhere permanent.
2. Open `chrome://extensions`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the folder that contains `manifest.json` (`newsletter-autofill-extension - Z.ai-v4`).
5. Pin the extension from the puzzle-piece menu.

**Updating:** replace the files, then click the reload icon on the extension card.

**Requires:** a Chromium browser with Manifest V3 support (Chrome/Edge 88+; `chrome.scripting` is used, so Chrome 88 or newer is required).

---

## Usage

1. Click the extension icon.
2. Fill in at least an **Email** (required).
3. Optionally expand **Additional Fields** and add job title, company and website.
4. Paste **Sites to Process**, one per line. Full URLs or bare domains both work; bare domains get `https://` added automatically.
5. Adjust the **Site Timeout** if needed.
6. Click **Start**.
7. Watch the progress bar and activity log. Use **Pause**, **Resume** or **Stop** as needed.

Example site list:

```
example.com
another-site.org/newsletter
https://onemore.co/contact
```

Notes:

- **Pause** takes effect between sites. The site currently being processed will usually finish and submit before the run holds.
- **Resume** continues from the next unprocessed site.
- **Stop** clears the queue and resets the index.
- **Clear** wipes credentials, site list, log and progress after a confirmation prompt.

---

## Saved fields

| Field | Used for |
| --- | --- |
| Email | Primary email field, required to start |
| First Name | `first`, `fname`, `given-name`, `autocomplete="given-name"` |
| Last Name | `last`, `lname`, `family-name`, `autocomplete="family-name"` |
| Phone | `type="tel"`, `phone`, `autocomplete="tel"` |
| Zip Code | `zip`, `postal`, `autocomplete="postal-code"` |
| Custom Message | `textarea` with message-related attributes |
| Job Title | `job`, `title`, `position`, `role`, `autocomplete="organization-title"` |
| Company Name | `company`, `organization`, `org`, `autocomplete="organization"` |
| Website URL | `website`, `url`, `web`, `type="url"` |

Email detection is intentionally broad: `type="email"` first, then any input whose name/id/placeholder/class mentions `email`, `newsletter` or `subscribe`.

---

## Popup controls

| Control | Action |
| --- | --- |
| **Save Info** | Saves the current user fields without starting a run |
| **Start** | Begins processing the site list |
| **Pause** | Holds the queue after the current site |
| **Resume** | Continues a paused run |
| **Stop** | Stops and resets the queue (confirmation required) |
| **Clear** | Resets everything, including saved data (confirmation required) |
| **Site Timeout** slider | 5 to 30 seconds per site |
| **Enable thorough scrolling** | Intended to toggle scrolling before filling; see known limitations |
| **Status dot** | Green idle/completed, amber running, orange paused, red stopped |

---

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| Site timeout | 15 s | How long to wait for a page to load before skipping it |
| Enable scrolling | On | Scrolls fields into view before filling and submitting |

Both settings and all credentials are stored locally under the `extensionState` key.

---

## Form detection details

### Popup detection

The script checks common dialog and popup selectors (`[role="dialog"]`, `.modal`, `.popup`, `.overlay`, `.swal2-container`, `.pum-container`, `.tcb-popup`, and many others), then falls back to any visible fixed-position element larger than 100x100 that contains a form, email input, text input or button. It waits up to 3 seconds for a popup to appear.

### Consent checkboxes

It ticks checkboxes whose name, id, class, `aria-label` or `data-testid` contains `consent`, `agree`, `accept`, `terms`, `privacy` or `gdpr`. It also checks boxes inside the email form whose surrounding label text mentions those words plus `newsletter`, `subscribe` or `email`.

### Submit button selection

Priority order:

1. Buttons with matching text (`subscribe`, `sign up`, `submit`, `register`, `join`, `send`, `continue`, `get`, `go`) or an `onclick`/`href` hint.
2. Any visible enabled button near the email field.
3. Any enabled button inside the form.
4. Clickable elements with `role="button"`, `.btn`, `.submit` or an inline handler.
5. Siblings of the email field.
6. If nothing is found, a plain `form.submit()` is attempted.

### Honeypot avoidance

Only fields that are clearly hidden are skipped: `display:none`, `visibility:hidden`, `type="hidden"` and equivalent. The code deliberately avoids aggressive visibility heuristics so real fields are not missed.

---

## Project structure

```
newsletter-autofill-extension/
├── manifest.json          #  manifest, permissions, popup and icons
├── background.js          # service worker: queue, tabs, timeouts, state, log
├── content.js             # injected on demand: form/popup detection and filling
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── popup/
│   ├── popup.html         # control panel UI
│   ├── popup.css          # styling (Inter font from Google Fonts)
│   └── popup.js           # UI wiring and state rendering
└── Extention content.txt  # plain-text dump of the source files (dev reference)
```

`Extention content.txt` is not used by the extension and can be deleted or excluded from a repository if you prefer a clean tree.

---

## State and storage

Everything lives under one `chrome.storage.local` key:

```js
extensionState = {
  sites: [],
  currentIndex: 0,
  status: 'idle',            // idle | running | paused | stopped | completed
  log: [],                   // newest first, max 100 entries
  userCredentials: {
    email, firstName, lastName, phone, zipCode,
    customMessage, jobTitle, companyName, websiteUrl
  },
  processingTabId: null,
  siteTimeout: 15000,
  enableScrolling: true,
  processingUrl: null,
  isPaused: false
}
```

Messages used between the popup, background worker and content script:

| Message | Direction | Purpose |
| --- | --- | --- |
| `GET_STATE` | popup to background | Load current state |
| `SAVE_CREDENTIALS` | popup to background | Persist user fields |
| `START_PROCESSING` | popup to background | Start a run |
| `PAUSE_PROCESSING` / `RESUME_PROCESSING` / `STOP_PROCESSING` | popup to background | Run control |
| `CLEAR_STATE` | popup to background | Reset everything |
| `UPDATE_TIMEOUT` / `UPDATE_SCROLL_SETTING` | popup to background | Save settings |
| `AUTOFILL_FORM` | background to content | Fill and submit this page |
| `SCRIPT_COMPLETE` | content to background | Report result and advance queue |
| `UPDATE_UI` | background to popup | Push live state to an open popup |

---

## Permissions and privacy

| Permission | Why it is needed |
| --- | --- |
| `storage` | Save credentials, queue, progress, settings and log locally |
| `tabs` | Create inactive tabs, observe page loads, close tabs |
| `scripting` | Inject `content.js` into the site being processed |
| `<all_urls>` | The site list can contain any domain, so injection and access cannot be restricted ahead of time |

- **All data stays local.** Nothing is sent to the extension's author or any third party. The only network requests are the sites you list and the Google Fonts stylesheet referenced by the popup.
- **Credentials are not encrypted.** They sit in `chrome.storage.local` in plain text, readable by anyone with access to your Chrome profile. Do not use this extension with sensitive accounts or on a shared machine.
- **No analytics or telemetry.**
- The extension has no remote code; all logic is in the packaged files.

---

## Known limitations

- **Consent is auto-ticked.** This may be unwanted, and on some sites it may be legally or contractually problematic. Review each target site before using the tool.
- **The scrolling toggle is not wired up.** `background.js` passes `enableScrolling`, but `content.js` only assigns it to a local variable and never uses it. Scrolling currently always runs.
- **Pause is between sites, not instant.** The current page is normally still filled and submitted.
- **No resume after a browser or service-worker restart.** State is restored in the popup, but an interrupted run does not restart itself. Click Start again after a restart.
- **Service workers can be suspended.** A long gap with no events may interrupt an in-flight run; the state will still be in storage.
- **Fixed delays.** 5 seconds after page load, 12 seconds for form processing, 3 seconds between sites. Slow sites can be skipped, fast ones wait longer than needed.
- **Heuristic form filling.** Sites with Shadow DOM, cross-origin iframes, CAPTCHAs, multi-step wizards, custom dropdowns or React-controlled inputs may not be filled correctly.
- **No duplicate detection.** The same URL in the list twice is processed twice.
- **No CSV/JSON import.** Sites are pasted as plain text, one per line.
- **`extention content.txt` is a stale-style source dump.** It can drift from the real files; the real `.js` files are the source of truth.

---

## Troubleshooting

### Nothing happens after clicking Start

- Make sure an email is filled in; Start is blocked without one.
- Check that the site list is not empty or whitespace only.
- Open the activity log: injection failures and error pages are logged there.

### The run stops after one or two sites

The MV3 service worker may have been suspended, or the tab never fired a `complete` event. Reopen the popup (state is restored), then run the remaining sites again. Very heavy or slow pages may also hit the site timeout.

### Forms are not filled

- The site may use Shadow DOM, an iframe, or a multi-step flow.
- Some frameworks ignore direct `value` assignment even though `input` and `change` events are dispatched.
- CAPTCHAs and bot protection will block automation.

### The wrong button was clicked

The button matcher is text- and position-based. Some sites have several plausible buttons (for example, "Subscribe" and "Continue shopping"). Test with a single site first.

### Popups are not detected

Some popups appear after a scroll, a timer longer than 3 seconds, or an exit-intent trigger. Increase the site timeout, and note that the popup wait itself is fixed at 3 seconds in code.

### "Already processing or paused"

A previous state was left running. Click **Stop** then **Start**, or **Clear** to reset everything.

---
