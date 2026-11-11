import React, { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import BackToSettings from "@/components/BackToSettings";
import { Settings } from "@/entities/all";
import { getTeamId } from "@/lib/team";
import { getTeamSettings, clearTeamSettingsCache } from "@/lib/teamSettings";

const TEMPLATES = [
  {
    id: "classic",
    name: "Classic",
    description: "Logo à gauche, infos facture à droite, séparateurs fins",
    preview: <ClassicPreview />,
  },
  {
    id: "compact",
    name: "Compact",
    description: "En-tête condensé avec client en haut à droite",
    preview: <CompactPreview />,
  },
  {
    id: "clean",
    name: "Clean",
    description: "Minimaliste, logo à droite, mise en page aérée",
    preview: <CleanPreview />,
  },
  {
    id: "sharp",
    name: "Sharp",
    description: "En-tête gris clair, tableau avec bordure colorée",
    preview: <SharpPreview />,
  },
];

const COLORS = [
  { id: "none", hex: null, label: "Aucune" },
  { id: "black", hex: "#111111", label: "Noir" },
  { id: "gray", hex: "#4B5563", label: "Gris" },
  { id: "slate", hex: "#334E68", label: "Ardoise" },
  { id: "brown", hex: "#6B3A2A", label: "Marron" },
  { id: "red", hex: "#DC2626", label: "Rouge" },
  { id: "pink", hex: "#DB2777", label: "Rose" },
  { id: "purple", hex: "#7C3AED", label: "Violet" },
  { id: "indigo", hex: "#4338CA", label: "Indigo" },
  { id: "blue", hex: "#2563EB", label: "Bleu" },
  { id: "sky", hex: "#0284C7", label: "Ciel" },
  { id: "teal", hex: "#0D9488", label: "Sarcelle" },
  { id: "green", hex: "#16A34A", label: "Vert" },
  { id: "lime", hex: "#65A30D", label: "Lime" },
  { id: "custom", hex: "custom", label: "Personnalisé" },
];

function MiniInvoice({ color }) {
  const accent = color || "#2563EB";
  return (
    <div className="w-full bg-card text-[5px] p-2 font-sans leading-tight" style={{ minHeight: 120 }}>
      <div className="flex justify-between items-start mb-1">
        <div>
          <div className="w-6 h-6 rounded bg-gray-200 mb-0.5" />
          <div className="font-bold text-[6px]">Entreprise</div>
          <div className="text-muted-foreground">Adresse, Ville</div>
          <div className="text-muted-foreground">+221 77 000 0000</div>
        </div>
        <div className="text-right">
          <div className="font-bold" style={{ color: accent }}>FACTURE</div>
          <div className="text-muted-foreground">INV0001</div>
          <div className="text-muted-foreground">23 juin 2026</div>
          <div className="font-bold mt-0.5">XOF 150 000 CFA</div>
        </div>
      </div>
      <div className="border-t border-border/60 my-0.5" />
      <div className="text-muted-foreground mb-0.5">ADRESSE DE FACTURATION</div>
      <div className="font-bold">Client ABC</div>
      <div className="border-t border-border/60 my-0.5" />
      <table className="w-full">
        <thead>
          <tr style={{ backgroundColor: accent }}>
            <th className="text-left text-white px-0.5 py-0.5">ARTICLE</th>
            <th className="text-right text-white px-0.5 py-0.5">PRIX</th>
            <th className="text-right text-white px-0.5 py-0.5">QTÉ</th>
            <th className="text-right text-white px-0.5 py-0.5">MONTANT</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border/60">
            <td className="py-0.5">Service A</td>
            <td className="text-right">50 000</td>
            <td className="text-right">3</td>
            <td className="text-right">150 000</td>
          </tr>
        </tbody>
      </table>
      <div className="flex justify-end mt-0.5">
        <div className="text-right">
          <div>TOTAL: 150 000 CFA</div>
          <div className="font-bold" style={{ color: accent }}>SOLDE DÛ: XOF 150 000 CFA</div>
        </div>
      </div>
    </div>
  );
}

function ClassicPreview() {
  return (
    <div className="w-full bg-card text-[5px] p-2 font-sans leading-tight">
      <div className="flex justify-between items-start mb-1">
        <div>
          <div className="w-7 h-7 rounded bg-gray-200 mb-0.5" />
          <div className="font-bold text-[6px]">Entreprise</div>
          <div className="text-muted-foreground">Adresse, Ville</div>
        </div>
        <div className="text-right">
          <div className="font-bold text-[6px]">FACTURE</div>
          <div className="text-muted-foreground">INV0001</div>
          <div className="text-muted-foreground mt-0.5">DATE 23/06/2026</div>
          <div className="font-bold mt-0.5">XOF 150 000 CFA</div>
        </div>
      </div>
      <div className="border-t border-gray-300 my-0.5" />
      <div className="text-muted-foreground text-[4px] mb-0.5">ADRESSE DE FACTURATION</div>
      <div className="font-bold text-[5px]">Client ABC</div>
      <div className="border-t border-b border-gray-300 my-0.5 py-0.5">
        <div className="flex justify-between font-bold text-[4px]">
          <span>ARTICLE</span><span>PRIX</span><span>QTÉ</span><span>MONTANT</span>
        </div>
      </div>
      <div className="flex justify-between text-[4px] py-0.5">
        <span>Service A</span><span>50 000</span><span>3</span><span>150 000</span>
      </div>
      <div className="border-t border-border/60 mt-0.5 flex justify-end">
        <div className="text-right text-[4px] mt-0.5">
          <div>TOTAL: 150 000 CFA</div>
          <div className="font-bold text-[5px]">SOLDE DÛ: XOF 150 000 CFA</div>
        </div>
      </div>
    </div>
  );
}

function CompactPreview() {
  return (
    <div className="w-full bg-card text-[5px] p-2 font-sans leading-tight">
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-1">
          <div className="w-6 h-6 rounded bg-gray-200" />
          <div>
            <div className="font-bold text-[6px]">Entreprise</div>
            <div className="text-muted-foreground">Adresse, Ville</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-muted-foreground text-[4px]">ADRESSE DE FACTURATION</div>
          <div className="font-bold text-[5px]">Client ABC</div>
          <div className="text-muted-foreground">+221 77 000 0000</div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-0.5 border-y border-border/60 py-0.5 mb-0.5">
        <div><div className="text-muted-foreground text-[4px]">FACTURE</div><div>INV0001</div></div>
        <div><div className="text-muted-foreground text-[4px]">DATE</div><div>23/06</div></div>
        <div><div className="text-muted-foreground text-[4px]">MONTANT DÛ</div><div>Réception</div></div>
        <div className="text-right"><div className="text-muted-foreground text-[4px]">SOLDE DÛ</div><div className="font-bold">150 000</div></div>
      </div>
      <div className="border border-border/60 rounded">
        <div className="flex justify-between bg-gray-100 px-0.5 py-0.5 font-bold text-[4px]">
          <span>ARTICLE</span><span>PRIX</span><span>QTÉ</span><span>MONTANT</span>
        </div>
        <div className="flex justify-between px-0.5 py-0.5 text-[4px]">
          <span>Service A</span><span>50 000</span><span>3</span><span>150 000</span>
        </div>
      </div>
      <div className="flex justify-end mt-0.5">
        <div className="text-right text-[4px]">
          <div>TOTAL: 150 000 CFA</div>
          <div className="font-bold text-[5px]">SOLDE DÛ: XOF 150 000 CFA</div>
        </div>
      </div>
    </div>
  );
}

function CleanPreview() {
  return (
    <div className="w-full bg-card text-[5px] p-2 font-sans leading-tight">
      <div className="flex justify-between items-start mb-1">
        <div>
          <div className="font-bold text-[6px]">Entreprise</div>
          <div className="text-muted-foreground">Adresse, Ville</div>
          <div className="text-muted-foreground">+221 77 000 0000</div>
        </div>
        <div className="w-7 h-7 rounded bg-gray-200" />
      </div>
      <div className="border-t border-border/60 my-0.5" />
      <div className="flex justify-between mb-0.5">
        <div>
          <div className="text-muted-foreground text-[4px]">ADRESSE DE FACTURATION</div>
          <div className="font-bold">Client ABC</div>
          <div className="text-muted-foreground">+221 77 000 0000</div>
        </div>
        <div className="text-right">
          <div className="text-muted-foreground text-[4px]">DATE</div>
          <div>23/06/2026</div>
          <div className="text-muted-foreground text-[4px] mt-0.5">MONTANT DÛ</div>
          <div>Réception</div>
          <div className="text-muted-foreground text-[4px] mt-0.5">FACTURE</div>
          <div>INV0001</div>
          <div className="text-muted-foreground text-[4px] mt-0.5">SOLDE DÛ</div>
          <div className="font-bold">XOF 150 000</div>
        </div>
      </div>
      <div className="border border-gray-300 rounded">
        <div className="flex justify-between bg-gray-800 text-white px-0.5 py-0.5 font-bold text-[4px]">
          <span>ARTICLE</span><span>PRIX</span><span>QTÉ</span><span>MONTANT</span>
        </div>
        <div className="flex justify-between px-0.5 py-0.5 text-[4px]">
          <span>Service A</span><span>50 000</span><span>3</span><span>150 000</span>
        </div>
      </div>
      <div className="flex justify-end mt-0.5 text-[4px]">
        <div className="text-right">
          <div>TOTAL: 150 000 CFA</div>
          <div className="font-bold text-[5px]">SOLDE DÛ: XOF 150 000 CFA</div>
        </div>
      </div>
    </div>
  );
}

function SharpPreview() {
  return (
    <div className="w-full bg-card text-[5px] p-0 font-sans leading-tight overflow-hidden">
      <div className="bg-gray-100 p-1.5 mb-1">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 rounded bg-gray-300" />
            <div>
              <div className="font-bold text-[6px]">Entreprise</div>
              <div className="text-muted-foreground">Adresse</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-[6px]">FACTURE</div>
            <div className="text-muted-foreground">INV0001</div>
            <div className="text-muted-foreground">23/06/2026</div>
            <div className="font-bold">XOF 150 000</div>
          </div>
        </div>
      </div>
      <div className="px-1.5">
        <div className="text-muted-foreground text-[4px] mb-0.5">ADRESSE DE FACTURATION</div>
        <div className="font-bold mb-0.5">Client ABC</div>
        <div className="flex justify-between bg-gray-800 text-white px-0.5 py-0.5 font-bold text-[4px] rounded-t">
          <span>ARTICLE</span><span>PRIX</span><span>QTÉ</span><span>MONTANT</span>
        </div>
        <div className="flex justify-between border border-border/60 px-0.5 py-0.5 text-[4px]">
          <span>Service A</span><span>50 000</span><span>3</span><span>150 000</span>
        </div>
        <div className="flex justify-end mt-0.5 text-[4px]">
          <div className="text-right">
            <div>TOTAL: 150 000 CFA</div>
            <div className="font-bold text-[5px]">SOLDE DÛ: XOF 150 000 CFA</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InvoiceModel() {
  const [activeTab, setActiveTab] = useState("conception");
  const [selectedTemplate, setSelectedTemplate] = useState("classic");
  const [selectedColor, setSelectedColor] = useState("none");
  const [customColor, setCustomColor] = useState("#2563EB");
  const [settingsId, setSettingsId] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getTeamSettings().then((s) => {
      if (s) {
        setSettingsId(s.id);
        if (s.invoice_template) setSelectedTemplate(s.invoice_template);
        if (s.invoice_color) {
          const found = COLORS.find(c => c.hex === s.invoice_color);
          if (found) setSelectedColor(found.id);
          else { setSelectedColor("custom"); setCustomColor(s.invoice_color); }
        }
      }
      setLoaded(true);
    });
  }, []);

  const getActiveColor = () => {
    if (selectedColor === "none") return null;
    if (selectedColor === "custom") return customColor;
    return COLORS.find(c => c.id === selectedColor)?.hex || null;
  };

  // Autosave (sans indicateur)
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(async () => {
      const colorHex = getActiveColor();
      const data = { invoice_template: selectedTemplate, invoice_color: colorHex || "" };
      if (settingsId) {
        await Settings.update(settingsId, data);
      } else {
        const created = await Settings.create({ company_name: "Mon Entreprise", currency: "XOF", team_id: await getTeamId(), ...data });
        setSettingsId(created.id);
      }
      clearTeamSettingsCache();
    }, 800);
    return () => clearTimeout(t);
  }, [selectedTemplate, selectedColor, customColor, loaded, settingsId]);

  const accentColor = getActiveColor() || "#2563EB";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border/60 px-4 pt-4 pb-0 flex flex-col sticky top-0 z-10">
        {/* Tabs */}
        <div className="flex">
          <button
            onClick={() => setActiveTab("conception")}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === "conception" ? "border-emerald-600 text-emerald-600" : "border-transparent text-muted-foreground"}`}
          >
            Conception
          </button>
          <button
            onClick={() => setActiveTab("style")}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === "style" ? "border-emerald-600 text-emerald-600" : "border-transparent text-muted-foreground"}`}
          >
            Style
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-28 px-4 pt-4">
        <BackToSettings />
        {activeTab === "conception" && (
          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto md:max-w-md">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTemplate(t.id)}
                className={`relative rounded-xl overflow-hidden border-2 transition-all bg-card shadow-sm ${
                  selectedTemplate === t.id ? "border-emerald-600 shadow-md" : "border-border/60"
                }`}
              >
                {selectedTemplate === t.id && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center z-10">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="p-1 scale-90 origin-top">
                  {t.preview}
                </div>
                <div className="py-1.5 text-center text-xs font-semibold text-foreground">{t.name}</div>
              </button>
            ))}
          </div>
        )}

        {activeTab === "style" && (
          <div>
            {/* Live preview */}
            <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-3 mb-5 overflow-hidden">
              <MiniInvoice color={accentColor} />
            </div>

            {/* Color picker */}
            <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-4">
              <h3 className="text-sm font-bold text-foreground mb-3">Couleur</h3>
              <div className="grid grid-cols-8 gap-2">
                {COLORS.map(c => {
                  const isSelected = selectedColor === c.id;
                  if (c.id === "custom") {
                    return (
                      <div key={c.id} className="relative">
                        <label className={`w-9 h-9 rounded-xl overflow-hidden border-2 flex items-center justify-center cursor-pointer transition-all ${isSelected ? "border-emerald-600 scale-110" : "border-border/60"}`}
                          style={{ backgroundColor: customColor }}>
                          <input
                            type="color"
                            value={customColor}
                            onChange={e => { setCustomColor(e.target.value); setSelectedColor("custom"); }}
                            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                          />
                          <svg className="w-4 h-4 text-white drop-shadow" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l-4 4m0 0l4-4m-4 4V13m10-8l3.5 3.5a2 2 0 010 2.828l-7 7a2 2 0 01-1.414.586H8v-2.586a2 2 0 01.586-1.414l7-7a2 2 0 012.828 0z" />
                          </svg>
                        </label>
                        {isSelected && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-600 rounded-full" />}
                      </div>
                    );
                  }
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedColor(c.id)}
                      className={`w-9 h-9 rounded-xl border-2 transition-all relative ${isSelected ? "border-emerald-600 scale-110" : "border-border/60"}`}
                      style={{ backgroundColor: c.hex || "#f3f4f6" }}
                      title={c.label}
                    >
                      {c.id === "none" && (
                        <svg className="w-5 h-5 text-muted-foreground absolute inset-0 m-auto" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <line x1="4" y1="4" x2="20" y2="20" />
                          <circle cx="12" cy="12" r="8" />
                        </svg>
                      )}
                      {isSelected && c.id !== "none" && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white drop-shadow" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}