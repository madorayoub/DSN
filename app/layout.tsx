import type { ReactNode } from "react";

import "../docs/tokens.css";

import Footer from "../src/components/Footer";
import Header from "../src/components/Header";

export const metadata = {
  title: "Direct Sales Network ® | B2B Lead Generation Agency",
  description: "Direct Sales Network ® builds predictable revenue engines for ambitious B2B teams.",
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
