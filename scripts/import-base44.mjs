// Import des abonnés de l'ancienne application (base44) dans FacturePlus.
//
// Entrée : exports CSV du tableau de bord base44 dans exports/base44/ (jamais versionnés).
// Comptes visés : utilisateurs ayant payé un abonnement (en cours ou expiré).
// Pour chacun : compte (sans mot de passe : « Mot de passe oublié » à la première connexion),
// abonnement, entreprise et paramètres, catégories, produits, clients, fournisseurs,
// factures / proformas / BL avec lignes et règlements, dépenses, historique des paiements.
//
//   node scripts/import-base44.mjs --essai          contrôle sans rien écrire
//   SUPABASE_SERVICE_ROLE_KEY=… node scripts/import-base44.mjs
//
// Reprise possible : les entreprises déjà importées (exports/base44/import-etat.json) sont sautées.
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(new URL("../apps/web/package.json", import.meta.url));
const { createClient } = require("@supabase/supabase-js");

const DOSSIER = new URL("../exports/base44/", import.meta.url);
const FICHIER_ETAT = new URL("import-etat.json", DOSSIER);
const ESSAI = process.argv.includes("--essai");
// --seulement email1,email2 : limite l'import à ces comptes (test sur une entreprise)
const indexSeulement = process.argv.indexOf("--seulement");
const SEULEMENT = indexSeulement >= 0 ? (process.argv[indexSeulement + 1] ?? "").toLowerCase().split(",").filter(Boolean) : [];
const AUJOURDHUI = new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Lecture CSV (RFC 4180 : guillemets doublés, retours à la ligne dans les champs)
// ---------------------------------------------------------------------------
function lireCsv(nom) {
  const texte = readFileSync(new URL(nom, DOSSIER), "utf8").replace(/^\uFEFF/, "");
  const lignes = [];
  let ligne = [], champ = "", guillemets = false;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (guillemets) {
      if (c === '"' && texte[i + 1] === '"') { champ += '"'; i++; }
      else if (c === '"') guillemets = false;
      else champ += c;
    } else if (c === '"') guillemets = true;
    else if (c === ",") { ligne.push(champ); champ = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texte[i + 1] === "\n") i++;
      ligne.push(champ); champ = "";
      if (ligne.length > 1 || ligne[0] !== "") lignes.push(ligne);
      ligne = [];
    } else champ += c;
  }
  if (champ !== "" || ligne.length) { ligne.push(champ); lignes.push(ligne); }
  const [entete, ...donnees] = lignes;
  return donnees.map((l) => Object.fromEntries(entete.map((k, i) => [k, l[i] ?? ""])))
    .filter((r) => r.is_sample !== "true");
}

// ---------------------------------------------------------------------------
// Outils de nettoyage
// ---------------------------------------------------------------------------
const texte = (v, max) => {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : null;
};
const entier = (v) => {
  const n = Math.round(Number(String(v ?? "").replace(",", ".")));
  return Number.isFinite(n) ? n : 0;
};
const nombre = (v) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
// Quantité aberrante (faute de saisie, ≥ 1 milliard) : ramenée à 0, au-delà des limites de la base
const QUANTITE_MAX = 1e9;
const jour = (v) => (/^\d{4}-\d{2}-\d{2}/.test(v ?? "") ? v.slice(0, 10) : null);
const horodatage = (v) => (v ? new Date(v.endsWith("Z") || /[+-]\d\d:\d\d$/.test(v) ? v : `${v}Z`).toISOString() : null);
const hexa = (v) => (/^#[0-9a-f]{6}$/i.test(v ?? "") ? v : null);
const json = (v) => { try { return JSON.parse(v); } catch { return null; } };
const sansVides = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined));
const cle = (s) => String(s ?? "").trim().toLowerCase();

const PLANS = { monthly: "mensuel", annual: "annuel", semestriel: "annuel" };
const DUREES = { monthly: 30, semestriel: 180, annual: 365 };
const STATUTS = { draft: "emis", sent: "emis", paid: "paye", cancelled: "annule", accepted: "accepte", refused: "refuse" };
const TYPES = { invoice: "facture", proforma: "proforma", bl: "bl" };
const MODELES = { classic: "classique", compact: "bandeau", sharp: "moderne", clean: "client" };
const CATEGORIES_DEPENSE = ["loyer", "salaire", "fournitures", "transport", "facture", "impot", "autre"];

