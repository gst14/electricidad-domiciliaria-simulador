import type { Carga, Circuito, Config, Proteccion, Runtime, Severidad } from "./tipos";

export const IZ: Record<number, number>;
export const MAG: Record<string, number>;
export const CATALOGO: { n: string; w: number; fp?: number }[];
export const EJEMPLO: Config;

export function fmt(n: number, d?: number): string;
export function izOf(s: number): number;
export function hms(s: number): string;

export function normalize(c: unknown): Config;
export function freshRuntime(cfg: Config, old?: Runtime | null): Runtime;
export function logEv(rt: Runtime, type: "info" | "ok" | "trip", msg: string): void;

export function loadI(cfg: Config, k: Circuito): number;
export function loadP(k: Circuito): number;
export function loadA(cfg: Config, a: Carga): number;
export function heatRate(I: number, In: number): number;
export function trip(rt: Runtime, b: Proteccion, label: string, why: string): void;
export function step(cfg: Config, rt: Runtime, dt: number): void;
export function etaDisparo(b: Proteccion, I: number, In: number): number | null;

export function statusOf(cfg: Config, rt: Runtime): { cl: "" | "warn" | "bad"; msg: string };
export function gradoDe(m2: number): { g: string; min: number };
export function validate(cfg: Config): {
  checks: [Severidad, string][];
  gr: { g: string; min: number } | null;
  maxI: number;
};
