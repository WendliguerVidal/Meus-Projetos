// Coordenadas aproximadas para renderização do Mapa (sem necessidade de chaves pagas /
// geocodificação externa). Centros dos estados servem de fallback quando a cidade não
// está no dicionário; um pequeno "jitter" determinístico evita sobreposição total dos pinos.

export const STATE_CENTERS: Record<string, [number, number]> = {
  AC: [-9.0238, -70.812],
  AL: [-9.5713, -36.782],
  AP: [1.4148, -51.7754],
  AM: [-3.4168, -65.8561],
  BA: [-12.5797, -41.7007],
  CE: [-5.4984, -39.3206],
  DF: [-15.7998, -47.8645],
  ES: [-19.1834, -40.3089],
  GO: [-15.827, -49.8362],
  MA: [-4.9609, -45.2744],
  MT: [-12.6819, -56.9211],
  MS: [-20.7722, -54.7852],
  MG: [-18.5122, -44.555],
  PA: [-3.9014, -52.4788],
  PB: [-7.2399, -36.782],
  PR: [-24.8932, -51.4292],
  PE: [-8.8137, -36.9541],
  PI: [-8.5578, -42.7616],
  RJ: [-22.9068, -43.1729],
  RN: [-5.4026, -36.9541],
  RS: [-30.0346, -51.2177],
  RO: [-10.83, -63.34],
  RR: [2.7376, -62.0751],
  SC: [-27.2423, -50.2189],
  SP: [-22.1908, -48.7938],
  SE: [-10.5741, -37.3857],
  TO: [-10.1753, -48.2982],
};

const CITY_COORDS: Record<string, [number, number]> = {
  "belo horizonte": [-19.9167, -43.9345],
  "são paulo": [-23.5505, -46.6333],
  "rio de janeiro": [-22.9068, -43.1729],
  "brasília": [-15.7998, -47.8645],
  "salvador": [-12.9777, -38.5016],
  "fortaleza": [-3.7172, -38.5433],
  "curitiba": [-25.4284, -49.2733],
  "recife": [-8.0476, -34.877],
  "porto alegre": [-30.0346, -51.2177],
  "manaus": [-3.119, -60.0217],
  "belém": [-1.4558, -48.4902],
  "goiânia": [-16.6869, -49.2648],
  "campinas": [-22.9099, -47.0626],
  "são luís": [-2.5297, -44.3028],
  "maceió": [-9.6498, -35.7089],
  "natal": [-5.7945, -35.211],
  "campo grande": [-20.4697, -54.6201],
  "joão pessoa": [-7.1195, -34.845],
  "teresina": [-5.0892, -42.8019],
  "florianópolis": [-27.5954, -48.548],
  "vitória": [-20.3155, -40.3128],
  "aracaju": [-10.9472, -37.0731],
  "cuiabá": [-15.601, -56.0974],
  "uberlândia": [-18.9186, -48.2772],
  "contagem": [-19.9317, -44.0536],
  "juiz de fora": [-21.7642, -43.3503],
  "londrina": [-23.3103, -51.1628],
};

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

/** Retorna [lat, lng] aproximados para uma cidade/UF, com leve variação determinística. */
export function coordsFor(city: string, state: string): [number, number] {
  const key = city.trim().toLowerCase();
  const exact = CITY_COORDS[key];
  if (exact) return exact;

  const base = STATE_CENTERS[state] ?? [-14.235, -51.9253]; // centro geográfico do Brasil
  const h = hashString(`${key}-${state}`);
  const jitterLat = ((h % 1000) / 1000 - 0.5) * 2.5;
  const jitterLng = (((h >> 10) % 1000) / 1000 - 0.5) * 2.5;
  return [base[0] + jitterLat, base[1] + jitterLng];
}
