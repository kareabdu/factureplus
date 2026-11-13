import { formaterQuantite, LIBELLES_MOUVEMENT, listerMouvements, type TypeMouvement } from '@factureplus/core';
import { useDonnees } from '@factureplus/core/react';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ErreurChargement, LigneListe, Pastilles, Vide } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useEquipe } from '@/lib/espace';
import { supabase } from '@/lib/supabase';

export default function Mouvements() {
  const { equipeId } = useEquipe();
  const [type, setType] = useState<TypeMouvement | 'tous'>('tous');
  const { donnees, chargement, erreur, recharger } = useDonnees(
    () => listerMouvements(supabase, equipeId, { limite: 200, type: type === 'tous' ? undefined : type }),
    [equipeId, type],
  );

  return (
    <ThemedView style={{ flex: 1 }}>
      <FlatList
        data={donnees ?? []}
        keyExtractor={(m) => String(m.id)}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={recharger} />}
        ListHeaderComponent={
          <View style={{ gap: Spacing.two, marginBottom: Spacing.two }}>
            <Pastilles options={[{ code: 'tous', libelle: 'Tous' }, { code: 'entree', libelle: 'Entrées' }, { code: 'sortie', libelle: 'Sorties' }, { code: 'ajustement', libelle: 'Ajustements' }]}
              valeur={type} onChange={setType} />
            {erreur && <ErreurChargement message={erreur} reessayer={recharger} />}
          </View>
        }
        ListEmptyComponent={chargement ? undefined : <Vide icone="mouvements" titre="Aucun mouvement" />}
        renderItem={({ item: m }) => (
          <LigneListe
            titre={m.produits?.nom ?? 'Produit'}
            sousTitre={`${LIBELLES_MOUVEMENT[m.type]}${m.motif ? ` · ${m.motif}` : ''} · ${new Date(m.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}`}
            droite={`${m.variation > 0 ? '+' : ''}${formaterQuantite(m.variation)}`}
            sousDroite={<ThemedText type="small" themeColor="textSecondary">{m.reference ?? `→ ${formaterQuantite(m.quantite_apres)}`}</ThemedText>}
            onPress={() => router.push(`/produit/${m.produit_id}`)}
          />
        )}
      />
    </ThemedView>
  );
}
