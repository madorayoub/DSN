import PipelineFunnel from "../src/components/PipelineFunnel";
import TopRatedSection from "../src/components/TopRatedSection";

export default function HomePage() {
  return (
    <main className="bg-neutral-950 text-white">
      <TopRatedSection />
      <PipelineFunnel />
    </main>
  );
}
