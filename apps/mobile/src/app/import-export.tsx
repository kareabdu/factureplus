import {
  analyserImportProduits, ecrireTableur, htmlListeProduits, importerProduits, lignesAEnvoyer, listerCategories, listerProduits,
  lireTableur, nomFichierExportProduits, nomFichierPdfProduits, tableauExportProduits, tableauModeleProduits, TYPE_MIME_TABLEUR,
  type AnalyseImportProduits, type BilanImportProduits, type FormatTableur, type Tableau,
} from '@factureplus/core';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Alerte, Badge, Bouton, Carte, Ecran, Interrupteur, LigneListe, Section } from '@/components/ui';
import { signalerErreur, vibrerSucces } from '@/lib/confirmer';
import { useEquipe } from '@/lib/espace';
import { partagerHtmlEnPdf } from '@/lib/pdf';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const UTI: Record<FormatTableur, string> = { xlsx: 'org.openxmlformats.spreadsheetml.sheet', csv: 'public.comma-separated-values-text' };

/** Écrit le fichier dans le cache puis ouvre la feuille de partage (enregistrer, e-mail, WhatsApp…). */
async function partagerTableur(format: FormatTableur, tableau: Tableau, nom: string) {
  const contenu = ecrireTableur(format, tableau, 'Produits');
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([contenu as BlobPart], { type: TYPE_MIME_TABLEUR[format] }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nom}.${format}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const fichier = new File(Paths.cache, `${nom}.${format}`);
  if (fichier.exists) fichier.delete();
  fichier.create();
  fichier.write(contenu);
  await Sharing.shareAsync(fichier.uri, { mimeType: TYPE_MIME_TABLEUR[format].split(';')[0], UTI: UTI[format], dialogTitle: nom });
}

