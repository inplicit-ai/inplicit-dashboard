/**
 * One-time import script: IHK Lüneburg-Wolfsburg Belegschaft
 *
 * Usage:
 *   1. Open the prod dashboard in Chrome (https://dashboard-inplicit-ai.vercel.app)
 *   2. DevTools → Application → Cookies → copy value of `inplicit_session`
 *   3. Get the IHK org ID from the staff panel (/staff/orgs)
 *   4. Run:
 *      COOKIE=<value> ORG_ID=<uuid> npx tsx scripts/import-ihk-employees.ts
 */

const PROD_API = "https://dashboard-inplicit-ai.vercel.app/dapi";
const COOKIE = process.env.COOKIE ?? "";
const ORG_ID = process.env.ORG_ID ?? "";

if (!COOKIE || !ORG_ID) {
  console.error("Missing COOKIE or ORG_ID env vars. See usage at top of file.");
  process.exit(1);
}

function slug(name: string) {
  return name
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/ç/g, "c").replace(/[^a-z0-9]/g, ".");
}

function email(name: string) {
  return `inplicit+${slug(name)}@outlook.com`;
}

interface Employee {
  name: string;
  department: string;
  role_name: string;
}

const employees: Employee[] = [
  // ── Hauptgeschäftsführung ──────────────────────────────────────────────
  { name: "Michael Schuster",     department: "Hauptgeschäftsführung", role_name: "Hauptgeschäftsführer" },
  { name: "Margot Schuster",      department: "Hauptgeschäftsführung", role_name: "Assistentin des Hauptgeschäftsführers" },
  { name: "Sönke Feldhausen",     department: "Hauptgeschäftsführung", role_name: "Stellvertretender Hauptgeschäftsführer" },
  { name: "Michael Wilkens",      department: "Hauptgeschäftsführung", role_name: "Stellvertretender Hauptgeschäftsführer" },
  { name: "Stefanie Grußendorf",  department: "Hauptgeschäftsführung", role_name: "Bereichsleitung Menschen-Bilden" },

  // ── Menschen Bilden ────────────────────────────────────────────────────
  { name: "Christoph Gerstenberg", department: "Menschen Bilden", role_name: "Berater — Ausbilder- und Prüferqualifizierung" },
  { name: "Kirsten Deising",       department: "Menschen Bilden", role_name: "Beraterin — Ausbildungsmarketing" },
  { name: "Cornelia Bühler",       department: "Menschen Bilden", role_name: "Beraterin — Ausbildungsmarketing" },
  { name: "Heidrun von Weding",    department: "Menschen Bilden", role_name: "Beraterin — Ausbildung" },
  { name: "Antje Possler",         department: "Menschen Bilden", role_name: "Beraterin — Ausbildung" },
  { name: "Michael Heuer",         department: "Menschen Bilden", role_name: "Berater — Ausbildung" },
  { name: "Riccardo Guida",        department: "Menschen Bilden", role_name: "Berater — Ausbildung" },
  { name: "Tobias Mumm",           department: "Menschen Bilden", role_name: "Berater — Ausbildung" },
  { name: "Dorit Siebenrodt",      department: "Menschen Bilden", role_name: "Beraterin — Ausbildung" },
  { name: "Natascha Albrecht",     department: "Menschen Bilden", role_name: "Beraterin — Ausbildung" },
  { name: "Athena van Renen",      department: "Menschen Bilden", role_name: "Beraterin — Ausbildung" },
  { name: "Susanne Mügge-Erdinc",  department: "Menschen Bilden", role_name: "Beraterin — Ausbildung" },
  { name: "Kamel Muhammad",        department: "Menschen Bilden", role_name: "Berater — Internationale Fachkräfte" },
  { name: "Thomas Boehnke",        department: "Menschen Bilden", role_name: "Teamleiter — Professionell Prüfen" },
  { name: "Christina Möller",      department: "Menschen Bilden", role_name: "Seminarleiterin" },
  { name: "Nele Uhl",              department: "Menschen Bilden", role_name: "Teamleiterin — Weiterbildung" },
  { name: "Lia Neumann",           department: "Menschen Bilden", role_name: "Prüfungsorganisation Weiterbildung" },
  { name: "Andreas Kinski",        department: "Menschen Bilden", role_name: "Teamleiter — Berufszugang Schaffen, Justitiariat" },
  { name: "Florin Stöhr",          department: "Menschen Bilden", role_name: "Veranstaltungskoordinator" },

  // ── Interessen Bündeln ─────────────────────────────────────────────────
  { name: "Tobias Siewert",    department: "Interessen Bündeln", role_name: "Teamleiter — Standort- und Politikberatung" },
  { name: "Gerd Ludwig",       department: "Interessen Bündeln", role_name: "Berater — Konjunktur, Steuern und Internationale Wirtschaftspolitik" },
  { name: "Jan Weckenbrock",   department: "Interessen Bündeln", role_name: "Berater — Raumordnung und Stadtentwicklung" },
  { name: "Paul Pozzi",        department: "Interessen Bündeln", role_name: "Berater — Energie, Umwelt- und Klimapolitik und Tourismuspolitik" },
  { name: "Medina Gaidus",     department: "Interessen Bündeln", role_name: "Beraterin — Bürokratieabbau und Rechtspolitik" },
  { name: "Lennart Ulrich",    department: "Interessen Bündeln", role_name: "Berater — Bildung und Fachkräfte" },
  { name: "Jan Hassels",       department: "Interessen Bündeln", role_name: "Berater — Gremienbetreuung und Sicherheits-Verteidigungspolitik" },

  // ── Strategie & Stäbe ─────────────────────────────────────────────────
  { name: "Dr. Annika Wilkening", department: "Strategie & Stäbe", role_name: "Büroleiterin — Strategie und Kommunikation" },
  { name: "Sandra Bengsch",       department: "Strategie & Stäbe", role_name: "Teamleiterin — Strategie und Kommunikation, Chefredakteurin" },
  { name: "Grit Preibisch",       department: "Strategie & Stäbe", role_name: "Redakteurin" },
  { name: "Larissa Flahr",        department: "Strategie & Stäbe", role_name: "Digitale Brandmanagerin" },
  { name: "Marcel Hoke",          department: "Strategie & Stäbe", role_name: "Veranstaltungskoordinator" },
  { name: "Dana Schumacher",      department: "Strategie & Stäbe", role_name: "Beraterin — Ausbildungskampagne" },
  { name: "Raphaela Salfner",     department: "Strategie & Stäbe", role_name: "Teamleiterin — Personal und Interne Kommunikation" },
  { name: "Christina Schlöter",   department: "Strategie & Stäbe", role_name: "Koordinatorin — Interne Kommunikation" },
  { name: "Benjamin Damm",        department: "Strategie & Stäbe", role_name: "Büroleiterin — Produkt- und Prozessentwicklung, Chief Digital Officer" },
  { name: "Saskia Phillips",      department: "Strategie & Stäbe", role_name: "Projekt Management Office" },
  { name: "Nina Heyse",           department: "Strategie & Stäbe", role_name: "Qualitäts- und Produktmanagement" },
  { name: "Alexander Diez",       department: "Strategie & Stäbe", role_name: "Teamleiter — Zentrale Dienste" },
  { name: "Uwe Jahnke",           department: "Strategie & Stäbe", role_name: "Controller" },
  { name: "Ralf Osenbroch",       department: "Strategie & Stäbe", role_name: "Teamleiter — Finanzen, Beitrag, Forderungen" },
  { name: "Daniel Fassnauer",     department: "Strategie & Stäbe", role_name: "Teamleiter — Facility Management" },

  // ── Unternehmen Beraten ────────────────────────────────────────────────
  { name: "Christiane Hewner",  department: "Unternehmen Beraten", role_name: "Teamleiterin — Service Leisten, Beraterin Außenwirtschaft" },
  { name: "Steven Smelius",     department: "Unternehmen Beraten", role_name: "Berater — Außenwirtschaftsförderung" },
  { name: "Rola Çam",           department: "Unternehmen Beraten", role_name: "Beraterin — Außenwirtschaft" },
  { name: "Michael Petz",       department: "Unternehmen Beraten", role_name: "Berater — Außenwirtschaft" },
  { name: "Lars Böker",         department: "Unternehmen Beraten", role_name: "Berater — Nachhaltiges Wirtschaften" },
  { name: "Sven Heitmann",      department: "Unternehmen Beraten", role_name: "Teamleiter — Unternehmen Fördern" },
  { name: "Sabine Schlüter",    department: "Unternehmen Beraten", role_name: "Beraterin — Existenzgründung, Unternehmensnachfolge" },
  { name: "Sonja Bausch",       department: "Unternehmen Beraten", role_name: "Nachfolgemoderatorin, Beraterin — Unternehmensnetzwerke" },
  { name: "Thomas Rekowski",    department: "Unternehmen Beraten", role_name: "Berater — Unternehmensförderung" },
  { name: "Meike Förster",      department: "Unternehmen Beraten", role_name: "Beraterin — Start-ups, junge Unternehmen" },
  { name: "Natalie Schwarz",    department: "Unternehmen Beraten", role_name: "Beraterin — Digitale Transformation" },
  { name: "Kirstin Borgwardt",  department: "Unternehmen Beraten", role_name: "Beraterin — Unternehmensnetzwerke" },
  { name: "Yvonne Fernando",    department: "Unternehmen Beraten", role_name: "Beraterin — Recht" },
  { name: "Susanne Blumenthal", department: "Unternehmen Beraten", role_name: "Beraterin — Recht" },
  { name: "Johannes Knauf",     department: "Unternehmen Beraten", role_name: "Leiter Geschäftsstelle Celle, Berater — Netzwerk- und Unternehmensentwicklung" },
];

async function createEmployee(emp: Employee) {
  const body = {
    email: email(emp.name),
    name: emp.name,
    department: emp.department,
    role_name: emp.role_name,
  };

  const res = await fetch(
    `${PROD_API}/orgs/me/employees?org_id=${ORG_ID}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `inplicit_session=${COOKIE}`,
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(`${res.status} — ${err.error ?? res.statusText}`);
  }
  return res.json();
}

async function main() {
  console.log(`Importing ${employees.length} employees into org ${ORG_ID}…\n`);
  let ok = 0;
  let fail = 0;

  for (const emp of employees) {
    try {
      await createEmployee(emp);
      console.log(`✓  ${emp.name} (${emp.department})`);
      ok++;
    } catch (e) {
      console.error(`✗  ${emp.name}: ${(e as Error).message}`);
      fail++;
    }
    // small delay to avoid rate-limiting
    await new Promise((r) => setTimeout(r, 120));
  }

  console.log(`\nDone: ${ok} created, ${fail} failed.`);
}

void main();
