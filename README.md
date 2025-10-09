# DSN

## Assets

The site sources the Inter typeface directly from the official CDN, so typography will render even
without bundling any local assets. If you prefer to ship the font for offline use, download
`Inter-Regular.woff2` (or the Inter Roman variable font) from
[https://rsms.me/inter/](https://rsms.me/inter/) and place it in the `fonts/` directory (a placeholder
`.gitkeep` is provided so the folder exists in the repo). Once the file is present you can optionally
update the `@font-face` declaration in `styles.css` to reference the local asset ahead of the CDN
source.
