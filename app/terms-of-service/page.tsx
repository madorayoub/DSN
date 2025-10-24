import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const MAIN_START = '<main class="container page page--narrow" id="main-content">';
const MAIN_END = "</main>";

const termsHtmlSource = readFileSync(
  join(process.cwd(), "docs", "terms.html"),
  "utf8",
);

const startIndex = termsHtmlSource.indexOf(MAIN_START);
const endIndex = startIndex === -1 ? -1 : termsHtmlSource.indexOf(MAIN_END, startIndex);

if (startIndex === -1 || endIndex === -1) {
  throw new Error("Unable to locate terms markup in docs/terms.html");
}

const termsMarkup = termsHtmlSource.slice(startIndex + MAIN_START.length, endIndex).trim();

export const metadata: Metadata = {
  title: "Terms of Service | Direct Sales Network (DSN)",
  description:
    "Review the Terms of Service for working with Direct Sales Network (DSN), including acceptable use, disclaimers, and contact details.",
  alternates: {
    canonical: "/terms-of-service",
  },
};

export default function TermsOfServicePage() {
  return (
    <div
      className="container page page--narrow"
      dangerouslySetInnerHTML={{ __html: termsMarkup }}
    />
  );
}