function modeReglement(m) {
  const s = cle(m);
  if (!s) return null;
  if (s.includes("wave")) return "wave";
  if (s.includes("orange") || s.includes("om")) return "orange_money";
  if (s.includes("esp") || s.includes("cash")) return "especes";
  if (s.includes("carte") || s.includes("card")) return "carte";
  if (s.includes("vir") || s.includes("transfer")) return "virement";
  if (s.includes("ch")) return "cheque";
  return "autre";
}
function moyenDepense(m) {
  const s = cle(m);
  if (!s) return null;
  if (s.includes("esp") || s.includes("cash")) return "especes";
  if (s.includes("wave")) return "wave";
  if (s.includes("orange")) return "orange_money";
  if (s.includes("vir")) return "virement";
  if (s.includes("ch")) return "cheque";
  if (s.includes("carte")) return "carte";
  return "autre";
}

// ---------------------------------------------------------------------------
// Données et comptes visés
// ---------------------------------------------------------------------------
const utilisateurs = lireCsv("StockTracker-users.csv");
const paiements = lireCsv("SubscriptionPayment_export.csv");
const parTeam = (nom) => {
  const m = new Map();
  for (const r of lireCsv(nom)) {
    if (!m.has(r.team_id)) m.set(r.team_id, []);
    m.get(r.team_id).push(r);
  }
  return m;
};
const T = {
  reglages: parTeam("Settings_export.csv"),
  categories: parTeam("Category_export.csv"),
  produits: parTeam("Product_export.csv"),
  clients: parTeam("Customer_export.csv"),
  fournisseurs: parTeam("Supplier_export.csv"),
  documents: parTeam("Invoice_export.csv"),
  depenses: parTeam("Expense_export.csv"),
};
const lignesParDocument = new Map();
for (const l of lireCsv("InvoiceItem_export.csv")) {
  if (!lignesParDocument.has(l.invoice_id)) lignesParDocument.set(l.invoice_id, []);
  lignesParDocument.get(l.invoice_id).push(l);
}

const idParEmail = new Map(paiements.map((p) => [cle(p.user_email), p.user_id]));
const payes = paiements.filter((p) => p.status === "paid");
const emailsPayeurs = new Set(payes.map((p) => cle(p.user_email)));

const cibles = utilisateurs.filter((u) => !u.deleted_at && (emailsPayeurs.has(cle(u.email)) || u.subscription_end_date));

/** Abonnement repris : date de fin connue ou déduite du dernier paiement. */
function abonnementRepris(u) {
  let fin = jour(u.subscription_end_date);
  let plan = PLANS[u.subscription_plan] ?? null;
  if (!fin) {
    const dernier = payes.filter((p) => cle(p.user_email) === cle(u.email))
      .sort((a, b) => b.created_date.localeCompare(a.created_date))[0];
    if (dernier) {
      const d = new Date(horodatage(dernier.created_date));
      d.setDate(d.getDate() + (DUREES[dernier.plan] ?? 30));
      fin = d.toISOString().slice(0, 10);
      plan ??= PLANS[dernier.plan] ?? null;
    }
  }
  return { fin, plan, statut: fin && fin >= AUJOURDHUI ? "actif" : "expire" };
}

// Regroupement par entreprise (équipe base44) : compte principal = propriétaire de l'équipe
const equipes = new Map();
for (const u of cibles) {
  const team = u.team_id || idParEmail.get(cle(u.email));
  if (!equipes.has(team)) equipes.set(team, []);
  equipes.get(team).push(u);
}
for (const [team, membres] of equipes) {
  membres.sort((a, b) => (idParEmail.get(cle(b.email)) === team) - (idParEmail.get(cle(a.email)) === team));
}

