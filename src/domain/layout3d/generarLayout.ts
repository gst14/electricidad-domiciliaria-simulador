import type { Circuito, Config } from "../simulacion/tipos";
import { rutearTodo } from "./ruteo";
import type { Ambiente, Boca, Layout3D, TipoBoca, Vec3 } from "./tipos";

export const ALTO = 2.6;
export const ALTURA_LLAVE = 1.1;
export const ALTURA_TOMA = 0.3;
export const ALTURA_TABLERO = 1.5;
const SUPERFICIE_DEFECTO = 95;
const DESPEGUE = 0.02; // las bocas de muro quedan 2 cm hacia adentro del ambiente
const NOMBRES = ["Living", "Cocina", "Baño", "Dormitorio 1", "Dormitorio 2", "Dormitorio 3", "Lavadero", "Estudio"];
const TIPOS_BOCA: TipoBoca[] = ["centro", "aplique", "toma", "llave", "caja_paso"];

const r = (n: number) => Math.round(n * 1000) / 1000;
const pad = (n: number) => String(n).padStart(2, "0");

/* Hash determinístico (FNV-1a) para rotar el reparto de bocas según el circuito. */
function semilla(s: string): number {
  let h = 2166136261;
  for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export type Clase = "luz" | "tomas" | "dedicado";
export function claseDe(tipo: string): Clase {
  if (tipo.startsWith("I")) return "luz";
  if (tipo === "TUG") return "tomas";
  return tipo.endsWith("E") ? "dedicado" : "tomas";
}

/* ---------- ambientes ---------- */
export function generarAmbientes(superficie: number): Ambiente[] {
  const S = superficie > 0 ? superficie : SUPERFICIE_DEFECTO;
  const n = Math.min(NOMBRES.length, Math.max(3, Math.round(S / 16)));
  const cols = Math.ceil(Math.sqrt(n)), filas = Math.ceil(n / cols);
  const W = Math.sqrt(S * 1.25), L = S / W;
  const out: Ambiente[] = [];
  for (let f = 0, i = 0; f < filas; f++) {
    const enFila = Math.min(cols, n - i), ancho = W / enFila, largo = L / filas;
    for (let c = 0; c < enFila; c++, i++) {
      out.push({ id: "A" + (i + 1), nombre: NOMBRES[i], x: r(c * ancho), z: r(f * largo), ancho: r(ancho), largo: r(largo), alto: ALTO });
    }
  }
  return out;
}

/* ---------- bocas ---------- */
type Muro = 0 | 1 | 2 | 3; // 0 frente (z mín), 1 derecha (x máx), 2 fondo (z máx), 3 izquierda (x mín)
function sobreMuro(a: Ambiente, muro: Muro, t: number, y: number): { posicion: Vec3; normal: Vec3 } {
  switch (muro) {
    case 0: return { posicion: [r(a.x + a.ancho * t), y, r(a.z + DESPEGUE)], normal: [0, 0, 1] };
    case 1: return { posicion: [r(a.x + a.ancho - DESPEGUE), y, r(a.z + a.largo * t)], normal: [-1, 0, 0] };
    case 2: return { posicion: [r(a.x + a.ancho * (1 - t)), y, r(a.z + a.largo - DESPEGUE)], normal: [0, 0, -1] };
    default: return { posicion: [r(a.x + DESPEGUE), y, r(a.z + a.largo * (1 - t))], normal: [1, 0, 0] };
  }
}

function alturaDedicada(k: Circuito): number {
  const n = k.cargas.map((a) => a.nombre).join(" ").toLowerCase();
  if (n.includes("aire")) return 2.0;
  if (n.includes("termotanque")) return 1.5;
  return 1.2;
}
function ambienteDedicado(k: Circuito, amb: Ambiente[]): Ambiente {
  const n = (k.descripcion + " " + k.cargas.map((a) => a.nombre).join(" ")).toLowerCase();
  const por = (nombre: string) => amb.find((a) => a.nombre.startsWith(nombre));
  if (n.includes("aire")) return por("Dormitorio") ?? amb[0];
  if (n.includes("termotanque")) return por("Baño") ?? por("Cocina") ?? amb[0];
  return por("Cocina") ?? amb[0];
}

/* Genera exactamente k.bocas bocas para el circuito, repartidas entre los ambientes. */
export function generarBocasCircuito(k: Circuito, amb: Ambiente[]): Boca[] {
  const n = Math.max(0, Math.floor(k.bocas)), clase = claseDe(k.tipo);
  if (!n || !amb.length) return [];
  const rot = semilla(k.id) % amb.length;
  const orden = amb.map((_, i) => amb[(i + rot) % amb.length]);
  const id = (i: number) => `${k.id}-b${pad(i + 1)}`;

  if (clase === "dedicado") {
    const a = ambienteDedicado(k, amb), y = alturaDedicada(k);
    return Array.from({ length: n }, (_, i) => ({ id: id(i), circuitoId: k.id, tipo: "toma" as const, ambienteId: a.id, ...sobreMuro(a, 2, (i + 1) / (n + 1), y) }));
  }

  // Ranuras (ambiente, tipo): luz → centro y llave por ambiente en la primera vuelta, después más centros.
  const ranuras: { a: Ambiente; tipo: TipoBoca }[] = [];
  for (let vuelta = 0; ranuras.length < n; vuelta++) {
    for (const a of orden) {
      if (clase === "luz") ranuras.push({ a, tipo: "centro" }, ...(vuelta === 0 ? [{ a, tipo: "llave" as TipoBoca }] : []));
      else ranuras.push({ a, tipo: "toma" });
    }
  }
  ranuras.length = n;

  const cuenta = new Map<string, number>(), indice = new Map<string, number>();
  ranuras.forEach(({ a, tipo }) => cuenta.set(a.id + tipo, (cuenta.get(a.id + tipo) ?? 0) + 1));
  return ranuras.map(({ a, tipo }, i) => {
    const key = a.id + tipo, j = indice.get(key) ?? 0, m = cuenta.get(key)!;
    indice.set(key, j + 1);
    let pos: { posicion: Vec3; normal: Vec3 };
    if (tipo === "centro") pos = { posicion: [r(a.x + a.ancho * (j + 1) / (m + 1)), a.alto, r(a.z + a.largo / 2)], normal: [0, -1, 0] };
    else if (tipo === "llave") pos = sobreMuro(a, 0, Math.min(0.9, 0.3 / a.ancho), ALTURA_LLAVE);
    else { const muro = ((j + rot) % 4) as Muro, porMuro = Math.ceil(m / 4), k2 = Math.floor(j / 4); pos = sobreMuro(a, muro, (k2 + 1) / (porMuro + 1), ALTURA_TOMA); }
    return { id: id(i), circuitoId: k.id, tipo, ambienteId: a.id, ...pos };
  });
}

/* Luminarias a centros y apliques; artefactos a tomas. Si hay menos cargas que bocas, se reparten en ronda. */
export function asignarCargas(k: Circuito, bocas: Boca[]): Boca[] {
  const destino = bocas.filter((b) => (claseDe(k.tipo) === "luz" ? b.tipo === "centro" || b.tipo === "aplique" : b.tipo === "toma"));
  const nc = k.cargas.length;
  return bocas.map((b) => {
    const { cargaIndex: _c, ...resto } = b;
    const j = destino.indexOf(b);
    return j >= 0 && nc ? { ...resto, cargaIndex: j % nc } : resto;
  });
}

/* Boca donde va el artefacto cargas[ai] (la de su cargaIndex, o en ronda sobre las bocas destino). */
export function bocaDeCarga(layout: Layout3D, k: Circuito, ai: number): Boca | undefined {
  const propias = layout.bocas.filter((b) => b.circuitoId === k.id);
  const directa = propias.find((b) => b.cargaIndex === ai);
  if (directa) return directa;
  const destino = propias.filter((b) => (claseDe(k.tipo) === "luz" ? b.tipo === "centro" || b.tipo === "aplique" : b.tipo === "toma"));
  return destino.length ? destino[ai % destino.length] : propias[0];
}

/* ---------- validación del layout3d que viene en el JSON ---------- */
const esNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const esVec = (v: unknown): v is Vec3 => Array.isArray(v) && v.length === 3 && v.every(esNum);
function ambientesValidos(v: unknown): Ambiente[] | null {
  if (!Array.isArray(v) || !v.length) return null;
  const ok = v.every((a) => a && typeof a.id === "string" && ["x", "z", "ancho", "largo", "alto"].every((c) => esNum(a[c])) && a.ancho > 0 && a.largo > 0 && a.alto > 0);
  return ok ? v.map((a) => ({ ...a, nombre: String(a.nombre ?? a.id) })) : null;
}
function bocasValidas(v: unknown, amb: Ambiente[]): Boca[] {
  if (!Array.isArray(v)) return [];
  const ids = new Set(amb.map((a) => a.id));
  return v.filter((b) => b && typeof b.id === "string" && typeof b.circuitoId === "string" && TIPOS_BOCA.includes(b.tipo)
    && ids.has(b.ambienteId) && esVec(b.posicion) && esVec(b.normal));
}

/*
 * Layout 3D por defecto a partir del JSON eléctrico. Determinístico: mismo JSON → mismo layout.
 * Conserva las bocas de cfg.layout3d (editadas por el usuario) y, si se pasa, las del layout previo;
 * solo se regeneran las bocas de un circuito cuando cambia su cantidad.
 */
export function generarLayout(cfg: Config, previo?: Layout3D): Layout3D {
  const usuario = (cfg.layout3d && typeof cfg.layout3d === "object" ? cfg.layout3d : {}) as Partial<Layout3D>;
  const ambientes = ambientesValidos(usuario.ambientes) ?? generarAmbientes(cfg.superficie_m2);
  const mismoPlano = previo && JSON.stringify(previo.ambientes) === JSON.stringify(ambientes);
  const t = usuario.tablero;
  const tablero = t && esVec(t.posicion) && ambientes.some((a) => a.id === t.ambienteId)
    ? { posicion: t.posicion, ambienteId: t.ambienteId }
    : { posicion: [r(ambientes[0].x + 0.6), ALTURA_TABLERO, r(ambientes[0].z + DESPEGUE)] as Vec3, ambienteId: ambientes[0].id };

  const deUsuario = bocasValidas(usuario.bocas, ambientes);
  const dePrevio = mismoPlano ? previo!.bocas : [];
  const bocas: Boca[] = [];
  for (const k of cfg.circuitos) {
    const n = Math.max(0, Math.floor(k.bocas));
    const fijadas = deUsuario.filter((b) => b.circuitoId === k.id);
    const existentes = fijadas.length ? fijadas : dePrevio.filter((b) => b.circuitoId === k.id);
    let propias: Boca[];
    if (existentes.length === n) propias = existentes;
    else {
      const conservadas = existentes.slice(0, n), usados = new Set(conservadas.map((b) => b.id));
      const nuevas = generarBocasCircuito(k, ambientes).slice(conservadas.length)
        .map((b) => { let id = b.id; while (usados.has(id)) id += "'"; usados.add(id); return { ...b, id }; });
      propias = [...conservadas, ...nuevas];
    }
    // cargaIndex explícito del usuario se respeta; el resto se recalcula (las cargas pueden haber cambiado).
    const explicito = fijadas.length > 0 && fijadas.some((b) => b.cargaIndex !== undefined);
    bocas.push(...(explicito ? propias : asignarCargas(k, propias)));
  }

  const carriles = Object.fromEntries(cfg.circuitos.map((k, i) => [k.id, i]));
  const recorridos = Array.isArray(usuario.recorridos) && usuario.recorridos.length
    ? usuario.recorridos
    : rutearTodo(tablero.posicion, bocas, ambientes, carriles);
  return { ambientes, tablero, bocas, recorridos };
}
