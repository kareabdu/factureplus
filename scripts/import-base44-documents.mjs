// Rattrapage des factures / proformas / BL créés dans l'ancienne application (base44) après l'import
// initial, pour les entreprises déjà importées (exports/base44/import-etat.json).
//
// Entrée : nouveaux exports base44 Invoice_export.csv et InvoiceItem_export.csv dans le dossier donné.
// Sortie : fichiers SQL (lots de 40 documents) à exécuter sur la base, sans clé de service :
//   node scripts/import-base44-documents.mjs <dossier-des-exports> [--depuis 2026-11-15]
// Sans --depuis : documents créés après l'import initial de chaque entreprise.
//
// Chaque document n'est inséré que si l'entreprise n'a pas déjà ce type et ce numéro ; produits et clients
// rattachés par leur nom ; les factures émises ou payées sortent leur stock (prive.mouvementer) ;
// les compteurs de numérotation sont relevés pour que FacturePlus ne réutilise pas ces numéros.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [dossier] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!dossier) throw new Error("Usage : node scripts/import-base44-documents.mjs <dossier> [--depuis AAAA-MM-JJ]");
const iDepuis = process.argv.indexOf("--depuis");
const DEPUIS = iDepuis >= 0 ? new Date(`${process.argv[iDepuis + 1]}T00:00:00Z`) : null;

function lireCsv(chemin) {
  const texte = readFileSync(chemin, "utf8").replace(/^\uFEFF/, "");
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
  return donnees.map((l) => Object.fromEntries(entete.map((k, i) => [k, l[i] ?? ""]))).filter((r) => r.is_sample !== "true");
}

