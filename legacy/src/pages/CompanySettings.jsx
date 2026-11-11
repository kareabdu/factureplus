import React, { useState, useEffect } from "react";
import { Settings } from "@/entities/all";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import BackToSettings from "@/components/BackToSettings";
import { getTeamId } from "@/lib/team";
import { getTeamSettings, clearTeamSettingsCache } from "@/lib/teamSettings";

const UNITS = ["Pcs", "heures", "jours", "kg", "litres", "mètres", "yards", "boîtes", "cartons", "sachets", "paquets"];

const CURRENCIES = [
  { code: "XOF", symbol: "CFA", label: "CFA (XOF)" },
  { code: "EUR", symbol: "€", label: "Euro (€)" },
  { code: "USD", symbol: "$", label: "Dollar US ($)" },
  { code: "XAF", symbol: "FCFA", label: "FCFA (XAF)" },
  { code: "GBP", symbol: "£", label: "Livre (£)" },
  { code: "MAD", symbol: "DH", label: "Dirham (DH)" },
  { code: "NGN", symbol: "₦", label: "Naira (₦)" },
  { code: "GHS", symbol: "₵", label: "Cedi (₵)" },
  { code: "ZAR", symbol: "R", label: "Rand (R)" },
  { code: "KES", symbol: "KSh", label: "Shilling (KSh)" },
];

