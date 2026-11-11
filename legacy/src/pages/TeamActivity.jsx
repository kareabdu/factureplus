import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Users, Activity } from "lucide-react";
import { base44 } from "@/api/base44Client";
import TeamPanel from "@/components/team/TeamPanel";
import ActivityPanel from "@/components/activity/ActivityPanel";

export default function TeamActivity() {
  const location = useLocation();
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState("team");

  useEffect(() => {
    base44.auth.me().then((u) => {
      setMe(u);
      const isOwner = u?.team_id === u?.id || u?.role === "admin";
      if (isOwner && location.pathname.endsWith("/Activity")) setTab("activity");
    }).catch(() => {});
  }, []);

  const isOwner = me?.team_id === me?.id || me?.role === "admin";
  const TABS = [
    { key: "team", label: "Équipe", icon: Users },
    ...(isOwner ? [{ key: "activity", label: "Activité", icon: Activity }] : []),
  ];

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-4">
      <div className="hidden md:block">
        <h1 className="font-heading text-3xl font-semibold text-foreground">Équipe{isOwner ? " & Activité" : ""}</h1>
        <p className="text-muted-foreground mt-1">
          {isOwner ? "Gérez vos collaborateurs et consultez le journal d'activité" : "Gérez vos collaborateurs"}
        </p>
      </div>

      <div className="flex gap-2 bg-muted rounded-xl p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "activity" && isOwner ? <ActivityPanel /> : <TeamPanel />}
    </div>
  );
}