import { formaterMontant, lireMontant, lireQuantite, type Ton } from '@stocktracker/core';
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

import { Icone, type NomIcone } from '@/components/icone';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Rayons, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// ---------------------------------------------------------------------------
// Écrans
// ---------------------------------------------------------------------------

/**
 * Écran défilant, sûr vis-à-vis du clavier et des encoches.
 * `enTete` : l'écran est sous un en-tête natif (pile) → pas de marge haute.
 */
export function Ecran({
  children,
  enTete = false,
  onglets = false,
  rafraichir,
  pied,
}: {
  children: ReactNode;
  enTete?: boolean;
  onglets?: boolean;
  /** Tirer pour rafraîchir */
  rafraichir?: () => Promise<unknown>;
  /** Barre d'actions fixe en bas */
  pied?: ReactNode;
}) {
  const [enCours, setEnCours] = useState(false);
  // Position réelle de la zone à l'écran : selon la version d'iOS, l'en-tête natif est au-dessus
  // du contenu ou le recouvre (effet translucide). Une valeur fixe laissait un vide sous le clavier.
  const zone = useRef<ComponentRef<typeof View>>(null);
  const [decalage, setDecalage] = useState(0);
  const bords: Edge[] = [];
  if (!enTete) bords.push('top');
  if (!onglets && !pied) bords.push('bottom');
  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={bords}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? decalage : 0}>
          <View ref={zone} style={styles.flex}
            onLayout={() => zone.current?.measureInWindow((_x: number, y: number) => setDecalage((d) => (Math.abs(d - y) > 1 ? y : d)))}>
          <ScrollView
            contentContainerStyle={styles.contenu}
            keyboardShouldPersistTaps="handled"
            contentInsetAdjustmentBehavior="automatic"
            refreshControl={rafraichir ? (
              <RefreshControl refreshing={enCours} onRefresh={() => {
                setEnCours(true);
                rafraichir().finally(() => setEnCours(false));
              }} />
            ) : undefined}>
            {children}
          </ScrollView>
          </View>
          {pied && <PiedActions>{pied}</PiedActions>}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

/** Vrai quand le clavier est affiché (iOS : dès le début de l'animation). */
export function useClavierVisible(): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const apparition = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const disparition = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const a = Keyboard.addListener(apparition, () => setVisible(true));
    const b = Keyboard.addListener(disparition, () => setVisible(false));
    return () => { a.remove(); b.remove(); };
  }, []);
  return visible;
}

function PiedActions({ children }: { children: ReactNode }) {
  const theme = useTheme();
  // Clavier ouvert : la barre se colle au clavier, sans la marge de la barre d'accueil de l'iPhone
  const clavier = useClavierVisible();
  return (
    <SafeAreaView edges={clavier ? [] : ['bottom']} style={[styles.pied, { backgroundColor: theme.backgroundElement, borderTopColor: theme.border }]}>
      <View style={styles.piedContenu}>{children}</View>
    </SafeAreaView>
  );
}

export function ChargementPlein() {
  const theme = useTheme();
  return (
    <ThemedView style={[styles.flex, styles.centre]}>
      <ActivityIndicator color={theme.primary} size="large" />
    </ThemedView>
  );
}

