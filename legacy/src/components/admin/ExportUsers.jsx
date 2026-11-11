import React from "react";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/exportCsv";

export default function ExportUsers({ users = [] }) {
  const handleExport = () => {
    const headers = [
      "Nom",
      "Email",
      "Rôle",
      "Statut abonnement",
      "Plan",
      "Date fin abonnement",
      "Date inscription",
      "ID",
    ];

    const rows = users.map((u) => [
      u.full_name,
      u.email,
      u.role,
      u.subscription_status,
      u.subscription_plan,
      u.subscription_end_date,
      u.created_date,
      u.id,
    ]);

    downloadCsv("utilisateurs", headers, rows);
  };

  return (
    <Card className="shadow-sm border border-border/60 mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Download className="w-4 h-4 text-green-600" />
          Exporter les utilisateurs
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Téléchargez la liste complète des utilisateurs au format CSV.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{users.length} utilisateur(s)</span>
          <Button onClick={handleExport} disabled={users.length === 0} className="bg-green-600 hover:bg-green-700">
            <Download className="w-4 h-4 mr-2" /> Exporter (CSV)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}