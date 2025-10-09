# DSN

## Assets

The site sources the Inter typeface directly from the official CDN, so typography will render even
without bundling any local assets. If you prefer to ship the font for offline use, download
`Inter-Regular.woff2` (or the Inter Roman variable font) from
[https://rsms.me/inter/](https://rsms.me/inter/) and place it in the `fonts/` directory (a placeholder
`.gitkeep` is provided so the folder exists in the repo). Once the file is present you can optionally
update the `@font-face` declaration in `styles.css` to reference the local asset ahead of the CDN
source.

## Development

To preview the static site locally, launch a simple HTTP server from the project root:

```bash
python3 -m http.server 8000
```

You can then open [http://localhost:8000](http://localhost:8000) in a browser to verify layout and
interaction details. For a lightweight regression check on the JavaScript (and to keep the
repository free of syntax errors), run Python's built-in bytecode compilation step:

```bash
python3 -m compileall .
```

This command walks the project tree and surfaces any immediate syntax issues without requiring
additional dependencies.
