import { ColorPicker, Host } from '@expo/ui/swift-ui';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useThemeApp } from '@/lib/theme';

/**
 * iOS : sélecteur de couleur natif (SwiftUI ColorPicker). Le rond de couleur ouvre la palette du système
 * (Grille, Spectre, Curseurs, pipette).
 */
export function SelecteurCouleur({ couleur, onChange, libelle = 'Autre couleur' }: {
  couleur: string;
  onChange: (couleur: string) => void;
  libelle?: string;
}) {
  const { schema } = useThemeApp();
  return (
    <View style={styles.ligne}>
      <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>{libelle}</ThemedText>
      <Host matchContents colorScheme={schema === 'sombre' ? 'dark' : 'light'}>
        <ColorPicker
          selection={couleur}
          supportsOpacity={false}
          // #RRGGBB (on ignore une éventuelle opacité #RRGGBBAA)
          onSelectionChange={(v) => onChange(v.slice(0, 7).toUpperCase())}
        />
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  ligne: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 44 },
});
