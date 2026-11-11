import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icone } from '@/components/icone';
import { ThemedText } from '@/components/themed-text';
import { Bouton, ChargementPlein, Ecran } from '@/components/ui';
import { Rayons, Spacing } from '@/constants/theme';
import { abandonner, repondre } from '@/lib/selection';

/** Lecture d'un code-barres (EAN, UPC, Code 128, QR…). Renvoie le code à l'écran appelant. */
export default function Scanner() {
  const { titre } = useLocalSearchParams<{ titre?: string }>();
  const [permission, demander] = useCameraPermissions();
  const [saisie, setSaisie] = useState('');
  const [manuel, setManuel] = useState(false);
  const lu = useRef(false);

    // Écran fermé sans choix (geste, bouton retour) : l'appelant reçoit null
  useEffect(() => () => { if (!lu.current) abandonner('scan'); }, []);

  function terminer(code: string) {
    if (lu.current || !code.trim()) return;
    lu.current = true;
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    repondre('scan', code.trim());
  }

  if (!permission) return <ChargementPlein />;

  if (!permission.granted || manuel) {
    return (
      <Ecran>
        <ThemedText type="subtitle">{titre ?? 'Scanner'}</ThemedText>
        {!permission.granted && !manuel && (
          <>
            <ThemedText themeColor="textSecondary">
              StockTracker a besoin de la caméra pour lire les codes-barres. Les images ne sont ni enregistrées ni envoyées.
            </ThemedText>
            {permission.canAskAgain
              ? <Bouton titre="Autoriser la caméra" icone="photo" onPress={demander} />
              : <Bouton titre="Ouvrir les réglages" onPress={() => Linking.openSettings()} />}
          </>
        )}
        <ThemedText type="smallBold">Ou saisissez le code</ThemedText>
        <TextInput value={saisie} onChangeText={setSaisie} autoFocus={manuel} keyboardType="number-pad" placeholder="Code-barres"
          onSubmitEditing={() => terminer(saisie)} style={styles.saisie} accessibilityLabel="Code-barres" />
        <Bouton titre="Valider" onPress={() => terminer(saisie)} desactive={!saisie.trim()} />
        <Bouton titre="Annuler" variante="secondaire" onPress={() => repondre('scan', null)} />
      </Ecran>
    );
  }

  return (
    <View style={styles.fond}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        autofocus="on"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'code93', 'itf14', 'codabar', 'qr', 'datamatrix'] }}
        onBarcodeScanned={(r: BarcodeScanningResult) => terminer(r.data)}
      />
      <SafeAreaView style={styles.calque} edges={['top', 'bottom']}>
        <View style={styles.haut}>
          <Pressable onPress={() => repondre('scan', null)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Fermer" style={styles.rond}>
            <Icone nom="fermer" taille={22} couleur="#FFFFFF" />
          </Pressable>
          <ThemedText type="smallBold" style={{ color: '#FFFFFF', fontSize: 17 }}>{titre ?? 'Scanner un code-barres'}</ThemedText>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.viseur} />
        <View style={{ alignItems: 'center', gap: Spacing.three }}>
          <ThemedText style={{ color: '#FFFFFF', textAlign: 'center' }}>Placez le code-barres dans le cadre</ThemedText>
          <Pressable onPress={() => setManuel(true)} style={styles.pilule} accessibilityRole="button">
            <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>Saisir le code à la main</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fond: { flex: 1, backgroundColor: '#000' },
  calque: { flex: 1, justifyContent: 'space-between', padding: Spacing.three },
  haut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rond: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  viseur: { alignSelf: 'center', width: '82%', aspectRatio: 1.6, borderWidth: 3, borderColor: '#FFFFFF', borderRadius: Rayons.grand },
  pilule: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two + Spacing.one, borderRadius: Rayons.plein, backgroundColor: 'rgba(0,0,0,0.5)' },
  saisie: { height: 50, borderRadius: Rayons.moyen, borderWidth: 1, borderColor: '#C9D1CB', paddingHorizontal: Spacing.three, fontSize: 18, backgroundColor: '#FFFFFF' },
});