/** Erreur de chargement avec bouton « Réessayer ». */
export function ErreurChargement({ message, reessayer }: { message: string; reessayer: () => void }) {
  return (
    <View style={{ gap: Spacing.three }}>
      <Alerte>{message}</Alerte>
      <Bouton titre="Réessayer" variante="secondaire" onPress={reessayer} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Marque
// ---------------------------------------------------------------------------

/** Logo StockTracker : un carton stylisé sur fond vert (même dessin que l'icône d'application). */
export function Monogramme({ taille = 36 }: { taille?: number }) {
  const k = taille / 36;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ width: taille, height: taille, borderRadius: 10 * k, backgroundColor: '#147A2E', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 20 * k, height: 16 * k, borderRadius: 3 * k, borderWidth: 2.6 * k, borderColor: '#FFFFFF', marginTop: 6 * k }}>
        {/* Rabat */}
        <View style={{ position: 'absolute', left: 2.4 * k, right: 2.4 * k, top: -2.6 * k, height: 5 * k, backgroundColor: '#FFFFFF', borderRadius: 1.2 * k }} />
        {/* Étiquette */}
        <View style={{ position: 'absolute', left: 2.4 * k, right: 2.4 * k, top: 7.6 * k, height: 2.8 * k, backgroundColor: '#9BE3AE', borderRadius: 1.4 * k }} />
      </View>
    </View>
  );
}

export function Logo({ taille = 36 }: { taille?: number }) {
  const theme = useTheme();
  const t = { fontSize: taille * 0.6, lineHeight: taille, fontWeight: 700 as const };
  return (
    <View style={styles.logo} accessibilityRole="header" accessibilityLabel="StockTracker">
      <Monogramme taille={taille} />
      <ThemedText style={[t, { color: theme.text }]}>
        Stock<ThemedText style={[t, { color: theme.primary }]}>Tracker</ThemedText>
      </ThemedText>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Textes et blocs
// ---------------------------------------------------------------------------

export function Titre({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <View style={styles.titreLigne}>
      <ThemedText type="subtitle" style={styles.flex}>{children}</ThemedText>
      {action}
    </View>
  );
}

export function Section({ titre, action, children }: { titre: string; action?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ gap: Spacing.two }}>
      <View style={styles.titreLigne}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={[styles.flex, { textTransform: 'uppercase', letterSpacing: 0.5 }]}>
          {titre}
        </ThemedText>
        {action}
      </View>
      {children}
    </View>
  );
}

export function Carte({ titre, children, style, onPress }: {
  titre?: string; children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void;
}) {
  const theme = useTheme();
  const contenu = (
    <>
      {titre && <ThemedText type="smallBold">{titre}</ThemedText>}
      {children}
    </>
  );
  const s = [styles.carte, { borderColor: theme.border, backgroundColor: theme.backgroundElement }, style];
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => [s, { opacity: pressed ? 0.85 : 1 }]}>{contenu}</Pressable>
  ) : <View style={s}>{contenu}</View>;
}

export function Alerte({ children, type = 'erreur' }: { children: ReactNode; type?: 'erreur' | 'succes' | 'attention' | 'info' }) {
  const theme = useTheme();
  const c = {
    erreur: [theme.dangerSoft, theme.danger],
    succes: [theme.primarySoft, theme.primary],
    attention: [theme.warningSoft, theme.warning],
    info: [theme.infoSoft, theme.info],
  }[type];
  return (
    <View style={[styles.alerte, { backgroundColor: c[0] }]} accessibilityRole="alert">
      <ThemedText type="small" style={{ color: c[1] }}>{children}</ThemedText>
    </View>
  );
}

export function Badge({ libelle, ton = 'neutre' }: { libelle: string; ton?: Ton }) {
  const theme = useTheme();
  const c = {
    neutre: [theme.backgroundSelected, theme.textSecondary],
    info: [theme.infoSoft, theme.info],
    succes: [theme.primarySoft, theme.primary],
    attention: [theme.warningSoft, theme.warning],
    danger: [theme.dangerSoft, theme.danger],
  }[ton];
  return (
    <View style={[styles.badge, { backgroundColor: c[0] }]}>
      <ThemedText style={{ color: c[1], fontSize: 12, lineHeight: 16, fontWeight: 700 }}>{libelle}</ThemedText>
    </View>
  );
}

