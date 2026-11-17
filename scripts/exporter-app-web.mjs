// Compile l'application mobile (Expo) pour le navigateur dans apps/web/public/app :
// sur téléphone, le site sert cette version (même présentation que l'app), à l'adresse /app.
// Lancé avant « next build » (en local comme sur Vercel). Variables Supabase : celles de l'app mobile
// (apps/mobile/.env) ou, à défaut, celles du site (NEXT_PUBLIC_*), identiques.
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const racine = fileURLToPath(new URL("..", import.meta.url));
const mobile = fileURLToPath(new URL("../apps/mobile", import.meta.url));
const sortie = fileURLToPath(new URL("../apps/web/public/app", import.meta.url));

const env = { ...process.env, EXPO_NO_TELEMETRY: "1", CI: process.env.CI ?? "1" };
env.EXPO_PUBLIC_SUPABASE_URL ??= process.env.NEXT_PUBLIC_SUPABASE_URL;
env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
for (const cle of ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]) {
  if (!env[cle]) delete env[cle]; // laisse Expo lire apps/mobile/.env en local
}

if (existsSync(sortie)) rmSync(sortie, { recursive: true, force: true });
const r = spawnSync("pnpm", ["exec", "expo", "export", "--platform", "web", "--output-dir", sortie], {
  cwd: mobile, env, stdio: "inherit", shell: process.platform === "win32",
});
if (r.status !== 0) {
  console.error(`Export web de l'application mobile échoué (code ${r.status}).`);
  process.exit(r.status ?? 1);
}
console.log(`Application mobile pour le navigateur : ${sortie.replace(racine, "")}`);