// ---------------------------------------------------------------------------
// Transformation d'une entreprise en lignes FacturePlus
// ---------------------------------------------------------------------------
function construire(team, equipeId, proprietaireId) {
  const reglage = (T.reglages.get(team) ?? []).sort((a, b) => b.updated_date.localeCompare(a.updated_date))[0] ?? {};
  const principal = equipes.get(team)[0];
  const nomEntreprise = texte(reglage.company_name, 200) ?? texte(principal.full_name, 200) ?? principal.email.split("@")[0];
  let devise = cle(reglage.currency).toUpperCase();
  if (devise === "EURO") devise = "EUR";
  const avecTaxe = reglage.tax_type === "total" && nombre(reglage.tax_rate) > 0;

  const parametres = sansVides({
    equipe_id: equipeId,
    nom_entreprise: nomEntreprise,
    adresse: texte(reglage.company_address, 300),
    telephone: texte(reglage.company_phone, 30),
    telephone2: texte(reglage.company_phone2, 30),
    email: texte(reglage.company_email, 200),
    site_web: texte(reglage.company_website, 200),
    identifiant_fiscal: texte(reglage.company_tax_id, 50),
    rccm: texte(reglage.company_rcm, 50),
    ninea: texte(reglage.company_ninea, 50),
    devise: devise.length >= 3 && devise.length <= 5 ? devise : null,
    symbole_devise: texte(reglage.currency_symbol, 10),
    prefixe_facture: texte(reglage.invoice_prefix, 20),
    prefixe_proforma: texte(reglage.proforma_prefix, 20),
    prefixe_bl: texte(reglage.bl_prefix, 20),
    format_numero: texte(reglage.invoice_number_format, 60),
    prefixe_ref_produit: texte(reglage.product_ref_prefix, 20),
    ref_produit_auto: reglage.product_ref_auto === "true" ? true : reglage.product_ref_auto === "false" ? false : null,
    unite_defaut: texte(reglage.default_unit, 20),
    taxe_type: avecTaxe ? "total" : "aucune",
    taxe_nom: texte(reglage.tax_name, 30),
    taxe_taux: avecTaxe ? Math.min(100, nombre(reglage.tax_rate)) : null,
    taxe_incluse: reglage.tax_inclusive === "true" ? true : null,
    pied_facture: texte(reglage.invoice_footer, 1000),
    conditions_defaut: texte(reglage.default_terms, 1000),
    logo_url: texte(reglage.company_logo_url, 2000),
    signature_url: texte(reglage.signature_url, 2000),
    couleur_document: hexa(reglage.invoice_color),
    modele_document: MODELES[reglage.invoice_template] ?? null,
  });

  // Catégories (nom unique par entreprise)
  const categories = [], idCategorie = new Map(), nomsCategories = new Set();
  for (const c of T.categories.get(team) ?? []) {
    const nom = texte(c.name, 100);
    if (!nom) continue;
    if (nomsCategories.has(cle(nom))) {
      idCategorie.set(c.id, categories.find((x) => cle(x.nom) === cle(nom)).id);
      continue;
    }
    nomsCategories.add(cle(nom));
    const id = randomUUID();
    idCategorie.set(c.id, id);
    categories.push(sansVides({ id, equipe_id: equipeId, nom, description: texte(c.description, 500), couleur: hexa(c.color) }));
  }

  // Produits (référence et code-barres uniques par entreprise)
  const produits = [], idProduit = new Map(), refs = new Set(), codes = new Set();
  for (const p of T.produits.get(team) ?? []) {
    const nom = texte(p.name, 200);
    if (!nom) continue;
    let reference = texte(p.sku, 60);
    if (reference && refs.has(cle(reference))) reference = null;
    if (reference) refs.add(cle(reference));
    let code = texte(p.barcode, 64);
    if (code && codes.has(code)) code = null;
    if (code) codes.add(code);
    const id = randomUUID();
    idProduit.set(p.id, id);
    produits.push(sansVides({
      id, equipe_id: equipeId, nom, reference, code_barres: code,
      categorie_id: idCategorie.get(p.category_id) ?? null,
      description: texte(p.description, 2000),
      unite: texte(p.unit, 20) ?? "Pcs",
      prix_vente: Math.max(0, entier(p.unit_price)),
      prix_achat: Math.max(0, entier(p.cost_price)),
      seuil_alerte: nombre(p.reorder_level) >= QUANTITE_MAX ? 0 : Math.max(0, nombre(p.reorder_level)),
      quantite: nombre(p.quantity) >= QUANTITE_MAX ? 0 : Math.max(0, Math.round(nombre(p.quantity) * 1000) / 1000),
      image_url: texte(p.image_url, 2000),
      created_at: horodatage(p.created_date),
    }));
  }

  const clients = [], idClientParNom = new Map();
  for (const c of T.clients.get(team) ?? []) {
    const nom = texte(c.name, 200);
    if (!nom) continue;
    const id = randomUUID();
    if (!idClientParNom.has(cle(nom))) idClientParNom.set(cle(nom), id);
    clients.push(sansVides({
      id, equipe_id: equipeId, nom, telephone: texte(c.phone, 30), email: texte(c.email, 200),
      adresse: texte(c.address, 300), notes: texte(c.description, 2000), created_at: horodatage(c.created_date),
    }));
  }

  const fournisseurs = (T.fournisseurs.get(team) ?? []).filter((f) => texte(f.name, 200)).map((f) => sansVides({
    id: randomUUID(), equipe_id: equipeId, nom: texte(f.name, 200), telephone: texte(f.phone, 30), email: texte(f.email, 200),
    adresse: texte(f.address, 300), contact: texte(f.contact_person, 120), notes: texte(f.notes, 2000),
    created_at: horodatage(f.created_date),
  }));

  // Documents, lignes, règlements et sorties de stock déjà faites par les factures
  const documents = [], lignes = [], reglements = [], mouvementsFactures = [], numeros = new Set();
  for (const d of T.documents.get(team) ?? []) {
    const type = TYPES[d.type];
    const statut = STATUTS[d.status];
    if (!type || !statut) continue;
    let numero = texte(d.invoice_number, 55) ?? `ANC-${d.id.slice(-6)}`;
    while (numeros.has(`${type}|${numero}`)) numero = `${numero}-b`;
    numeros.add(`${type}|${numero}`);
    const id = randomUUID();
    const date = jour(d.date) ?? jour(d.created_date) ?? AUJOURDHUI;

    const items = (lignesParDocument.get(d.id) ?? []).sort((a, b) => a.created_date.localeCompare(b.created_date));
    let sousTotal = 0, position = 0;
    const qteParProduit = new Map();
    for (const l of items) {
      const quantite = Math.round(nombre(l.quantity) * 1000) / 1000;
      if (quantite <= 0 || quantite >= QUANTITE_MAX) continue;
      const prix = Math.max(0, entier(l.unit_price));
      const total = Math.max(0, entier(l.total_price) || Math.round(prix * quantite));
      const produitId = idProduit.get(l.product_id) ?? null;
      sousTotal += total;
      lignes.push(sansVides({
        id: randomUUID(), document_id: id, equipe_id: equipeId, position: position++, produit_id: produitId,
        designation: texte(l.product_name, 300) ?? texte(l.description, 300) ?? "Article",
        description: texte(l.description, 1000), unite: texte(l.unit, 20),
        prix_unitaire: prix, quantite, taxable: l.taxable !== "false", total,
      }));
      if (produitId) qteParProduit.set(produitId, (qteParProduit.get(produitId) ?? 0) + quantite);
    }
    const total = Math.max(0, entier(d.total_amount)) || sousTotal;

    // Règlements : liste base44, sinon montant déjà réglé
    const paiementsDoc = (json(d.payments) ?? []).filter((p) => entier(p?.amount) > 0);
    let regle = 0;
    for (const p of paiementsDoc) {
      regle += entier(p.amount);
      reglements.push(sansVides({
        document_id: id, equipe_id: equipeId, montant: entier(p.amount), mode: modeReglement(p.method),
        date: jour(p.date) ?? date, user_id: proprietaireId,
      }));
    }
    if (!paiementsDoc.length && type === "facture") {
      const du = d.balance_due === "" ? null : entier(d.balance_due);
      regle = statut === "paye" ? total : du !== null ? Math.max(0, total - du) : 0;
      if (regle > 0) {
        reglements.push(sansVides({
          document_id: id, equipe_id: equipeId, montant: regle, mode: modeReglement(d.payment_method),
          date: jour(d.payment_date) ?? date, user_id: proprietaireId,
        }));
      }
    }

    documents.push(sansVides({
      id, equipe_id: equipeId, type, statut, numero, date, echeance: jour(d.due_date),
      client_id: idClientParNom.get(cle(d.customer_name)) ?? null,
      client_nom: texte(d.customer_name, 200), client_telephone: texte(d.customer_phone, 30),
      client_adresse: texte(d.billing_address, 300), conditions: texte(d.payment_terms, 1000), notes: texte(d.notes, 2000),
      taxe_type: avecTaxe ? "total" : "aucune", taxe_nom: avecTaxe ? texte(reglage.tax_name, 30) : null,
      taxe_taux: avecTaxe ? Math.min(100, nombre(reglage.tax_rate)) : 0, taxe_incluse: reglage.tax_inclusive === "true",
      sous_total: sousTotal, base_taxable: sousTotal, montant_taxe: Math.max(0, total - sousTotal), total,
      montant_paye: regle, user_id: proprietaireId, valide_le: horodatage(d.created_date),
      created_at: horodatage(d.created_date),
    }));

    // Facture émise ou payée : sa sortie de stock est considérée comme faite (pas de double déduction ensuite)
    if (type === "facture" && (statut === "emis" || statut === "paye")) {
      for (const [produitId, q] of qteParProduit) {
        mouvementsFactures.push({ produitId, variation: -q, document_id: id, reference: numero.slice(0, 60), date: horodatage(d.created_date) });
      }
    }
  }

  // Historique de stock : sorties des factures puis reprise du stock actuel (la somme = quantité actuelle)
  const mouvements = [];
  const parProduit = new Map();
  for (const m of mouvementsFactures) {
    if (!parProduit.has(m.produitId)) parProduit.set(m.produitId, []);
    parProduit.get(m.produitId).push(m);
  }
  for (const p of produits) {
    const liste = (parProduit.get(p.id) ?? []).sort((a, b) => a.date.localeCompare(b.date));
    let qte = 0;
    for (const m of liste) {
      mouvements.push({
        equipe_id: equipeId, produit_id: p.id, type: "sortie", variation: m.variation, quantite_avant: qte,
        quantite_apres: Math.round((qte + m.variation) * 1000) / 1000, motif: "Facture (ancienne application)",
        reference: m.reference, document_id: m.document_id, user_id: proprietaireId, created_at: m.date,
      });
      qte = Math.round((qte + m.variation) * 1000) / 1000;
    }
    const ecart = Math.round(((p.quantite ?? 0) - qte) * 1000) / 1000;
    if (ecart !== 0) {
      mouvements.push({
        equipe_id: equipeId, produit_id: p.id, type: "ajustement", variation: ecart, quantite_avant: qte,
        quantite_apres: p.quantite ?? 0, motif: "Reprise depuis l'ancienne application", user_id: proprietaireId,
      });
    }
  }

  const depenses = (T.depenses.get(team) ?? []).filter((e) => entier(e.amount) > 0).map((e) => {
    const categorie = CATEGORIES_DEPENSE.includes(e.category) ? e.category : e.category === "utilities" ? "facture" : "autre";
    const description = [texte(e.description, 900), e.receipt_url ? `Reçu : ${e.receipt_url}` : null].filter(Boolean).join("\n");
    return sansVides({
      equipe_id: equipeId, commercant: texte(e.merchant_name, 200) ?? "Dépense", montant: entier(e.amount),
      date_depense: jour(e.date) ?? jour(e.created_date), categorie, moyen_paiement: moyenDepense(e.payment_method),
      description: texte(description, 1000), created_by: proprietaireId, created_at: horodatage(e.created_date),
    });
  });

  return { parametres, categories, produits, clients, fournisseurs, documents, lignes, reglements, mouvements, depenses };
}

