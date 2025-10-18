import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const MAIN_START = '<main class="container page page--narrow" id="main-content">';
const MAIN_END = "</main>";

const privacyHtmlSource = readFileSync(
  join(process.cwd(), "docs", "privacy.html"),
  "utf8"
);

const startIndex = privacyHtmlSource.indexOf(MAIN_START);
const endIndex = startIndex === -1 ? -1 : privacyHtmlSource.indexOf(MAIN_END, startIndex);

if (startIndex === -1 || endIndex === -1) {
  throw new Error("Unable to locate privacy policy markup in docs/privacy.html");
}

const privacyMarkup = privacyHtmlSource
  .slice(startIndex + MAIN_START.length, endIndex)
  .trim();

export const metadata: Metadata = {
  title: "Privacy Policy | Direct Sales Network (DSN)",
  description:
    "Read how Direct Sales Network (DSN) collects, uses, and safeguards personal data across our marketing and service operations.",
  alternates: {
    canonical: "/privacy-policy",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div
      className="container page page--narrow"
      dangerouslySetInnerHTML={{ __html: privacyMarkup }}
    />
  );
}
