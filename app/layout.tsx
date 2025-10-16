import type { ReactNode } from "react";
import { SITE_URL } from "../site.config";

import "../docs/tokens.css";
import "../docs/styles.css";

import Footer from "../src/components/Footer";
import Header from "../src/components/Header";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Direct Sales Network® | B2B Lead Generation Agency",
  description: "Direct Sales Network® builds predictable revenue engines for ambitious B2B teams.",
  themeColor: "#19ad50",
};

type RootLayoutProps = {
  children: ReactNode;
};

const RootLayout = ({ children }: RootLayoutProps) => {
  return (
    <html lang="en">
      <body>
        <Header />
        <main
          id="main-content"
          style={{ background: "var(--color-background)", color: "var(--color-text)" }}
        >
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
};

export default RootLayout;
