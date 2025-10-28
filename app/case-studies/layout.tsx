import type { ReactNode } from "react";

import CaseStudiesPage from "./CaseStudiesPage";

export const metadata = {
  title: "Case Studies",
  description:
    "Deep dives into Direct Sales Network® customer wins, featuring video highlights and detailed engagement breakdowns.",
};

type CaseStudiesLayoutProps = {
  children: ReactNode;
};

const CaseStudiesLayout = ({ children }: CaseStudiesLayoutProps) => {
  return (
    <>
      <CaseStudiesPage />
      <div aria-hidden="true" style={{ display: "none" }}>
        {children}
      </div>
    </>
  );
};

export default CaseStudiesLayout;
