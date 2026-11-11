import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Customer } from "@/entities/all";
import { Check, UserPlus } from "lucide-react";
import { getTeamId } from "@/lib/team";

const fieldClass =
  "w-full text-base text-foreground bg-transparent outline-none placeholder:text-muted-foreground";

export default function AddCustomer() {
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", address: "" });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!editId);
  const [customerId, setCustomerId] = useState(editId || null);
  const dirtyRef = useRef(false);
  const loadedRef = useRef(!editId);

  useEffect(() => {
    if (editId) loadCustomer();
  }, [editId]);

  const loadCustomer = async () => {
    const list = await Customer.filter({ id: editId });
    const c = list[0];
    if (c) setFormData({ name: c.name || "", phone: c.phone || "", email: c.email || "", address: c.address || "" });
    loadedRef.current = true;
    setLoading(false);
  };

  const set = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    dirtyRef.current = true;
  };

  // Debounced autosave
  useEffect(() => {
    if (!loadedRef.current || !dirtyRef.current) return;
    if (!formData.name.trim()) return;
    const t = setTimeout(async () => {
      setSaving(true);
      try {
        if (customerId) {
          await Customer.update(customerId, formData);
        } else {
          const created = await Customer.create({ ...formData, team_id: await getTeamId() });
          setCustomerId(created.id);
        }
        dirtyRef.current = false;
      } finally { setSaving(false); }
    }, 800);
    return () => clearTimeout(t);
  }, [formData, customerId]);

  const handleImportContacts = async () => {
    if (!navigator.contacts || !navigator.contacts.select) {
      alert("L'import depuis les contacts n'est pas supporté sur cet appareil.");
      return;
    }
    try {
      const contacts = await navigator.contacts.select(["name", "tel", "email"], { multiple: false });
      if (contacts && contacts.length > 0) {
        const c = contacts[0];
        setFormData((prev) => ({
          ...prev,
          name: (c.name && c.name[0]) || prev.name,
          phone: (c.tel && c.tel[0]) || prev.phone,
          email: (c.email && c.email[0]) || prev.email,
        }));
      }
    } catch (e) {
      /* user cancelled */
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
      </div>
    );
  }

  const nameError = submitted && !formData.name.trim();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-5">
        <h1 className="hidden md:block font-heading text-3xl font-semibold text-foreground">
          {editId ? "Modifier le client" : "Nouveau client"}
        </h1>

        {/* Container 1: identity */}
        <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
          <div className="p-4">
            <label className="text-sm text-muted-foreground">Nom du client</label>
            <input
              value={formData.name}
              onChange={set("name")}
              placeholder="Nom du client"
              className={`${fieldClass} mt-1`}
            />
            {nameError && <p className="text-xs text-red-600 mt-1">Nom du client est requis</p>}
          </div>
          <div className="h-px bg-border/60 ml-4" />
          <div className="p-4">
            <label className="text-sm text-muted-foreground">E-mail</label>
            <input
              value={formData.email}
              onChange={set("email")}
              type="email"
              placeholder="E-mail"
              className={`${fieldClass} mt-1`}
            />
          </div>
        </div>

        {/* Container 2: phone + address */}
        <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
          <div className="flex items-center p-4 gap-3">
            <span className="text-sm font-semibold text-foreground w-20 flex-shrink-0">Mobile</span>
            <input
              value={formData.phone}
              onChange={set("phone")}
              placeholder="Portable"
              className={`${fieldClass} flex-1`}
            />
          </div>
          <div className="h-px bg-border/60 ml-4" />
          <div className="flex items-start p-4 gap-3">
            <span className="text-sm font-semibold text-foreground w-20 flex-shrink-0 pt-1">Adresse</span>
            <input
              value={formData.address}
              onChange={set("address")}
              placeholder="Adresse"
              className={`${fieldClass} flex-1`}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button
            onClick={handleImportContacts}
            className="w-full bg-transparent text-emerald-600 border-2 border-emerald-500 rounded-full py-3 flex items-center justify-center gap-2 font-semibold hover:bg-emerald-50 transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            <span>Importer depuis les contacts</span>
          </button>
          {saving && (
            <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
              <Check className="w-3 h-3" /> Enregistrement…
            </p>
          )}
        </div>
      </div>

    </div>
  );
}