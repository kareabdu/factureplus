import React, { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Download,
  Loader2,
  ClipboardList,
  CheckCircle2,
  ChevronLeft,
  ScanLine,
  Filter,
  MapPin,
  FileSpreadsheet,
  LayoutGrid,
  ListChecks,
  Save,
  History,
} from "lucide-react";


const CDN = "https://media.base44.com/images/public/6a3b047b6054a9a30af8781d";

const STEPS = [
  {
    n: 1,
    icon: ClipboardList,
    title: "Consulter vos articles",
    desc: "L'écran « Articles » est votre point de départ. Il liste tout votre stock avec, pour chaque produit, la quantité disponible, le seuil de réapprovisionnement, le prix unitaire et les emplacements de stockage.",
    img: `${CDN}/5326b042b_Screenshot_20260803_145102_Chrome.jpg`,
    tip: "Le compteur en haut indique le nombre total d'articles en stock.",
  },
  {
    n: 2,
    icon: Filter,
    title: "Filtrer par emplacement",
    desc: "Ouvrez le filtre « Emplacements » pour ne visualiser que les articles stockés dans un dépôt ou magasin précis. Cette sélection facilite la préparation de votre inventaire, site par site.",
    img: `${CDN}/c50bc448f_Screenshot_20260803_145157_Chrome.jpg`,
    tip: "L'emplacement sélectionné est marqué d'une coche dans la liste.",
  },
  {
    n: 3,
    icon: MapPin,
    title: "Vérifier la répartition par emplacement",
    desc: "Sur chaque fiche article, la ligne « Emplacement(s) » détaille la quantité présente dans chaque dépôt ou magasin. Vous savez ainsi exactement où se trouve chaque unité de stock.",
    img: `${CDN}/2ef2a2839_Screenshot_20260803_145338_Chrome.jpg`,
  },
  {
    n: 4,
    icon: FileSpreadsheet,
    title: "Exporter votre stock",
    desc: "Le bouton « Exporter » permet de générer un fichier Excel ou PDF de votre stock. Utile pour préparer un inventaire hors-ligne, archiver un état du stock ou le partager avec votre équipe.",
    img: `${CDN}/c157e888f_Screenshot_20260803_145359_Chrome.jpg`,
  },
  {
    n: 5,
    icon: LayoutGrid,
    title: "Ouvrir le module Inventaire",
    desc: "Touchez le bouton « Plus » en bas de l'écran pour ouvrir le menu des modules, puis sélectionnez « Inventaire ». Ce module vous guide dans le comptage physique de votre stock.",
    img: `${CDN}/9f72bafef_Screenshot_20260803_145429_Chrome.jpg`,
    tip: "Le menu « Plus » donne également accès au Dashboard, Clients, Fournisseurs, Catégories, Emplacements, Dépenses, Équipe et Parrainage.",
  },
  {
    n: 6,
    icon: ScanLine,
    title: "Choisir un emplacement et lancer le comptage",
    desc: "Dans le module Inventaire, sélectionnez l'emplacement à inventorier dans la liste déroulante, puis touchez « Lancer un inventaire ». Seuls les produits présents dans cet emplacement seront proposés au comptage.",
    img: `${CDN}/4bac14a18_Screenshot_20260803_145559_Chrome.jpg`,
    tip: "L'inventaire se fait emplacement par emplacement pour plus de précision.",
  },
  {
    n: 7,
    icon: ListChecks,
    title: "Saisir les quantités comptées",
    desc: "Pour chaque produit de l'emplacement, comparez le stock théorique (affiché) à la quantité réellement comptée. Saisissez le chiffre compté dans le champ prévu. Ajoutez des notes si nécessaire, puis touchez « Valider l'inventaire ».",
    img: `${CDN}/06b4dcd58_Screenshot_20260803_145630_Chrome.jpg`,
    tip: "Le stock théorique correspond à la quantité enregistrée dans l'application avant votre comptage.",
  },
  {
    n: 8,
    icon: History,
    title: "Valider et consulter les écarts",
    desc: "Une notification confirme la validation et indique le nombre d'écarts constatés. L'historique conserve chaque inventaire (référence, date, produits, emplacement) avec son statut « Conforme » ou non. Vous pouvez modifier ou supprimer une entrée à tout moment.",
    img: `${CDN}/1d88ee2b2_Screenshot_20260803_145742_Chrome.jpg`,
    tip: "Un écart apparaît lorsque la quantité comptée diffère du stock théorique. Corrigez-le ou enregistrez un ajustement de stock.",
  },
];



