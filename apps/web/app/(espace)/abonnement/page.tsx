"use client";

import {
  ECONOMIE_ANNUELLE, formaterMontant, lancerPaiementAbonnement, LIBELLES_ETATS_ACCES, LIBELLES_MOYENS_ABONNEMENT,
  LIBELLES_STATUTS_PAIEMENT, listerMesPaiements, MOYENS_PAIEMENT_ABONNEMENT, paiementEnCours, PLANS_ABONNEMENT,
  TONS_ETATS_ACCES, verifierPaiementAbonnement, type MoyenPaiementAbonnement, type PlanAbonnement,
} from "@factureplus/core";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { Alerte, Badge, Bouton, Carte, Champ, Chargement, EnTetePage, Info, Segments, Tableau } from "@/components/ui";
import { useDonnees, useEquipe, useSession } from "@/lib/espace";
import { supabase } from "@/lib/supabase";

export default function PageAbonnement() {
  return <Suspense fallback={<Chargement />}><Abonnement /></Suspense>;
}

type Message = { type: "succes" | "erreur" | "info"; texte: string };

function Abonnement() {
  const params = useSearchParams();
  const router = useRouter();
  const retour = params.get("paiement");
  const { userId } = useSession();
  const { profil, abonnement, rafraichir } = useEquipe();
  const [plan, setPlan] = useState<PlanAbonnement>("annuel");
  const [moyen, setMoyen] = useState<MoyenPaiementAbonnement>("wave");
  const [telephone, setTelephone] = useState(profil?.telephone ?? "");
  const [qr, setQr] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(
    retour === "annule" ? { type: "info", texte: "Paiement annulé. Vous pouvez réessayer." } : null,
  );
  const [chargement, setChargement] = useState(false);
  const { donnees: paiements, recharger } = useDonnees(() => listerMesPaiements(supabase, userId!), [userId]);
  const enCours = paiementEnCours(paiements ?? []);
  const verification = useRef(false);

  const verifier = useCallback(async (silencieux = true) => {
    if (verification.current) return;
    verification.current = true;
    try {
      const r = await verifierPaiementAbonnement(supabase);
      if (r.actif) {
        setQr(null);
        setMessage({ type: "succes", texte: "Paiement confirmé : votre abonnement est actif. Merci !" });
        await rafraichir();
      } else if (!silencieux) {
        setMessage({ type: "info", texte: "Paiement pas encore confirmé. Réessayez dans un instant." });
      }
      await recharger();
    } catch (e) {
      if (!silencieux) setMessage({ type: "erreur", texte: (e as Error).message });
    } finally {
      verification.current = false;
    }
  }, [rafraichir, recharger]);

  // Retour de la page de paiement : vérification puis URL nettoyée
  useEffect(() => {
    if (!retour) return;
    const t = setTimeout(() => {
      if (retour === "succes") void verifier(false);
      router.replace("/abonnement");
    }, 0);
    return () => clearTimeout(t);
  }, [retour, verifier, router]);

  // Paiement en attente : vérification régulière
  useEffect(() => {
    if (!enCours) return;
    const minuterie = setInterval(() => void verifier(), 8000);
    return () => clearInterval(minuterie);
  }, [enCours, verifier]);

  if (!profil || !abonnement || !paiements) return <Chargement />;

  async function payer() {
    if (MOYENS_PAIEMENT_ABONNEMENT.find((x) => x.code === moyen)?.telephone && telephone.replace(/\D/g, "").length < 9) {
      return setMessage({ type: "erreur", texte: "Indiquez le numéro Orange Money qui va payer." });
    }
    setMessage(null);
    setChargement(true);
    try {
      const r = await lancerPaiementAbonnement(supabase, {
        plan, moyen, telephone: telephone.trim() || undefined, retour: window.location.origin,
      });
      await recharger();
      if (r.url_paiement) {
        window.location.href = r.url_paiement;
        return;
      }
      if (r.qr_code) {
        setQr(r.qr_code);
        setMessage({ type: "info", texte: "Scannez ce QR code avec Orange Money. L'abonnement s'activera automatiquement." });
      } else {
        setMessage({ type: "erreur", texte: "Réponse inattendue du service de paiement. Réessayez." });
      }
    } catch (e) {
      setMessage({ type: "erreur", texte: (e as Error).message });
    }
    setChargement(false);
  }

  const finTexte = abonnement.fin?.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <EnTetePage titre="Abonnement" description="Paiement sécurisé par Wave ou Orange Money (Unitech Pay)." />
      {message && <div className="mb-4"><Alerte type={message.type}>{message.texte}</Alerte></div>}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-6">
          <Carte titre="Mon accès" action={<Badge ton={TONS_ETATS_ACCES[abonnement.etat]}>{LIBELLES_ETATS_ACCES[abonnement.etat]}</Badge>}>
            {abonnement.etat === "admin" && <p className="text-sm text-muted">Administrateur : accès permanent, sans abonnement.</p>}
            {abonnement.etat === "actif" && (
              <>
                <Info libelle="Formule" valeur={abonnement.plan ? PLANS_ABONNEMENT[abonnement.plan].libelle : "—"} />
                <Info libelle="Jusqu'au" valeur={finTexte} fort />
              </>
            )}
            {abonnement.etat === "essai" && <Info libelle="Essai gratuit jusqu'au" valeur={finTexte} fort />}
            {abonnement.etat === "expire" && (
              <p className="text-sm text-muted">
                Vos données restent consultables, mais vous ne pouvez plus rien créer ni modifier. Abonnez-vous pour tout débloquer.
              </p>
            )}
          </Carte>

          {enCours && (
            <Carte titre="Paiement en attente">
              <p className="mb-3 text-sm text-muted">
                {PLANS_ABONNEMENT[enCours.plan].libelle} · {formaterMontant(enCours.montant)} · {LIBELLES_MOYENS_ABONNEMENT[enCours.moyen]}.
                La confirmation arrive en général en quelques secondes.
              </p>
              <Bouton variante="secondaire" onClick={() => void verifier(false)}>J&apos;ai payé, vérifier</Bouton>
            </Carte>
          )}

          {qr && (
            <Carte titre="QR code Orange Money">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="QR code de paiement Orange Money" className="mx-auto size-56"
                src={qr.startsWith("http") || qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`} />
            </Carte>
          )}
        </div>

        {abonnement.etat !== "admin" && (
          <Carte titre={abonnement.etat === "actif" ? "Prolonger mon abonnement" : "Choisir une formule"}>
            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(PLANS_ABONNEMENT) as PlanAbonnement[]).map((code) => {
                const p = PLANS_ABONNEMENT[code];
                const choisi = plan === code;
                return (
                  <button key={code} type="button" role="radio" aria-checked={choisi} onClick={() => setPlan(code)}
                    className={`flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-colors ${
                      choisi ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40"}`}>
                    <span className="text-sm font-medium">{p.libelle}</span>
                    <span className="montant text-2xl font-semibold">{formaterMontant(p.montant)}</span>
                    <span className="text-xs text-muted">{p.periode}</span>
                    {code === "annuel" && <Badge ton="succes">{formaterMontant(ECONOMIE_ANNUELLE)} d&apos;économie</Badge>}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-sm text-muted">
              Tout inclus : factures, proformas et bons de livraison illimités, stock, achats, dépenses, export PDF.
            </p>
            <div className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Payer avec</span>
                <Segments libelle="Moyen de paiement" valeur={moyen} onChange={setMoyen}
                  options={MOYENS_PAIEMENT_ABONNEMENT.map((x) => ({ valeur: x.code, libelle: x.libelle }))} />
              </div>
              {MOYENS_PAIEMENT_ABONNEMENT.find((x) => x.code === moyen)?.telephone && (
                <Champ libelle="Numéro Orange Money" type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)}
                  placeholder="77 000 00 00" className="max-w-xs" />
              )}
              <div><Bouton onClick={payer} chargement={chargement}>Payer {formaterMontant(PLANS_ABONNEMENT[plan].montant)}</Bouton></div>
            </div>
          </Carte>
        )}
      </div>

      {paiements.length > 0 && (
        <Carte titre="Historique des paiements" className="mt-6" sansMarge>
          <Tableau entetes={[{ libelle: "Date" }, { libelle: "Formule" }, { libelle: "Moyen" }, { libelle: "Statut" }, { libelle: "Montant", droite: true }]}>
            {paiements.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 text-muted">{new Date(p.paye_le ?? p.created_at).toLocaleDateString("fr-FR")}</td>
                <td className="px-4 py-3">{PLANS_ABONNEMENT[p.plan].libelle}</td>
                <td className="px-4 py-3 text-muted">{LIBELLES_MOYENS_ABONNEMENT[p.moyen]}</td>
                <td className="px-4 py-3">
                  <Badge ton={p.statut === "paye" ? "succes" : p.statut === "en_attente" ? "attention" : "neutre"}>{LIBELLES_STATUTS_PAIEMENT[p.statut]}</Badge>
                </td>
                <td className="montant px-4 py-3 text-right">{formaterMontant(p.montant)}</td>
              </tr>
            ))}
          </Tableau>
        </Carte>
      )}
    </>
  );
}
