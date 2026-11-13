import { formaterMontant, lireMontant, type Ton } from "@factureplus/core";
import Link from "next/link";
import {
  useState, type ButtonHTMLAttributes, type ComponentProps, type InputHTMLAttributes, type ReactNode,
  type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from "react";

import { Icone, type NomIcone } from "@/components/icones";

/** Composants d'interface communs (couleurs : globals.css). */

/** Logo : carton étiqueté sur fond vert (même dessin que l'icône mobile). */
export function Monogramme({ taille = 32 }: { taille?: number }) {
  return (
    <svg viewBox="0 0 36 36" width={taille} height={taille} aria-hidden="true">
      <rect width="36" height="36" rx="10" fill="#147A2E" />
      <rect x="9.3" y="12.3" width="17.4" height="13.4" rx="1.8" fill="none" stroke="#fff" strokeWidth="2.6" />
      <rect x="10.4" y="10.5" width="15.2" height="5" rx="1.2" fill="#fff" />
      <rect x="13" y="19.6" width="10" height="2.8" rx="1.4" fill="#9BE3AE" />
    </svg>
  );
}

export function Logo({ className = "", inverse = false }: { className?: string; inverse?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-semibold tracking-tight ${className}`}>
      <Monogramme />
      <span className={`text-lg ${inverse ? "text-panneau-texte" : "text-foreground"}`}>
        Stock<span className={inverse ? "text-accent" : "text-primary"}>Tracker</span>
      </span>
    </span>
  );
}

type Variante = "primaire" | "secondaire" | "danger" | "discret";

const variantes: Record<Variante, string> = {
  primaire: "bg-primary text-on-primary shadow-sm hover:bg-primary-hover",
  secondaire: "border border-border bg-surface text-foreground hover:bg-surface-retrait",
  danger: "border border-danger/30 bg-surface text-danger hover:bg-danger-soft",
  discret: "text-muted hover:bg-surface-retrait hover:text-foreground",
};

const baseBouton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function Bouton({ variante = "primaire", chargement = false, icone, className = "", children, disabled, type = "button", ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; chargement?: boolean; icone?: NomIcone }) {
  return (
    <button {...props} type={type} disabled={disabled || chargement}
      className={`${baseBouton} disabled:cursor-not-allowed disabled:opacity-55 ${variantes[variante]} ${className}`}>
      {chargement ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        : icone && <Icone nom={icone} taille={17} />}
      {children}
    </button>
  );
}

export function LienBouton({ variante = "primaire", icone, className = "", children, ...props }:
  ComponentProps<typeof Link> & { variante?: Variante; icone?: NomIcone }) {
  return (
    <Link {...props} className={`${baseBouton} ${variantes[variante]} ${className}`}>
      {icone && <Icone nom={icone} taille={17} />}
      {children}
    </Link>
  );
}

const styleChamp =
  "h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:bg-surface-retrait disabled:text-muted";

function Etiquette({ libelle, requis, aide, className = "", children }: {
  libelle: string; requis?: boolean; aide?: string; className?: string; children: ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-sm font-medium">{libelle}{requis && <span className="text-danger"> *</span>}</span>
      {children}
      {aide && <span className="text-xs text-muted">{aide}</span>}
    </label>
  );
}

export function Champ({ libelle, aide, className = "", ...props }: InputHTMLAttributes<HTMLInputElement> & { libelle: string; aide?: string }) {
  return <Etiquette libelle={libelle} requis={props.required} aide={aide} className={className}><input {...props} className={styleChamp} /></Etiquette>;
}

export function Zone({ libelle, aide, className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { libelle: string; aide?: string }) {
  return (
    <Etiquette libelle={libelle} aide={aide} className={className}>
      <textarea rows={3} {...props} className={`${styleChamp} h-auto py-2`} />
    </Etiquette>
  );
}

/** Montant entier saisi librement (« 15 000 »). */
export function ChampMontant({ libelle, valeur, onChange, symbole, aide, className = "", requis }: {
  libelle: string; valeur: number | null; onChange: (v: number | null) => void; symbole?: string; aide?: string; className?: string; requis?: boolean;
}) {
  const [texte, setTexte] = useState(valeur == null ? "" : formaterMontant(valeur, null));
  return (
    <Champ libelle={symbole ? `${libelle} (${symbole})` : libelle} aide={aide} className={className} required={requis}
      inputMode="numeric" value={texte} placeholder="0" onFocus={(e) => e.target.select()}
      onChange={(e) => { setTexte(e.target.value); onChange(e.target.value.trim() ? lireMontant(e.target.value) : null); }}
      onBlur={() => { const v = lireMontant(texte); if (v != null) setTexte(formaterMontant(v, null)); }} />
  );
}

export function Liste({ libelle, children, className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement> & { libelle?: string }) {
  const select = <select {...props} className={`${styleChamp} pr-8 ${libelle ? "" : className}`}>{children}</select>;
  if (!libelle) return select;
  return <Etiquette libelle={libelle} requis={props.required} className={className}>{select}</Etiquette>;
}

export function Case({ libelle, aide, ...props }: InputHTMLAttributes<HTMLInputElement> & { libelle: string; aide?: string }) {
  return (
    <label className="flex items-start gap-3 text-sm">
      <input type="checkbox" {...props} className="mt-0.5 size-4 accent-[var(--primary)]" />
      <span><span className="font-medium">{libelle}</span>{aide && <span className="block text-xs text-muted">{aide}</span>}</span>
    </label>
  );
}

export function Recherche({ valeur, onChange, placeholder = "Rechercher…", className = "" }: {
  valeur: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  return (
    <label className={`relative block ${className}`}>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted"><Icone nom="chercher" taille={17} /></span>
      <input type="search" value={valeur} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
        className={`${styleChamp} pl-9`} />
    </label>
  );
}

export function Carte({ titre, action, children, className = "", sansMarge = false }: {
  titre?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; sansMarge?: boolean;
}) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-border bg-surface shadow-carte ${className}`}>
      {(titre || action) && (
        <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
          <h2 className="font-semibold tracking-tight">{titre}</h2>
          {action}
        </header>
      )}
      <div className={sansMarge ? "" : "p-5"}>{children}</div>
    </section>
  );
}

