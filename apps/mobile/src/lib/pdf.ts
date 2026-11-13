import { chargerDocument, htmlDocument, LIBELLES_TYPE_DOCUMENT, lienPdfDocument, messagePartage, numeroWhatsApp, type Parametres } from '@factureplus/core';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Linking, Platform } from 'react-native';

import { confirmer } from '@/lib/confirmer';
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

/** Ouvre WhatsApp vers le client avec un message. */
export async function ecrireWhatsApp(telephone: string, message: string, telephoneEntreprise?: string | null) {
  await Linking.openURL(`https://wa.me/${numeroWhatsApp(telephone, telephoneEntreprise)}?text=${encodeURIComponent(message)}`);
}

/**
 * Message WhatsApp au client avec le lien de téléchargement du PDF : le PDF est généré, déposé dans
 * l'espace privé de l'entreprise, puis un lien signé (valable 30 jours) est ajouté au message.
 * Si le PDF ne peut pas être préparé, propose d'envoyer le message sans lien.
 */
export async function envoyerSurWhatsApp(documentId: string, parametres: Parametres) {
  const { document, contenu } = await html(documentId, parametres);
  if (!document.client_telephone) throw new Error('Le client n’a pas de numéro de téléphone.');
  let lien: string | null = null;
  try {
    if (Platform.OS === 'web') throw new Error('La génération du PDF n’est disponible que sur téléphone.');
    const { uri } = await Print.printToFileAsync({ html: contenu });
    const fichier = await (await fetch(uri)).arrayBuffer();
    lien = await lienPdfDocument(supabase, document, fichier);
  } catch (e) {
    const sansPdf = await confirmer('PDF non joint',
      `${(e as Error).message}\n\nEnvoyer le message sans le lien du PDF ?`, 'Envoyer sans PDF');
    if (!sansPdf) return;
  }
  await ecrireWhatsApp(document.client_telephone, messagePartage(document, parametres, lien), parametres.telephone);
}

export { messagePartage };
