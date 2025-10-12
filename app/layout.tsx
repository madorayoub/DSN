import type { ReactNode } from "react";

import Footer from "../src/components/Footer";
import Header from "../src/components/Header";

export const metadata = {
  title: "Belkins | B2B Lead Generation Agency",
  description: "Belkins builds predictable revenue engines for ambitious B2B teams.",
};

type RootLayoutProps = {
  children: ReactNode;
};

const RootLayout = ({ children }: RootLayoutProps) => {
  return (
    <html lang="en">
      <body>
        <Header />
        <main id="main-content" className="bg-neutral-950 text-white">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
};

export default RootLayout;
