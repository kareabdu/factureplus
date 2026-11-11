import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { UserPlus, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

export default function CreateAccountSection() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!email) return;
    setCreating(true);
    try {
      const cleanEmail = email.trim();
      // 1. Invite l'utilisateur — envoie un email unique pour définir son
      //    mot de passe ; l'adresse email est confirmée d'office (invitation admin).
      await base44.users.inviteUser(cleanEmail, role);
      // 2. Rattache l'utilisateur à l'équipe (le compte existe déjà via inviteUser)
      try {
        await base44.functions.invoke("teamInvite", { email: cleanEmail, role });
      } catch {}
      toast({ title: "Compte créé", description: `${cleanEmail} va recevoir un email pour définir son mot de passe.` });
      setEmail("");
    } catch (e) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mb-5">
      <div className="px-4 mb-1">
        <h2 className="text-sm font-bold text-gray-900">Créer un compte</h2>
        <p className="text-xs text-gray-400 mt-0.5">Invitez un utilisateur ; il reçoit un email pour définir son mot de passe.</p>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        <div className="relative">
          <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            type="email"
            placeholder="email@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="user">Utilisateur</SelectItem>
            <SelectItem value="admin">Administrateur</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleCreate} disabled={creating || !email} className="w-full bg-green-600 hover:bg-green-700">
          <UserPlus className="w-4 h-4 mr-2" /> {creating ? "Création..." : "Créer le compte"}
        </Button>
      </div>
    </div>
  );
}