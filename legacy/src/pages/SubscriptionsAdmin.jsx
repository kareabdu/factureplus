import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Crown, Clock, RefreshCw, UserCheck, UserX, AlertCircle } from "lucide-react";

const statusConfig = {
  trial: { label: "Essai", color: "bg-yellow-100 text-yellow-800" },
  pending: { label: "En attente", color: "bg-amber-100 text-amber-800" },
  active: { label: "Actif", color: "bg-green-100 text-green-800" },
  expired: { label: "Expiré", color: "bg-red-100 text-red-800" },
  none: { label: "Aucun", color: "bg-gray-100 text-gray-800" },
};

const planLabels = {
  monthly: "Mensuel",
  annual: "Annuel",
  none: "—",
};

export default function SubscriptionsAdmin() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    const all = await base44.entities.User.list();
    setUsers(all.filter(u => u.role === "user"));
    setIsLoading(false);
  };

  // Toute écriture d'abonnement passe par la fonction backend admin-only
  // setSubscription (asServiceRole) : plus aucun updateMe / User.update côté
  // client sur les champs d'abonnement.
  const applySubscription = async (userId, status, plan, endDate) => {
    const res = await base44.functions.invoke("setSubscription", {
      user_id: userId,
      status,
      plan,
      end_date: endDate,
    });
    const data = res?.data || res || {};
    setUsers(prev => prev.map(u => u.id === userId ? {
      ...u,
      subscription_status: data.subscription_status || status,
      subscription_plan: data.subscription_plan || plan,
      subscription_end_date: data.subscription_end_date ?? endDate,
    } : u));
  };

  const approveRequest = async (user) => {
    const end = new Date();
    const plan = user.subscription_plan === "annual" ? "annual" : "monthly";
    if (plan === "monthly") end.setMonth(end.getMonth() + 1);
    else end.setFullYear(end.getFullYear() + 1);
    await applySubscription(user.id, "active", plan, end.toISOString());
  };

  const rejectRequest = async (userId) => {
    await applySubscription(userId, "none", "none", null);
  };

  const activatePlan = async (user, plan) => {
    const end = new Date();
    if (plan === "monthly") end.setMonth(end.getMonth() + 1);
    else end.setFullYear(end.getFullYear() + 1);
    await applySubscription(user.id, "active", plan, end.toISOString());
  };

  const deactivateUser = async (userId) => {
    await applySubscription(userId, "expired", "none", null);
  };

  const pendingUsers = users.filter(u => u.subscription_status === "pending");
  const otherUsers = users.filter(u => u.subscription_status !== "pending");

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="font-heading text-3xl font-semibold text-foreground mb-2">Gestion des abonnements</h1>
            <p className="text-muted-foreground">{users.length} utilisateur{users.length > 1 ? "s" : ""}{pendingUsers.length > 0 && ` — ${pendingUsers.length} demande${pendingUsers.length > 1 ? "s" : ""} en attente`}</p>
          </div>
          <Button variant="outline" onClick={loadUsers} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          </div>
        ) : (
          <>
            {/* Pending requests */}
            {pendingUsers.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  Demandes en attente d'approbation
                </h2>
                <div className="space-y-3">
                  {pendingUsers.map(user => (
                    <Card key={user.id} className="shadow-sm border-amber-200 border-2">
                      <CardContent className="p-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold">
                                {(user.full_name || user.email || "?").charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{user.full_name || "Sans nom"}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={statusConfig.pending.color}>
                                  {statusConfig.pending.label}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  <Crown className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
                                  Plan {planLabels[user.subscription_plan]}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => approveRequest(user)}
                              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow"
                            >
                              <UserCheck className="w-4 h-4 mr-2" /> Approuver
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => rejectRequest(user.id)}
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <UserX className="w-4 h-4 mr-2" /> Refuser
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* All users */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">Tous les utilisateurs</h2>
              {otherUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">Aucun autre utilisateur</p>
              ) : (
                <div className="space-y-3">
                  {otherUsers.map(user => (
                    <Card key={user.id} className="shadow-sm border hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold">
                                {(user.full_name || user.email || "?").charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{user.full_name || "Sans nom"}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge className={statusConfig[user.subscription_status]?.color || "bg-gray-100"}>
                              {statusConfig[user.subscription_status]?.label || "Aucun"}
                            </Badge>

                            {user.subscription_plan && user.subscription_plan !== "none" && (
                              <span className="text-sm text-muted-foreground">
                                <Crown className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
                                {planLabels[user.subscription_plan]}
                              </span>
                            )}

                            {user.trial_end_date && user.subscription_status === "trial" && (
                              <span className="text-xs text-yellow-600 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Fin : {new Date(user.trial_end_date).toLocaleDateString("fr-FR")}
                              </span>
                            )}

                            {user.subscription_end_date && user.subscription_status === "active" && (
                              <span className="text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Expire : {new Date(user.subscription_end_date).toLocaleDateString("fr-FR")}
                              </span>
                            )}

                            <div className="flex gap-2 ml-2">
                              <Select onValueChange={(plan) => activatePlan(user, plan)}>
                                <SelectTrigger className="h-8 text-xs w-32">
                                  <SelectValue placeholder="Activer plan" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="monthly">Mensuel</SelectItem>
                                  <SelectItem value="annual">Annuel</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => deactivateUser(user.id)}
                              >
                                <XCircle className="w-3.5 h-3.5 mr-1" /> Désactiver
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}