import React from "react";
import BackToSettings from "@/components/BackToSettings";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        <div className="mb-6"><BackToSettings /></div>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Politique de confidentialité</h1>

        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">1. Collecte des données</h2>
            <p>StockTracker collecte uniquement les données nécessaires au bon fonctionnement du service :</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Informations de compte (nom, adresse e-mail)</li>
              <li>Informations de l'entreprise (nom, adresse, logo, coordonnées)</li>
              <li>Données de navigation (logs d'erreurs, performances)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">2. Utilisation des données</h2>
            <p>Vos données sont utilisées exclusivement pour :</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Fournir et améliorer le service StockTracker</li>
              <li>Assurer la sécurité de votre compte</li>
              <li>Vous contacter en cas de besoin (support, mises à jour importantes)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">3. Partage des données</h2>
            <p>Nous ne vendons, ne louons et ne partageons pas vos données personnelles avec des tiers à des fins commerciales. Vos données peuvent être partagées uniquement dans les cas suivants :</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Avec des prestataires techniques qui nous aident à fournir le service (hébergement, paiement)</li>
              <li>Si la loi l'exige (réquisition judiciaire)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">4. Sécurité des données</h2>
            <p>Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles appropriées pour protéger vos données contre tout accès non autorisé, perte ou divulgation. Les données sont chiffrées en transit (HTTPS) et au repos.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">5. Conservation des données</h2>
            <p>Vos données sont conservées pendant toute la durée de votre utilisation du service, et supprimées dans un délai raisonnable après la résiliation de votre compte, sauf obligation légale contraire.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">6. Vos droits</h2>
            <p>Conformément à la réglementation applicable, vous disposez des droits suivants :</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li><strong>Accès</strong> : obtenir une copie de vos données personnelles</li>
              <li><strong>Rectification</strong> : corriger des données inexactes</li>
              <li><strong>Suppression</strong> : demander la suppression de vos données</li>
              <li><strong>Portabilité</strong> : recevoir vos données dans un format structuré</li>
              <li><strong>Opposition</strong> : vous opposer à certains traitements</li>
            </ul>
            <p className="mt-2">Pour exercer ces droits, contactez-nous à : <a href="mailto:support@stocktracker.app" className="text-blue-600 underline">applikare@gmail.com</a></p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">7. Cookies</h2>
            <p>StockTracker utilise des cookies techniques essentiels au bon fonctionnement de l'application (session, authentification). Aucun cookie publicitaire ou de pistage n'est utilisé.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">8. Modifications</h2>
            <p>Cette politique peut être mise à jour pour refléter des changements dans nos pratiques ou la réglementation. Nous vous informerons de tout changement significatif par notification dans l'application.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">9. Contact</h2>
            <p>Pour toute question relative à la protection de vos données, contactez notre responsable de la protection des données : <a href="mailto:support@stocktracker.app" className="text-blue-600 underline">applikare@gmail.com</a></p>
          </section>

          <p className="text-xs text-gray-400 pt-4 border-t">Dernière mise à jour : octobre 2026</p>
        </div>
      </div>
    </div>);

}