// ---------------------------------------------------------------------------
// Exécution
// ---------------------------------------------------------------------------
const etat = existsSync(FICHIER_ETAT) ? JSON.parse(readFileSync(FICHIER_ETAT, "utf8")) : { faites: {} };
const sauver = () => writeFileSync(FICHIER_ETAT, JSON.stringify(etat, null, 2));

let sb = null;
if (!ESSAI) {
  const url = readFileSync(new URL("../apps/web/.env.local", import.meta.url), "utf8").match(/NEXT_PUBLIC_SUPABASE_URL=(\S+)/)?.[1];
  const cleService = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !cleService) {
    console.error("SUPABASE_SERVICE_ROLE_KEY manquante (ou URL absente de apps/web/.env.local).");
    process.exit(1);
  }
  sb = createClient(url, cleService, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function inserer(table, lignes, taille = 500) {
  for (let i = 0; i < lignes.length; i += taille) {
    // Colonnes absentes d'une ligne : valeur par défaut de la base (et non NULL)
    const { error } = await sb.from(table).insert(lignes.slice(i, i + taille), { defaultToNull: false });
    if (error) throw new Error(`${table} : ${error.message}`);
  }
}

async function comptesExistants() {
  const m = new Map();
  for (let page = 1; ; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) m.set(cle(u.email), u.id);
    if (data.users.length < 1000) break;
  }
  return m;
}

