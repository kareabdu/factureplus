import type { Document, ModePaiement, StatutAchat, StatutDocument, TypeDocument, TypeMouvement } from "./types";

export const LIBELLES_TYPE_DOCUMENT: Record<TypeDocument, string> = {
  facture: "Facture",
  proforma: "Proforma",
  bl: "Bon de livraison",
};

export const LIBELLES_TYPE_DOCUMENT_PLURIEL: Record<TypeDocument, string> = {
  facture: "Factures",
  proforma: "Proformas",
  bl: "Bons de livraison",
};

export const LIBELLES_MOUVEMENT: Record<TypeMouvement, string> = {
  entree: "Entrée",
  sortie: "Sortie",
  ajustement: "Ajustement",
};

export const LIBELLES_MODE_PAIEMENT: Record<ModePaiement, string> = {
  especes: "Espèces",
  wave: "Wave",
  orange_money: "Orange Money",
  carte: "Carte bancaire",
  virement: "Virement",
  cheque: "Chèque",
  credit: "Crédit",
  autre: "Autre",
};

export const LIBELLES_STATUT_ACHAT: Record<StatutAchat, string> = {
  brouillon: "Brouillon",
  recu: "Reçu",
  annule: "Annulé",
};

/** Ton visuel d'un statut, interprété par chaque interface (couleurs propres au web / mobile). */
export type Ton = "neutre" | "info" | "succes" | "attention" | "danger";

/** Statut affiché : distingue « Partiel » et « En retard » à partir des montants et de l'échéance. */
export function statutAffiche(d: Pick<Document, "type" | "statut" | "total" | "montant_paye" | "echeance">,
  aujourdhui = new Date()): { libelle: string; ton: Ton } {
  const s: StatutDocument = d.statut;
  if (s === "brouillon") return { libelle: "Brouillon", ton: "neutre" };
  if (s === "annule") return { libelle: "Annulé", ton: "danger" };
  if (d.type === "proforma") {
    if (s === "accepte") return { libelle: "Acceptée", ton: "succes" };
    if (s === "refuse") return { libelle: "Refusée", ton: "danger" };
    return { libelle: "Envoyée", ton: "info" };
  }
  if (d.type === "bl") return { libelle: "Émis", ton: "info" };
  if (s === "paye") return { libelle: "Payée", ton: "succes" };
  const jour = aujourdhui.toISOString().slice(0, 10);
  if (d.echeance && d.echeance < jour) return { libelle: "En retard", ton: "danger" };
  if (d.montant_paye > 0) return { libelle: "Partiel", ton: "attention" };
  return { libelle: "Non payée", ton: "attention" };
}

export function resteAPayer(d: Pick<Document, "total" | "montant_paye">): number {
  return Math.max(0, d.total - d.montant_paye);
}