/** Ligne libellé / valeur (fiches, totaux) */
export function Info({ libelle, valeur, fort = false }: { libelle: string; valeur: ReactNode; fort?: boolean }) {
  return (
    <View style={styles.info}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>{libelle}</ThemedText>
      {typeof valeur === 'string' || typeof valeur === 'number'
        ? <ThemedText type={fort ? 'smallBold' : 'small'} style={fort ? { fontSize: 16 } : undefined}>{valeur}</ThemedText>
        : valeur}
    </View>
  );
}

export function Vide({ icone, titre, texte, action }: { icone: NomIcone; titre: string; texte?: string; action?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.vide}>
      <View style={[styles.videIcone, { backgroundColor: theme.primarySoft }]}>
        <Icone nom={icone} taille={30} couleur={theme.primary} />
      </View>
      <ThemedText type="smallBold" style={{ fontSize: 17, textAlign: 'center' }}>{titre}</ThemedText>
      {texte && <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>{texte}</ThemedText>}
      {action}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Listes
// ---------------------------------------------------------------------------

/** Ligne de liste cliquable : titre, sous-titre, valeur à droite. */
export function LigneListe({
  titre, sousTitre, droite, sousDroite, icone, onPress, badge,
}: {
  titre: string;
  sousTitre?: string | null;
  droite?: string;
  sousDroite?: ReactNode;
  icone?: NomIcone;
  onPress?: () => void;
  badge?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.ligne, { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement, borderColor: theme.border }]}>
      {icone && (
        <View style={[styles.ligneIcone, { backgroundColor: theme.primarySoft }]}>
          <Icone nom={icone} taille={18} couleur={theme.primary} />
        </View>
      )}
      <View style={[styles.flex, { gap: 2 }]}>
        <ThemedText type="smallBold" numberOfLines={1} style={{ fontSize: 15 }}>{titre}</ThemedText>
        {!!sousTitre && <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>{sousTitre}</ThemedText>}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        {droite !== undefined && <ThemedText type="smallBold" style={{ fontSize: 15 }}>{droite}</ThemedText>}
        {sousDroite}
        {badge}
      </View>
      {onPress && !droite && !badge && !sousDroite && <Icone nom="suivant" taille={16} couleur={theme.textSecondary} />}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Formulaires
// ---------------------------------------------------------------------------

export function Champ({ libelle, aide, erreur, ...props }: TextInputProps & { libelle: string; aide?: string; erreur?: string | null }) {
  const theme = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={styles.champ}>
      <ThemedText type="smallBold">{libelle}</ThemedText>
      <TextInput
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel={libelle}
        {...props}
        onFocus={(e) => { setFocus(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocus(false); props.onBlur?.(e); }}
        style={[
          styles.input,
          props.multiline && styles.inputMulti,
          { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: erreur ? theme.danger : focus ? theme.primary : theme.border },
          props.style,
        ]}
      />
      {!!erreur && <ThemedText type="small" style={{ color: theme.danger }}>{erreur}</ThemedText>}
      {!!aide && !erreur && <ThemedText type="small" themeColor="textSecondary">{aide}</ThemedText>}
    </View>
  );
}

/** Champ montant : saisie libre (« 15 000 »), valeur entière ou null. */
export function ChampMontant({ libelle, valeur, onChange, symbole, aide }: {
  libelle: string; valeur: number | null; onChange: (v: number | null) => void; symbole?: string; aide?: string;
}) {
  const [texte, setTexte] = useState(valeur == null ? '' : formaterMontant(valeur, null));
  return (
    <Champ
      libelle={symbole ? `${libelle} (${symbole})` : libelle}
      aide={aide}
      value={texte}
      keyboardType="number-pad"
      selectTextOnFocus
      placeholder="0"
      onChangeText={(t) => { setTexte(t); onChange(t.trim() ? lireMontant(t) : null); }}
      onBlur={() => { const v = lireMontant(texte); if (v != null) setTexte(formaterMontant(v, null)); }}
    />
  );
}

export function ChampQuantite({ libelle, valeur, onChange, unite, aide }: {
  libelle: string; valeur: number | null; onChange: (v: number | null) => void; unite?: string; aide?: string;
}) {
  const [texte, setTexte] = useState(valeur == null ? '' : String(valeur).replace('.', ','));
  return (
    <Champ
      libelle={unite ? `${libelle} (${unite})` : libelle}
      aide={aide}
      value={texte}
      keyboardType="decimal-pad"
      selectTextOnFocus
      placeholder="0"
      onChangeText={(t) => { setTexte(t); onChange(t.trim() ? lireQuantite(t) : null); }}
    />
  );
}

/** Choix parmi quelques options sous forme de pastilles. */
export function Pastilles<T extends string>({ libelle, options, valeur, onChange }: {
  libelle?: string; options: readonly { code: T; libelle: string }[]; valeur: T; onChange: (v: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.champ}>
      {libelle && <ThemedText type="smallBold">{libelle}</ThemedText>}
      <View style={styles.pastilles}>
        {options.map((o) => {
          const choisi = o.code === valeur;
          return (
            <Pressable key={o.code} onPress={() => onChange(o.code)} accessibilityRole="radio" accessibilityState={{ selected: choisi }}
              style={[styles.pastille, { backgroundColor: choisi ? theme.primary : theme.backgroundElement, borderColor: choisi ? theme.primary : theme.border }]}>
              <ThemedText type="small" style={{ color: choisi ? theme.onPrimary : theme.text }}>{o.libelle}</ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Champ de recherche avec bouton de scan optionnel. */
export function Recherche({ valeur, onChange, placeholder = 'Rechercher…', onScanner }: {
  valeur: string; onChange: (v: string) => void; placeholder?: string; onScanner?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.recherche, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Icone nom="chercher" taille={18} couleur={theme.textSecondary} />
      <TextInput value={valeur} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={theme.textSecondary}
        style={[styles.flex, { color: theme.text, fontSize: 16, height: 44 }]} returnKeyType="search" clearButtonMode="while-editing"
        autoCorrect={false} accessibilityLabel={placeholder} />
      {onScanner && (
        <Pressable onPress={onScanner} hitSlop={10} accessibilityRole="button" accessibilityLabel="Scanner un code-barres">
          <Icone nom="scanner" taille={24} couleur={theme.primary} />
        </Pressable>
      )}
    </View>
  );
}

export function Interrupteur({ libelle, valeur, onChange, aide }: { libelle: string; valeur: boolean; onChange: (v: boolean) => void; aide?: string }) {
  const theme = useTheme();
  return (
    <Pressable onPress={() => onChange(!valeur)} accessibilityRole="switch" accessibilityState={{ checked: valeur }} style={styles.interrupteur}>
      <View style={[styles.flex, { gap: 2 }]}>
        <ThemedText type="smallBold">{libelle}</ThemedText>
        {aide && <ThemedText type="small" themeColor="textSecondary">{aide}</ThemedText>}
      </View>
      <View style={[styles.piste, { backgroundColor: valeur ? theme.primary : theme.border }]}>
        <View style={[styles.pouce, { alignSelf: valeur ? 'flex-end' : 'flex-start' }]} />
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Boutons
// ---------------------------------------------------------------------------

export function Bouton({ titre, onPress, chargement = false, variante = 'primaire', icone, desactive = false, style }: {
  titre: string;
  onPress: () => void;
  chargement?: boolean;
  variante?: 'primaire' | 'secondaire' | 'danger';
  icone?: NomIcone;
  desactive?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const fond = variante === 'primaire' ? theme.primary : theme.backgroundElement;
  const texte = variante === 'primaire' ? theme.onPrimary : variante === 'danger' ? theme.danger : theme.text;
  const bordure = variante === 'primaire' ? theme.primary : variante === 'danger' ? theme.dangerSoft : theme.border;
  const inactif = chargement || desactive;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: inactif, busy: chargement }} onPress={onPress} disabled={inactif}
      style={({ pressed }) => [styles.bouton, { backgroundColor: fond, borderColor: bordure, opacity: inactif ? 0.6 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}>
      {chargement ? <ActivityIndicator color={texte} /> : (
        <>
          {icone && <Icone nom={icone} taille={18} couleur={texte} />}
          <ThemedText type="smallBold" style={{ color: texte, fontSize: 16 }}>{titre}</ThemedText>
        </>
      )}
    </Pressable>
  );
}

/** Bouton icône rond (en-têtes, lignes). */
export function BoutonIcone({ icone, onPress, libelle, couleur }: { icone: NomIcone; onPress: () => void; libelle: string; couleur?: string }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={libelle}
      style={({ pressed }) => [styles.boutonIcone, { backgroundColor: pressed ? theme.backgroundSelected : 'transparent' }]}>
      <Icone nom={icone} taille={22} couleur={couleur ?? theme.primary} />
    </Pressable>
  );
}

/**
 * Hauteur masquée par la barre d'onglets native. Sur iOS elle se superpose au contenu (effet translucide) :
 * barre (BottomTabInset) + zone sûre basse. Sur Android, le contenu s'arrête au-dessus de la barre.
 */
export function useMargeOnglets(): number {
  const { bottom } = useSafeAreaInsets();
  return Platform.OS === 'ios' ? bottom + BottomTabInset : 0;
}

/** Bouton d'action flottant (ajout), placé au-dessus de la barre d'onglets. */
export function BoutonFlottant({ onPress, libelle, icone = 'ajouter' }: { onPress: () => void; libelle: string; icone?: NomIcone }) {
  const theme = useTheme();
  const marge = useMargeOnglets();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={libelle}
      style={({ pressed }) => [styles.flottant, { bottom: marge + Spacing.four, backgroundColor: theme.primary, transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
      <Icone nom={icone} taille={26} couleur={theme.onPrimary} />
    </Pressable>
  );
}

export function Lien({ titre, onPress }: { titre: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="link" hitSlop={8}>
      <ThemedText type="smallBold" style={{ color: theme.primary, textAlign: 'center' }}>{titre}</ThemedText>
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  flex: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  contenu: {
    padding: Spacing.three + Spacing.one,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingBottom: Spacing.six * 2,
  },
  pied: { borderTopWidth: StyleSheet.hairlineWidth },
  piedContenu: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  logo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + Spacing.half },
  titreLigne: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  carte: { borderRadius: Rayons.grand, borderWidth: 1, padding: Spacing.three, gap: Spacing.two },
  alerte: { borderRadius: Rayons.moyen, padding: Spacing.three },
  badge: { borderRadius: Rayons.plein, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  info: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 28 },
  vide: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five, paddingHorizontal: Spacing.three },
  videIcone: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.one },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Rayons.moyen, borderWidth: 1, minHeight: 64 },
  ligneIcone: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  champ: { gap: Spacing.one + Spacing.half },
  input: { minHeight: 50, borderRadius: Rayons.moyen, borderWidth: 1, paddingHorizontal: Spacing.three, fontSize: 16 },
  inputMulti: { minHeight: 96, paddingTop: Spacing.three, textAlignVertical: 'top' },
  pastilles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  pastille: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Rayons.plein, borderWidth: 1, minHeight: 40, justifyContent: 'center' },
  recherche: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: Rayons.moyen, borderWidth: 1, paddingHorizontal: Spacing.three },
  interrupteur: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 48 },
  piste: { width: 50, height: 30, borderRadius: 15, padding: 3 },
  pouce: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF' },
  bouton: { minHeight: 52, borderRadius: Rayons.moyen + 2, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.three, flexDirection: 'row', gap: Spacing.two, flexGrow: 1 },
  boutonIcone: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  flottant: {
    position: 'absolute', right: Spacing.four, bottom: Spacing.four, width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 6px 16px rgba(0,0,0,0.22)',
  },
});
