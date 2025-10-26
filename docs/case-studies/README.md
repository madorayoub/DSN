# Case Studies Page

The Case Studies experience is composed of server-rendered data (`data/case-studies.json`) and interactive client components under `app/case-studies/`. The layout renders a fully responsive desktop grid and mobile carousel experience while keeping the existing placeholder page hidden from assistive tech.

## Constants

The page reads the following configuration from `CaseStudiesPage.tsx`:

- `NUM_VIDEO_FEATURES = 4`
- `NUM_CARD_CASES = 6`
- `MOBILE_BREAKPOINT = 640`

Update the JSON file to change copy, thumbnails, or destinations; the layout will automatically respect the limits above.

## Screenshots

Use the helper script to capture the responsive states once the dev server is running.

```bash
# Optional (only if needed)
npx playwright install --with-deps

# Start dev server (Next.js app router)
npm run dev

# Take screenshots:
node scripts/screenshot-case-studies.mjs --url=http://localhost:3000/case-studies --out=public/case-studies-desktop.png --viewport=1440,900
node scripts/screenshot-case-studies.mjs --url=http://localhost:3000/case-studies --out=public/case-studies-mobile.png --viewport=375,812
```

If Playwright is not installed the script will attempt to fall back to Puppeteer (install it manually with `npm install --save-dev puppeteer`).
