import { useStore } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { createStore } from "zustand/vanilla";
import { CATALOGO, EJEMPLO, freshRuntime, logEv, normalize, step, trip } from "../domain/simulacion";
import type { Carga, Circuito, Config, Proteccion, Runtime } from "../domain/simulacion";
import { generarLayout } from "../domain/layout3d/generarLayout";
import type { Layout3D } from "../domain/layout3d/tipos";

export const KEY = "tablerista-cfg";
const storage = {
  get(): string | null { try { return localStorage.getItem(KEY); } catch { return null; } },
  set(v: string) { try { localStorage.setItem(KEY, v); } catch { /* sin storage */ } },
};
export function cfgInicial(): Config {
  try { const saved = storage.get(); return normalize(saved ? JSON.parse(saved) : structuredClone(EJEMPLO)); }
  catch { return normalize(structuredClone(EJEMPLO)); }
}

export type Vista = "tablero" | "3d";
export type ClaveProteccion = "tg" | "id" | string;

export type Capa = "casa" | "canerias" | "bocas" | "artefactos" | "luminarias" | "etiquetas";
export type PestanaPanel = "circuitos" | "tablero" | "fallas";
export type PresetCamara = "iso" | "planta" | "tablero" | "ambiente";

/* Elemento seleccionado o bajo el cursor en la vista 3D. */
export interface Seleccion {
  tipo: "circuito" | "boca" | "artefacto" | "proteccion";
  circuitoId?: string;
  bocaId?: string;
  cargaIndex?: number;
  proteccion?: ClaveProteccion;
}

export interface UI3D {
  seleccion: Seleccion | null;
  hover: (Seleccion & { punto: [number, number, number] }) | null;
  capas: Record<Capa, boolean>;
  rayosX: boolean;
  corte: boolean;
  techo: boolean;
  soloSeleccion: boolean;
  pestana: PestanaPanel;
  panelAbierto: boolean;
  hoja: "cerrada" | "media" | "completa"; // bottom sheet en mobile
  camara: { preset: PresetCamara; ambienteId?: string; n: number }; // n cambia en cada pedido
  pose: number[] | null; // posición + target de la cámara, para restaurarla al volver a la vista
  destellos: { circuitoId: string; bocaId?: string; t: number }[];
}

export interface UI {
  vista: Vista;
}

export interface Acciones {
  tick(dtReal: number): void;
  lever(key: ClaveProteccion): void;
  rearmar(key: ClaveProteccion): void;
  testId(): void;
  addLoad(ci: number, idx: number): void;
  removeLoad(ci: number, ai: number): void;
  toggleLoad(ci: number, ai: number, on: boolean): void;
  setCarga(ci: number, ai: number, patch: Partial<Carga>): void;
  setCircuito(ci: number, patch: Partial<Omit<Circuito, "id" | "cargas">>): void;
  setTablero(patch: { termica_general?: Partial<Config["tablero"]["termica_general"]>; diferencial?: Partial<Config["tablero"]["diferencial"]> }): void;
  setPuestaTierra(patch: Partial<Config["puesta_tierra"]>): void;
  setLeak(ci: number, mA: number, bocaId?: string): void;
  short(ci: number): void;
  togglePlay(): void;
  setSpeed(s: number): void;
  rearmAll(): void;
  clearLog(): void;
  applyText(txt: string): string | null;
  restoreSample(): void;
  setVista(v: Vista): void;
  setUi3d(patch: Partial<UI3D> | ((u: UI3D) => Partial<UI3D>)): void;
}

// cfg es inmutable (se reemplaza en cada edición); rt (runtime) es mutable y cada
// cambio incrementa version para que los suscriptores se enteren.
export interface SimState {
  cfg: Config;
  rt: Runtime;
  version: number;
  ui: UI;
  ui3d: UI3D;
  actions: Acciones;
}

