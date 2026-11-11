import { chargerDocument, htmlDocument, LIBELLES_TYPE_DOCUMENT, messagePartage, type Parametres } from '@stocktracker/core';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Linking, Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

async function html(documentId: string, parametres: Parametres) {
  const { document, lignes, reglements } = await chargerDocument(supabase, documentId);
  return { document, contenu: htmlDocument({ document, lignes, reglements, parametres }) };
}

/** Génère le PDF et ouvre la feuille de partage (WhatsApp, e-mail, enregistrement…). */
export async function partagerPdf(documentId: string, parametres: Parametres) {
  const { document, contenu } = await html(documentId, parametres);
  if (Platform.OS === 'web') return Print.printAsync({ html: contenu });
  const { uri } = await Print.printToFileAsync({ html: contenu });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: `${LIBELLES_TYPE_DOCUMENT[document.type]} ${document.numero ?? ''}`,
  });
}

export async function imprimer(documentId: string, parametres: Parametres) {
  const { contenu } = await html(documentId, parametres);
  await Print.printAsync({ html: contenu });
}

/** Ouvre WhatsApp vers le client avec un message (le PDF se joint ensuite via « Partager »). */
export async function ecrireWhatsApp(telephone: string, message: string) {
  const numero = telephone.replace(/[^\d+]/g, '').replace(/^\+/, '');
  await Linking.openURL(`https://wa.me/${numero}?text=${encodeURIComponent(message)}`);
}

export { messagePartage };