async function compte(u, existants) {
  const email = cle(u.email);
  let id = existants.get(email);
  if (!id) {
    const { data, error } = await sb.auth.admin.createUser({
      email, email_confirm: true, user_metadata: { nom_complet: texte(u.full_name, 120) },
    });
    if (error) throw new Error(`compte ${email} : ${error.message}`);
    id = data.user.id;
    existants.set(email, id);
  }
  return id;
}

/** Abonnement et nom repris sur le profil (seulement si l'entreprise est bien importée). */
async function majProfil(u, id) {
  const email = cle(u.email);
  const a = abonnementRepris(u);
  const { error } = await sb.from("profils").update(sansVides({
    nom_complet: texte(u.full_name, 120),
    abonnement_statut: a.statut, abonnement_plan: a.plan, abonnement_fin: a.fin,
    essai_fin: new Date().toISOString(),
  })).eq("id", id);
  if (error) throw new Error(`profil ${email} : ${error.message}`);
}

/** Retire ce qui a été importé pour une entreprise (échec en cours de route) : ordre imposé par les clés étrangères. */
async function nettoyer(equipe) {
  for (const t of ["mouvements_stock", "reglements", "document_lignes", "documents", "alertes_stock", "produits",
    "clients", "fournisseurs", "categories", "depenses"]) {
    await sb.from(t).delete().eq("equipe_id", equipe.id);
  }
  if (!equipe.existante) {
    await sb.from("parametres").delete().eq("equipe_id", equipe.id);
    await sb.from("membres_equipe").delete().eq("equipe_id", equipe.id);
    await sb.from("equipes").delete().eq("id", equipe.id);
  }
}

