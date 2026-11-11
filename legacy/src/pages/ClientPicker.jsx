import React, { useState, useEffect, useRef } from "react";
import { Customer } from "@/entities/all";
import { Search, Plus, UserPlus } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getTeamId } from "@/lib/team";
import { getCustomers, upsertCustomerInCache } from "@/lib/customerCache";
import EditorHeader from "@/components/invoice-editor/EditorHeader";
import TrialGate from "@/components/TrialGate";

export default function ClientPicker() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const docType = searchParams.get("type") || "invoice";
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768);
  const searchRef = useRef(null);

  useEffect(() => {
    getCustomers().then((list) => { setCustomers(list); setLoading(false); });
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const filtered = [...customers]
    .filter((c) => (c.name || "").toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const trimmed = query.trim();
  const exactMatch = trimmed && customers.some((c) => (c.name || "").toLowerCase() === trimmed.toLowerCase());

  const pick = (c) => {
    sessionStorage.setItem(
      `picked_customer_${docType}`,
      JSON.stringify({ name: c.name, phone: c.phone || "", address: c.address || "" })
    );
    navigate(-1);
  };

  const createAndPick = async () => {
    if (!trimmed) return;
    const created = await Customer.create({ name: trimmed, team_id: await getTeamId() });
    upsertCustomerInCache(created);
    pick(created);
  };

  const handleImportContacts = async () => {
    if (!navigator.contacts || !navigator.contacts.select) {
      alert("L'import depuis les contacts n'est pas supporté sur cet appareil.");
      return;
    }
    try {
      const contacts = await navigator.contacts.select(["name", "tel"], { multiple: false });
      if (contacts && contacts.length > 0) {
        const c = contacts[0];
        const name = (c.name && c.name[0]) || "Contact";
        const phone = (c.tel && c.tel[0]) || "";
        const created = await Customer.create({ name, phone, team_id: await getTeamId() });
        upsertCustomerInCache(created);
        pick(created);
      }
    } catch (e) {
      /* user cancelled */
    }
  };

  return (
    <TrialGate>
    <div className="min-h-screen bg-background">
      <EditorHeader
        title="Clients"
        onBack={() => navigate(-1)}
        rightElement={
          <button onClick={() => searchRef.current?.focus()} className="text-white p-1">
            <Search className="w-6 h-6" />
          </button>
        }
      />
      <div className="max-w-2xl mx-auto p-4 pb-32">
        <div className="bg-card rounded-xl border-2 border-green-500 shadow-sm px-4 py-3 flex items-center gap-2 mb-3">
          <Search className="w-5 h-5 text-green-600" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom"
            className="flex-1 bg-transparent text-base font-medium outline-none placeholder:text-muted-foreground placeholder:font-normal"
          />
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 overflow-hidden divide-y divide-border/60">
          {loading ? (
            <p className="p-4 text-sm text-muted-foreground">Chargement…</p>
          ) : (
            <>
              {trimmed && !exactMatch && (
                <button
                  onClick={createAndPick}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-green-600 hover:bg-green-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>Créer « {trimmed} »</span>
                </button>
              )}
              {filtered.length === 0 && !trimmed ? (
                <p className="p-4 text-sm text-muted-foreground">Aucun client</p>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => pick(c)}
                    className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted/50"
                  >
                    {c.name}
                  </button>
                ))
              )}
            </>
          )}
        </div>
      </div>
      {isMobile ? (
        <button
          onClick={handleImportContacts}
          className="fixed bottom-6 left-4 right-4 bg-transparent text-green-600 border-2 border-green-500 rounded-full py-3 flex items-center justify-center gap-2 font-semibold z-30"
        >
          <UserPlus className="w-5 h-5" />
          <span>Importer depuis les contacts</span>
        </button>
      ) : (
        <button
          onClick={() => navigate(`${createPageUrl("AddCustomer")}?type=${docType}`)}
          className="fixed bottom-6 right-6 bg-green-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg z-30"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
    </TrialGate>
  );
}