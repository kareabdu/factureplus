// Mise à jour des documents base44 déjà importés puis modifiés dans l'ancienne application (contenu, paiements,
// annulation), pour les entreprises importées (exports/base44/import-etat.json).
//
// Entrées : deux exports base44 (Invoice_export.csv, InvoiceItem_export.csv) :
//   <reference> : l'export dont FacturePlus reflète l'état (celui du dernier import / rattrapage / mise à jour) ;
//   <nouveau>   : l'export récent.
//   node scripts/maj-base44-documents.mjs <reference> <nouveau>
// Sortie dans <nouveau> : maj-traitement.sql (bloc SQL, remplacer __DONNEES__ par le contenu d'un lot JSON) et
// maj-NN.json (lots de 40 documents). À exécuter sur la base, sans clé de service.
//
// Ordre d'un rattrapage : 1. scripts/import-base44-documents.mjs <nouveau> (documents créés depuis),
// 2. ce script (documents modifiés depuis) ; <nouveau> devient ensuite la référence du rattrapage suivant.
//
// Pour chaque document modifié (retrouvé par entreprise, type et date de création) :
// - contenu changé : lignes remplacées, totaux mis à jour ; stock ajusté de la seule différence de quantité par
//   produit (facture dont l'ancienne app déduisait le stock), sans descendre sous zéro comme l'ancienne app ;
// - paiement : un règlement « Ancienne application » pour ce qui manque seulement (un paiement déjà saisi dans
//   FacturePlus n'est pas compté deux fois), statut « payée » une fois soldée ;
// - annulation : facture annulée, stock de ses lignes réinjecté.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [reference, nouveau] = process.argv.slice(2);
if (!reference || !nouveau) throw new Error("Usage : node scripts/maj-base44-documents.mjs <export-reference> <export-nouveau>");

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

/** Documents et lignes d'un export. */
function charger(dossier) {
  const documents = new Map(lireCsv(join(dossier, "Invoice_export.csv")).map((d) => [d.id, d]));
  const lignes = new Map();
  for (const l of lireCsv(join(dossier, "InvoiceItem_export.csv"))) {
    if (!lignes.has(l.invoice_id)) lignes.set(l.invoice_id, []);
    lignes.get(l.invoice_id).push(l);
  }
  for (const ls of lignes.values()) ls.sort((a, b) => a.created_date.localeCompare(b.created_date));
  return { documents, lignes };
}

const etat = JSON.parse(readFileSync(new URL("../exports/base44/import-etat.json", import.meta.url), "utf8")).faites;
const avant = charger(reference), apres = charger(nouveau);
// Produits base44 → date de création, conservée à l'import (identifie le bon produit quand plusieurs ont le même nom)
const creationProduit = new Map();
for (const chemin of [new URL("../exports/base44/Product_export.csv", import.meta.url), join(reference, "Product_export.csv"), join(nouveau, "Product_export.csv")]) {
  try { for (const p of lireCsv(chemin)) creationProduit.set(p.id, horodatage(p.created_date)?.toISOString() ?? null); } catch { /* absent */ }
}

/** Lignes d'un document au format du traitement SQL. */
const lignesDe = (export_, d) => (export_.lignes.get(d.id) ?? []).map((l) => {
  const quantite = Math.round(nombre(l.quantity) * 1000) / 1000;
  const prix = Math.max(0, entier(l.unit_price));
  return [texte(l.product_name, 300) ?? texte(l.description, 300) ?? "Article", texte(l.description, 1000), texte(l.unit, 20), prix,
    quantite, l.taxable !== "false", Math.max(0, entier(l.total_price) || Math.round(prix * quantite)), creationProduit.get(l.product_id) ?? null];
}).filter((l) => l[4] > 0 && l[4] < 1e9);

/** Montant payé selon l'ancienne app (paiements détaillés, sinon solde restant). */
function paye(d, total) {
  const paiements = (json(d.payments) ?? []).filter((p) => entier(p?.amount) > 0);
  if (paiements.length) return paiements.reduce((s, p) => s + entier(p.amount), 0);
  if (d.status === "paid") return total;
  return d.balance_due === "" ? 0 : Math.max(0, total - entier(d.balance_due));
}

