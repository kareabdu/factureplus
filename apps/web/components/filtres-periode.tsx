"use client";

import {
  LIBELLES_PERIODES, periodePersonnalisee, periodePredefinie, PERIODES_PREDEFINIES, type CodePeriode, type Periode,
} from "@factureplus/core";

import { Champ } from "@/components/ui";

const CODES: CodePeriode[] = [...PERIODES_PREDEFINIES, "personnalisee"];

/** Périodes prédéfinies (pastilles) et période personnalisée (deux dates), comme sur mobile. */
export function FiltresPeriode({ periode, onChange, className = "" }: {
  periode: Periode; onChange: (p: Periode) => void; className?: string;
}) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div role="radiogroup" aria-label="Période" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {CODES.map((code) => {
          const choisi = periode.code === code;
          return (
            <button key={code} type="button" role="radio" aria-checked={choisi}
              onClick={() => onChange(code === "personnalisee" ? periodePersonnalisee(periode.debut, periode.fin) : periodePredefinie(code))}
              className={`h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-colors ${
                choisi ? "border-primary bg-primary text-on-primary" : "border-border bg-surface text-foreground hover:bg-surface-retrait"
              }`}>
              {LIBELLES_PERIODES[code]}
            </button>
          );
        })}
      </div>
      {periode.code === "personnalisee" && (
        <div className="flex flex-wrap items-end gap-3">
          <Champ libelle="Du" type="date" value={periode.debut} max={periode.fin}
            onChange={(e) => e.target.value && onChange(periodePersonnalisee(e.target.value, periode.fin))} />
          <Champ libelle="Au" type="date" value={periode.fin} min={periode.debut}
            onChange={(e) => e.target.value && onChange(periodePersonnalisee(periode.debut, e.target.value))} />
        </div>
      )}
    </div>
  );
}
