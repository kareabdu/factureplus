import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Clock, UserCheck, UserX, Activity, Loader2, Search, Send, MailCheck, AlertTriangle, CheckCircle2, Download, Trash2 } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import { Input } from "@/components/ui/input";
import SearchInput from "@/components/SearchInput";
import { downloadCsv } from "@/lib/exportCsv";

const fmtDate = (d) => (d ? format(new Date(d), "dd/MM/yyyy") : "—");

function inactivityLabel(days) {
  if (days == null) return "Jamais";
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 30) return `${days} jours`;
  if (days < 365) return `${Math.round(days / 30)} mois`;
  return `${Math.floor(days / 365)} an(s)`;
}

function inactivityColor(days) {
  if (days == null) return "text-red-600";
  if (days <= 7) return "text-green-600";
  if (days <= 30) return "text-amber-600";
  if (days <= 90) return "text-orange-600";
  return "text-red-600";
}

export default function UserInsights() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [lastActivity, setLastActivity] = useState({});
  const [tab, setTab] = useState("unverified");
  const [search, setSearch] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [emailStatus, setEmailStatus] = useState({}); // { [email]: { status, mx } }
  const [sending, setSending] = useState(false);
  const [sendingReengage, setSendingReengage] = useState(false);
  const [sentEmails, setSentEmails] = useState({}); // { [email]: true | 'error' }
  const [reengageSent, setReengageSent] = useState({}); // { [email]: true | 'error' }
  const [deleting, setDeleting] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Supprimer définitivement le compte de ${u.full_name || u.email} ?`)) return;
    setDeleting((prev) => ({ ...prev, [u.id]: true }));
    try {
      await base44.entities.User.delete(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (e) {
      alert("Erreur lors de la suppression : " + (e.message || e));
    }
    setDeleting((prev) => ({ ...prev, [u.id]: false }));
  };

  const statusBadge = (st) => {
    if (st === 'valid') return { label: 'Valide', cls: 'text-green-700 bg-green-50', Icon: MailCheck };
    if (st === 'invalid_syntax') return { label: 'Syntaxe invalide', cls: 'text-red-700 bg-red-50', Icon: AlertTriangle };
    if (st === 'invalid_domain') return { label: 'Domaine invalide', cls: 'text-red-700 bg-red-50', Icon: AlertTriangle };
    if (st === 'no_mx') return { label: 'Domaine non receveur', cls: 'text-orange-700 bg-orange-50', Icon: AlertTriangle };
    return null;
  };

  const handleVerify = async () => {
    if (unverified.length === 0) return;
    setVerifying(true);
    try {
      const emails = unverified.map((u) => (u.email || '').toLowerCase()).filter(Boolean);
      const res = await base44.functions.invoke('verifyEmails', { emails });
      setEmailStatus(res.data?.results || {});
    } catch (e) {
      console.log('verifyEmails error', e);
    } finally {
      setVerifying(false);
    }
  };

  const handleSendReminder = async (emails) => {
    setSending(true);
    try {
      const res = await base44.functions.invoke('sendInviteReminder', {
        emails,
        app_url: 'https://invoice.kareapps.com',
      });
      const sent = res.data?.sent || [];
      const failed = res.data?.failed || [];
      setSentEmails((prev) => {
        const next = { ...prev };
        for (const e of sent) next[e.toLowerCase()] = true;
        for (const f of failed) next[f.email.toLowerCase()] = 'error';
        return next;
      });
    } catch (e) {
      console.log('sendInviteReminder error', e);
    } finally {
      setSending(false);
    }
  };

  const handleSendReengagement = async (emails) => {
    setSendingReengage(true);
    try {
      const res = await base44.functions.invoke('sendReengagementEmail', {
        emails,
        app_url: 'https://invoice.kareapps.com',
      });
      const sent = res.data?.sent || [];
      const failed = res.data?.failed || [];
      setReengageSent((prev) => {
        const next = { ...prev };
        for (const e of sent) next[e.toLowerCase()] = true;
        for (const f of failed) next[f.email.toLowerCase()] = 'error';
        return next;
      });
    } catch (e) {
      console.log('sendReengagementEmail error', e);
    } finally {
      setSendingReengage(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [userList, activityRes] = await Promise.all([
        base44.entities.User.list("-created_date", 1000),
        base44.functions.invoke("getUserActivity", {}),
      ]);
      setUsers(userList || []);
      setLastActivity(activityRes.data?.activity || {});
    } catch (e) {
      console.log("UserInsights load error", e);
    }
    setLoading(false);
  };

  const s = search.toLowerCase();
  const matchSearch = (u) => !s || (u.full_name || "").toLowerCase().includes(s) || (u.email || "").toLowerCase().includes(s);

  const unverified = useMemo(
    () => (users || []).filter((u) => u.is_verified === false && matchSearch(u)),
    [users, s]
  );

  const verified = useMemo(() => {
    const now = new Date();
    return (users || [])
      .filter((u) => u.is_verified === true && matchSearch(u))
      .map((u) => {
        const last = lastActivity[u.id] || null;
        const ref = last || u.created_date;
        const days = ref ? differenceInCalendarDays(now, new Date(ref)) : null;
        return { ...u, last_activity: last, inactivity_days: days };
      })
      .sort((a, b) => (b.inactivity_days ?? 9999) - (a.inactivity_days ?? 9999));
  }, [users, lastActivity, s]);

  const exportUnverified = () => {
    const headers = ["Nom", "Email", "Date inscription"];
    const rows = unverified.map((u) => [u.full_name, u.email, u.created_date]);
    downloadCsv("inscriptions_non_confirmees", headers, rows);
  };

  const exportVerified = () => {
    const headers = ["Nom", "Email", "Dernière activité", "Inactivité (jours)", "Date inscription"];
    const rows = verified.map((u) => [
      u.full_name,
      u.email,
      u.last_activity,
      u.inactivity_days,
      u.created_date,
    ]);
    downloadCsv("inscriptions_confirmees", headers, rows);
  };

  if (loading) {
    return (
      <Card className="shadow-sm border border-border/60 mb-6">
        <CardContent className="p-10 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border border-border/60 mb-6">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-500" />
          <CardTitle className="text-base text-muted-foreground">Inscriptions & Inactivité</CardTitle>
        </div>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setTab("unverified")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${tab === "unverified" ? "bg-green-600 text-white border-green-600" : "bg-card text-muted-foreground border-border/60"}`}
            style={{ minHeight: "unset" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <UserX className="w-3.5 h-3.5" />
              Non confirmées <span className={tab === "unverified" ? "text-white/70" : "text-muted-foreground"}>{unverified.length}</span>
            </span>
          </button>
          <button
            onClick={() => setTab("inactive")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${tab === "inactive" ? "bg-green-600 text-white border-green-600" : "bg-card text-muted-foreground border-border/60"}`}
            style={{ minHeight: "unset" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" />
              Inscrits <span className={tab === "inactive" ? "text-white/70" : "text-muted-foreground"}>{verified.length}</span>
            </span>
          </button>
        </div>
        <SearchInput
          className="mt-3"
          placeholder="Rechercher un utilisateur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          desktopClassName="md:bg-card md:border md:rounded-md"
        />
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto divide-y divide-border/60">
          {tab === "unverified" ? (
            unverified.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">Aucune inscription en attente</div>
            ) : (
              <>
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/60 bg-muted/30">
                  <button
                    onClick={handleVerify}
                    disabled={verifying}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border/60 bg-card hover:bg-muted transition-colors disabled:opacity-60"
                    style={{ minHeight: "unset" }}
                  >
                    {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MailCheck className="w-3.5 h-3.5" />}
                    Vérifier les emails
                  </button>
                  <button
                    onClick={() => handleSendReminder(unverified.map((u) => u.email).filter(Boolean))}
                    disabled={sending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-60"
                    style={{ minHeight: "unset" }}
                  >
                    {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Relancer tous
                  </button>
                  <button
                    onClick={exportUnverified}
                    disabled={unverified.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border/60 bg-card hover:bg-muted transition-colors disabled:opacity-60"
                    style={{ minHeight: "unset" }}
                  >
                    <Download className="w-3.5 h-3.5 text-green-600" /> Exporter
                  </button>
                </div>
                {unverified.map((u) => {
                  const days = differenceInCalendarDays(new Date(), new Date(u.created_date));
                  const key = (u.email || '').toLowerCase();
                  const st = emailStatus[key];
                  const badge = st ? statusBadge(st.status) : null;
                  const sent = sentEmails[key];
                  return (
                    <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate text-sm">{u.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        {badge && (
                          <span className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${badge.cls}`}>
                            <badge.Icon className="w-3 h-3" /> {badge.label}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <p className="text-xs text-muted-foreground">Inscrit le {fmtDate(u.created_date)}</p>
                        <p className="text-xs font-medium text-amber-600">il y a {days} j</p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSendReminder([u.email])}
                            disabled={sending}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border border-border/60 hover:bg-muted transition-colors disabled:opacity-60"
                            style={{ minHeight: "unset" }}
                          >
                            {sent === true ? (
                              <><CheckCircle2 className="w-3 h-3 text-green-600" /><span className="text-green-600">Envoyé</span></>
                            ) : sent === 'error' ? (
                              <><AlertTriangle className="w-3 h-3 text-red-500" /><span className="text-red-600">Échec</span></>
                            ) : (
                              <><Send className="w-3 h-3" /> Relancer</>
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={deleting[u.id]}
                            title="Supprimer l'utilisateur"
                            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[11px] font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
                            style={{ minHeight: "unset" }}
                          >
                            {deleting[u.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )
          ) : verified.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">Aucun utilisateur vérifié</div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border/60 bg-muted/30">
                <button
                  onClick={() => handleSendReengagement(verified.map((u) => u.email).filter(Boolean))}
                  disabled={sendingReengage || verified.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-60"
                  style={{ minHeight: "unset" }}
                >
                  {sendingReengage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Inciter tous
                </button>
                <button
                  onClick={exportVerified}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border/60 bg-card hover:bg-muted transition-colors"
                  style={{ minHeight: "unset" }}
                >
                  <Download className="w-3.5 h-3.5 text-green-600" /> Exporter
                </button>
              </div>
              {verified.map((u) => {
                const key = (u.email || '').toLowerCase();
                const sent = reengageSent[key];
                return (
                <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-xs">
                      {(u.full_name?.charAt(0) || u.email?.charAt(0) || "?").toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate text-sm">{u.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      {u.last_activity ? `Actif le ${fmtDate(u.last_activity)}` : "Jamais actif"}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className={`text-xs font-medium ${inactivityColor(u.inactivity_days)}`}>
                        {inactivityLabel(u.inactivity_days)}
                      </p>
                      <button
                        onClick={() => handleSendReengagement([u.email])}
                        disabled={sendingReengage}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border border-border/60 hover:bg-muted transition-colors disabled:opacity-60"
                        style={{ minHeight: "unset" }}
                      >
                        {sent === true ? (
                          <><CheckCircle2 className="w-3 h-3 text-green-600" /><span className="text-green-600">Envoyé</span></>
                        ) : sent === 'error' ? (
                          <><AlertTriangle className="w-3 h-3 text-red-500" /><span className="text-red-600">Échec</span></>
                        ) : (
                          <><Send className="w-3 h-3" /> Inciter</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                );
              })}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}