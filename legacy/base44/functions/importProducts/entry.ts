import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const fileContent = body.file_content;
    if (!fileContent || typeof fileContent !== 'string') {
      return Response.json({ error: 'file_content requis (base64)' }, { status: 400 });
    }

    // Décodage base64 -> bytes. Aucun fichier n'est stocké : le contenu
    // transite uniquement dans le corps de la requête.
    const binary = atob(fileContent);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const wb = XLSX.read(bytes, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) return Response.json({ error: 'Aucune feuille trouvée' }, { status: 400 });
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

    const norm = (s) => (s == null ? '' : s.toString()).trim().toLowerCase();
    const num = (v) => {
      if (v == null || v === '') return 0;
      const n = parseFloat(v.toString().replace(/\s/g, '').replace(',', '.'));
      return isNaN(n) ? 0 : n;
    };
    const orDefault = (v, d) => (v == null || v === '' ? d : num(v));
    const str = (v) => (v == null ? '' : v.toString()).trim();

    // Mapping basé sur le template officiel :
    // Nom, Référence, Catégorie, Quantité, Prix de vente, Prix de revient,
    // Unité, Seuil réappro, Fournisseur, Localisation, Description
    const headerMap = {
      'nom': 'name', 'name': 'name', 'libellé': 'name', 'libelle': 'name',
      'désignation': 'name', 'designation': 'name', 'produit': 'name', 'product': 'name',
      'référence': 'sku', 'reference': 'sku', 'ref': 'sku', 'réf': 'sku', 'sku': 'sku',
      'code article': 'sku', 'article': 'sku',
      'code-barres': 'barcode', 'code barres': 'barcode', 'codebarres': 'barcode',
      'barcode': 'barcode', 'ean': 'barcode',
      'catégorie': 'category', 'categorie': 'category', 'category': 'category', 'famille': 'category',
      'quantité': 'quantity', 'quantite': 'quantity', 'quantity': 'quantity',
      'qté': 'quantity', 'qte': 'quantity', 'stock': 'quantity', 'qte stock': 'quantity',
      'prix de vente': 'unit_price', 'prix unitaire': 'unit_price', 'prix vente': 'unit_price',
      'unit price': 'unit_price', 'selling price': 'unit_price', 'prix': 'unit_price', 'pv': 'unit_price',
      "prix de revient": 'cost_price', "prix d'achat": 'cost_price', 'prix achat': 'cost_price', 'prix de coût': 'cost_price',
      'prix cout': 'cost_price', 'cost price': 'cost_price', 'pa': 'cost_price',
      'unité': 'unit', 'unite': 'unit', 'unit': 'unit',
      'unité de mesure': 'unit', 'unite de mesure': 'unit', 'unit of measure': 'unit',
      'seuil réappro': 'reorder_level', 'seuil reappro': 'reorder_level',
      'seuil de réappro': 'reorder_level', 'seuil': 'reorder_level',
      'reorder level': 'reorder_level', 'reorder': 'reorder_level', 'stock minimum': 'reorder_level',
      'fournisseur': 'supplier', 'supplier': 'supplier',
      'description': 'description',
      'localisation': 'location', 'location': 'location', 'emplacement': 'location', 'rayon': 'location',
    };

    const existingCats = await base44.entities.Category.list();
    const catMap = {};
    existingCats.forEach((c) => { catMap[c.name.toLowerCase()] = c.id; });
    const ensureCategory = async (name) => {
      if (!name) return null;
      const key = name.toLowerCase();
      if (catMap[key]) return catMap[key];
      const created = await base44.entities.Category.create({ name, team_id: user.team_id });
      catMap[key] = created.id;
      return created.id;
    };

    // Produits existants pour éviter les doublons.
    // Clé composite : nom + référence (insensible à la casse). Un produit est
    // considéré en doublon si cette clé existe déjà (en base ou dans le lot).
    const existingProducts = await base44.entities.Product.list('-created_date', 1000);
    const seenKeys = new Set(
      existingProducts.map((p) => {
        const n = (p.name || '').toLowerCase().trim();
        const s = (p.sku || '').toLowerCase().trim();
        return `${n}||${s}`;
      })
    );

    const productsToCreate = [];
    let skipped = 0;
    for (const row of rows) {
      const mapped = {};
      for (const key of Object.keys(row)) {
        const field = headerMap[norm(key)];
        if (field && !(field in mapped)) mapped[field] = row[key];
      }
      const name = str(mapped.name);
      if (!name) { skipped++; continue; }
      const sku = str(mapped.sku);
      const dedupKey = `${name.toLowerCase()}||${sku.toLowerCase()}`;
      if (seenKeys.has(dedupKey)) { skipped++; continue; }
      seenKeys.add(dedupKey);

      const catId = await ensureCategory(str(mapped.category));
      productsToCreate.push({
        name,
        team_id: user.team_id,
        sku,
        barcode: str(mapped.barcode),
        quantity: num(mapped.quantity),
        unit_price: num(mapped.unit_price),
        cost_price: num(mapped.cost_price),
        unit: str(mapped.unit) || 'Pcs',
        reorder_level: orDefault(mapped.reorder_level, 10),
        supplier: str(mapped.supplier),
        description: str(mapped.description),
        location: str(mapped.location),
        ...(catId ? { category_id: catId } : {}),
      });
    }

    let created = 0;
    if (productsToCreate.length > 0) {
      await base44.entities.Product.bulkCreate(productsToCreate);
      created = productsToCreate.length;
    }
    return Response.json({ created, skipped, total_rows: rows.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});