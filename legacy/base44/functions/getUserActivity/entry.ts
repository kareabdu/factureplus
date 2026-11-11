import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    // Service role pour bypasser le RLS par team_id — l'admin doit voir
    // l'activité de tous les utilisateurs, pas seulement ceux de son équipe.
    const [logs, invoices] = await Promise.all([
      base44.asServiceRole.entities.ActivityLog.list("-created_date", 2000),
      base44.asServiceRole.entities.Invoice.list("-created_date", 2000),
    ]);

    const map = {};
    const touch = (uid, date) => {
      if (!uid || !date) return;
      const ex = map[uid];
      if (!ex || new Date(date) > new Date(ex)) map[uid] = date;
    };
    for (const l of logs || []) touch(l.created_by_id, l.created_date);
    for (const i of invoices || []) touch(i.created_by_id, i.created_date);

    return Response.json({ activity: map });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}