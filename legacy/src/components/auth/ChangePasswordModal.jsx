import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

export default function ChangePasswordModal({ open, onClose, user }) {
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
    setShowCurrent(false);
    setShowNew(false);
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!current || !next || !confirm) {
      toast({ title: "Champs incomplets", description: "Veuillez remplir tous les champs.", variant: "destructive" });
      return;
    }
    if (next.length < 6) {
      toast({ title: "Mot de passe trop court", description: "6 caractères minimum.", variant: "destructive" });
      return;
    }
    if (next !== confirm) {
      toast({ title: "Confirmation différente", description: "Les deux mots de passe ne correspondent pas.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await base44.auth.changePassword({
        userId: user.id,
        currentPassword: current,
        newPassword: next,
      });
      toast({ title: "Mot de passe modifié", description: "Votre nouveau mot de passe est actif." });
      reset();
      onClose();
    } catch (err) {
      const status = err?.status;
      const msg =
        status === 401 ? "Le mot de passe actuel est incorrect." :
        status === 422 ? "Le nouveau mot de passe ne respecte pas les exigences." :
        status === 403 ? "Vous n'êtes pas autorisé à modifier ce mot de passe." :
        err?.message || "Échec du changement de mot de passe.";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Changer le mot de passe</DialogTitle>
          <DialogDescription>
            Renseignez votre mot de passe actuel puis choisissez-en un nouveau.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cp-current">Mot de passe actuel</Label>
            <div className="relative">
              <Input
                id="cp-current"
                type={showCurrent ? "text" : "password"}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
                style={{ minHeight: "unset", minWidth: "unset" }}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cp-new">Nouveau mot de passe</Label>
            <div className="relative">
              <Input
                id="cp-new"
                type={showNew ? "text" : "password"}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowNew((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
                style={{ minHeight: "unset", minWidth: "unset" }}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cp-confirm">Confirmer le nouveau</Label>
            <Input
              id="cp-confirm"
              type={showNew ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">
              {saving ? "Enregistrement..." : "Modifier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}