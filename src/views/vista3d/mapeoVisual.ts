import { etaDisparo, izOf } from "../../domain/simulacion";
import type { Carga, Circuito, Config, Runtime } from "../../domain/simulacion";

/* Funciones puras: estado eléctrico → cómo se ve. Sin three.js ni DOM. */

export type Nivel = "normal" | "ambar" | "naranja" | "rojo" | "sin_tension";
export type Pulso = "no" | "lento" | "rapido";

export const UMBRAL_AMBAR = 0.6;
export const UMBRAL_NARANJA = 0.9;

export const COLOR_NIVEL = { ambar: "#E3A21A", naranja: "#E8711C" } as const;

export interface EstadoVisual {
  conTension: boolean;
  disparada: boolean;
  I: number;
  carga: number; // I / In
  nivel: Nivel;
  pulso: Pulso;
  flujo: number; // velocidad del flujo animado (m/s); 0 = no se ve
  etiqueta: string; // texto que acompaña al color: "82 %", "DISPARADA", "SIN TENSIÓN"
  iz: number;
  subdimensionado: boolean; // In > Iz: la protección no cuida al cable (regla de validate)
  izExcedida: boolean; // I > Iz en este momento
  eta: number | null; // segundos simulados hasta el disparo térmico, del motor
}

export function nivelDeCarga(carga: number): { nivel: Nivel; pulso: Pulso } {
  if (carga > 1) return { nivel: "rojo", pulso: "rapido" };
  if (carga >= UMBRAL_NARANJA) return { nivel: "naranja", pulso: "lento" };
  if (carga >= UMBRAL_AMBAR) return { nivel: "ambar", pulso: "no" };
  return { nivel: "normal", pulso: "no" };
}

/* Velocidad del flujo: crece con la corriente pero sin volverse ilegible. */
export const velocidadFlujo = (I: number) => (I > 0.005 ? 0.25 + Math.sqrt(I) * 0.22 : 0);

export const hayTension = (rt: Runtime, id: string) => rt.tg.on && rt.id.on && !!rt.c[id]?.on;

export function estadoVisualCircuito(_cfg: Config, rt: Runtime, k: Circuito): EstadoVisual {
  const s = rt.c[k.id], iz = izOf(k.seccion_mm2);
  const conTension = hayTension(rt, k.id), I = conTension ? s.I : 0, carga = I / k.amperes;
  const base = { conTension, disparada: s.tripped, I, carga, iz, subdimensionado: k.amperes > iz, izExcedida: I > iz };
  if (!conTension) {
    return { ...base, nivel: "sin_tension", pulso: "no", flujo: 0, eta: null, etiqueta: s.tripped ? "DISPARADA" : "SIN TENSIÓN" };
  }
  return { ...base, ...nivelDeCarga(carga), flujo: velocidadFlujo(I), eta: etaDisparo(s, I, k.amperes), etiqueta: `${Math.round(carga * 100)} %` };
}

/* Brillo de un pulso en el instante t (s): 0..1. Con movimiento reducido, fijo. */
export function intensidadPulso(pulso: Pulso, t: number, reducido = false): number {
  if (pulso === "no" || reducido) return pulso === "no" ? 0 : 1;
  const f = pulso === "rapido" ? 3 : 1;
  return 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * f);
}

export const luzEncendida = (rt: Runtime, k: Circuito, a: Carga | undefined) => !!a?.encendida && hayTension(rt, k.id);

/* Mismo criterio que statusOf: sin jabalina, una fuga en un circuito con tensión deja la carcasa con tensión. */
export const carcasaEnergizada = (cfg: Config, rt: Runtime, k: Circuito) =>
  !cfg.puesta_tierra.jabalina && rt.c[k.id].leak > 0 && hayTension(rt, k.id);

/* La fuga circula a tierra (y se ve el trazo hacia la jabalina) solo si hay tensión y jabalina. */
export const fugaATierra = (cfg: Config, rt: Runtime, k: Circuito) =>
  cfg.puesta_tierra.jabalina && rt.c[k.id].leak > 0 && hayTension(rt, k.id);

/* Mismos umbrales que validate: > 40 Ω error, > 10 Ω aviso. */
export function estadoTierra(cfg: Config): "ok" | "warn" | "error" {
  const pe = cfg.puesta_tierra;
  if (!pe.jabalina || pe.resistencia_ohm > 40) return "error";
  return pe.resistencia_ohm > 10 ? "warn" : "ok";
}

export function colorNivel(nivel: Nivel, base: string, p: { trip: string; line: string }): string {
  switch (nivel) {
    case "ambar": return COLOR_NIVEL.ambar;
    case "naranja": return COLOR_NIVEL.naranja;
    case "rojo": return p.trip;
    case "sin_tension": return p.line;
    default: return base;
  }
}

/* ¿Hay algo que animar? Si no, el Canvas no dibuja frames. */
export function hayAnimacion(cfg: Config, rt: Runtime, reducido: boolean): boolean {
  if (reducido) return false;
  return cfg.circuitos.some((k) => {
    const e = estadoVisualCircuito(cfg, rt, k);
    return (rt.running && e.flujo > 0) || e.pulso !== "no" || e.izExcedida || rt.c[k.id].leak > 0;
  });
}
