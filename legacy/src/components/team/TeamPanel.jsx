import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { UserPlus, Trash2, Crown, Mail, Lock, FileText, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { isTeamEnabled } from "@/lib/planLimits";
import { Invoice } from "@/entities/all";

export default function TeamPanel() {
  const { toast } = useToast();
  const [me, setMe] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [period, setPeriod] = useState("day");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const userData = await base44.auth.me();
      if (!userData.team_id) {
        // team_id est attribué côté serveur uniquement (ensureTeamId) pour
        // empêcher un client de fixer un team_id arbitraire.
        const res = await base44.functions.invoke("ensureTeamId", {});
        userData.team_id = res?.data?.team_id || userData.id;
      }
      setMe(userData);
      const [res, inv] = await Promise.all([
        base44.functions.invoke("teamMembers", {}),
        Invoice.list("-created_date", 2000),
      ]);
      setMembers(res.data.members || []);
      setInvoices(Array.isArray(inv) ? inv : []);
    } catch (e) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleInvite = async () => {
    if (!email) return;
    setInviting(true);
    try {
      await base44.users.inviteUser(email, "user");
      await base44.functions.invoke("teamInvite", { email });
      toast({ title: "Invitation envoyée", description: email });
      setEmail("");
      load();
    } catch (e) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const handleRevoke = async (m) => {
    if (m.id === me.id) return;
    if (!confirm(`Retirer ${m.full_name || m.email} de l'équipe ?`)) return;
    try {
      await base44.functions.invoke("teamRemoveMember", { memberId: m.id });
      toast({ title: "Membre retiré de l'équipe" });
      load();
    } catch (e) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const PERIODS = [
    { key: "day", label: "Jour" },
    { key: "week", label: "7 derniers jours" },
    { key: "month", label: "30 derniers jours" },
    { key: "all", label: "Tout" },
    { key: "custom", label: "Personnalisé" },
  ];

  const getRange = () => {
    let start, end;
    if (period === "custom") {
      end = customEnd ? new Date(customEnd) : new Date();
      end.setHours(23, 59, 59, 0);
      start = customStart ? new Date(customStart) : new Date();
      start.setHours(0, 0, 0, 0);
      if (!customStart) start.setFullYear(2000);
    } else {
      end = new Date(); end.setHours(23, 59, 59, 0);
      start = new Date();
      if (period === "day") start.setHours(0, 0, 0, 0);
      else if (period === "week") { const dow = start.getDay(); start.setDate(start.getDate() - ((dow + 6) % 7)); start.setHours(0, 0, 0, 0); }
      else if (period === "month") { start.setMonth(start.getMonth() - 1); start.setHours(0, 0, 0, 0); }
      else { start.setFullYear(2000); }
    }
    return { start, end };
  };

  const countsFor = (memberId) => {
    const { start, end } = getRange();
    let factures = 0, bons = 0;
    for (const i of invoices) {
      if (i.created_by_id !== memberId || !i.created_date) continue;
      const d = new Date(i.created_date);
      if (d < start || d > end) continue;
      const t = i.type || "invoice";
      if (t === "bl") bons++;
      else if (t === "invoice") factures++;
    }
    return { factures, bons };
  };

  if (loading) return <div className="p-6 text-muted-foreground">Chargement…</div>;

  if (me && !isTeamEnabled(me)) {
    return (
      <div className="bg-card rounded-2xl border border-border/60 p-6 text-center">
        <Lock className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
        <h2 className="text-xl font-bold text-foreground">Collaboration en équipe indisponible</h2>
        <p className="text-sm text-muted-foreground mt-2">Le partage de documents entre membres n'est pas inclus dans votre plan Essentiel.</p>
        <Link to="/Subscription" className="inline-block mt-4 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-xl">Voir les plans</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Équipe</h2>
        <p className="text-muted-foreground text-sm">
          Invitez des collaborateurs. Ils partagent vos factures, devis, articles et stock.
        </p>
      </div>

      {me?.team_id === me?.id || me?.role === "admin" ? (
        <div className="bg-card rounded-2xl border border-border/60 p-4">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="email@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button
              onClick={handleInvite}
              disabled={inviting || !email}
              className="bg-green-600 hover:bg-green-700"
            >
              <UserPlus className="w-4 h-4 mr-1" /> Inviter
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/60 p-4 text-sm text-muted-foreground">
          Seul le propriétaire de l'équipe peut inviter des collaborateurs.
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground mr-1">Documents créés :</span>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${period === p.key ? "bg-green-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            {p.label}
          </button>
        ))}
        {period === "custom" && (
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="h-7 text-xs border border-border/60 rounded-md px-1.5"
            />
            <span className="text-muted-foreground text-xs">→</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="h-7 text-xs border border-border/60 rounded-md px-1.5"
            />
          </div>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-border/60 divide-y divide-border/60 overflow-hidden">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
              {(m.full_name || m.email || "U").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{m.full_name || m.email}</p>
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <Mail className="w-3 h-3" /> {m.email}
              </p>
              {(() => {
                const c = countsFor(m.id);
                return (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1">
                      <FileText className="w-3 h-3" /> {c.factures} facture{c.factures > 1 ? "s" : ""}
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Truck className="w-3 h-3" /> {c.bons} bon{c.bons > 1 ? "s" : ""}
                    </span>
                  </p>
                );
              })()}
            </div>
            {m.id === (me.team_id || me.id) ? (
              <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1 flex-shrink-0">
                <Crown className="w-3 h-3" /> Propriétaire
              </span>
            ) : m.id === me.id ? (
              <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-full flex-shrink-0">
                Vous
              </span>
            ) : me?.team_id === me?.id || me?.role === "admin" ? (
              <button
                onClick={() => handleRevoke(m)}
                className="text-muted-foreground hover:text-red-500 p-2 flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        ))}
        {members.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground text-center">Aucun membre.</div>
        )}
      </div>
    </div>
  );
}