export const ui3dInicial = (): UI3D => ({
  seleccion: null, hover: null,
  capas: { casa: true, canerias: true, bocas: true, artefactos: true, luminarias: true, etiquetas: true },
  rayosX: false, corte: false, techo: false, soloSeleccion: false,
  pestana: "circuitos", panelAbierto: true, hoja: "media",
  camara: { preset: "iso", n: 0 }, pose: null, destellos: [],
});

export function crearSimStore(cfg: Config = cfgInicial()) {
  return createStore<SimState>()(subscribeWithSelector((set, get) => {
    const bump = () => set((s) => ({ version: s.version + 1 }));
    const act = (fn: (rt: Runtime, cfg: Config) => void) => { const { rt, cfg } = get(); fn(rt, cfg); step(cfg, rt, 0); bump(); };
    const commit = (next: Config, rt?: Runtime) => {
      set({ cfg: next, ...(rt ? { rt } : {}) });
      step(next, get().rt, 0);
      bump();
    };
    const editCfg = (fn: (c: Config) => void) => { const next = structuredClone(get().cfg); fn(next); commit(next); };
    const breaker = (rt: Runtime, key: ClaveProteccion): Proteccion => (key === "tg" ? rt.tg : key === "id" ? rt.id : rt.c[key]);
    const nombre = (key: ClaveProteccion) => (key === "tg" ? "Térmica general" : key === "id" ? "Diferencial" : "Térmica " + key);

    const actions: Acciones = {
      // En pausa el paso no cambia nada: no se notifica, así la vista 3D no redibuja.
      tick: (dtReal) => { const { cfg, rt } = get(); step(cfg, rt, rt.running ? dtReal * rt.speed : 0); if (rt.running) bump(); },
      lever: (key) => act((rt) => {
        const b = breaker(rt, key);
        if (b.on) { b.on = false; logEv(rt, "info", `${nombre(key)} abierta manualmente.`); }
        else { b.on = true; b.tripped = false; logEv(rt, "ok", `${nombre(key)} rearmada.`); }
      }),
      rearmar: (key) => act((rt) => {
        const b = breaker(rt, key);
        if (!b.on) { b.on = true; b.tripped = false; logEv(rt, "ok", `${nombre(key)} rearmada.`); }
      }),
      testId: () => act((rt) => {
        if (rt.id.on) trip(rt, rt.id, "Diferencial", "botón de prueba presionado. Así se verifica una vez por mes que el mecanismo funciona.");
      }),
      addLoad: (ci, idx) => editCfg((c) => {
        const a = CATALOGO[idx];
        c.circuitos[ci].cargas.push({ nombre: a.n, potencia_w: a.w, ...(a.fp ? { fp: a.fp } : {}), encendida: true });
      }),
      removeLoad: (ci, ai) => editCfg((c) => { c.circuitos[ci].cargas.splice(ai, 1); }),
      toggleLoad: (ci, ai, on) => editCfg((c) => { c.circuitos[ci].cargas[ai].encendida = on; }),
      setCarga: (ci, ai, patch) => editCfg((c) => { Object.assign(c.circuitos[ci].cargas[ai], patch); }),
      setCircuito: (ci, patch) => editCfg((c) => { Object.assign(c.circuitos[ci], patch); }),
      setTablero: (patch) => editCfg((c) => {
        Object.assign(c.tablero.termica_general, patch.termica_general);
        Object.assign(c.tablero.diferencial, patch.diferencial);
      }),
      setPuestaTierra: (patch) => editCfg((c) => { Object.assign(c.puesta_tierra, patch); }),
      setLeak: (ci, v, bocaId) => act((rt, c) => {
        const k = c.circuitos[ci];
        rt.c[k.id].leak = v;
        rt.c[k.id].leakBoca = v ? bocaId : undefined;
        logEv(rt, "info", v ? `${k.id}: falla de aislación de ${v} mA hacia la carcasa.` : `${k.id}: aislación reparada.`);
      }),
      short: (ci) => act((rt, c) => {
        const k = c.circuitos[ci], s = rt.c[k.id];
        if (rt.tg.on && rt.id.on && s.on) trip(rt, s, `Térmica ${k.id}`, "cortocircuito, más de 1000 A en milisegundos. Disparo magnético instantáneo; la general no llega a actuar (selectividad).");
        else logEv(rt, "info", `${k.id} no tiene tensión: el cortocircuito no hace nada.`);
      }),
      togglePlay: () => { get().rt.running = !get().rt.running; bump(); },
      setSpeed: (s) => { get().rt.speed = s; bump(); },
      rearmAll: () => act((rt) => {
        [rt.tg, rt.id, ...Object.values(rt.c)].forEach((b) => { b.on = true; b.tripped = false; b.heat = 0; });
        logEv(rt, "ok", "Todas las protecciones rearmadas.");
      }),
      clearLog: () => { get().rt.log = []; bump(); },
      // Devuelve el mensaje de error, o null si se aplicó.
      applyText: (txt) => {
        try {
          const next = normalize(JSON.parse(txt));
          commit(next, freshRuntime(next, get().rt));
          logEv(get().rt, "ok", `Configuración aplicada: ${next.circuitos.length} circuitos.`);
          return null;
        } catch (err) {
          return (err instanceof SyntaxError ? "El JSON no es válido: " : "") + (err as Error).message;
        }
      },
      restoreSample: () => {
        const next = normalize(structuredClone(EJEMPLO));
        const rt = freshRuntime(next, get().rt);
        rt.simT = 0; rt.kwh = 0; rt.log = [];
        commit(next, rt);
        logEv(rt, "ok", "Ejemplo restaurado.");
      },
      setVista: (vista) => set((s) => ({ ui: { ...s.ui, vista } })),
      setUi3d: (patch) => set((s) => ({ ui3d: { ...s.ui3d, ...(typeof patch === "function" ? patch(s.ui3d) : patch) } })),
    };

    const rt = freshRuntime(cfg);
    step(cfg, rt, 0);
    return { cfg, rt, version: 0, ui: { vista: "tablero" }, ui3d: ui3dInicial(), actions };
  }));
}

