import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Conditions d'utilisation" };

const CONTACT = "applikare@gmail.com";

export default function Conditions() {
  return (
    <>
      <header>
        <h1>Conditions d&apos;utilisation</h1>
        <p className="mt-1 text-sm text-muted">FacturePlus, édité par AppliKare (Sénégal). Mise à jour : 18 novembre 2026.</p>
      </header>

      <section>
        <h2>Le service</h2>
        <p>FacturePlus permet de gérer un stock, des clients et des fournisseurs, et de créer des proformas, factures, bons de
          livraison, achats et dépenses, sur le site web et dans les applications mobiles. En créant un compte, vous acceptez
          les présentes conditions.</p>
      </section>

      <section>
        <h2>Votre compte</h2>
        <ul>
          <li>Vous fournissez une adresse e-mail valide et gardez vos identifiants confidentiels.</li>
          <li>Vous êtes responsable de l&apos;activité de votre compte et des informations saisies.</li>
          <li>Vous pouvez supprimer votre compte à tout moment : <strong>Mon compte → Supprimer mon compte</strong>.</li>
        </ul>
      </section>

      <section>
        <h2>Essai et abonnement</h2>
        <p>Un essai gratuit est offert à l&apos;inscription. Ensuite, la création et la modification de documents nécessitent un
          abonnement (mensuel ou annuel), payé sur le site par Wave ou Orange Money (Max It). L&apos;abonnement n&apos;est pas
          renouvelé automatiquement. Sans abonnement actif, vos données restent conservées et consultables.</p>
      </section>

      <section>
        <h2>Vos documents et vos données</h2>
        <p>Vous restez propriétaire des données que vous saisissez. Vous êtes responsable du contenu de vos documents
          (prix, taxes, mentions légales) et de leur conformité à la réglementation qui vous concerne. Le traitement de vos
          données est décrit dans la <Link href="/confidentialite">politique de confidentialité</Link>.</p>
      </section>

      <section>
        <h2>Usage acceptable</h2>
        <p>Il est interdit d&apos;utiliser FacturePlus à des fins illégales ou frauduleuses, de tenter d&apos;accéder aux données
          d&apos;autres comptes ou de perturber le fonctionnement du service. Un compte qui ne respecte pas ces règles peut être
          suspendu.</p>
      </section>

      <section>
        <h2>Disponibilité et responsabilité</h2>
        <p>Nous faisons notre possible pour que le service soit disponible et fiable, sans pouvoir garantir l&apos;absence
          d&apos;interruption ou d&apos;erreur. Pensez à exporter régulièrement vos données importantes (PDF, CSV, Excel).
          Notre responsabilité est limitée aux montants payés pour l&apos;abonnement en cours.</p>
      </section>

      <section>
        <h2>Modifications</h2>
        <p>Ces conditions peuvent évoluer ; la date de mise à jour figure en haut de cette page. En cas de changement important,
          vous en serez informé dans l&apos;application ou par e-mail.</p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>Une question : <a href={`mailto:${CONTACT}`}>{CONTACT}</a> ou la page <Link href="/assistance">Assistance</Link>.</p>
      </section>
    </>
  );
}
