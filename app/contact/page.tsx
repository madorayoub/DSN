import { PHONE_NUMBER } from "../../site.config";

export default function Page() {
  return (
    <main className="container page">
      <h1>Contact</h1>
      <p>
        <strong>Phone:</strong> <a href={`tel:${PHONE_NUMBER}`}>{PHONE_NUMBER}</a>
      </p>
      <p>Placeholder. Replace with real content.</p>
    </main>
  );
}
