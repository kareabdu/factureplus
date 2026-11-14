import {
  formaterMontant, formaterQuantite, lireMontant, lireQuantite, listerArticlesLibres, listerProduits, totalLigne, type ArticleLibre, type Produit,
} from '@factureplus/core';
import { useDonnees } from '@factureplus/core/react';
import { Stack } from 'expo-router';
import { useDeferredValue, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Icone } from '@/components/icone';
import { ThemedText } from '@/components/themed-text';
import { Alerte, Bouton, Ecran } from '@/components/ui';
import { Rayons, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useEquipe } from '@/lib/espace';
import { abandonner, lireLigneInitiale, repondre, scannerCode } from '@/lib/selection';
import { supabase } from '@/lib/supabase';

/** Saisie d'une ligne : produit du catalogue ou désignation libre, prix, quantité, unité. */
export default function Article() {
  const { equipeId, parametres } = useEquipe();
  const theme = useTheme();
  const symbole = parametres?.symbole_devise ?? 'FCFA';
  const [{ ligne: initiale, controleStock }] = useState(lireLigneInitiale);

  const [designation, setDesignation] = useState(initiale?.designation ?? '');
  const [produitId, setProduitId] = useState<string | null>(initiale?.produit_id ?? null);
  const [stock, setStock] = useState<number | undefined>(initiale?.stock);
  const [prix, setPrix] = useState(initiale ? String(initiale.prix_unitaire) : '');
  const [quantite, setQuantite] = useState(initiale ? formaterQuantite(initiale.quantite) : '');
  const [unite, setUnite] = useState(initiale?.unite ?? parametres?.unite_defaut ?? 'Pcs');
  const [taxable, setTaxable] = useState(initiale?.taxable ?? true);
  const [ouvert, setOuvert] = useState(!initiale);
  const [erreur, setErreur] = useState<string | null>(null);
  const repondu = useRef(false);

  const recherche = useDeferredValue(produitId ? '' : designation);
  const { donnees: suggestions } = useDonnees(
    () => (ouvert
      ? Promise.all([listerProduits(supabase, equipeId, { recherche }), listerArticlesLibres(supabase, equipeId, recherche, 20)])
      : Promise.resolve([[], []] as [Produit[], ArticleLibre[]])),
    [equipeId, recherche, ouvert],
  );
  const [produits, articlesLibres] = suggestions ?? [[], []];
  // Un article libre identique à la saisie n'est pas reproposé
  const articles = articlesLibres.filter((a) => a.designation.toLowerCase() !== designation.trim().toLowerCase());

  // Fermeture par geste ou retour : l'éditeur ne reçoit rien
  useEffect(() => () => { if (!repondu.current) abandonner('article'); }, []);

  const prixUnitaire = lireMontant(prix) ?? 0;
  const qte = lireQuantite(quantite) ?? 0;
  const total = totalLigne({ prix_unitaire: prixUnitaire, quantite: qte });

  function choisir(p: Produit) {
    setProduitId(p.id);
    setDesignation(p.nom);
    setPrix(String(p.prix_vente));
    setUnite(p.unite);
    setStock(p.quantite);
    setTaxable(true);
    if (!quantite) setQuantite('1');
    setOuvert(false);
  }

  /** Article déjà saisi librement : désignation, dernier prix, unité et taxe repris. */
  function reprendre(a: ArticleLibre) {
    setProduitId(null);
    setDesignation(a.designation);
    setPrix(String(a.prix_unitaire));
    if (a.unite) setUnite(a.unite);
    setTaxable(a.taxable);
    setStock(undefined);
    if (!quantite) setQuantite('1');
    setOuvert(false);
  }

  async function scanner() {
    const code = await scannerCode('Scanner le produit');
    if (!code) return;
    const p = (await listerProduits(supabase, equipeId, { recherche: code })).find((x) => x.code_barres === code);
    if (p) choisir(p);
    else setErreur(`Aucun produit avec le code ${code}.`);
  }

  function valider() {
    if (!designation.trim()) return setErreur('Choisissez un produit ou saisissez une désignation.');
    if (!(qte > 0)) return setErreur('Saisissez une quantité.');
    if (lireMontant(prix) == null && prix.trim()) return setErreur('Prix invalide.');
    repondu.current = true;
    repondre('article', {
      action: 'enregistrer',
      ligne: { produit_id: produitId, designation: designation.trim(), unite: unite.trim() || null, prix_unitaire: prixUnitaire,
        quantite: qte, taxable, stock },
    });
  }

  function supprimer() {
    repondu.current = true;
    repondre('article', { action: 'supprimer' });
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Article' }} />
      <Ecran enTete>
        {erreur && <Alerte>{erreur}</Alerte>}
        <Bloc>
          <View style={styles.zoneRecherche}>
            <View style={[styles.combo, { borderColor: ouvert ? theme.text : theme.border, backgroundColor: theme.backgroundElement }]}>
              <TextInput
                value={designation}
                onChangeText={(t) => { setDesignation(t); setProduitId(null); setStock(undefined); setOuvert(true); }}
                onFocus={() => setOuvert(true)}
                placeholder="Article, produit, service…"
                placeholderTextColor={theme.textSecondary}
                accessibilityLabel="Article"
                style={[styles.comboTexte, { color: theme.text }]}
              />
              {!!designation && (
                <Pressable hitSlop={10} accessibilityLabel="Effacer" onPress={() => { setDesignation(''); setProduitId(null); setStock(undefined); setOuvert(true); }}>
                  <Icone nom="fermer" taille={18} couleur={theme.textSecondary} />
                </Pressable>
              )}
              <Pressable hitSlop={10} accessibilityLabel="Scanner un code-barres" onPress={scanner}>
                <Icone nom="scanner" taille={20} couleur={theme.textSecondary} />
              </Pressable>
              <Pressable hitSlop={10} accessibilityLabel={ouvert ? 'Fermer la liste' : 'Afficher les produits'} onPress={() => setOuvert((o) => !o)}>
                <Icone nom={ouvert ? 'haut' : 'bas'} taille={18} couleur={theme.textSecondary} />
              </Pressable>
            </View>
            {ouvert && produits.length + articles.length > 0 && (
              <View style={[styles.liste, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={{ maxHeight: 320 }}>
                  {produits.slice(0, 30).map((p) => (
                    <Pressable key={p.id} onPress={() => choisir(p)} accessibilityRole="button"
                      style={({ pressed }) => [styles.suggestion, { backgroundColor: pressed ? theme.backgroundSelected : 'transparent' }]}>
                      <ThemedText style={{ fontSize: 17 }} numberOfLines={1}>{p.nom}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {formaterMontant(p.prix_vente, symbole)} · Stock total : {formaterQuantite(p.quantite)}
                      </ThemedText>
                    </Pressable>
                  ))}
                  {articles.length > 0 && (
                    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.entete}>Articles déjà saisis</ThemedText>
                  )}
                  {articles.map((a) => (
                    <Pressable key={a.designation} onPress={() => reprendre(a)} accessibilityRole="button"
                      style={({ pressed }) => [styles.suggestion, { backgroundColor: pressed ? theme.backgroundSelected : 'transparent' }]}>
                      <ThemedText style={{ fontSize: 17 }} numberOfLines={1}>{a.designation}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {formaterMontant(a.prix_unitaire, symbole)}{a.unite ? ` / ${a.unite}` : ''} · hors catalogue
                      </ThemedText>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <Champ libelle="Prix unitaire">
            <TextInput value={prix} onChangeText={setPrix} keyboardType="number-pad" placeholder="" selectTextOnFocus
              accessibilityLabel="Prix unitaire" style={[styles.valeur, { color: theme.text }]} />
            <ThemedText themeColor="textSecondary" style={{ fontSize: 16 }}>{symbole}</ThemedText>
          </Champ>
          <Champ libelle="Quantité">
            <TextInput value={quantite} onChangeText={setQuantite} keyboardType="decimal-pad" placeholder="0" selectTextOnFocus
              placeholderTextColor={theme.textSecondary} accessibilityLabel="Quantité" style={[styles.valeur, { color: theme.text }]} />
          </Champ>
          <Champ libelle="Unité" dernier>
            <TextInput value={unite} onChangeText={setUnite} accessibilityLabel="Unité"
              style={[styles.valeur, { color: theme.text, fontWeight: '400' }]} />
          </Champ>
        </Bloc>

        {controleStock && stock !== undefined && qte > stock && (
          <Alerte type="attention">Stock disponible : {formaterQuantite(stock)} {unite}. La validation de la facture sera refusée au-delà.</Alerte>
        )}

        <Bloc>
          <View style={styles.total}>
            <ThemedText style={styles.totalTexte}>Total</ThemedText>
            <ThemedText style={styles.totalTexte}>{formaterMontant(total, symbole)}</ThemedText>
          </View>
        </Bloc>

        <Bouton titre={initiale ? 'Enregistrer' : 'Ajouter'} onPress={valider} />
        {initiale && <Bouton titre="Supprimer l'article" icone="supprimer" variante="danger" onPress={supprimer} />}
      </Ecran>
    </>
  );
}

function Bloc({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <View style={[styles.bloc, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>{children}</View>;
}

function Champ({ libelle, children, dernier }: { libelle: string; children: ReactNode; dernier?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.champ, !dernier && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
      { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
      <ThemedText style={{ fontSize: 18, flex: 1 }}>{libelle}</ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: { borderRadius: Rayons.grand + 4, borderWidth: 1, overflow: 'visible' },
  zoneRecherche: { padding: Spacing.three, zIndex: 10 },
  combo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderWidth: 1.5, borderRadius: Rayons.grand + 4,
    paddingHorizontal: Spacing.three, minHeight: 52 },
  comboTexte: { flex: 1, fontSize: 18, paddingVertical: Spacing.two },
  liste: { marginTop: Spacing.one, borderRadius: Rayons.moyen + 2, borderWidth: 1, overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)' },
  suggestion: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + Spacing.one, gap: 2 },
  entete: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three, paddingBottom: Spacing.one, textTransform: 'uppercase', fontSize: 12 },
  champ: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three + Spacing.one, minHeight: 64 },
  valeur: { minWidth: 80, textAlign: 'right', fontSize: 20, fontWeight: '600', paddingVertical: Spacing.two },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.three + Spacing.one },
  totalTexte: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
});
