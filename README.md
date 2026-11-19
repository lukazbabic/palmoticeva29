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

## Votes and registrations
They go to Netlify Forms (forms `vote` and `interest`) and Netlify emails each submission.
Netlify UI: Forms shows every submission; Project configuration > Notifications > Form submission notifications sets the email.
Optional: set `CONFIG.endpoint` in `public/index.html` to a Google Apps Script URL (`backend/apps-script.gs`) to use a Google Sheet instead.

## Rebuild the viewer (only if src/viewer.js changes)
    npx esbuild src/viewer.js --bundle --format=iife --minify --outfile=public/viewer.bundle.js