/** Équipe de destination : nouvelle, ou celle (vide) d'un compte déjà créé dans FacturePlus. */
async function equipeDestination(proprietaireId, nom) {
  const { data: membres } = await sb.from("membres_equipe").select("equipe_id").eq("user_id", proprietaireId).eq("role", "proprietaire");
  for (const { equipe_id } of membres ?? []) {
    const [{ count: p }, { count: d }] = await Promise.all([
      sb.from("produits").select("id", { count: "exact", head: true }).eq("equipe_id", equipe_id),
      sb.from("documents").select("id", { count: "exact", head: true }).eq("equipe_id", equipe_id),
    ]);
    if (!p && !d) return { id: equipe_id, existante: true };
    throw new Error("le compte a déjà des données dans FacturePlus : import sauté");
  }
  const id = randomUUID();
  const { error } = await sb.from("equipes").insert({ id, nom: nom.slice(0, 200), created_by: proprietaireId });
  if (error) throw new Error(`équipe : ${error.message}`);
  const { error: e2 } = await sb.from("membres_equipe").insert({ equipe_id: id, user_id: proprietaireId, role: "proprietaire" });
  if (e2) throw new Error(`membre : ${e2.message}`);
  return { id, existante: false };
}

const bilan = [];
const totaux = {};
const existants = ESSAI ? new Map() : await comptesExistants();

