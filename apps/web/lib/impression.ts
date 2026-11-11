import { chargerDocument, htmlDocument, type Parametres } from "@stocktracker/core";

import { supabase } from "./supabase";

/**
 * Imprime (ou enregistre en PDF via le navigateur) un document de vente,
 * avec le même gabarit que l'application mobile.
 */
export async function imprimerDocument(documentId: string, parametres: Parametres) {
  const { document, lignes, reglements } = await chargerDocument(supabase, documentId);
  const html = htmlDocument({ document, lignes, reglements, parametres });
  const cadre = window.document.createElement("iframe");
  cadre.style.position = "fixed";
  cadre.style.width = "0";
  cadre.style.height = "0";
  cadre.style.border = "0";
  window.document.body.appendChild(cadre);
  const doc = cadre.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();
  // Laisse le temps au logo de se charger avant d'imprimer
  await new Promise((r) => setTimeout(r, 300));
  cadre.contentWindow!.focus();
  cadre.contentWindow!.print();
  setTimeout(() => cadre.remove(), 1000);
}
