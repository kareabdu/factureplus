// Lien court vers le PDF d'un document (envoi WhatsApp) : https://factureplus.kareapps.com/d/<code>
// est redirigé ici (?c=<code>). Vérifie le code et sa validité, puis redirige vers un lien signé de
// quelques minutes du fichier (stockage privé « documents »). Sans vérification de JWT.
import { clientService } from "../_shared/unitech.ts";

const SITE = "https://factureplus.kareapps.com";
const DUREE_LIEN_SIGNE_S = 300;

const rediriger = (destination: string) =>
  new Response(null, { status: 302, headers: { Location: destination, "Cache-Control": "no-store" } });

Deno.serve(async (req) => {
  const code = new URL(req.url).searchParams.get("c") ?? "";
  if (!/^[A-Za-z0-9_-]{11}$/.test(code)) return rediriger(`${SITE}/lien-expire`);

  const sb = clientService();
  const { data: lien } = await sb.from("liens_documents").select("chemin, expire_le").eq("code", code).maybeSingle();
  if (!lien || new Date(lien.expire_le) < new Date()) return rediriger(`${SITE}/lien-expire`);

  const nom = lien.chemin.split("/").pop() ?? "document.pdf";
  const { data, error } = await sb.storage.from("documents").createSignedUrl(lien.chemin, DUREE_LIEN_SIGNE_S, { download: nom });
  if (error || !data?.signedUrl) return rediriger(`${SITE}/lien-expire`);
  return rediriger(data.signedUrl);
});
