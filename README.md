# Family Calendar

A private family calendar that runs on your iPad and iPhones. Built to be
free to run, with no credit card and almost no upkeep.

## What's in here
- `index.html`, `styles.css`, `app.js` — the app itself
- `config.js` — **the only file you edit** (two values from Supabase)
- `manifest.webmanifest`, `sw.js`, `icons/` — makes it install like an app
- `schema.sql` — paste this into Supabase once to build the database
- `.github/workflows/keepalive.yml` — keeps the free database awake

## The 3-layer security model (why this is safe even though the page is public)
1. The page itself is just an empty shell — no family data lives in these files.
2. Everything real lives in Supabase, locked behind a **login**.
3. **Row Level Security** means the database hands back nothing without a valid
   family login — so even if someone finds the link, they see a login wall.

The key in `config.js` is the *public* key. It's meant to be seen and is safe here.
Never put the **secret / service_role** key in these files.

## Setup
Follow the step-by-step guide your assistant gave you in chat. Order:
1. Supabase (make the database) → 2. GitHub (put the app online) →
3. Add to Home Screen on your devices.
