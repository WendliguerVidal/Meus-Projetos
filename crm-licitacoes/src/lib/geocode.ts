import { municipios } from "municipios-brasil/dados";

// Coordenadas para o Mapa de processos — baseadas nos 5.571 municípios do Brasil (dados
// do IBGE via o pacote `municipios-brasil`), não mais numa lista de ~27 capitais com um
// deslocamento pseudo-aleatório para o resto. Esse deslocamento aleatório era a causa do
// bug relatado (prefeituras aparecendo em outro estado, ou no mar): para qualquer cidade
// fora daquela lista curta, o pino "pulava" para um ponto quase arbitrário dentro de um
// raio de ~140km do centro do estado. Agora toda cidade real do Brasil é encontrada com
// sua coordenada oficial; só cai no fallback (centro do estado, sem deslocamento) se o
// nome digitado não corresponder a nenhum município — e mesmo assim nunca sai do estado
// certo nem cai no oceano.

/** Centro aproximado de cada UF — usado apenas como fallback quando a cidade digitada não
 * é encontrada na base de municípios (erro de digitação, nome incompleto etc.). Sem
 * nenhum deslocamento aleatório: na pior das hipóteses o pino fica no meio do estado
 * certo, nunca em outro estado ou no mar. */
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

/** Tira acentos, baixa a caixa e normaliza espaços — mesma lógica usada para casar o que
 * o usuário digitou no campo "Cidade" com o nome oficial do município. */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** Índice cidade normalizada + UF -> coordenadas, construído uma vez a partir dos 5.571
 * municípios do IBGE. */
const CITY_INDEX = new Map<string, [number, number]>();
for (const m of municipios) {
  CITY_INDEX.set(`${normalize(m.nome)}|${m.uf}`, [m.latitude, m.longitude]);
}

/** Retorna [lat, lng] para uma cidade/UF digitada pelo usuário — precisa (base oficial do
 * IBGE) sempre que o nome bater com um município real; cai no centro do estado (sem
 * nenhum deslocamento aleatório) só quando não encontra correspondência. */
export function coordsFor(city: string, state: string): [number, number] {
  const key = `${normalize(city)}|${state}`;
  const exact = CITY_INDEX.get(key);
  if (exact) return exact;

  return STATE_CENTERS[state] ?? [-14.235, -51.9253]; // centro geográfico do Brasil
}
