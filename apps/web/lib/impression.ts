import { chargerDocument, htmlDocument, nomFichierDocument, type Parametres } from "@factureplus/core";

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
  // « Enregistrer en PDF » propose le titre de la page comme nom de fichier : le numéro du document
  const titre = window.document.title;
  window.document.title = nomFichierDocument(document);
  doc.title = window.document.title;
  cadre.contentWindow!.focus();
  cadre.contentWindow!.print();
  setTimeout(() => { cadre.remove(); window.document.title = titre; }, 1000);
}

/** Imprime (ou enregistre en PDF) un HTML autonome ; `titre` = nom proposé pour le fichier PDF. */
export async function imprimerHtml(html: string, titre: string) {
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
  await new Promise((r) => setTimeout(r, 300)); // logo
  const titrePage = window.document.title;
  window.document.title = titre;
  doc.title = titre;
  cadre.contentWindow!.focus();
  cadre.contentWindow!.print();
  setTimeout(() => { cadre.remove(); window.document.title = titrePage; }, 1000);
}