const blocs = [];
const bilan = new Map();
for (const d of apres.documents.values()) {
  const equipe = etat[d.team_id];
  const ancien = avant.documents.get(d.id);
  if (!equipe || !ancien || !TYPES[d.type]) continue; // entreprise non importée, ou document nouveau (rattrapage)
  const type = TYPES[d.type];
  const lAvant = lignesDe(avant, ancien), lApres = lignesDe(apres, d);
  const contenu = JSON.stringify(lAvant) !== JSON.stringify(lApres) || entier(ancien.total_amount) !== entier(d.total_amount);
  const sousTotal = lApres.reduce((s, l) => s + l[6], 0);
  const total = Math.max(0, entier(d.total_amount)) || sousTotal;
  const totalAvant = Math.max(0, entier(ancien.total_amount)) || lAvant.reduce((s, l) => s + l[6], 0);
  const payeAvant = paye(ancien, totalAvant), payeApres = paye(d, total);
  const annule = STATUTS[d.status] === "annule" && STATUTS[ancien.status] !== "annule";
  if (!contenu && payeAvant === payeApres && !annule) continue;
  const paiements = (json(d.payments) ?? []).filter((p) => entier(p?.amount) > 0);
  const dernier = paiements.at(-1);
  blocs.push({
    e: equipe.equipe_id, t: type, c: horodatage(d.created_date).toISOString(), n: texte(d.invoice_number, 60),
    l: contenu ? lApres : null, st: sousTotal, tot: total,
    sd: type === "facture" && d.stock_deducted === "true", p: type === "facture" ? payeApres : 0,
    m: modeReglement(dernier?.method ?? d.payment_method), dp: jour(dernier?.date) ?? jour(d.payment_date) ?? jour(d.date),
    a: annule,
  });
  const b = bilan.get(equipe.email) ?? { contenus: 0, paiements: 0, annulations: 0 };
  if (contenu) b.contenus++;
  if (payeAvant !== payeApres) b.paiements++;
  if (annule) b.annulations++;
  bilan.set(equipe.email, b);
}

