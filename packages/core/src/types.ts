import type { TypeTaxe } from "./taxe";

/** Types des lignes de la base (voir supabase/migrations). Montants : entiers ; quantités : décimaux. */

export type RoleEquipe = "proprietaire" | "admin" | "membre";

export interface Profil {
  id: string;
  email: string | null;
  nom_complet: string | null;
  telephone: string | null;
  essai_fin: string;
  abonnement_statut: "essai" | "en_attente" | "actif" | "expire" | "aucun";
  abonnement_plan: "mensuel" | "annuel" | null;
  abonnement_fin: string | null;
}

export interface MonEquipe {
  id: string;
  nom: string;
  role: RoleEquipe;
}

export interface Parametres {
  equipe_id: string;
  nom_entreprise: string;
  adresse: string | null;
  telephone: string | null;
  telephone2: string | null;
  email: string | null;
  site_web: string | null;
  identifiant_fiscal: string | null;
  rccm: string | null;
  ninea: string | null;
  devise: string;
  symbole_devise: string;
  prefixe_facture: string;
  prefixe_proforma: string;
  prefixe_bl: string;
  prefixe_avoir: string;
  format_numero: string;
  prefixe_ref_produit: string;
  ref_produit_auto: boolean;
  unite_defaut: string;
  taxe_type: TypeTaxe;
  taxe_nom: string;
  taxe_taux: number;
  taxe_incluse: boolean;
  pied_facture: string | null;
  conditions_defaut: string | null;
  logo_url: string | null;
  signature_url: string | null;
  couleur_document: string;
}

export type ParametresModifiables = Partial<Omit<Parametres, "equipe_id">>;

export interface Categorie {
  id: string;
  equipe_id: string;
  nom: string;
  description: string | null;
  couleur: string | null;
}

export interface Fournisseur {
  id: string;
  equipe_id: string;
  nom: string;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  contact: string | null;
  notes: string | null;
}

export interface Produit {
  id: string;
  equipe_id: string;
  nom: string;
  reference: string | null;
  code_barres: string | null;
  categorie_id: string | null;
  description: string | null;
  unite: string;
  prix_vente: number;
  prix_achat: number;
  seuil_alerte: number;
  quantite: number;
  image_url: string | null;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

/** Champs saisis sur la fiche produit */
export interface SaisieProduit {
  nom: string;
  reference?: string | null;
  code_barres?: string | null;
  categorie_id?: string | null;
  description?: string | null;
  unite?: string;
  prix_vente?: number;
  prix_achat?: number;
  seuil_alerte?: number;
  image_url?: string | null;
}

export type TypeMouvement = "entree" | "sortie" | "ajustement";

export interface MouvementStock {
  id: number;
  produit_id: string;
  type: TypeMouvement;
  variation: number;
  quantite_avant: number;
  quantite_apres: number;
  motif: string | null;
  reference: string | null;
  document_id: string | null;
  achat_id: string | null;
  inventaire_id: string | null;
  created_at: string;
  produits?: { nom: string; unite: string } | null;
}

export interface AlerteStock {
  id: string;
  produit_id: string;
  quantite: number;
  seuil: number;
  statut: "active" | "resolue";
  created_at: string;
  produits?: { nom: string; unite: string } | null;
}

export interface Inventaire {
  id: string;
  reference: string;
  date: string;
  statut: "brouillon" | "cloture";
  notes: string | null;
  ecarts: number;
  created_at: string;
  cloture_le: string | null;
}

export interface LigneInventaire {
  inventaire_id: string;
  produit_id: string;
  quantite_theorique: number;
  quantite_comptee: number | null;
  produits?: { nom: string; unite: string; code_barres: string | null; reference: string | null } | null;
}

export interface Client {
  id: string;
  equipe_id: string;
  nom: string;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  notes: string | null;
}

export type TypeDocument = "facture" | "proforma" | "bl";
export type StatutDocument = "brouillon" | "emis" | "paye" | "accepte" | "refuse" | "annule";
export type ModePaiement = "especes" | "wave" | "orange_money" | "carte" | "virement" | "cheque" | "credit" | "autre";

export interface Document {
  id: string;
  equipe_id: string;
  type: TypeDocument;
  statut: StatutDocument;
  numero: string | null;
  date: string;
  echeance: string | null;
  client_id: string | null;
  client_nom: string;
  client_telephone: string | null;
  client_adresse: string | null;
  conditions: string | null;
  notes: string | null;
  taxe_type: TypeTaxe;
  taxe_nom: string;
  taxe_taux: number;
  taxe_incluse: boolean;
  sous_total: number;
  base_taxable: number;
  montant_taxe: number;
  total: number;
  montant_paye: number;
  source_id: string | null;
  valide_le: string | null;
  created_at: string;
}

export interface LigneDocument {
  id?: string;
  produit_id: string | null;
  designation: string;
  description?: string | null;
  unite?: string | null;
  prix_unitaire: number;
  quantite: number;
  taxable: boolean;
  total?: number;
}

export interface EnteteDocument {
  client_id?: string | null;
  client_nom?: string;
  client_telephone?: string | null;
  client_adresse?: string | null;
  date?: string;
  echeance?: string | null;
  conditions?: string | null;
  notes?: string | null;
}

export interface Reglement {
  id: string;
  document_id: string;
  montant: number;
  mode: ModePaiement;
  date: string;
  reference: string | null;
  created_at: string;
}

export type StatutAchat = "brouillon" | "recu" | "annule";

export interface Achat {
  id: string;
  equipe_id: string;
  numero: string | null;
  date: string;
  statut: StatutAchat;
  fournisseur_id: string | null;
  fournisseur_nom: string;
  reference_fournisseur: string | null;
  mode_paiement: ModePaiement;
  montant_paye: number;
  total: number;
  notes: string | null;
  created_at: string;
}

export interface LigneAchat {
  produit_id: string;
  quantite: number;
  cout_unitaire: number;
  total?: number;
  produits?: { nom: string; unite: string } | null;
}

export interface EnteteAchat {
  fournisseur_id?: string | null;
  fournisseur_nom?: string;
  date?: string;
  reference_fournisseur?: string | null;
  mode_paiement?: ModePaiement;
  montant_paye?: number;
  notes?: string | null;
}
