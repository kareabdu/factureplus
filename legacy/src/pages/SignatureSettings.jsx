import React, { useState, useEffect, useRef } from "react";
import { Settings } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, PenLine, Upload, Image as ImageIcon } from "lucide-react";
import { base44 } from "@/api/base44Client";
import BackToSettings from "@/components/BackToSettings";
import { getTeamId } from "@/lib/team";
import { getTeamSettings, clearTeamSettingsCache } from "@/lib/teamSettings";
import SignaturePad from "@/components/SignaturePad";

export default function SignatureSettings() {
  const [settingsId, setSettingsId] = useState(null);
  const [signatureUrl, setSignatureUrl] = useState("");
  const [mode, setMode] = useState("draw");
  const padRef = useRef(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    loadSettings();
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, []);

  const loadSettings = async () => {
    const s = await getTeamSettings();
    if (s) {
      setSettingsId(s.id);
      setSignatureUrl(s.signature_url || "");
    }
  };

  const persist = async (url) => {
    if (settingsId) {
      await Settings.update(settingsId, { signature_url: url });
    } else {
      const created = await Settings.create({
        company_name: "Mon Entreprise",
        currency: "XOF",
        currency_symbol: "CFA",
        signature_url: url,
        team_id: await getTeamId(),
      });
      setSettingsId(created.id);
    }
    clearTeamSettingsCache();
    setSignatureUrl(url);
  };

  const scheduleDrawSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!padRef.current || padRef.current.isEmpty()) return;
      const dataUrl = padRef.current.getDataURL();
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "signature.png", { type: "image/png" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await persist(file_url);
      padRef.current.clear();
    }, 2500);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await persist(file_url);
    if (padRef.current) padRef.current.clear();
  };

  const handleRemove = async () => {
    if (padRef.current) padRef.current.clear();
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await persist("");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 md:p-8 pb-32">
        <BackToSettings />
        <Card className="shadow-sm border border-border/60 mb-6">
          <CardHeader className="border-b border-border/60">
            <CardTitle className="flex items-center gap-2">
              <PenLine className="w-5 h-5 text-emerald-600" /> Signature des factures
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Dessinez ou insérez une image (cachet). Votre signature sera ajoutée automatiquement en bas de vos factures.
            </p>

            {signatureUrl && (
              <div className="rounded-xl border border-border/60 bg-card p-4 flex items-center justify-between gap-3">
                <img src={signatureUrl} alt="Signature actuelle" className="h-16 object-contain" />
                <button
                  onClick={handleRemove}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" /> Supprimer
                </button>
              </div>
            )}

            {/* Mode toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setMode("draw")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${mode === "draw" ? "bg-emerald-600 text-white border-emerald-600" : "bg-card text-foreground border-border/60 hover:bg-muted"}`}
              >
                <PenLine className="w-4 h-4 inline mr-1.5" /> Dessiner
              </button>
              <button
                onClick={() => setMode("image")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${mode === "image" ? "bg-emerald-600 text-white border-emerald-600" : "bg-card text-foreground border-border/60 hover:bg-muted"}`}
              >
                <ImageIcon className="w-4 h-4 inline mr-1.5" /> Image / Cachet
              </button>
            </div>

            {mode === "draw" && (
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Dessinez votre signature
                </label>
                <SignaturePad ref={padRef} onEnd={scheduleDrawSave} />
                <div className="flex justify-between mt-3">
                  <button
                    onClick={() => { if (padRef.current) padRef.current.clear(); }}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm text-foreground border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <Trash2 className="w-4 h-4" /> Effacer
                  </button>
                  <span className="text-xs text-muted-foreground self-center">Sauvegarde automatique</span>
                </div>
              </div>
            )}

            {mode === "image" && (
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Insérer une image (cachet)
                </label>
                <label className="flex flex-col items-center justify-center gap-2 w-full h-40 border-2 border-dashed border-border/60 rounded-xl cursor-pointer hover:bg-muted">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Cliquez pour téléverser une image</span>
                  <span className="text-xs text-muted-foreground">PNG ou JPG</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUpload}
                  />
                </label>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}