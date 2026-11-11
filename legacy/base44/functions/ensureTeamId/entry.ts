import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

// Garantit que team_id est persisté sur l'utilisateur courant côté serveur.
// Remplace l'écriture client (updateMe) qui permettait à un utilisateur de
// fixer arbitrairement team_id et de rejoindre l'équipe d'un autre compte.
// Ne fixe team_id qu'à l'id de l'utilisateur lui-même (propriétaire solo),
// et uniquement si team_id est vide.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    if (user.team_id) {
      return Response.json({ ok: true, team_id: user.team_id, already: true });
    }

    await base44.asServiceRole.entities.User.update(user.id, { team_id: user.id });
    return Response.json({ ok: true, team_id: user.id, already: false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}