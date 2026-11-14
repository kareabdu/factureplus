import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Assistance" };

const CONTACT = "applikare@gmail.com";
const WHATSAPP = "https://wa.me/221778339771?text=" + encodeURIComponent("Bonjour, j'ai besoin d'aide concernant FacturePlus.");

export default function Assistance() {
  return (
    <>
      <header>
        <h1>Assistance FacturePlus</h1>
        <p className="mt-1 text-muted">Une question, un problème ? Nous répondons en français, en général dans la journée.</p>
      </header>

      <section>
        <h2>Nous contacter</h2>
        <ul>
          <li>WhatsApp : <a href={WHATSAPP}>+221 77 833 97 71</a></li>
          <li>E-mail : <a href={`mailto:${CONTACT}`}>{CONTACT}</a></li>
        </ul>
      </section>

      <section>
        <h2>Questions fréquentes</h2>
        <p><strong>J&apos;utilisais l&apos;ancienne application.</strong> Vos données ont été reprises. Connectez-vous avec la même
          adresse e-mail : avec Google, ou avec « Mot de passe oublié » pour choisir un mot de passe.</p>
        <p className="mt-3"><strong>Comment payer mon abonnement ?</strong> Dans <em>Plus → Abonnement</em>, par Wave ou Max It.</p>
        <p className="mt-3"><strong>Comment supprimer mon compte ?</strong> Dans <em>Mon compte → Supprimer mon compte</em>.
          Toutes vos données sont effacées définitivement.</p>
      </section>

      <p className="text-sm text-muted">
        Voir aussi la <Link href="/confidentialite">politique de confidentialité</Link>.
      </p>
    </>
  );
}
