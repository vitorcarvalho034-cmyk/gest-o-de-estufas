import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const RENAME_MAP = {
  'boda': 'Anast. Boda',
  'cipria': 'Anast. Cipria',
  'chispa': 'Anast. Chispa',
  'herreira': 'Anast. Herreira',
  'fiebre': 'Anast. Fiebre',
  'lotso': 'Anast. Lotso',
  'magnun': 'Anast. Magnum',
  'magnum': 'Anast. Magnum',
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { estufa } = await req.json().catch(() => ({}));
  const filterQuery = estufa ? { estufa: parseInt(estufa) } : {};
  const canteiros = await base44.asServiceRole.entities.Canteiro.filter(filterQuery, '-created_date', 200);
  if (!Array.isArray(canteiros)) {
    return Response.json({ error: 'Could not load canteiros' }, { status: 500 });
  }

  let updated = 0;
  const toUpdate = [];

  for (const c of canteiros) {
    const variedades = c.variedades || [];
    if (variedades.length === 0) continue;
    let changed = false;
    const newVariedades = variedades.map(v => {
      const mapped = RENAME_MAP[v.nome?.toLowerCase()?.trim()];
      if (mapped) { changed = true; return { ...v, nome: mapped }; }
      return v;
    });
    if (changed) toUpdate.push({ id: c.id, variedades: newVariedades });
  }

  for (const item of toUpdate) {
    await base44.asServiceRole.entities.Canteiro.update(item.id, { variedades: item.variedades });
    updated++;
  }

  return Response.json({ success: true, updated, total: canteiros.length });
});