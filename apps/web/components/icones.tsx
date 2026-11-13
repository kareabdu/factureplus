import type { SVGProps } from "react";

/** Icônes au trait (24 × 24) de FacturePlus. Couleur : currentColor. */

const TRACES = {
  accueil: (
    <>
      <rect x="3" y="3" width="7.5" height="9" rx="1.8" />
      <rect x="13.5" y="3" width="7.5" height="5" rx="1.8" />
      <rect x="13.5" y="11" width="7.5" height="10" rx="1.8" />
      <rect x="3" y="15" width="7.5" height="6" rx="1.8" />
    </>
  ),
  produits: (
    <>
      <path d="M12 3 3.5 7.5 12 12l8.5-4.5z" />
      <path d="M3.5 7.5v9L12 21l8.5-4.5v-9M12 12v9" />
    </>
  ),
  ventes: (
    <>
      <path d="M5.5 3h13v18l-2.6-1.6L13.3 21l-2.6-1.6L8.1 21l-2.6-1.6z" />
      <path d="M9 8h6M9 11.5h6M9 15h3.5" />
    </>
  ),
  achats: (
    <>
      <path d="M5.5 7.5h13l-1.1 12.1a1.6 1.6 0 0 1-1.6 1.4H8.2a1.6 1.6 0 0 1-1.6-1.4z" />
      <path d="M9 10V7a3 3 0 0 1 6 0v3" />
    </>
  ),
  mouvements: <path d="M7 4v16M7 4 3.5 7.5M7 4l3.5 3.5M17 20V4M17 20l-3.5-3.5M17 20l3.5-3.5" />,
  inventaire: (
    <>
      <rect x="4.5" y="3.5" width="15" height="17" rx="2" />
      <path d="M8.5 8.5l1.5 1.5 3-3M8.5 15l1.5 1.5 3-3M15 9h1.5M15 15.5h1.5" />
    </>
  ),
  clients: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20.5a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.4 6.4 0 0 1 3.5 6.3" />
    </>
  ),
  fournisseurs: (
    <>
      <path d="M2.5 6.5h11v10h-11zM13.5 10h4l3 3.5v3h-7" />
      <circle cx="6.5" cy="18" r="1.8" />
      <circle cx="17" cy="18" r="1.8" />
    </>
  ),
  categories: (
    <>
      <path d="M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8 8-9 9z" />
      <circle cx="8.5" cy="8.5" r="1.5" />
    </>
  ),
  reglages: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
    </>
  ),
  compte: (
    <>
      <circle cx="12" cy="8.5" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  deconnexion: (
    <>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="m9.5 8-4 4 4 4M5.5 12H15" />
    </>
  ),
  soleil: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  lune: <path d="M20 14.6A8.2 8.2 0 1 1 9.4 4a6.6 6.6 0 0 0 10.6 10.6z" />,
  ecran: (
    <>
      <rect x="3" y="4" width="18" height="12.5" rx="2" />
      <path d="M8.5 20.5h7M12 16.5v4" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  fermer: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  moins: <path d="M5 12h14" />,
  chercher: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.4-4.4" />
    </>
  ),
  alerte: (
    <>
      <path d="M12 3.5 2.5 20h19z" />
      <path d="M12 10v4.5M12 17.2v.1" />
    </>
  ),
  imprimer: (
    <>
      <path d="M6.5 9V3.5h11V9M6.5 17H4.5a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 4.5 9h15a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5h-2" />
      <path d="M6.5 14h11v6.5h-11z" />
    </>
  ),
  supprimer: <path d="M4 6.5h16M9.5 6.5V4h5v2.5M6.5 6.5l1 13.5h9l1-13.5M10 10.5v6M14 10.5v6" />,
  fleche: <path d="M5 12h14M13 6l6 6-6 6" />,
  depenses: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3 10h18M7 15h4" />
    </>
  ),
  abonnement: <path d="M3.5 8.5 7.5 12 12 5l4.5 7 4-3.5-1.8 10H5.3z" />,
  admin: (
    <>
      <path d="M12 3 4.5 6v5.5c0 4.4 3.1 8.2 7.5 9.5 4.4-1.3 7.5-5.1 7.5-9.5V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  telecharger: <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" />,
  recu: (
    <>
      <path d="M6 3.5h12v17l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8.5h6M9 12h6" />
    </>
  ),
} as const;

export type NomIcone = keyof typeof TRACES;

export function Icone({ nom, taille = 20, ...props }: SVGProps<SVGSVGElement> & { nom: NomIcone; taille?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={taille} height={taille} fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {TRACES[nom]}
    </svg>
  );
}
