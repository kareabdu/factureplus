import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings } from "@/entities/all";
import { Switch } from "@/components/ui/switch";
import BackToSettings from "@/components/BackToSettings";
import { getTeamId } from "@/lib/team";
import { getTeamSettings, clearTeamSettingsCache } from "@/lib/teamSettings";

const GREEN = "#059669";

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <div className="flex-1 flex justify-end min-w-0">{children}</div>
    </div>
  );
}

export default function Taxe() {
  const navigate = useNavigate();
  const [settingsId, setSettingsId] = useState(null);
  const [applyTax, setApplyTax] = useState(false);
  const [taxName, setTaxName] = useState("TAX");
  const [taxRate, setTaxRate] = useState("");
  // Type et inclusif conservés en arrière-plan pour ne pas perdre la config
  // existante (déduction / par article / inclusif) lors d'un bascule off→on.
  const [savedType, setSavedType] = useState("total");
  const [taxInclusive, setTaxInclusive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getTeamSettings().then((s) => {
      const st = s || {};
      setSettingsId(st.id || null);
      const hasTax = st.tax_type && st.tax_type !== "none";
      setApplyTax(hasTax);
      setSavedType(hasTax ? st.tax_type : "total");
      setTaxName(st.tax_name || "TAX");
      setTaxRate(st.tax_rate != null ? String(st.tax_rate) : "");
      setTaxInclusive(!!st.tax_inclusive);
      setLoaded(true);
    });
  }, []);

  const handleSave = async () => {
    if (applyTax && (!taxRate || isNaN(Number(taxRate)) || Number(taxRate) <= 0)) {
      alert("Taux de taxe invalide");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        tax_type: applyTax ? savedType : "none",
        tax_name: taxName.trim() || "TAX",
        tax_rate: Number(taxRate) || 0,
        tax_inclusive: taxInclusive,
      };
      if (settingsId) {
        await Settings.update(settingsId, payload);
      } else {
        const created = await Settings.create({
          company_name: "Mon entreprise",
          currency: "XOF",
          team_id: await getTeamId(),
          ...payload,
        });
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
        <BackToSettings />
        {/* Interrupteur : appliquer la TAX sur les factures */}
        <div className="bg-card rounded-xl shadow-sm border border-border/60 px-4 py-3.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">
              Appliquer la TAX sur les factures
            </span>
            <Switch checked={applyTax} onCheckedChange={setApplyTax} className="data-[state=checked]:bg-[#059669]" />
          </div>
        </div>

        {/* Tableau de configuration — visible uniquement si la taxe est activée */}
        {applyTax && (
          <div className="bg-card rounded-xl shadow-sm border border-border/60 divide-y divide-border/60 overflow-hidden">
            <Row label="Tax label">
              <input
                value={taxName}
                onChange={(e) => setTaxName(e.target.value)}
                placeholder="TAX"
                className="text-right text-sm text-foreground bg-transparent outline-none border-0 w-40 placeholder:text-muted-foreground"
              />
            </Row>
            <Row label="TAX (%)">
              <div className="flex items-center">
                <input
                  type="number"
                  inputMode="decimal"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  placeholder="0"
                  className="text-right text-sm text-foreground bg-transparent outline-none border-0 w-20 placeholder:text-muted-foreground"
                />
                <span className="text-sm text-muted-foreground ml-1">%</span>
              </div>
            </Row>
          </div>
        )}

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