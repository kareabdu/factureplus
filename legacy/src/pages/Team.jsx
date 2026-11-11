import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { UserPlus, Trash2, Crown, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { isTeamEnabled } from "@/lib/planLimits";

export default function Team() {
  const { toast } = useToast();
  const [me, setMe] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const userData = await base44.auth.me();
      if (!userData.team_id) {
        // team_id est attribué côté serveur uniquement (ensureTeamId) pour
        // empêcher un client de fixer un team_id arbitraire et de rejoindre
        // l'équipe d'un autre compte.
        const res = await base44.functions.invoke("ensureTeamId", {});
        userData.team_id = res?.data?.team_id || userData.id;
      }
      setMe(userData);
      const res = await base44.functions.invoke("teamMembers", {});
      setMembers(res.data.members || []);
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

  if (loading) return <div className="p-6 text-gray-500">Chargement…</div>;

  if (me && !isTeamEnabled(me)) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
          <Lock className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <h1 className="text-xl font-bold text-gray-900">Collaboration en équipe indisponible</h1>
          <p className="text-sm text-gray-500 mt-2">Le partage de documents entre membres n'est pas inclus dans votre plan Essentiel.</p>
          <Link to="/Subscription" className="inline-block mt-4 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-xl">Voir les plans</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Équipe</h1>
        <p className="text-gray-500 text-sm">
          Invitez des collaborateurs. Ils partagent vos factures, devis, articles et stock.
        </p>
      </div>

      {me?.team_id === me?.id || me?.role === "admin" ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
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
        <div className="bg-white rounded-2xl border border-gray-200 p-4 text-sm text-gray-500">
          Seul le propriétaire de l'équipe peut inviter des collaborateurs.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
              {(m.full_name || m.email || "U").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{m.full_name || m.email}</p>
              <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                <Mail className="w-3 h-3" /> {m.email}
              </p>
            </div>
            {m.id === (me.team_id || me.id) ? (
              <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1 flex-shrink-0">
                <Crown className="w-3 h-3" /> Propriétaire
              </span>
            ) : m.id === me.id ? (
              <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-full flex-shrink-0">
                Vous
              </span>
            ) : me?.team_id === me?.id || me?.role === "admin" ? (
              <button
                onClick={() => handleRevoke(m)}
                className="text-gray-400 hover:text-red-500 p-2 flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        ))}
        {members.length === 0 && (
          <div className="p-4 text-sm text-gray-500 text-center">Aucun membre.</div>
        )}
      </div>
    </div>
  );
}