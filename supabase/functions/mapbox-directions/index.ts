// Calcula a rota de carro entre dois pontos.
// Provedor padrão: OSRM (gratuito, sem chave). Opcional: Mapbox, se o segredo
// ROUTING_PROVIDER=mapbox estiver definido (usa o segredo MAPBOX_TOKEN).
// Só responde a usuários com acesso ao mapa (função has_map_access no banco).
//
// Deploy: supabase functions deploy mapbox-directions
// Segredos (opcionais): ROUTING_PROVIDER, MAPBOX_TOKEN

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isPoint(value: unknown): value is [number, number] {
  if (!Array.isArray(value) || value.length !== 2) return false;
  const [lng, lat] = value;
  return typeof lng === 'number' && typeof lat === 'number' &&
    Number.isFinite(lng) && Number.isFinite(lat) &&
    lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
}

// Ambos os provedores devolvem { distance, geometry } com coordenadas [lng, lat]
async function rotaOsrm(from: [number, number], to: [number, number]) {
  const url = `https://router.project-osrm.org/route/v1/driving/` +
    `${from[0]},${from[1]};${to[0]},${to[1]}?overview=full&geometries=geojson`;
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const data = await response.json();
  if (!response.ok || data.code !== 'Ok' || !data.routes?.length) return null;
  const rota = data.routes[0];
  return { distance: rota.distance, geometry: rota.geometry };
}

async function rotaMapbox(from: [number, number], to: [number, number], token: string) {
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/` +
    `${from[0]},${from[1]};${to[0]},${to[1]}?geometries=geojson&access_token=${token}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const data = await response.json();
  if (!response.ok || !data.routes?.length) return null;
  const rota = data.routes[0];
  return { distance: rota.distance, geometry: rota.geometry };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Checa o acesso com o token do próprio usuário
    const authorization = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authorization } } },
    );

    const { data: allowed, error: accessError } = await supabase.rpc('has_map_access');
    if (accessError || allowed !== true) {
      return json({ error: 'Sem acesso ao mapa.' }, 403);
    }

    const body = await req.json();
    if (!isPoint(body?.from) || !isPoint(body?.to)) {
      return json({ error: 'Coordenadas inválidas. Use [lng, lat].' }, 400);
    }

    const provedor = (Deno.env.get('ROUTING_PROVIDER') ?? 'osrm').toLowerCase();
    let rota;

    if (provedor === 'mapbox') {
      const token = Deno.env.get('MAPBOX_TOKEN');
      if (!token) return json({ error: 'MAPBOX_TOKEN não configurado no servidor.' }, 500);
      rota = await rotaMapbox(body.from, body.to, token);
    } else {
      rota = await rotaOsrm(body.from, body.to);
    }

    if (!rota) return json({ error: 'Não foi possível calcular a rota.' }, 422);
    return json(rota);
  } catch (err) {
    return json({ error: 'Erro ao calcular a rota: ' + String(err) }, 500);
  }
});
