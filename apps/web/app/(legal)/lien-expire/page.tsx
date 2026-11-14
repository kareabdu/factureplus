import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Lien expiré" };

export default function LienExpire() {
  return (
    <>
      <header>
        <h1>Ce lien n&apos;est plus valable</h1>
        <p className="mt-1 text-muted">Les liens de téléchargement des documents sont valables 30 jours.</p>
      </header>
      <p>Demandez à votre fournisseur de vous renvoyer le document.</p>
      <p className="text-sm text-muted">Envoyé avec <Link href="/">FacturePlus</Link>.</p>
    </>
  );
}
