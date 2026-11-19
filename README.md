# Palmotićeva 29 · website

Presentation site for the office space at Palmotićeva 29, Belgrade (EN / SR).
Live: https://palmoticeva29.space

## How it deploys
Netlify watches this repository. Every push to `main` publishes the `public/` folder. No build step.

## Where things are
| Path | What |
|---|---|
| `public/index.html` | The page, styles and all EN/SR text (objects `T`, `ROOMS`, `LAYOUTS`, `SPEC` near the bottom) |
| `public/viewer.bundle.js` | 3D viewer, built from `src/viewer.js` |
| `public/models/*.js` | The 3D models (base64 of gzipped GLB) |
| `public/img/`, `public/plans/` | Renders and floor plans |
| `src/` | Viewer source and three.js r169 (MIT) |
| `backend/apps-script.gs` | Google Apps Script that stores votes and registrations in a Google Sheet |

## Settings
At the top of the script in `public/index.html`:
`const CONFIG = { endpoint: "", contactEmail: "", contactPhone: "" };`
`endpoint` is the Google Apps Script web app URL. Until it is set, votes and registrations stay in each visitor's browser.

## Rebuild the viewer (only if src/viewer.js changes)
    npx esbuild src/viewer.js --bundle --format=iife --minify --outfile=public/viewer.bundle.js
