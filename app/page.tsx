import ClientPlanSection from "../src/components/ClientPlanSection";
import PipelineFunnel from "../src/components/PipelineFunnel";
import TopRatedSection from "../src/components/TopRatedSection";

export default function HomePage() {
  return (
    <>
      <TopRatedSection />
      <ClientPlanSection />
      <PipelineFunnel />
    </>
  );
}