const texte = (v, max) => {
  const s = String(v ?? "").replace(/[\u202A\u202C]/g, "").trim().replace(/^'+(?=\s*[+=\-@0-9])/, "").trim();
  return s ? s.slice(0, max) : null;
};
const entier = (v) => { const n = Math.round(Number(String(v ?? "").replace(",", "."))); return Number.isFinite(n) ? n : 0; };
const nombre = (v) => { const n = Number(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : 0; };
const jour = (v) => (/^\d{4}-\d{2}-\d{2}/.test(v ?? "") ? v.slice(0, 10) : null);
const horodatage = (v) => (v ? new Date(v.endsWith("Z") || /[+-]\d\d:\d\d$/.test(v) ? v : `${v}Z`) : null);
const json = (v) => { try { return JSON.parse(v); } catch { return null; } };
const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);

const STATUTS = { draft: "emis", sent: "emis", paid: "paye", cancelled: "annule", accepted: "accepte", refused: "refuse" };
const TYPES = { invoice: "facture", proforma: "proforma", bl: "bl" };
function modeReglement(m) {
  const s = String(m ?? "").trim().toLowerCase();
  if (!s) return "especes";
  if (s.includes("wave")) return "wave";
  if (s.includes("orange") || s.includes("om")) return "orange_money";
  if (s.includes("vir") || s.includes("bank") || s.includes("transfer")) return "virement";
  if (s.includes("ch")) return "cheque";
  return "especes";
}

const etat = JSON.parse(readFileSync(new URL("../exports/base44/import-etat.json", import.meta.url), "utf8")).faites;
const documents = lireCsv(join(dossier, "Invoice_export.csv"));
// Produits base44 → date de création, conservée à l'import initial (created_at) : identifie le bon produit
// même quand plusieurs produits portent le même nom. Exports d'origine, et nouveaux s'ils sont fournis.
const creationProduit = new Map();
for (const chemin of [new URL("../exports/base44/Product_export.csv", import.meta.url), join(dossier, "Product_export.csv")]) {
  try { for (const p of lireCsv(chemin)) creationProduit.set(p.id, horodatage(p.created_date)?.toISOString() ?? null); } catch { /* absent */ }
}
const lignesParDocument = new Map();
for (const l of lireCsv(join(dossier, "InvoiceItem_export.csv"))) {
  if (!lignesParDocument.has(l.invoice_id)) lignesParDocument.set(l.invoice_id, []);
  lignesParDocument.get(l.invoice_id).push(l);
}

const blocs = [];
const bilan = new Map();
for (const d of documents) {
  const equipe = etat[d.team_id];
  if (!equipe) continue; // entreprise non importée
  const cree = horodatage(d.created_date);
  const depuis = DEPUIS ?? new Date(equipe.le);
  if (!cree || cree < depuis) continue;
  const type = TYPES[d.type], statut = STATUTS[d.status];
  if (!type || !statut) continue;
  const numero = texte(d.invoice_number, 55) ?? `ANC-${d.id.slice(-6)}`;
  const date = jour(d.date) ?? jour(d.created_date);
  const e = q(equipe.equipe_id);

  const items = (lignesParDocument.get(d.id) ?? []).sort((a, b) => a.created_date.localeCompare(b.created_date));
  const lignesSql = [];
  let sousTotal = 0;
  for (const l of items) {
    const quantite = Math.round(nombre(l.quantity) * 1000) / 1000;
    if (quantite <= 0 || quantite >= 1e9) continue;
    const prix = Math.max(0, entier(l.unit_price));
    const total = Math.max(0, entier(l.total_price) || Math.round(prix * quantite));
    sousTotal += total;
    const designation = texte(l.product_name, 300) ?? texte(l.description, 300) ?? "Article";
    lignesSql.push({ designation, description: texte(l.description, 1000), unite: texte(l.unit, 20), prix, quantite,
      taxable: l.taxable !== "false", total, produit: creationProduit.get(l.product_id) ?? null });
  }
  const total = Math.max(0, entier(d.total_amount)) || sousTotal;
  const paiements = (json(d.payments) ?? []).filter((p) => entier(p?.amount) > 0);
  let regle = paiements.reduce((s, p) => s + entier(p.amount), 0);
  const reglements = paiements.map((p) => ({ montant: entier(p.amount), mode: modeReglement(p.method), date: jour(p.date) ?? date }));
  if (!paiements.length && type === "facture") {
    const du = d.balance_due === "" ? null : entier(d.balance_due);
    regle = statut === "paye" ? total : du !== null ? Math.max(0, total - du) : 0;
    if (regle > 0) reglements.push({ montant: regle, mode: modeReglement(d.payment_method), date: jour(d.payment_date) ?? date });
  }
  blocs.push({
    e: equipe.equipe_id, t: type, s: statut, n: numero, d: date, ech: jour(d.due_date), c: cree.toISOString(),
    cn: texte(d.customer_name, 200), ct: texte(d.customer_phone, 30), ca: texte(d.billing_address, 300),
    cond: texte(d.payment_terms, 1000), notes: texte(d.notes, 2000), st: sousTotal, tot: total, p: regle,
    // Stock réellement retiré par l'ancienne app pour cette facture : on le retire aussi ici
    sd: type === "facture" && (statut === "emis" || statut === "paye") && d.stock_deducted === "true",
    l: lignesSql.map((l) => [l.designation, l.description, l.unite, l.prix, l.quantite, l.taxable, l.total, l.produit]),
    r: reglements.map((r) => [r.montant, r.mode, r.date]),
  });
  const b = bilan.get(equipe.email) ?? { factures: 0, proformas: 0, bl: 0 };
  b[type === "facture" ? "factures" : type === "proforma" ? "proformas" : "bl"]++;
  bilan.set(equipe.email, b);
}

// Compteurs de numérotation relevés au plus grand numéro importé (suffixe numérique du numéro)
const compteurs = `insert into prive.compteurs (equipe_id, type, annee, dernier)
select equipe_id, type, extract(year from date)::int, max((regexp_match(numero, '(\\d+)$'))[1]::int)
from public.documents where numero ~ '-\\d+$' and numero not like 'ANC-%' and date is not null
group by equipe_id, type, extract(year from date)
on conflict (equipe_id, type, annee) do update set dernier = greatest(prive.compteurs.dernier, excluded.dernier);`;

// Bloc SQL de traitement : remplacer __DONNEES__ par le contenu d'un lot JSON (apostrophes doublées)
const traitement = `do $$
declare
  doc jsonb; l jsonb; r jsonb; v_id uuid; v_num text; v_proprio uuid; v_produit uuid; v_pos int; v_e uuid; v_stock numeric;
  v_inseres int := 0; v_ignores int := 0;
begin
  for doc in select * from jsonb_array_elements('__DONNEES__'::jsonb) loop
    v_e := (doc->>'e')::uuid;
    v_num := doc->>'n';
    -- Déjà importé (même type, numéro et date de création) : ignoré
    if exists (select 1 from public.documents where equipe_id = v_e and type = (doc->>'t')::public.type_document
               and numero = v_num and created_at = (doc->>'c')::timestamptz) then v_ignores := v_ignores + 1; continue; end if;
    -- Numéro déjà pris par un document créé dans FacturePlus : suffixe « -A »
    while exists (select 1 from public.documents where equipe_id = v_e and type = (doc->>'t')::public.type_document and numero = v_num) loop
      v_num := v_num || '-A';
    end loop;
    select user_id into v_proprio from public.membres_equipe where equipe_id = v_e and role = 'proprietaire' limit 1;
    insert into public.documents (equipe_id, type, statut, numero, date, echeance, client_id, client_nom, client_telephone,
      client_adresse, conditions, notes, taxe_type, taxe_taux, sous_total, base_taxable, montant_taxe, total, montant_paye,
      user_id, valide_le, created_at)
    values (v_e, (doc->>'t')::public.type_document, (doc->>'s')::public.statut_document, v_num, (doc->>'d')::date, (doc->>'ech')::date,
      (select id from public.clients where equipe_id = v_e and lower(trim(nom)) = lower(trim(doc->>'cn')) limit 1),
      coalesce(doc->>'cn', ''), doc->>'ct', doc->>'ca', doc->>'cond', doc->>'notes', 'aucune', 0,
      (doc->>'st')::bigint, (doc->>'st')::bigint, greatest(0, (doc->>'tot')::bigint - (doc->>'st')::bigint), (doc->>'tot')::bigint,
      (doc->>'p')::bigint, v_proprio, (doc->>'c')::timestamptz, (doc->>'c')::timestamptz)
    returning id into v_id;
    v_pos := 0;
    for l in select * from jsonb_array_elements(doc->'l') loop
      -- Produit d'origine (date de création), sinon même nom : le produit actif le mieux approvisionné
      v_produit := coalesce(
        (select id from public.produits where equipe_id = v_e and created_at = (l->>7)::timestamptz limit 1),
        (select id from public.produits where equipe_id = v_e and lower(trim(nom)) = lower(trim(l->>0))
         order by actif desc, quantite desc limit 1));
      insert into public.document_lignes (document_id, equipe_id, position, produit_id, designation, description, unite,
        prix_unitaire, quantite, taxable, total)
      values (v_id, v_e, v_pos, v_produit, l->>0, l->>1, l->>2, (l->>3)::bigint, (l->>4)::numeric, (l->>5)::boolean, (l->>6)::bigint);
      v_pos := v_pos + 1;
      -- Facture dont l'ancienne app avait retiré le stock : même sortie ici, sans descendre sous zéro
      -- (l'ancienne app ramenait le stock à 0 : on retrouve exactement son stock)
      if v_produit is not null and (doc->>'sd')::boolean then
        select quantite into v_stock from public.produits where id = v_produit;
        if v_stock > 0 then
          perform prive.mouvementer(v_produit, 'sortie', least(v_stock, (l->>4)::numeric), 'Facture de l''ancienne application', v_num, v_id);
        end if;
      end if;
    end loop;
    for r in select * from jsonb_array_elements(doc->'r') loop
      insert into public.reglements (document_id, equipe_id, montant, mode, date, user_id)
      values (v_id, v_e, (r->>0)::bigint, (r->>1)::public.mode_paiement, coalesce((r->>2)::date, (doc->>'d')::date), v_proprio);
    end loop;
    v_inseres := v_inseres + 1;
  end loop;
  raise notice 'insérés : %, déjà présents : %', v_inseres, v_ignores;
end $$;`;
writeFileSync(join(dossier, "rattrapage-traitement.sql"), traitement + "\n");

const TAILLE = 40;
let n = 0;
for (let i = 0; i < blocs.length; i += TAILLE) {
  writeFileSync(join(dossier, `rattrapage-${String(++n).padStart(2, "0")}.json`), JSON.stringify(blocs.slice(i, i + TAILLE)));
}
writeFileSync(join(dossier, "rattrapage-compteurs.sql"), compteurs + "\n");
console.log(`${blocs.length} document(s) à importer, ${n} lot(s)`);
for (const [email, b] of bilan) console.log(`  ${email} : ${b.factures} facture(s), ${b.proformas} proforma(s), ${b.bl} BL`);
