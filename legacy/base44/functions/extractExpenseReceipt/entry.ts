import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const file_url: string | undefined = body?.file_url;
    if (!file_url) return Response.json({ error: 'Missing file_url' }, { status: 400 });

    // N'autorise que les fichiers stockés dans le stockage de l'app, pour
    // éviter qu'un utilisateur ne fasse extraire (avec les identifiants de
    // l'app) un fichier arbitraire hébergé ailleurs ou appartenant à un tiers.
    let parsed: URL;
    try {
      parsed = new URL(file_url);
    } catch {
      return Response.json({ error: 'file_url invalide' }, { status: 400 });
    }
    const allowedHosts = ['media.base44.com', 'files.base44.com'];
    if (!allowedHosts.includes(parsed.hostname)) {
      return Response.json({ error: 'file_url non autorisé' }, { status: 403 });
    }

    const res = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: 'object',
        properties: {
          merchant_name: { type: 'string' },
          amount: { type: 'number' },
          date: { type: 'string' },
          category: { type: 'string' },
          payment_method: { type: 'string' },
        },
      },
    });

    return Response.json({ output: (res && res.output) || {} });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}