// Bloc SQL de traitement : remplacer __DONNEES__ par le contenu d'un lot JSON (apostrophes doublées)
const traitement = `do $$
declare
  doc jsonb; l jsonb; d public.documents; r record; v_pos int; v_produit uuid; v_diff bigint; v_stock numeric; v_q numeric;
  v_contenus int := 0; v_paiements int := 0; v_annulations int := 0; v_introuvables int := 0;
begin
  create temp table if not exists _avant (produit uuid, q numeric) on commit drop;
  create temp table if not exists _apres (produit uuid, q numeric) on commit drop;
  for doc in select * from jsonb_array_elements('__DONNEES__'::jsonb) loop
    select * into d from public.documents where equipe_id = (doc->>'e')::uuid and type = (doc->>'t')::public.type_document
      and created_at = (doc->>'c')::timestamptz and statut <> 'annule' for update;
    if d.id is null then v_introuvables := v_introuvables + 1; continue; end if;
    delete from _avant; delete from _apres;
    -- Quantités par produit avant (produit de la ligne, sinon même nom)
    insert into _avant select coalesce(dl.produit_id, (select id from public.produits p where p.equipe_id = d.equipe_id
        and lower(trim(p.nom)) = lower(trim(dl.designation)) order by p.actif desc, p.quantite desc limit 1)), dl.quantite
      from public.document_lignes dl where dl.document_id = d.id;
    if jsonb_typeof(doc->'l') = 'array' then
      delete from public.document_lignes where document_id = d.id;
      v_pos := 0;
      for l in select * from jsonb_array_elements(doc->'l') loop
        -- Produit d'origine (date de création), sinon même nom : le produit actif le mieux approvisionné
        v_produit := coalesce(
          (select id from public.produits where equipe_id = d.equipe_id and created_at = (l->>7)::timestamptz limit 1),
          (select id from public.produits where equipe_id = d.equipe_id and lower(trim(nom)) = lower(trim(l->>0))
           order by actif desc, quantite desc limit 1));
        insert into public.document_lignes (document_id, equipe_id, position, produit_id, designation, description, unite,
          prix_unitaire, quantite, taxable, total)
        values (d.id, d.equipe_id, v_pos, v_produit, l->>0, l->>1, l->>2, (l->>3)::bigint, (l->>4)::numeric, (l->>5)::boolean, (l->>6)::bigint);
        insert into _apres values (v_produit, (l->>4)::numeric);
        v_pos := v_pos + 1;
      end loop;
      update public.documents set sous_total = (doc->>'st')::bigint, base_taxable = (doc->>'st')::bigint,
        montant_taxe = greatest(0, (doc->>'tot')::bigint - (doc->>'st')::bigint), total = (doc->>'tot')::bigint where id = d.id;
      v_contenus := v_contenus + 1;
    else
      insert into _apres select produit, q from _avant;
    end if;
    -- Annulée dans l'ancienne app : plus rien n'est requis, tout le stock des lignes est réinjecté
    if (doc->>'a')::boolean then delete from _apres; end if;
    -- Stock : seulement la différence de quantité, pour une facture dont l'ancienne app déduisait le stock,
    -- sans descendre sous zéro (l'ancienne app ramenait le stock à 0)
    if d.type = 'facture' and d.statut in ('emis', 'paye') and (doc->>'sd')::boolean then
      for r in select produit, sum(q) delta from (select produit, q from _apres union all select produit, -q from _avant) x
               where produit is not null group by produit having sum(q) <> 0 loop
        if r.delta > 0 then
          select quantite into v_stock from public.produits where id = r.produit;
          v_q := least(r.delta, greatest(v_stock, 0));
          if v_q > 0 then
            perform prive.mouvementer(r.produit, 'sortie'::public.type_mouvement, v_q, 'Facture modifiée dans l''ancienne application', d.numero, d.id);
          end if;
        else
          perform prive.mouvementer(r.produit, 'entree'::public.type_mouvement, -r.delta,
            case when (doc->>'a')::boolean then 'Facture annulée dans l''ancienne application' else 'Facture modifiée dans l''ancienne application' end,
            d.numero, d.id);
        end if;
      end loop;
    end if;
    if (doc->>'a')::boolean then
      update public.documents set statut = 'annule' where id = d.id;
      v_annulations := v_annulations + 1;
      continue;
    end if;
    -- Paiement : seulement ce qui manque par rapport à l'ancienne app
    select * into d from public.documents where id = d.id;
    v_diff := least((doc->>'p')::bigint, d.total) - d.montant_paye;
    if d.type = 'facture' and v_diff > 0 then
      insert into public.reglements (document_id, equipe_id, montant, mode, date, reference, user_id)
      values (d.id, d.equipe_id, v_diff, (doc->>'m')::public.mode_paiement, coalesce((doc->>'dp')::date, d.date), 'Ancienne application',
        (select user_id from public.membres_equipe where equipe_id = d.equipe_id and role = 'proprietaire' limit 1));
      update public.documents set montant_paye = montant_paye + v_diff,
        statut = case when montant_paye + v_diff >= total then 'paye'::public.statut_document else statut end where id = d.id;
      v_paiements := v_paiements + 1;
    end if;
  end loop;
  raise notice 'contenus : %, paiements : %, annulations : %, introuvables : %', v_contenus, v_paiements, v_annulations, v_introuvables;
end $$;`;
writeFileSync(join(nouveau, "maj-traitement.sql"), traitement + "\n");

const TAILLE = 40;
let n = 0;
for (let i = 0; i < blocs.length; i += TAILLE) {
  writeFileSync(join(nouveau, `maj-${String(++n).padStart(2, "0")}.json`), JSON.stringify(blocs.slice(i, i + TAILLE)));
}
console.log(`${blocs.length} document(s) modifié(s), ${n} lot(s)`);
for (const [email, b] of bilan) console.log(`  ${email} : ${b.contenus} contenu(s), ${b.paiements} paiement(s), ${b.annulations} annulation(s)`);
