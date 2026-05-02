import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <main className="hero">
      <Link href="/admin/campaigns" className="wordmark" aria-label="Inplicit">
        <Image
          src="/logo.svg"
          alt="Inplicit"
          width={120}
          height={24}
          className="wordmark__logo"
          priority
        />
      </Link>

      <div style={{ marginTop: "var(--space-12)", maxWidth: "60ch" }}>
        <span className="eyebrow">Inplicit Dashboard</span>
        <h1
          className="display gradient-text"
          style={{ marginTop: "var(--space-4)" }}
        >
          Qualitative Audits, an Daten gemessen.
        </h1>
        <p
          className="body-lg"
          style={{
            marginTop: "var(--space-5)",
            color: "var(--color-text-secondary)",
            maxWidth: "52ch",
          }}
        >
          Sprachgeführte Mitarbeiter-Audits, automatische Insight-Synthese und
          ein Wissensgraph, den dein Team hinterfragen kann. Ab Login.
        </p>

        <div className="hero__cta">
          <Link href="/admin/campaigns" className="btn btn--primary btn--lg">
            Zum Workspace
            <span className="btn__arrow" aria-hidden="true">→</span>
          </Link>
          <Link href="/admin/login" className="btn btn--ghost btn--lg">
            Anmelden
          </Link>
        </div>
      </div>
    </main>
  );
}