export default function CompanySettings() {
  const [settings, setSettings] = useState({
    company_name: "",
    company_address: "",
    company_phone: "",
    company_phone2: "",
    company_email: "",
    company_website: "",
    company_tax_id: "",
    company_rcm: "",
    company_ninea: "",
    company_logo_url: "",
    invoice_prefix: "FAC-",
    invoice_next_number: 1,
    invoice_number_format: "{PREFIX}{YYYY}-{N:04d}",
    proforma_prefix: "PRO-",
    proforma_next_number: 1,
    bl_prefix: "BL-",
    bl_next_number: 1,
    currency: "XOF",
    currency_symbol: "CFA",
    invoice_footer: "",
    default_terms: "À payer dès réception",
    logo_size: "medium",
    default_unit: "Pcs",
  });
  const [existingId, setExistingId] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  // Autosave (sans indicateur)
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(async () => {
      if (existingId) {
        await Settings.update(existingId, settings);
      } else {
        const created = await Settings.create({ ...settings, team_id: await getTeamId() });
        setExistingId(created.id);
      }
      clearTeamSettingsCache();
    }, 800);
    return () => clearTimeout(t);
  }, [settings, loaded, existingId]);

  const loadSettings = async () => {
    const s = await getTeamSettings();
    if (s) {
      setSettings({
        company_name: s.company_name || "",
        company_address: s.company_address || "",
        company_phone: s.company_phone || "",
        company_phone2: s.company_phone2 || "",
        company_email: s.company_email || "",
        company_website: s.company_website || "",
        company_tax_id: s.company_tax_id || "",
        company_rcm: s.company_rcm || "",
        company_ninea: s.company_ninea || "",
        company_logo_url: s.company_logo_url || "",
        invoice_prefix: s.invoice_prefix || "FAC-",
        invoice_next_number: s.invoice_next_number || 1,
        invoice_number_format: s.invoice_number_format || "{PREFIX}{YYYY}-{N:04d}",
        proforma_prefix: s.proforma_prefix || "PRO-",
        proforma_next_number: s.proforma_next_number || 1,
        bl_prefix: s.bl_prefix || "BL-",
        bl_next_number: s.bl_next_number || 1,
        currency: s.currency || "XOF",
        currency_symbol: s.currency_symbol || "CFA",
        invoice_footer: s.invoice_footer || "",
        default_terms: s.default_terms || "À payer dès réception",
        logo_size: s.logo_size || "medium",
        default_unit: s.default_unit || "Pcs",
      });
      setExistingId(s.id);
    }
    setLoaded(true);
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const previewNumber = () => {
    const y = new Date().getFullYear();
    return settings.invoice_number_format
      .replace("{PREFIX}", settings.invoice_prefix)
      .replace("{YYYY}", String(y))
      .replace(/\{N:(\d+)d\}/, (_, len) => String(settings.invoice_next_number).padStart(Number(len), "0"));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-8 pb-32">
        <BackToSettings />
        <Card className="shadow-sm border border-border/60 mb-6">
          <CardHeader className="border-b border-border/60">
            <CardTitle>Informations de l'entreprise</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Nom de l'entreprise *</Label>
                <Input value={settings.company_name} onChange={e => handleChange("company_name", e.target.value)} placeholder="Mon Entreprise" />
              </div>
              <div className="space-y-2">
                <Label>Adresse</Label>
                <Input value={settings.company_address} onChange={e => handleChange("company_address", e.target.value)} placeholder="Dakar, Sénégal" />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input value={settings.company_phone} onChange={e => handleChange("company_phone", e.target.value)} placeholder="+221..." />
              </div>
              <div className="space-y-2">
                <Label>Téléphone secondaire</Label>
                <Input value={settings.company_phone2} onChange={e => handleChange("company_phone2", e.target.value)} placeholder="+221..." />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={settings.company_email} onChange={e => handleChange("company_email", e.target.value)} placeholder="contact@entreprise.sn" />
              </div>
              <div className="space-y-2">
                <Label>Site web</Label>
                <Input value={settings.company_website} onChange={e => handleChange("company_website", e.target.value)} placeholder="www.entreprise.sn" />
              </div>
              <div className="space-y-2">
                <Label>RCM</Label>
                <Input value={settings.company_rcm} onChange={e => handleChange("company_rcm", e.target.value)} placeholder="N° RCM" />
                <p className="text-xs text-muted-foreground">Affiché sur la facture et le devis</p>
              </div>
              <div className="space-y-2">
                <Label>NINEA</Label>
                <Input value={settings.company_ninea} onChange={e => handleChange("company_ninea", e.target.value)} placeholder="NINEA" />
                <p className="text-xs text-muted-foreground">Affiché sur la facture et le devis</p>
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Logo de l'entreprise</Label>
                <div className="flex items-center gap-4">
                  {settings.company_logo_url && (
                    <img src={settings.company_logo_url} alt="Logo" className="w-16 h-16 object-contain rounded border" />
                  )}
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const { file_url } = await base44.integrations.Core.UploadFile({ file });
                        handleChange("company_logo_url", file_url);
                      }}
                    />
                    <span className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-muted">
                      <Upload className="w-4 h-4" /> {settings.company_logo_url ? "Changer le logo" : "Uploader un logo"}
                    </span>
                  </label>
                </div>
                {settings.company_logo_url && (
                  <div className="mt-4">
                    <Label>Taille du logo sur la facture</Label>
                    <div className="flex gap-2 mt-2">
                      {[
                        { key: "small", label: "Petit" },
                        { key: "medium", label: "Moyen" },
                        { key: "large", label: "Grand" },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleChange("logo_size", opt.key)}
                          className={`px-4 py-2 rounded-lg text-sm border transition-colors ${settings.logo_size === opt.key ? "bg-emerald-600 text-white border-emerald-600" : "bg-card text-foreground border-border/60 hover:bg-muted"}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-border/60 mb-6">
          <CardHeader className="border-b border-border/60">
            <CardTitle>Numérotation des documents</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Préfixe facture</Label>
                <Input value={settings.invoice_prefix} onChange={e => handleChange("invoice_prefix", e.target.value)} placeholder="FAC-" />
              </div>
              <div className="space-y-2">
                <Label>Prochain N° facture</Label>
                <Input type="number" min="1" value={settings.invoice_next_number} onChange={e => handleChange("invoice_next_number", parseInt(e.target.value) || 1)} />
              </div>
              <div className="space-y-2">
                <Label>Préfixe proforma</Label>
                <Input value={settings.proforma_prefix} onChange={e => handleChange("proforma_prefix", e.target.value)} placeholder="PRO-" />
              </div>
              <div className="space-y-2">
                <Label>Prochain N° proforma</Label>
                <Input type="number" min="1" value={settings.proforma_next_number} onChange={e => handleChange("proforma_next_number", parseInt(e.target.value) || 1)} />
              </div>
              <div className="space-y-2">
                <Label>Préfixe bon de livraison</Label>
                <Input value={settings.bl_prefix} onChange={e => handleChange("bl_prefix", e.target.value)} placeholder="BL-" />
                <p className="text-xs text-muted-foreground">Partage le compteur des factures</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-border/60 mb-6">
          <CardHeader className="border-b border-border/60">
            <CardTitle>Devise & conditions</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Devise</Label>
                <Select
                  value={`${settings.currency}|${settings.currency_symbol}`}
                  onValueChange={(val) => {
                    const [code, symbol] = val.split("|");
                    handleChange("currency", code);
                    handleChange("currency_symbol", symbol);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={`${c.code}|${c.symbol}`}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unité par défaut (articles)</Label>
                <Input value={settings.default_unit} onChange={e => handleChange("default_unit", e.target.value)} placeholder="Pcs" />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Conditions par défaut</Label>
                <Input value={settings.default_terms} onChange={e => handleChange("default_terms", e.target.value)} placeholder="À payer dès réception" />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Pied de page facture</Label>
                <Input value={settings.invoice_footer} onChange={e => handleChange("invoice_footer", e.target.value)} placeholder="Merci pour votre confiance !" />
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}