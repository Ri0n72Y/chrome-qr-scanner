# Chrome QR Scanner

A minimal Chrome extension that scans QR codes from the visible area of the current tab.

## Goals

- Local-only QR decoding at runtime
- Minimal Chrome permissions
- No telemetry, backend, CDN, or remote scripts
- Simple source code that is easy to audit

## Current features

- Scans the currently visible tab when the popup opens
- Works with regular webpages and browser-rendered PDFs that Chrome allows to be captured
- Detects multiple QR codes in the same visible area
- Shows the captured tab preview and highlights the selected QR code
- Displays the selected QR payload as plain text
- Copies the selected value to the clipboard on user action
- Offers an Open action only for `http:` and `https:` URLs
- Rescans on demand

## Privacy and permissions

The extension requests only:

```json
"permissions": ["activeTab"]
```

When you click the extension, Chrome temporarily allows it to capture the visible area of the active tab. The screenshot is decoded in the popup process and is not stored after the popup closes.

At runtime:

- screenshots are not uploaded
- scan results are not stored
- there are no analytics or telemetry calls
- there are no remote JavaScript or CSS resources
- QR decoding is bundled into the extension

`npm install` naturally accesses the package registry during development/build time. The built extension itself does not require network access for QR decoding.

## Build

Requires a recent Node.js release.

```bash
npm install
npm run build
```

The unpacked Chrome extension is generated in `dist/`.

## Load in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this repository's `dist/` directory.
5. Open a page containing one or more visible QR codes and click the extension icon.

## Architecture

```text
extension action
      │
      ▼
activeTab permission
      │
      ▼
chrome.tabs.captureVisibleTab()
      │
      ▼
in-memory PNG → Canvas ImageData
      │
      ▼
local multi-QR decoder
      │
      ├── result list
      └── detection coordinates → preview highlight
              │
              └── selected result
                    ├── copy
                    └── open (http/https only)
```

The decoder is [`qr`](https://github.com/paulmillr/qr), bundled locally at build time. It has no runtime dependencies and is licensed under MIT OR Apache-2.0.

## Current limitations

- Only the visible viewport is scanned; the extension does not crawl the full page.
- Highlights are shown in the popup screenshot preview, not injected into the webpage.
- Camera scanning, local image-file scanning, and manual area selection are not implemented yet.
- Some browser-internal pages cannot be captured by extensions.

## Development principles

Keep the extension small and auditable. New permissions, persistent storage, network access, or remote resources should only be introduced when a feature clearly requires them and the privacy impact is documented.