/** Import et export du catalogue produits (Excel .xlsx ou CSV). */
export default function ImportExport() {
  const { equipeId, parametres } = useEquipe();
  const theme = useTheme();
  const [exportEnCours, setExportEnCours] = useState<FormatTableur | 'pdf' | null>(null);
  const [lecture, setLecture] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [fichier, setFichier] = useState<string | null>(null);
  const [analyse, setAnalyse] = useState<AnalyseImportProduits | null>(null);
  const [bilan, setBilan] = useState<BilanImportProduits | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [erreursSeules, setErreursSeules] = useState(false);

  async function exporter(format: FormatTableur | 'pdf') {
    setExportEnCours(format);
    try {
      const [produits, categories] = await Promise.all([
        listerProduits(supabase, equipeId, { inactifs: true }), listerCategories(supabase, equipeId),
      ]);
      if (format === 'pdf') {
        if (!parametres) throw new Error("Paramètres de l'entreprise indisponibles.");
        await partagerHtmlEnPdf(htmlListeProduits({ produits, categories, parametres }), nomFichierPdfProduits());
      } else {
        await partagerTableur(format, tableauExportProduits(produits, categories), nomFichierExportProduits());
      }
    } catch (e) {
      signalerErreur(e, 'Export impossible');
    } finally {
      setExportEnCours(null);
    }
  }

  async function choisirFichier() {
    setErreur(null);
    setBilan(null);
    const choix = await DocumentPicker.getDocumentAsync({
      type: [TYPE_MIME_TABLEUR.xlsx, 'text/csv', 'text/comma-separated-values', 'text/plain', 'application/vnd.ms-excel', 'application/octet-stream'],
      copyToCacheDirectory: true,
    });
    if (choix.canceled || !choix.assets[0]) return;
    const doc = choix.assets[0];
    setLecture(true);
    try {
      const octets = Platform.OS === 'web' && doc.file
        ? new Uint8Array(await doc.file.arrayBuffer())
        : await new File(doc.uri).bytes();
      const tableau = lireTableur(doc.name, octets);
      const a = analyserImportProduits(tableau, await listerProduits(supabase, equipeId, { inactifs: true }));
      setFichier(doc.name);
      setAnalyse(a);
      setErreursSeules(a.enErreur > 0);
    } catch (e) {
      setAnalyse(null);
      setErreur((e as Error).message);
    } finally {
      setLecture(false);
    }
  }

  async function importer() {
    if (!analyse) return;
    setEnvoi(true);
    setErreur(null);
    try {
      setBilan(await importerProduits(supabase, equipeId, lignesAEnvoyer(analyse)));
      setAnalyse(null);
      vibrerSucces();
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  }

  const aImporter = analyse ? analyse.creations + analyse.misesAJour : 0;
  const lignes = analyse ? analyse.lignes.filter((l) => !erreursSeules || l.erreurs.length) : [];

  return (
    <Ecran enTete pied={analyse && !analyse.erreur ? (
      <Bouton titre={`Importer ${aImporter} produit(s)`} icone="importer" chargement={envoi} desactive={!aImporter} onPress={importer} />
    ) : undefined}>
      <Section titre="Exporter">
        <ThemedText type="small" themeColor="textSecondary">
          Excel et CSV : tous vos produits avec leur stock actuel, modifiables puis réimportables. PDF : liste des produits
          actifs avec stock, prix et valeur du stock.
        </ThemedText>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Bouton titre="Excel" icone="exporter" style={{ flex: 1 }} chargement={exportEnCours === 'xlsx'}
            desactive={!!exportEnCours} onPress={() => exporter('xlsx')} />
          <Bouton titre="CSV" icone="exporter" variante="secondaire" style={{ flex: 1 }} chargement={exportEnCours === 'csv'}
            desactive={!!exportEnCours} onPress={() => exporter('csv')} />
        </View>
        <Bouton titre="PDF (liste à imprimer ou envoyer)" icone="document" variante="secondaire" chargement={exportEnCours === 'pdf'}
          desactive={!!exportEnCours} onPress={() => exporter('pdf')} />
      </Section>

      <Section titre="Importer">
        <ThemedText type="small" themeColor="textSecondary">
          Fichier Excel (.xlsx) ou CSV, en-têtes en première ligne. Un produit existant est mis à jour s’il a la même
          référence, le même code-barres ou, à défaut, le même nom ; sinon il est créé. Une cellule vide laisse la valeur
          actuelle. La quantité en stock est enregistrée comme un ajustement de stock.
        </ThemedText>
        <LigneListe icone="tableur" titre="Télécharger le modèle Excel"
          onPress={() => partagerTableur('xlsx', tableauModeleProduits(), 'modele-produits').catch((e) => signalerErreur(e))} />
        <LigneListe icone="tableur" titre="Télécharger le modèle CSV"
          onPress={() => partagerTableur('csv', tableauModeleProduits(), 'modele-produits').catch((e) => signalerErreur(e))} />
        <Bouton titre={analyse ? 'Choisir un autre fichier' : 'Choisir un fichier'} icone="importer"
          variante={analyse ? 'secondaire' : 'primaire'} chargement={lecture} onPress={choisirFichier} />
      </Section>

      {erreur && <Alerte>{erreur}</Alerte>}
      {bilan && (
        <Alerte type="succes">
          {`Import terminé : ${bilan.crees} produit(s) créé(s), ${bilan.modifies} mis à jour`
            + (bilan.stocks_ajustes ? `, ${bilan.stocks_ajustes} stock(s) ajusté(s)` : '')
            + (bilan.categories_creees ? `, ${bilan.categories_creees} catégorie(s) créée(s)` : '') + '.'}
        </Alerte>
      )}

      {analyse && (
        <Section titre={`Aperçu · ${fichier ?? ''}`}>
          {analyse.erreur ? <Alerte>{analyse.erreur}</Alerte> : (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                <Badge libelle={`${analyse.creations} à créer`} ton="succes" />
                <Badge libelle={`${analyse.misesAJour} à mettre à jour`} ton="info" />
                {analyse.enErreur > 0 && <Badge libelle={`${analyse.enErreur} en erreur`} ton="danger" />}
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {`Colonnes reconnues : ${analyse.colonnes.map((c) => c.entete).join(', ')}`
                  + (analyse.colonnesIgnorees.length ? `\nIgnorées : ${analyse.colonnesIgnorees.join(', ')}` : '')}
              </ThemedText>
              {analyse.enErreur > 0 && (
                <>
                  {aImporter > 0 && (
                    <Alerte type="attention">
                      {`Les ${analyse.enErreur} ligne(s) en erreur seront ignorées. Corrigez le fichier pour les inclure.`}
                    </Alerte>
                  )}
                  <Interrupteur libelle="Seulement les lignes en erreur" valeur={erreursSeules} onChange={setErreursSeules} />
                </>
              )}
              {lignes.slice(0, 200).map((l) => l.erreurs.length ? (
                <Carte key={l.numero} titre={`L${l.numero} · ${l.libelle || '—'}`}>
                  {l.erreurs.map((e) => <ThemedText key={e} type="small" style={{ color: theme.danger }}>{e}</ThemedText>)}
                </Carte>
              ) : (
                <LigneListe key={l.numero} titre={`L${l.numero} · ${l.libelle}`}
                  badge={l.action === 'creation' ? <Badge libelle="Nouveau" ton="succes" /> : <Badge libelle="Mise à jour" ton="info" />} />
              ))}
              {lignes.length > 200 && (
                <ThemedText type="small" themeColor="textSecondary">{`… et ${lignes.length - 200} autres lignes`}</ThemedText>
              )}
            </>
          )}
        </Section>
      )}
    </Ecran>
  );
}
