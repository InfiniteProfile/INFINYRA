# INFINYRA

**INFINYRA — Infinite identities. Endless possibilities.**

A lightweight static website that generates deterministic digital identities locally.

## Files
- `index.html` — page structure
- `style.css` — responsive dark visual system
- `script.js` — deterministic profile generation, identifier search, and feed behavior

## Run
Open `index.html` in a browser, or deploy the folder to GitHub Pages / Cloudflare Pages. No build step, database, login, or backend is required.

## Identity behavior
Profile IDs are exact decimal strings and are parsed with `BigInt`, so long identifiers are not rounded or shortened. Each ID deterministically maps to a name and generated SVG avatar. Search opens an identity directly without generating all preceding identities.

## Notes
The feed creates profiles on demand, automatically refills before the user reaches the end, and uses a bounded rendering window rather than keeping an ever-growing DOM. A scroll-based safety check backs up Intersection Observer so generation continues even if the observer target stays intersecting. The browser and device still impose practical limits on any page's lifetime and scrollable pixel range. The Google Fonts import is optional; system fonts are used as fallbacks if the network is unavailable.
