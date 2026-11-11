import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import SearchInput from "@/components/SearchInput";
import { Users, ShieldCheck, User, Search, Calendar, KeyRound, CheckCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SubscriptionRequests from "@/components/admin/SubscriptionRequests";
import SubscribersList from "@/components/admin/SubscribersList";
import UserInsights from "@/components/admin/UserInsights";
import ExportUsers from "@/components/admin/ExportUsers";
import UserExportButtons from "@/components/admin/UserExportButtons";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [sendingReset, setSendingReset] = useState({});
  const [sentReset, setSentReset] = useState({});
  const [deleting, setDeleting] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [me, userList] = await Promise.all([
      base44.auth.me(),
      base44.entities.User.list(),
    ]);
    setCurrentUser(me);
    setUsers(userList);
    setIsLoading(false);
  };

  const filtered = users.filter(u => {
    const s = searchTerm.toLowerCase();
    return (
      (u.full_name || "").toLowerCase().includes(s) ||
      (u.email || "").toLowerCase().includes(s) ||
      (u.role || "").toLowerCase().includes(s)
    );
  });

  const handleSendPasswordReset = async (u) => {
    setSendingReset(prev => ({ ...prev, [u.id]: true }));
    try {
      await base44.auth.resetPasswordRequest(u.email);
      setSentReset(prev => ({ ...prev, [u.id]: true }));
      setTimeout(() => setSentReset(prev => ({ ...prev, [u.id]: false })), 4000);
    } catch (e) {
      alert("Erreur lors de l'envoi : " + (e.message || e));
    }
    setSendingReset(prev => ({ ...prev, [u.id]: false }));
  };

  const handleDeleteUser = async (u) => {
    if (u.id === currentUser?.id) {
      alert("Vous ne pouvez pas supprimer votre propre compte.");
      return;
    }
    if (!window.confirm(`Supprimer définitivement le compte de ${u.full_name || u.email} ?`)) return;
    setDeleting(prev => ({ ...prev, [u.id]: true }));
    try {
      await base44.entities.User.delete(u.id);
      setUsers(prev => prev.filter(x => x.id !== u.id));
    } catch (e) {
      alert("Erreur lors de la suppression : " + (e.message || e));
    }
    setDeleting(prev => ({ ...prev, [u.id]: false }));
  };

  const adminCount = users.filter(u => u.role === "admin").length;
  const userCount = users.filter(u => u.role !== "admin").length;

  if (currentUser && currentUser.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Accès réservé aux administrateurs.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="font-heading text-3xl md:text-4xl font-semibold text-foreground mb-1">Dashboard Admin</h1>
          <p className="text-muted-foreground">Gestion et suivi des utilisateurs</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="shadow-sm border border-border/60">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-100">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{users.length}</p>
                <p className="text-sm text-muted-foreground">Utilisateurs total</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border border-border/60">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-100">
                <ShieldCheck className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{adminCount}</p>
                <p className="text-sm text-muted-foreground">Administrateurs</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border border-border/60">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-100">
                <User className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{userCount}</p>
                <p className="text-sm text-muted-foreground">Utilisateurs standard</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="mb-6 w-full justify-start">
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="subs">Abonnements</TabsTrigger>
            <TabsTrigger value="activity">Activité</TabsTrigger>
          </TabsList>

          {/* Onglet Utilisateurs */}
          <TabsContent value="users" className="space-y-6 mt-0">
            {!isLoading && <ExportUsers users={users} />}

            {/* Search */}
            <Card className="shadow-sm border border-border/60">
              <CardContent className="p-4">
                <SearchInput
                  placeholder="Rechercher un utilisateur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  desktopClassName="md:bg-card md:border md:rounded-md"
                />
              </CardContent>
            </Card>

            {/* User list */}
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
              </div>
            ) : (
              <Card className="shadow-sm border border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-muted-foreground">{filtered.length} utilisateur{filtered.length > 1 ? "s" : ""}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/60">
                    {filtered.map(u => (
                      <div key={u.id} className="px-4 py-3.5 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-semibold text-sm">
                              {(u.full_name?.charAt(0) || u.email?.charAt(0) || "?").toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{u.full_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                            {u.subscription_status === "active" && (
                              <p className="text-xs text-green-600 truncate">
                                Abonnement {u.subscription_plan === "annual" ? "Annuel" : "Mensuel"} — renouvellement le {u.subscription_end_date ? format(new Date(u.subscription_end_date), "dd/MM/yyyy") : "—"}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 mt-2">
                          {u.created_date && (
                            <span className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(u.created_date), "dd/MM/yyyy")}
                            </span>
                          )}
                          <UserExportButtons user={u} />
                          <button
                            onClick={() => handleSendPasswordReset(u)}
                            disabled={sendingReset[u.id] || sentReset[u.id]}
                            title="Envoyer un lien de réinitialisation de mot de passe"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-60"
                            style={{ minHeight: "unset" }}
                          >
                            {sentReset[u.id] ? (
                              <><CheckCircle className="w-3.5 h-3.5 text-green-500" /><span className="text-green-600">Envoyé</span></>
                            ) : (
                              <><KeyRound className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-muted-foreground">{sendingReset[u.id] ? "Envoi..." : "Reset MDP"}</span></>
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={deleting[u.id] || u.id === currentUser?.id}
                            title={u.id === currentUser?.id ? "Vous ne pouvez pas supprimer votre propre compte" : "Supprimer l'utilisateur"}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
                            style={{ minHeight: "unset" }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{deleting[u.id] ? "..." : "Supprimer"}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                    {filtered.length === 0 && (
                      <div className="py-10 text-center text-muted-foreground text-sm">Aucun utilisateur trouvé</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Onglet Abonnements */}
          <TabsContent value="subs" className="space-y-6 mt-0">
            {!isLoading && <SubscriptionRequests users={users} onActivated={loadData} />}
            {!isLoading && <SubscribersList users={users} />}
          </TabsContent>

          {/* Onglet Activité */}
          <TabsContent value="activity" className="space-y-6 mt-0">
            {!isLoading && <UserInsights />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}