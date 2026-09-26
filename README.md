# DSN

> **Legal content note:** Next.js routes currently read from `docs/privacy.html` and `docs/terms.html`, while the pretty URLs serve `docs/privacy-policy/index.html` and `docs/terms-of-service/index.html`. Update both copies of the legal text (or consolidate them) whenever edits are required.

## Deployment

The production-ready static site lives in the `docs/` directory so GitHub Pages can deploy it without
additional build steps. When updating the marketing page or its assets, make sure any HTML, CSS,
JavaScript, images, or fonts you add reside under `docs/`.

## Bookings and Meta tracking

> **Don't rename the website booking title** (`Strategy Call — <name>`, set in
> `netlify/functions/booking.js`). That title is how the `meta-crm-sync` job recognises website
> bookings. The job sends Meta a Schedule for every booking made any other way (by hand in GHL, or
> on GHL's own booking page), because `booking.js` has already sent one for website bookings.
> Rename the title and every website booking reaches Meta twice. There's a note about it in the
> code. If it ever has to change, change the check in `netlify/functions/meta-crm-sync.js` in the
> same commit.

## Assets

The site sources the Inter typeface directly from the official CDN, so typography will render even
without bundling any local assets. If you prefer to ship the font for offline use, download
`Inter-Regular.woff2` (or the Inter Roman variable font) from
[https://rsms.me/inter/](https://rsms.me/inter/) and place it in the `docs/fonts/` directory (a
placeholder `.gitkeep` is provided so the folder exists in the repo). Once the file is present you can
optionally update the `@font-face` declaration in `docs/styles.css` to reference the local asset ahead
of the CDN source.