export type SimStore = ReturnType<typeof crearSimStore>;

export const simStore = crearSimStore();

export function useSimStore<T>(selector: (s: SimState) => T): T {
  return useStore(simStore, selector);
}

/*
 * Layout 3D derivado de cfg. Solo depende de la estructura (bocas, tipos, nombres de cargas,
 * superficie, layout3d): encender cargas o cambiar amperes devuelve el mismo objeto.
 */
let cacheLayout: { firma: string; layout: Layout3D } | null = null;
export function firmaLayout(cfg: Config): string {
  return JSON.stringify([cfg.superficie_m2, cfg.layout3d ?? null,
    cfg.circuitos.map((k) => [k.id, k.tipo, k.bocas, k.descripcion, k.cargas.map((a) => a.nombre)])]);
}
export function selectLayout3d(s: Pick<SimState, "cfg">): Layout3D {
  const firma = firmaLayout(s.cfg);
  if (cacheLayout?.firma !== firma) cacheLayout = { firma, layout: generarLayout(s.cfg, cacheLayout?.layout) };
  return cacheLayout.layout;
}

let detener: (() => void) | null = null;

/* Arranca el reloj de 100 ms y la persistencia. Idempotente. */
export function iniciarSimulacion(store: SimStore = simStore): () => void {
  if (detener) return detener;
  storage.set(JSON.stringify(store.getState().cfg, null, 2));
  const unsub = store.subscribe((s) => s.cfg, (cfg) => storage.set(JSON.stringify(cfg, null, 2)));
  let last = performance.now();
  const id = setInterval(() => {
    const now = performance.now(), dt = Math.min(0.5, (now - last) / 1000);
    last = now;
    store.getState().actions.tick(dt);
  }, 100);
  detener = () => { clearInterval(id); unsub(); detener = null; };
  return detener;
}
