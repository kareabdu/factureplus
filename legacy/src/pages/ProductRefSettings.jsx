import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings } from "@/entities/all";
import { Switch } from "@/components/ui/switch";
import { getTeamId } from "@/lib/team";
import { getTeamSettings, clearTeamSettingsCache } from "@/lib/teamSettings";
import { generateProductRef } from "@/lib/productRef";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";

const GREEN = "#16a34a";

const FORMAT_PRESETS = [
  "{NAME}",
  "{PREFIX}{NAME}",
  "{PREFIX}{N:04d}",
  "{PREFIX}{N}",
  "{PREFIX}{NAME}-{N:03d}",
];

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <div className="flex-1 flex justify-end min-w-0">{children}</div>
    </div>
  );
}

export default function ProductRefSettings() {
  const navigate = useNavigate();
  const [settingsId, setSettingsId] = useState(null);
  const [auto, setAuto] = useState(true);
  const [prefix, setPrefix] = useState("ART-");
  const [format, setFormat] = useState("{NAME}");
  const [nextNumber, setNextNumber] = useState("1");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getTeamSettings().then((s) => {
      const st = s || {};
      setSettingsId(st.id || null);
      setAuto(st.product_ref_auto !== false);
      setPrefix(st.product_ref_prefix ?? "ART-");
      setFormat(st.product_ref_format || "{NAME}");
      setNextNumber(st.product_ref_next_number != null ? String(st.product_ref_next_number) : "1");
      setLoaded(true);
    });
  }, []);

  const preview = generateProductRef(
    { product_ref_prefix: prefix, product_ref_next_number: Number(nextNumber) || 1, product_ref_format: format },
    "iPhone 16 Pro Max"
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        product_ref_auto: auto,
        product_ref_prefix: prefix.trim() || "ART-",
        product_ref_format: format.trim() || "{NAME}",
        product_ref_next_number: Math.max(1, Number(nextNumber) || 1),
      };
      if (settingsId) {
        await Settings.update(settingsId, payload);
      } else {
        const created = await Settings.create({ company_name: "Mon entreprise", currency: "XOF", team_id: await getTeamId(), ...payload });
        setSettingsId(created.id);
      }
      clearTeamSettingsCache();
      navigate(-1);
    } catch (err) {
      alert("Erreur : " + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        <div className="hidden md:flex items-center gap-4 mb-2">
          <Button variant="outline" size="icon" onClick={() => navigate(createPageUrl("Settings"))} className="shadow-sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Référence article</h1>
        </div>

        {/* Auto toggle */}
        <div className="bg-card rounded-xl shadow-sm border border-border/60 px-4 py-3.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Génération automatique</span>
            <Switch checked={auto} onCheckedChange={setAuto} />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Génère automatiquement la référence à la création d'un article. Désactivez pour la saisie manuelle.
          </p>
        </div>

        {/* Config card */}
        <div className="bg-card rounded-xl shadow-sm border border-border/60 divide-y divide-border/60 overflow-hidden">
          <div className="px-4 py-3.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Préfixe</span>
              <input
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="ART-"
                className="text-right text-sm text-foreground bg-transparent outline-none border-0 w-40 placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="px-4 py-3.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Format</span>
              <input
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                placeholder="{PREFIX}{N:04d}"
                className="text-right text-sm text-foreground bg-transparent outline-none border-0 w-48 placeholder:text-muted-foreground"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 justify-end">
              {FORMAT_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFormat(p)}
                  className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground hover:bg-muted/80"
                  style={{ minHeight: "unset", minWidth: "unset" }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <Row label="Prochain N°">
            <input
              type="number"
              min="1"
              value={nextNumber}
              onChange={(e) => setNextNumber(e.target.value)}
              className="text-right text-sm text-foreground bg-transparent outline-none border-0 w-24 placeholder:text-muted-foreground"
            />
          </Row>
        </div>

        {/* Tokens help */}
        <div className="bg-card rounded-xl shadow-sm border border-border/60 px-4 py-3.5 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">Jetons disponibles</p>
          <p><code className="text-foreground">{"{PREFIX}"}</code> — le préfixe</p>
          <p><code className="text-foreground">{"{N:04d}"}</code> — numéro séquentiel (4 chiffres)</p>
          <p><code className="text-foreground">{"{N}"}</code> — numéro séquentiel simple</p>
          <p><code className="text-foreground">{"{NAME}"}</code> — abréviation du nom de l'article</p>
        </div>

        {/* Preview */}
        <div className="bg-card rounded-xl shadow-sm border border-border/60 px-4 py-3.5">
          <p className="text-xs text-muted-foreground">Aperçu</p>
          <p className="text-xs text-muted-foreground mt-1">Article : <span className="text-foreground font-medium">iPhone 16 Pro Max</span></p>
          <p className="text-lg font-bold mt-0.5" style={{ color: GREEN }}>{preview}</p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !loaded}
          className="w-full text-white font-semibold py-3.5 rounded-xl shadow-sm disabled:opacity-60"
          style={{ backgroundColor: GREEN }}
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}