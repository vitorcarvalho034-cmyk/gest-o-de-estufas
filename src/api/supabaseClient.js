import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Cache helpers ────────────────────────────────────────────────────────────
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function cacheSet(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch (_) {}
}

function cacheGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null; // expirado
    return data;
  } catch (_) { return null; }
}

function cacheGetAny(key) {
  // Retorna cache mesmo expirado (usado como fallback offline)
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw).data;
  } catch (_) { return null; }
}

// Executa query com timeout de 5s; se falhar, retorna cache
async function withCacheFallback(cacheKey, queryFn) {
  // Se offline, retorna cache imediatamente sem nem tentar
  if (!navigator.onLine) {
    const cached = cacheGetAny(cacheKey);
    if (cached !== null) return cached;
    return [];
  }

  // Tenta buscar do Supabase com timeout de 5s
  try {
    const result = await Promise.race([
      queryFn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 5000)
      ),
    ]);
    cacheSet(cacheKey, result);
    return result;
  } catch (_) {
    // Falhou (timeout ou erro de rede) — usa cache
    const cached = cacheGetAny(cacheKey);
    if (cached !== null) return cached;
    return [];
  }
}

// ─── APIs ─────────────────────────────────────────────────────────────────────

export const canteirosAPI = {
  list: async () => {
    return withCacheFallback('cache_canteiros', async () => {
      const { data, error } = await supabase
        .from('canteiros')
        .select('*')
        .order('estufa', { ascending: true })
        .order('lado', { ascending: true })
        .order('vao', { ascending: true });
      if (error) throw error;
      return data || [];
    });
  },
  get: async (id) => {
    const { data, error } = await supabase.from('canteiros').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  create: async (data) => {
    const { data: result, error } = await supabase.from('canteiros').insert([data]).select().single();
    if (error) throw error;
    localStorage.removeItem('cache_canteiros');
    return result;
  },
  update: async (id, data) => {
    const { data: result, error } = await supabase.from('canteiros').update(data).eq('id', id).select().single();
    if (error) throw error;
    localStorage.removeItem('cache_canteiros');
    return result;
  },
  delete: async (id) => {
    const { error } = await supabase.from('canteiros').delete().eq('id', id);
    if (error) throw error;
    localStorage.removeItem('cache_canteiros');
    return true;
  },
  listFinalizados: async () => {
    const { data, error } = await supabase
      .from('canteiros')
      .select('*')
      .not('data_finalizacao', 'is', null)
      .order('data_finalizacao', { ascending: false });
    if (error) throw error;
    return data || [];
  },
};

export const plantiosAPI = {
  list: async (limit = 500) => {
    return withCacheFallback(`cache_plantios_${limit}`, async () => {
      const { data, error } = await supabase
        .from('plantios')
        .select('*')
        .order('data_plantio', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    });
  },
  get: async (id) => {
    const { data, error } = await supabase.from('plantios').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  create: async (data) => {
    const { data: result, error } = await supabase.from('plantios').insert([data]).select().single();
    if (error) throw error;
    localStorage.removeItem('cache_plantios_500');
    localStorage.removeItem('cache_plantios_200');
    localStorage.removeItem('cache_plantios_1000');
    return result;
  },
  update: async (id, data) => {
    const { data: result, error } = await supabase.from('plantios').update(data).eq('id', id).select().single();
    if (error) throw error;
    localStorage.removeItem('cache_plantios_500');
    localStorage.removeItem('cache_plantios_200');
    localStorage.removeItem('cache_plantios_1000');
    return result;
  },
  delete: async (id) => {
    const { error } = await supabase.from('plantios').delete().eq('id', id);
    if (error) throw error;
    localStorage.removeItem('cache_plantios_500');
    localStorage.removeItem('cache_plantios_200');
    localStorage.removeItem('cache_plantios_1000');
    return true;
  },
  // Busca direta ao banco por semana — usada para reimprimir croqui sem limite
  listBySemana: async (semana, ano) => {
    const { data, error } = await supabase
      .from('plantios')
      .select('*')
      .eq('semana', semana)
      .order('estufa', { ascending: true })
      .order('lado', { ascending: true })
      .order('vao', { ascending: true })
      .order('canteiro', { ascending: true });
    if (error) throw error;
    // Filtrar por ano via data_plantio
    const filtered = (data || []).filter(p => {
      const y = p.data_plantio ? parseInt(p.data_plantio.split('-')[0]) : 0;
      return y === ano;
    });
    return filtered;
  },
  // Busca direta ao banco sem cache — usada após exclusão para recalcular canteiro
  listByCanteiro: async (estufa, lado, vao, canteiro) => {
    const { data, error } = await supabase
      .from('plantios')
      .select('*')
      .eq('estufa', estufa)
      .eq('lado', lado)
      .eq('vao', vao)
      .eq('canteiro', canteiro)
      .order('data_plantio', { ascending: false });
    if (error) throw error;
    return data || [];
  },
};

export const colheitasAPI = {
  list: async (limit = 500) => {
    return withCacheFallback(`cache_colheitas_${limit}`, async () => {
      const { data, error } = await supabase
        .from('colheitas')
        .select('*')
        .order('data_colheita', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    });
  },
  get: async (id) => {
    const { data, error } = await supabase.from('colheitas').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  create: async (data) => {
    const { data: result, error } = await supabase.from('colheitas').insert([data]).select().single();
    if (error) throw error;
    // Limpar todos os caches de colheitas
    Object.keys(localStorage).filter(k => k.startsWith('cache_colheitas')).forEach(k => localStorage.removeItem(k));
    return result;
  },
  update: async (id, data) => {
    const { data: result, error } = await supabase.from('colheitas').update(data).eq('id', id).select().single();
    if (error) throw error;
    Object.keys(localStorage).filter(k => k.startsWith('cache_colheitas')).forEach(k => localStorage.removeItem(k));
    return result;
  },
  delete: async (id) => {
    const { error } = await supabase.from('colheitas').delete().eq('id', id);
    if (error) throw error;
    Object.keys(localStorage).filter(k => k.startsWith('cache_colheitas')).forEach(k => localStorage.removeItem(k));
    return true;
  },
  // Busca todas as colheitas de um ano (sem limite fixo de registros)
  listByAno: async (ano) => {
    const cacheKey = `cache_colheitas_ano_${ano}`;
    return withCacheFallback(cacheKey, async () => {
      const inicio = `${ano}-01-01`;
      const fim    = `${ano}-12-31`;
      const { data, error } = await supabase
        .from('colheitas')
        .select('*')
        .gte('data_colheita', inicio)
        .lte('data_colheita', fim)
        .order('data_colheita', { ascending: false });
      if (error) throw error;
      return data || [];
    });
  },
};

export const descartesAPI = {
  list: async (limit = 500) => {
    return withCacheFallback(`cache_descartes_${limit}`, async () => {
      const { data, error } = await supabase
        .from('descartes')
        .select('*')
        .order('data_descarte', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    });
  },
  get: async (id) => {
    const { data, error } = await supabase.from('descartes').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  create: async (data) => {
    const { data: result, error } = await supabase.from('descartes').insert([data]).select().single();
    if (error) throw error;
    localStorage.removeItem('cache_descartes_500');
    localStorage.removeItem('cache_descartes_1000');
    return result;
  },
  update: async (id, data) => {
    const { data: result, error } = await supabase.from('descartes').update(data).eq('id', id).select().single();
    if (error) throw error;
    localStorage.removeItem('cache_descartes_500');
    localStorage.removeItem('cache_descartes_1000');
    return result;
  },
  delete: async (id) => {
    const { error } = await supabase.from('descartes').delete().eq('id', id);
    if (error) throw error;
    localStorage.removeItem('cache_descartes_500');
    localStorage.removeItem('cache_descartes_1000');
    return true;
  },
};

export const previsaoColheitaAPI = {
  list: async (limit = 500) => {
    return withCacheFallback(`cache_previsao_${limit}`, async () => {
      const { data, error } = await supabase
        .from('previsao_colheita')
        .select('*')
        .order('ano', { ascending: false })
        .order('semana', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    });
  },
  get: async (id) => {
    const { data, error } = await supabase.from('previsao_colheita').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  create: async (data) => {
    const { data: result, error } = await supabase.from('previsao_colheita').insert([data]).select().single();
    if (error) throw error;
    localStorage.removeItem('cache_previsao_500');
    return result;
  },
  update: async (id, data) => {
    const { data: result, error } = await supabase.from('previsao_colheita').update(data).eq('id', id).select().single();
    if (error) throw error;
    localStorage.removeItem('cache_previsao_500');
    return result;
  },
  delete: async (id) => {
    const { error } = await supabase.from('previsao_colheita').delete().eq('id', id);
    if (error) throw error;
    localStorage.removeItem('cache_previsao_500');
    return true;
  },
};

export const mudasSobradasAPI = {
  list: async () => {
    return withCacheFallback('cache_mudas_sobradas', async () => {
      const { data, error } = await supabase
        .from('mudas_sobradas')
        .select('*')
        .order('ano', { ascending: false })
        .order('semana', { ascending: false });
      if (error) throw error;
      return data || [];
    });
  },
  create: async (data) => {
    const { data: result, error } = await supabase.from('mudas_sobradas').insert([data]).select().single();
    if (error) throw error;
    localStorage.removeItem('cache_mudas_sobradas');
    return result;
  },
  delete: async (id) => {
    const { error } = await supabase.from('mudas_sobradas').delete().eq('id', id);
    if (error) throw error;
    localStorage.removeItem('cache_mudas_sobradas');
    return true;
  },
};

// ─── Pautas da Semana ────────────────────────────────────────────────────────
// Tabela: pauta_semana
// Colunas: id, semana, ano, cooperflora_oferta, cooperflora_mercado,
//          meta_oferta, meta_mercado, meta_barracão, observacoes, created_at
export const pautaSemanaAPI = {
  list: async () => {
    return withCacheFallback('cache_pauta_semana', async () => {
      const { data, error } = await supabase
        .from('pauta_semana')
        .select('*')
        .order('ano', { ascending: false })
        .order('semana', { ascending: false });
      if (error) throw error;
      return data || [];
    });
  },
  getBySemana: async (semana, ano) => {
    const { data, error } = await supabase
      .from('pauta_semana')
      .select('*')
      .eq('semana', semana)
      .eq('ano', ano)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  upsert: async (semana, ano, payload) => {
    // Verifica se já existe registro para essa semana/ano
    const existing = await pautaSemanaAPI.getBySemana(semana, ano);
    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('pauta_semana')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('pauta_semana')
        .insert([{ semana, ano, ...payload }])
        .select()
        .single();
      if (error) throw error;
      result = data;
    }
    localStorage.removeItem('cache_pauta_semana');
    return result;
  },
};
