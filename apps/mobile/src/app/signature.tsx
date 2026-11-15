import { envoyerImageProduit, modifierParametres, signatureVide, svgSignature, type Trait } from '@factureplus/core';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, PanResponder, Pressable, StyleSheet, View } from 'react-native';

import { Icone, type NomIcone } from '@/components/icone';
import { ThemedText } from '@/components/themed-text';
import { Alerte, Carte, Ecran } from '@/components/ui';
import { Rayons, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { signalerErreur, vibrerSucces } from '@/lib/confirmer';
import { useEquipe } from '@/lib/espace';
import { supabase } from '@/lib/supabase';

const DELAI_ENREGISTREMENT = 2500;

/**
 * Signature des factures (comme l'ancienne application) : dessinée au doigt ou importée
 * (image / cachet). Enregistrée automatiquement, imprimée en bas des factures.
 */
export default function Signature() {
  const { equipeId, parametres, rafraichir } = useEquipe();
  const theme = useTheme();
  const [mode, setMode] = useState<'dessin' | 'image'>('dessin');
  const [cle, setCle] = useState(0); // nouvelle clé = pavé vidé
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signature = parametres?.signature_url ?? null;

  useEffect(() => () => { if (minuterie.current) clearTimeout(minuterie.current); }, []);

  async function enregistrer(url: string | null) {
    await modifierParametres(supabase, equipeId, { signature_url: url });
    await rafraichir();
  }

  /** Dessin : enregistré quelques instants après le dernier trait, puis le pavé est vidé. */
  function programmer(dessin: Trait[]) {
    if (minuterie.current) clearTimeout(minuterie.current);
    minuterie.current = setTimeout(async () => {
      const svg = svgSignature(dessin);
      if (!svg || signatureVide(dessin)) return;
      setEnvoi(true);
      try {
        const contenu = new TextEncoder().encode(svg);
        await enregistrer(await envoyerImageProduit(supabase, equipeId, contenu.buffer as ArrayBuffer, 'image/svg+xml'));
        setCle((c) => c + 1);
        setMessage('Signature enregistrée.');
        vibrerSucces();
      } catch (e) {
        signalerErreur(e);
      } finally {
        setEnvoi(false);
      }
    }, DELAI_ENREGISTREMENT);
  }

  async function importer(source: 'galerie' | 'camera') {
    try {
      if (source === 'camera' && !(await ImagePicker.requestCameraPermissionsAsync()).granted) return;
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 0.8, allowsEditing: true };
      const r = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (r.canceled || !r.assets[0]) return;
      setEnvoi(true);
      const contenu = await (await fetch(r.assets[0].uri)).arrayBuffer();
      await enregistrer(await envoyerImageProduit(supabase, equipeId, contenu, r.assets[0].mimeType ?? 'image/jpeg'));
      setCle((c) => c + 1);
      setMessage('Signature enregistrée.');
      vibrerSucces();
    } catch (e) {
      signalerErreur(e);
    } finally {
      setEnvoi(false);
    }
  }

  async function supprimer() {
    if (minuterie.current) clearTimeout(minuterie.current);
    setCle((c) => c + 1);
    try {
      await enregistrer(null);
      setMessage(null);
    } catch (e) {
      signalerErreur(e);
    }
  }

  return (
    <Ecran enTete>
      <Carte>
        <View style={styles.titre}>
          <Icone nom="modifier" taille={20} couleur={theme.primary} />
          <ThemedText type="smallBold" style={{ fontSize: 17 }}>Signature des factures</ThemedText>
        </View>
        <ThemedText themeColor="textSecondary">
          Dessinez ou insérez une image (cachet). Votre signature sera ajoutée automatiquement en bas de vos factures.
        </ThemedText>

        {message && <Alerte type="succes">{message}</Alerte>}

        {signature && (
          <View style={[styles.actuelle, { borderColor: theme.border }]}>
            <Image source={{ uri: signature }} style={styles.apercu} contentFit="contain" accessibilityLabel="Signature actuelle" />
            <Pressable onPress={supprimer} accessibilityRole="button" style={[styles.supprimer, { borderColor: theme.danger }]}>
              <Icone nom="supprimer" taille={16} couleur={theme.danger} />
              <ThemedText type="small" style={{ color: theme.danger }}>Supprimer</ThemedText>
            </Pressable>
          </View>
        )}

        <View style={styles.modes}>
          <BoutonMode actif={mode === 'dessin'} icone="modifier" titre="Dessiner" onPress={() => setMode('dessin')} />
          <BoutonMode actif={mode === 'image'} icone="recu" titre="Image / Cachet" onPress={() => setMode('image')} />
        </View>

        {mode === 'dessin' ? (
          <View style={{ gap: Spacing.two }}>
            <ThemedText type="smallBold">Dessinez votre signature</ThemedText>
            <PaveSignature key={cle} onFin={programmer} />
            <View style={styles.basPave}>
              <Pressable onPress={() => { if (minuterie.current) clearTimeout(minuterie.current); setCle((c) => c + 1); }} accessibilityRole="button"
                style={[styles.effacer, { borderColor: theme.border }]}>
                <Icone nom="supprimer" taille={16} couleur={theme.text} />
                <ThemedText type="small">Effacer</ThemedText>
              </Pressable>
              {envoi ? <ActivityIndicator color={theme.primary} />
                : <ThemedText type="small" themeColor="textSecondary">Sauvegarde automatique</ThemedText>}
            </View>
          </View>
        ) : (
          <View style={{ gap: Spacing.two }}>
            <ThemedText type="smallBold">Insérer une image (cachet)</ThemedText>
            <Pressable onPress={() => importer('galerie')} disabled={envoi} accessibilityRole="button" accessibilityLabel="Choisir une image dans la galerie"
              style={({ pressed }) => [styles.depot, { borderColor: theme.border, opacity: pressed ? 0.6 : 1 }]}>
              {envoi ? <ActivityIndicator color={theme.primary} /> : <>
                <Icone nom="importer" taille={24} couleur={theme.textSecondary} />
                <ThemedText themeColor="textSecondary">Touchez pour choisir une image</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">PNG ou JPG</ThemedText>
              </>}
            </Pressable>
            <Pressable onPress={() => importer('camera')} disabled={envoi} accessibilityRole="button" style={{ alignSelf: 'center', padding: Spacing.one }}>
              <ThemedText type="smallBold" themeColor="primary">Prendre une photo du cachet</ThemedText>
            </Pressable>
          </View>
        )}
      </Carte>
    </Ecran>
  );
}

