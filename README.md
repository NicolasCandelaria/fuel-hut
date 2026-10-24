# Fuel Hut

Static site for Fuel Hut, the smoothie, wrap and supplement counter at New Westminster SkyTrain Station. No framework and no dependencies: `build.mjs` turns the menu data into `dist/index.html`.

## Run it locally

```
npm run build      # writes dist/
npm run dev        # builds, then serves dist/ on a local port
```

## Edit the menu

The menu lives in `data/menu.csv`, one row per item:

| Column | What it does |
| --- | --- |
| Sort | Order on the page |
| Title | Item name |
| Slug | Lowercase id, also the image file name |
| Category | Must match a category name in `data/site.json` |
| Tag | Small label on the card (supplements: the brand) |
| Ingredients | Shown under the name |
| Price | Shown when it differs from the section price, and in the details popup |
| Size | Sizes in the details popup |
| Extra | Small note in the details popup |
| Description | Longer text in the details popup |
| Image | Path under `public/`, e.g. `/images/menu/iron-man.webp` |

Section prices, intros, combos, address, phone and hours are in `data/site.json`. Add hours as `[{ "days": "Mon to Fri", "time": "7 am to 7 pm" }]` and the site shows them instead of "call ahead".

### From a Google Sheet

1. Import `data/menu.csv` into a Google Sheet.
2. File > Share > Publish to web > choose the sheet > CSV. Copy the link.
3. In Vercel, add an environment variable `SHEET_CSV_URL` with that link.
4. Redeploy (or add a Vercel deploy hook and give the owner a bookmark that calls it).

If the sheet can't be reached during a build, the site falls back to `data/menu.csv`.

## Going live

The site ships with `noindex` and a `robots.txt` that blocks crawlers, so the preview stays out of Google. To launch:

1. Set `SITE_LIVE=1` in Vercel's production environment variables.
2. Add `fuelhut.ca` as a domain on the Vercel project and update DNS.
3. Old WordPress URLs (/our-story/, /smoothie-menu/, /contact-us/, /products/) already redirect via `vercel.json`.

## Still needed from Fuel Hut

- Opening hours
- Unit number (#331 or #335)
- Which Uber Eats listing to link
- Photos for wellness shots, soups and pastries; reshoots of acai bowls and wraps
- Supplement prices, if they want them shown
