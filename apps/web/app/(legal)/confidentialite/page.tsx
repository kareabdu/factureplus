import type { Metadata } from "next";

export const metadata: Metadata = { title: "Politique de confidentialité" };

const CONTACT = "applikare@gmail.com";

export default function Confidentialite() {
  return (
    <>
      <header>
        <h1>Politique de confidentialité</h1>
        <p className="mt-1 text-sm text-muted">FacturePlus, édité par AppliKare (Sénégal). Mise à jour : 14 novembre 2026.</p>
      </header>

      <section>
        <h2>Données collectées</h2>
        <p>FacturePlus collecte uniquement les données nécessaires au service :</p>
        <ul>
          <li>votre compte : nom, adresse e-mail, téléphone (facultatif), et l&apos;identifiant fourni par Google ou Apple si vous vous connectez avec eux ;</li>
          <li>votre entreprise : nom, coordonnées, logo, réglages de facturation ;</li>
          <li>les données que vous saisissez : produits, stock, clients, fournisseurs, factures, achats, dépenses et photos de reçus ;</li>
          <li>vos paiements d&apos;abonnement : formule, montant, moyen de paiement (Wave ou Max It) et référence de la transaction.</li>
        </ul>
        <p className="mt-2">Aucune donnée de localisation, aucun contact du téléphone sans votre action, aucun identifiant publicitaire n&apos;est collecté.
          L&apos;appareil photo sert uniquement à scanner des codes-barres et à photographier vos produits et reçus.</p>
      </section>

      <section>
        <h2>Utilisation</h2>
        <p>Vos données servent exclusivement à fournir le service (gestion de stock, ventes, achats, documents), à gérer votre
          abonnement et à vous assister. Elles ne sont ni vendues, ni louées, ni utilisées à des fins publicitaires.</p>
      </section>

      <section>
        <h2>Partage</h2>
        <p>Vos données ne sont partagées qu&apos;avec les prestataires techniques nécessaires au service :</p>
        <ul>
          <li>Supabase (hébergement de la base de données et des fichiers, Union européenne) ;</li>
          <li>Vercel (hébergement du site web) ;</li>
          <li>Unitech Pay, Wave et Orange Money (paiement de l&apos;abonnement) ;</li>
          <li>Google et Apple, uniquement si vous choisissez de vous connecter avec eux.</li>
        </ul>
        <p className="mt-2">Elles peuvent aussi être communiquées si la loi l&apos;exige.</p>
      </section>

      <section>
        <h2>Sécurité</h2>
        <p>Les données sont chiffrées en transit (HTTPS) et au repos. Chaque entreprise n&apos;accède qu&apos;à ses propres données,
          grâce à des règles d&apos;accès appliquées par la base de données elle-même.</p>
      </section>

      <section>
        <h2>Conservation et suppression</h2>
        <p>Vos données sont conservées tant que votre compte existe. Vous pouvez supprimer votre compte à tout moment depuis
          l&apos;application ou le site : <strong>Mon compte → Supprimer mon compte</strong>. Votre compte, votre entreprise et toutes
          leurs données (y compris les fichiers) sont alors effacés définitivement.</p>
      </section>

      <section>
        <h2>Vos droits</h2>
        <p>Vous pouvez consulter, corriger, exporter (export CSV dans l&apos;application) ou supprimer vos données. Pour toute demande,
          écrivez-nous à <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>FacturePlus n&apos;utilise que le stockage technique nécessaire à votre session. Aucun cookie publicitaire ou de pistage.</p>
      </section>

      <section>
        <h2>Modifications</h2>
        <p>Cette politique peut évoluer ; tout changement important vous sera signalé dans l&apos;application.</p>
      </section>
    </>
  );
}
