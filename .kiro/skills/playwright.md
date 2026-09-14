---
name: playwright
description: Take screenshots, scrape pages, and run browser automation using Playwright. Use when asked to screenshot a page, check UI layout, or interact with a running local app.
allowed-tools: shell
---

# Playwright Skill

## Check what is available

```powershell
# Check if Playwright browsers are installed
Get-ChildItem "$env:LOCALAPPDATA\ms-playwright" | Select-Object Name
```

## Install browsers (if not already installed)

Browser downloads may fail on this machine due to TLS certificate restrictions.
If `npx playwright install` times out, use the system CA workaround:

```powershell
NODE_OPTIONS="--use-system-ca" npx playwright install chromium
```

Or install globally first then install browsers:

```powershell
npm install -g playwright
npx playwright install chromium
```

## Take a screenshot (CLI)

```powershell
npx playwright screenshot "<url>" "<output.png>" --browser chromium
```

Example:

```powershell
npx playwright screenshot "http://weather-starter.localhost:1355" "dashboard.png" --browser chromium
```

## Take a screenshot (Node script)

Use this when the CLI is unavailable. Save as `screenshot.mjs` and run with `node screenshot.mjs`:

```js
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto('http://weather-starter.localhost:1355', { waitUntil: 'networkidle' });
await page.screenshot({ path: 'dashboard.png', fullPage: true });
await browser.close();
console.log('Saved dashboard.png');
```

Run it from the project root:

```powershell
node screenshot.mjs
```

## Common tasks

### Get page title and headings

```js
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('<url>');
const title = await page.title();
const h1 = await page.locator('h1').allTextContents();
console.log({ title, h1 });
await browser.close();
```

### List network requests

```js
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
const requests = [];
page.on('request', (req) => requests.push({ method: req.method(), url: req.url() }));
await page.goto('<url>', { waitUntil: 'networkidle' });
console.log(JSON.stringify(requests, null, 2));
await browser.close();
```

### Click and interact

```js
await page.click('button:has-text("Refresh")');
await page.fill('input[name="lat"]', '1.3521');
await page.press('input[name="lat"]', 'Enter');
await page.waitForLoadState('networkidle');
```

## Notes

- `waitUntil: 'networkidle'` is best for SPAs like this React app — waits for API calls to finish.
- Default viewport is 1280×720. Use `setViewportSize` to change it.
- Scripts should be written as `.mjs` files (ES modules) to match this project's `"type": "module"` setup.
- Clean up script files after use — don't commit them.