export default function InventoryTutorial() {
  const contentRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const stepsWithImages = await Promise.all(
        STEPS.map(async (step) => {
          let imgData = step.img;
          try {
            const res = await fetch(step.img);
            const blob = await res.blob();
            imgData = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });
          } catch (_) {
            // fallback: keep original URL
          }
          return { ...step, imgData };
        })
      );

      const stepsHtml = stepsWithImages
        .map(
          (s) => `
        <div style="margin-bottom:28px;">
          <h2 style="color:#16a34a;font-size:15pt;margin:0 0 8px;">Étape ${s.n} : ${s.title}</h2>
          <p style="line-height:1.6;margin:0 0 14px;color:#333;">${s.desc}</p>
          <div style="text-align:center;margin-bottom:12px;">
            <img src="${s.imgData}" style="max-width:300px;border:1px solid #e2e8f0;border-radius:10px;" />
          </div>
          ${
            s.tip
              ? `<p style="background:#f0fdf4;padding:10px 14px;border-radius:8px;color:#166534;font-size:10pt;margin:0;"><strong>Astuce : </strong>${s.tip}</p>`
              : ""
          }
        </div>`
        )
        .join("");

      const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Tutoriel — Process d'inventaire</title><style>body{font-family:Calibri,Arial,sans-serif;color:#333;margin:40px;}h1{color:#16a34a;font-size:26pt;text-align:center;margin-bottom:6px;}h2{color:#16a34a;margin-top:0;}p{font-size:11pt;}hr{border:none;border-top:1px solid #e2e8f0;margin:24px 0;}.sub{color:#666;text-align:center;font-size:12pt;margin-bottom:4px;}.meta{color:#999;text-align:center;font-size:10pt;margin-bottom:4px;}</style></head><body>
