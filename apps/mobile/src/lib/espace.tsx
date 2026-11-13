import { EquipeProvider, SessionProvider, useEquipe, useSession } from '@factureplus/core/react';
import type { ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

/** Fournisseurs de session et d'équipe, branchés sur le client Supabase mobile. */
export function Fournisseurs({ children }: { children: ReactNode }) {
  return (
    <SessionProvider supabase={supabase}>
      <AvecEquipe>{children}</AvecEquipe>
    </SessionProvider>
  );
}

function AvecEquipe({ children }: { children: ReactNode }) {
  const { userId } = useSession();
  return <EquipeProvider supabase={supabase} userId={userId}>{children}</EquipeProvider>;
}

export { useEquipe, useSession };
