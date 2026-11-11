import React from "react";
import BackToSettings from "@/components/BackToSettings";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        <div className="mb-6"><BackToSettings /></div>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Conditions d'utilisation</h1>

        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">1. Acceptation des conditions</h2>
            <p>En accédant à StockTracker et en l'utilisant, vous acceptez d'être lié par les présentes conditions d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser l'application.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">2. Description du service</h2>
            <p>StockTracker est une application de gestion de stock et de facturation destinée aux professionnels et aux petites entreprises. L'application permet de gérer les produits, les factures, les devis et les mouvements de stock.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">3. Compte utilisateur</h2>
            <p>Vous êtes responsable de la confidentialité de vos identifiants de connexion. Vous vous engagez à ne pas partager votre compte avec des tiers et à informer immédiatement StockTracker en cas d'utilisation non autorisée de votre compte.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">4. Utilisation acceptable</h2>
            <p>Vous vous engagez à utiliser StockTracker uniquement à des fins légales et conformément aux présentes conditions. Il est interdit d'utiliser l'application pour :</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Toute activité illégale ou frauduleuse</li>
              <li>La violation des droits de tiers</li>
              <li>La diffusion de contenus offensants ou malveillants</li>
              <li>Toute tentative de piratage ou d'accès non autorisé</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">5. Données et confidentialité</h2>
            <p>Vos données sont stockées de manière sécurisée. Nous ne vendons pas vos données à des tiers. Pour plus d'informations, consultez notre Politique de confidentialité.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">6. Propriété intellectuelle</h2>
            <p>L'ensemble du contenu de StockTracker (design, code, logo, fonctionnalités) est protégé par les lois sur la propriété intellectuelle. Toute reproduction sans autorisation est interdite.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">7. Limitation de responsabilité</h2>
            <p>StockTracker est fourni "en l'état". Nous ne garantissons pas que le service sera ininterrompu ou exempt d'erreurs. Nous ne saurions être tenus responsables des pertes de données ou des dommages indirects liés à l'utilisation de l'application.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">8. Modifications</h2>
            <p>Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications entrent en vigueur dès leur publication dans l'application. L'utilisation continue du service vaut acceptation des nouvelles conditions.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 text-base mb-2">9. Contact</h2>
            <p>Pour toute question relative aux présentes conditions, contactez-nous à : <a href="mailto:support@stocktracker.app" className="text-blue-600 underline">applikare@gmail.com</a></p>
          </section>

          <p className="text-xs text-gray-400 pt-4 border-t">Dernière mise à jour : octobre 2026</p>
        </div>
      </div>
    </div>);

}