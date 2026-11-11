import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function AcceptInvitation() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setErrorMsg("Lien d'invitation invalide.");
      return;
    }
    (async () => {
      try {
        await base44.functions.invoke("acceptTeamInvitation", { token });
        setState("success");
      } catch (e) {
        setState("error");
        setErrorMsg(e?.message || "Impossible d'accepter cette invitation.");
      }
    })();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
        {state === "loading" && (
          <>
            <Loader2 className="w-10 h-10 mx-auto text-green-600 animate-spin mb-4" />
            <h1 className="text-xl font-bold text-gray-900">Acceptation en cours…</h1>
            <p className="text-sm text-gray-500 mt-2">Vérification de votre invitation.</p>
          </>
        )}
        {state === "success" && (
          <>
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-600 mb-4" />
            <h1 className="text-xl font-bold text-gray-900">Bienvenue dans l'équipe !</h1>
            <p className="text-sm text-gray-500 mt-2">
              Vous faites désormais partie de l'équipe. Vos factures, devis et stock sont partagés.
            </p>
            <Link to="/app" className="inline-block mt-6 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl">
              Aller à l'application
            </Link>
          </>
        )}
        {state === "error" && (
          <>
            <XCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <h1 className="text-xl font-bold text-gray-900">Invitation impossible</h1>
            <p className="text-sm text-gray-500 mt-2">{errorMsg}</p>
            <Link to="/app" className="inline-block mt-6 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-xl">
              Retour à l'application
            </Link>
          </>
        )}
      </div>
    </div>
  );
}