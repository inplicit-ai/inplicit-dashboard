#!/usr/bin/env -S deno run -A --watch=static/,routes/

import dev from "$fresh/dev.ts";
import config from "./fresh.config.ts";

const API_URL = Deno.env.get("API_URL") ?? "http://localhost:8080";

console.log("\n  ▌ Inplicit Dashboard");
console.log(`  ▌ Backend → ${API_URL}\n`);

// Quick connectivity check
try {
  const res = await fetch(`${API_URL}/health`, {
    signal: AbortSignal.timeout(2000),
  });
  if (res.ok) {
    console.log(`  ✓ Backend reachable (${API_URL}/health)\n`);
  } else {
    console.log(`  ⚠ Backend responded ${res.status} at ${API_URL}/health\n`);
  }
} catch {
  console.log("  ╔══════════════════════════════════════════════════════════════════╗");
  console.log(`  ║  ⚠ Backend not reachable at ${API_URL.padEnd(36)}║`);
  console.log("  ║                                                                  ║");
  console.log("  ║    Start it in another terminal:                                 ║");
  console.log("  ║      cd inplicit-backend && cargo run                            ║");
  console.log("  ║                                                                  ║");
  console.log("  ║  The dashboard will start anyway. Pages will show errors until   ║");
  console.log("  ║  the backend is up.                                              ║");
  console.log("  ╚══════════════════════════════════════════════════════════════════╝\n");
}

await dev(import.meta.url, "./main.ts", config);