for (const [team, membres] of equipes) {
  const principal = membres[0];
  if (SEULEMENT.length && !membres.some((m) => SEULEMENT.includes(cle(m.email)))) continue;
  if (etat.faites[team]) { bilan.push(`= ${principal.email} : déjà importé`); continue; }
  let equipe = null;
  try {
    if (ESSAI) {
      const r = construire(team, randomUUID(), randomUUID());
      for (const [k, v] of Object.entries(r)) if (Array.isArray(v)) totaux[k] = (totaux[k] ?? 0) + v.length;
      const a = abonnementRepris(principal);
      bilan.push(`✓ ${principal.email} (${membres.length} compte·s) — ${a.statut} jusqu'au ${a.fin ?? "?"} — ${r.produits.length} produits, ${r.documents.length} documents, ${r.clients.length} clients`);
      continue;
    }
    const proprietaireId = await compte(principal, existants);
    const autres = [];
    for (const m of membres.slice(1)) autres.push(await compte(m, existants));

    const nom = texte((T.reglages.get(team) ?? [])[0]?.company_name, 200) ?? texte(principal.full_name, 200) ?? principal.email.split("@")[0];
    equipe = await equipeDestination(proprietaireId, nom);
    await majProfil(principal, proprietaireId);
    for (const [i, m] of membres.slice(1).entries()) await majProfil(m, autres[i]);
    const r = construire(team, equipe.id, proprietaireId);

    if (equipe.existante) {
      const { equipe_id, ...champs } = r.parametres;
      const { error } = await sb.from("parametres").update(champs).eq("equipe_id", equipe_id);
      if (error) throw new Error(`paramètres : ${error.message}`);
    } else {
      await inserer("parametres", [r.parametres]);
    }
    for (const autre of autres) {
      await sb.from("membres_equipe").upsert({ equipe_id: equipe.id, user_id: autre, role: "membre" }, { onConflict: "equipe_id,user_id" });
    }
    await inserer("categories", r.categories);
    await inserer("produits", r.produits);
    await inserer("clients", r.clients);
    await inserer("fournisseurs", r.fournisseurs);
    await inserer("documents", r.documents);
    await inserer("document_lignes", r.lignes, 1000);
    await inserer("reglements", r.reglements, 1000);
    await inserer("mouvements_stock", r.mouvements, 1000);
    await inserer("depenses", r.depenses);

    // Historique des paiements d'abonnement
    const historique = payes.filter((p) => membres.some((m) => cle(m.email) === cle(p.user_email))).map((p) => sansVides({
      utilisateur_id: existants.get(cle(p.user_email)), plan: PLANS[p.plan] ?? "mensuel", montant: entier(p.amount),
      moyen: ["wave", "orange_maxit", "orange_qr"].includes(p.method) ? p.method : "manuel",
      reference: texte(p.reference, 200), transaction_id: texte(p.transaction_id, 200), statut: "paye",
      montant_recu: entier(p.amount), created_at: horodatage(p.created_date), paye_le: horodatage(p.updated_date),
    })).filter((p) => p.montant > 0);
    await inserer("paiements_abonnement", historique);

    etat.faites[team] = { email: principal.email, equipe_id: equipe.id, le: new Date().toISOString() };
    sauver();
    bilan.push(`✓ ${principal.email} — ${r.produits.length} produits, ${r.documents.length} documents, ${r.clients.length} clients, ${r.depenses.length} dépenses`);
  } catch (e) {
    if (equipe) await nettoyer(equipe).catch(() => {});
    bilan.push(`✘ ${principal.email} : ${e.message}${equipe ? " (import annulé, à relancer)" : ""}`);
  }
}

console.log(`${ESSAI ? "ESSAI — rien n'a été écrit" : "Import"} : ${equipes.size} entreprises, ${cibles.length} comptes`);
console.log(bilan.join("\n"));
if (ESSAI) console.log("Totaux :", totaux);