<div style="text-align:center;margin-bottom:36px;">
<h1>Process d'Inventaire</h1>
<p class="sub">Guide pas à pas pour réaliser un inventaire physique de votre stock sur StockTracker</p>
<p class="meta">8 étapes · ≈ 5 min de lecture</p>
</div>
<hr/>
<h2>Introduction</h2>
<p style="line-height:1.6;">L'inventaire permet de comparer les quantités théoriques (celles enregistrées dans l'application) avec les quantités réellement comptées dans vos dépôts et magasins. Il garantit que votre stock reflète la réalité et facilite la détection des écarts — manquants, surplus ou erreurs de saisie. Ce guide vous accompagne pas à pas, depuis l'écran Articles jusqu'à la validation finale de votre comptage.</p>
<hr/>
${stepsHtml}
<hr/>
<div style="text-align:center;margin-top:36px;">
<h2>Vous êtes prêt !</h2>
<p class="sub">Réalisez régulièrement vos inventaires — emplacement par emplacement — pour maintenir un stock fiable et détecter les écarts dès leur apparition.</p>
<p class="meta">StockTracker — Suivi de stock</p>
</div>
</body></html>`;

      const blob = new Blob(["\ufeff" + html], {
        type: "application/msword",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tutoriel-inventaire-stocktracker.doc";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la génération du document Word. Réessayez.");
    } finally {
      setDownloading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sticky header (not included in the Word export) */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link
            to="/Inventaire"
            className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-900 text-sm font-medium flex-shrink-0"
            style={{ minHeight: "unset" }}
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Retour</span>
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <ClipboardList className="w-5 h-5 text-green-600 flex-shrink-0" />
            <h1 className="font-bold text-gray-900 text-sm sm:text-base truncate">
              Tutoriel — Process d'inventaire
            </h1>
          </div>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 bg-green-600 text-white px-3 sm:px-4 py-2 rounded-xl font-medium text-xs sm:text-sm hover:bg-green-700 disabled:opacity-60 transition-colors flex-shrink-0"
            style={{ minHeight: "unset", minWidth: "unset" }}
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {downloading ? "Génération…" : "Télécharger en Word"}
            </span>
            <span className="sm:hidden">{downloading ? "…" : "Word"}</span>
          </button>
        </div>
      </div>

      {/* Printable content */}
      <div
        ref={contentRef}
        className="bg-white mx-auto"
        style={{ maxWidth: 820 }}
      >
        {/* Cover */}
        <div className="px-6 sm:px-10 pt-12 pb-10 text-center bg-gradient-to-b from-green-50 to-white">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-600 mb-5 shadow-lg">
            <ClipboardList className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Process d'Inventaire
          </h1>
          <p className="text-gray-500 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
            Guide pas à pas pour réaliser un inventaire physique de votre stock
            sur StockTracker — de la consultation des articles au comptage
            validé.
          </p>
          <div className="mt-6 inline-flex items-center gap-4 text-xs sm:text-sm text-gray-400 bg-white rounded-full px-4 py-2 border border-gray-100">
            <span>8 étapes</span>
            <span className="text-gray-300">•</span>
            <span>≈ 5 min de lecture</span>
          </div>
        </div>

        {/* Introduction */}
        <div className="px-6 sm:px-10 py-8 border-t border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Introduction</h2>
          <p className="text-gray-600 leading-relaxed text-sm sm:text-[15px]">
            L'inventaire permet de comparer les quantités théoriques (celles
            enregistrées dans l'application) avec les quantités réellement
            comptées dans vos dépôts et magasins. Il garantit que votre stock
            reflète la réalité et facilite la détection des écarts — manquants,
            surplus ou erreurs de saisie. Ce guide vous accompagne pas à pas,
            depuis l'écran Articles jusqu'à la validation finale de votre
            comptage.
          </p>
        </div>

        {/* Steps */}
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.n}
              className="px-6 sm:px-10 py-7 border-t border-gray-100"
            >
              <div className="flex items-start gap-4 mb-3">
                <div
                  className="flex-shrink-0 w-11 h-11 rounded-xl bg-green-600 text-white font-bold flex items-center justify-center shadow-sm"
                  style={{ minHeight: "unset", minWidth: "unset" }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">
                      Étape {step.n}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">
                    {step.title}
                  </h3>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed text-sm sm:text-[15px] mb-5 sm:ml-[60px]">
                {step.desc}
              </p>
              <div className="flex justify-center sm:ml-[60px]">
                <div
                  className="rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-gray-50"
                  style={{ maxWidth: 280, width: "100%" }}
                >
                  <img
                    src={step.img}
                    alt={`Étape ${step.n} — ${step.title}`}
                    crossOrigin="anonymous"
                    className="w-full h-auto block"
                    loading="eager"
                  />
                </div>
              </div>
              {step.tip && (
                <div className="sm:ml-[60px] mt-4 flex items-start gap-2 bg-green-50 rounded-xl px-4 py-3 text-sm text-green-800 border border-green-100">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-600" />
                  <span className="leading-relaxed">{step.tip}</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Conclusion */}
        <div className="px-6 sm:px-10 py-12 border-t border-gray-100 text-center bg-gray-50">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 mb-4">
            <CheckCircle2 className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Vous êtes prêt !
          </h2>
          <p className="text-gray-500 text-sm sm:text-[15px] max-w-sm mx-auto leading-relaxed">
            Réalisez régulièrement vos inventaires — emplacement par
            emplacement — pour maintenir un stock fiable et détecter les écarts
            dès leur apparition.
          </p>
          <div className="mt-8 flex items-center justify-center gap-2 text-gray-300 text-xs">
            <Save className="w-3.5 h-3.5" />
            <span>StockTracker — Suivi de stock</span>
          </div>
        </div>
      </div>
    </div>
  );
}