function BoutonMode({ actif, icone, titre, onPress }: { actif: boolean; icone: NomIcone; titre: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: actif }}
      style={[styles.mode, { backgroundColor: actif ? theme.primary : theme.backgroundElement, borderColor: actif ? theme.primary : theme.border }]}>
      <Icone nom={icone} taille={18} couleur={actif ? '#FFFFFF' : theme.text} />
      <ThemedText type="smallBold" style={{ color: actif ? '#FFFFFF' : theme.text }} numberOfLines={1}>{titre}</ThemedText>
    </Pressable>
  );
}

/** Pavé de dessin : chaque trait est une suite de points, affichée par segments. Vidé en changeant sa clé. */
function PaveSignature({ onFin }: { onFin: (t: Trait[]) => void }) {
  const theme = useTheme();
  const [traits, setTraits] = useState<Trait[]>([]);
  const traitsRef = useRef<Trait[]>([]);
  const finRef = useRef(onFin);
  useEffect(() => { finRef.current = onFin; }, [onFin]);

  // Les références ne sont lues que dans les gestionnaires de geste, jamais pendant le rendu
  // eslint-disable-next-line react-hooks/refs
  const [geste] = useState(() => {
    const maj = (t: Trait[]) => { traitsRef.current = t; setTraits(t); };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false, // le défilement de l'écran ne vole pas le geste
      onPanResponderGrant: (e) => {
        const { locationX: x, locationY: y } = e.nativeEvent;
        maj([...traitsRef.current, [{ x, y }]]);
      },
      onPanResponderMove: (e) => {
        const { locationX: x, locationY: y } = e.nativeEvent;
        const t = traitsRef.current.slice();
        const dernier = t[t.length - 1];
        if (!dernier) return;
        const p = dernier[dernier.length - 1];
        if (p && Math.hypot(p.x - x, p.y - y) < 1.5) return;
        t[t.length - 1] = [...dernier, { x, y }];
        maj(t);
      },
      onPanResponderRelease: () => finRef.current(traitsRef.current),
      onPanResponderTerminate: () => finRef.current(traitsRef.current),
    });
  });

  return (
    <View {...geste.panHandlers} style={[styles.pave, { borderColor: theme.border }]} accessibilityLabel="Zone de signature">
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {traits.flatMap((t, i) => t.length === 1
          ? [<View key={`${i}`} style={[styles.point, { left: t[0].x - 1.5, top: t[0].y - 1.5 }]} />]
          : t.slice(1).map((p, j) => <Segment key={`${i}-${j}`} a={t[j]} b={p} />))}
      </View>
    </View>
  );
}

function Segment({ a, b }: { a: { x: number; y: number }; b: { x: number; y: number } }) {
  const longueur = Math.hypot(b.x - a.x, b.y - a.y);
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  return (
    <View style={[styles.segment, {
      width: longueur + 3, left: (a.x + b.x) / 2 - (longueur + 3) / 2, top: (a.y + b.y) / 2 - 1.5,
      transform: [{ rotate: `${angle}rad` }],
    }]} />
  );
}

const ENCRE = '#111827';

const styles = StyleSheet.create({
  titre: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  actuelle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three, borderWidth: 1,
    borderRadius: Rayons.moyen, padding: Spacing.three, backgroundColor: '#FFFFFF' },
  apercu: { flex: 1, height: 64 },
  supprimer: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: Rayons.petit, paddingHorizontal: Spacing.two, paddingVertical: 6 },
  modes: { flexDirection: 'row', gap: Spacing.two },
  mode: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, minHeight: 48,
    borderRadius: Rayons.moyen, borderWidth: 1, paddingHorizontal: Spacing.two },
  pave: { height: 180, borderWidth: 1, borderRadius: Rayons.moyen, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  segment: { position: 'absolute', height: 3, borderRadius: 1.5, backgroundColor: ENCRE },
  point: { position: 'absolute', width: 3, height: 3, borderRadius: 1.5, backgroundColor: ENCRE },
  basPave: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  effacer: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: Rayons.moyen, paddingHorizontal: Spacing.three, minHeight: 44 },
  depot: { height: 160, borderWidth: 2, borderStyle: 'dashed', borderRadius: Rayons.moyen, alignItems: 'center', justifyContent: 'center', gap: Spacing.one },
});