export function Alerte({ type = "erreur", children }: { type?: "erreur" | "succes" | "info" | "attention"; children: ReactNode }) {
  const styles = {
    erreur: "border-danger/25 bg-danger-soft text-danger",
    succes: "border-primary/25 bg-primary-soft text-primary",
    info: "border-border bg-surface-retrait text-muted",
    attention: "border-warning/30 bg-warning-soft text-warning",
  };
  return <div role={type === "erreur" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${styles[type]}`}>{children}</div>;
}

const tonsBadge: Record<Ton, string> = {
  neutre: "bg-surface-retrait text-muted ring-border",
  info: "bg-info-soft text-info ring-info/20",
  succes: "bg-primary-soft text-primary ring-primary/20",
  attention: "bg-warning-soft text-warning ring-warning/25",
  danger: "bg-danger-soft text-danger ring-danger/20",
};

export function Badge({ children, ton = "neutre" }: { children: ReactNode; ton?: Ton }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tonsBadge[ton]}`}>{children}</span>;
}

export function Chargement({ texte = "Chargement…" }: { texte?: string }) {
  return (
    <div className="flex flex-1 items-center justify-center gap-3 p-10 text-sm text-muted">
      <span className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      {texte}
    </div>
  );
}

export function EnTetePage({ titre, description, action, retour }: { titre: string; description?: ReactNode; action?: ReactNode; retour?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {retour && <Link href={retour} className="mb-1 inline-block text-sm text-muted hover:text-foreground">← Retour</Link>}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{titre}</h1>
        {description && <div className="mt-1 text-sm text-muted">{description}</div>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

export function Indicateur({ libelle, valeur, detail, ton, href }: {
  libelle: string; valeur: ReactNode; detail?: ReactNode; ton?: "danger" | "attention" | "succes"; href?: string;
}) {
  const couleur = ton ? { danger: "text-danger", attention: "text-warning", succes: "text-primary" }[ton] : "";
  const contenu = (
    <>
      <p className="text-sm text-muted">{libelle}</p>
      <p className={`chiffre montant mt-1.5 text-xl font-semibold sm:text-2xl ${couleur}`}>{valeur}</p>
      {detail && <p className="mt-1 text-xs text-muted">{detail}</p>}
    </>
  );
  const classe = "rounded-2xl border border-border bg-surface p-4 shadow-carte sm:p-5";
  return href ? <Link href={href} className={`${classe} transition-colors hover:border-primary/40`}>{contenu}</Link> : <div className={classe}>{contenu}</div>;
}

export function Segments<T extends string>({ options, valeur, onChange, libelle }: {
  options: { valeur: T; libelle: ReactNode }[]; valeur: T; onChange: (v: T) => void; libelle?: string;
}) {
  return (
    <div role="radiogroup" aria-label={libelle} className="inline-flex flex-wrap gap-1 rounded-xl border border-border bg-surface-retrait p-1">
      {options.map((o) => (
        <button key={o.valeur} type="button" role="radio" aria-checked={valeur === o.valeur} onClick={() => onChange(o.valeur)}
          className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3.5 text-sm font-medium transition-colors ${
            valeur === o.valeur ? "bg-surface text-foreground shadow-sm ring-1 ring-border" : "text-muted hover:text-foreground"}`}>
          {o.libelle}
        </button>
      ))}
    </div>
  );
}

/** Tableau responsive (défilement horizontal sur petit écran). */
export function Tableau({ entetes, children, vide }: { entetes: { libelle: string; droite?: boolean; className?: string }[]; children: ReactNode; vide?: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-retrait text-left text-xs uppercase tracking-wide text-muted">
            {entetes.map((e) => <th key={e.libelle} className={`px-4 py-2.5 font-medium ${e.droite ? "text-right" : ""} ${e.className ?? ""}`}>{e.libelle}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
      {vide}
    </div>
  );
}

export function Vide({ icone, titre, texte, action }: { icone: NomIcone; titre: string; texte?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="mb-1 grid size-14 place-items-center rounded-full bg-primary-soft text-primary"><Icone nom={icone} taille={26} /></span>
      <p className="font-medium">{titre}</p>
      {texte && <p className="max-w-sm text-sm text-muted">{texte}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Ligne libellé / valeur */
export function Info({ libelle, valeur, fort = false }: { libelle: string; valeur: ReactNode; fort?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1 text-sm">
      <span className="text-muted">{libelle}</span>
      <span className={`montant text-right ${fort ? "text-base font-semibold" : ""}`}>{valeur}</span>
    </div>
  );
}

/** Fenêtre modale simple (dialog natif). */
export function Modale({ ouverte, titre, onFermer, children }: { ouverte: boolean; titre: string; onFermer: () => void; children: ReactNode }) {
  if (!ouverte) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onFermer} role="presentation">
      <div role="dialog" aria-modal="true" aria-label={titre} onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-surface p-6 shadow-carte sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight">{titre}</h2>
          <button type="button" onClick={onFermer} aria-label="Fermer" className="rounded-lg p-1 text-muted hover:bg-surface-retrait hover:text-foreground">
            <Icone nom="fermer" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
