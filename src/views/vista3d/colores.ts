import { useEffect, useState } from "react";
import { Color } from "three";
import type { Config } from "../../domain/simulacion";

const TOKENS = ["bg", "surface", "module", "ink", "muted", "line", "rail", "fase", "neutro", "tierra", "live", "trip", "ok", "warn"] as const;
export type Paleta = Record<(typeof TOKENS)[number], string>;

const DEFECTO: Paleta = {
  bg: "#E8EBEA", surface: "#F7F8F6", module: "#FDFDFB", ink: "#1B2226", muted: "#5B666C", line: "#CBD2D4", rail: "#B4BCBF",
  fase: "#8E5530", neutro: "#3A8FBF", tierra: "#5A962B", live: "#C9830A", trip: "#C4381F", ok: "#2C7A4B", warn: "#A86E12",
};

function leer(): Paleta {
  if (typeof document === "undefined") return DEFECTO;
  const cs = getComputedStyle(document.documentElement);
  return Object.fromEntries(TOKENS.map((t) => [t, cs.getPropertyValue("--" + t).trim() || DEFECTO[t]])) as Paleta;
}

/* Tokens de diseño del proyecto; se releen al cambiar el tema claro/oscuro. */
export function usePaleta(): Paleta {
  const [p, setP] = useState(leer);
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const upd = () => setP(leer());
    mq.addEventListener("change", upd);
    const mo = new MutationObserver(upd);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "style", "class"] });
    return () => { mq.removeEventListener("change", upd); mo.disconnect(); };
  }, []);
  return p;
}

/*
 * Color de cada circuito, consistente con los chips de la vista Tablero: tono base por tipo
 * (IUG → live, TUG → neutro, TUE → fase, otros → tierra) y luminosidad según el orden dentro del tipo.
 */
export function coloresCircuitos(cfg: Config, p: Paleta): Record<string, string> {
  const base = (tipo: string) => (tipo === "IUG" ? p.live : tipo === "TUG" ? p.neutro : tipo === "TUE" ? p.fase : p.tierra);
  const vistos: Record<string, number> = {};
  return Object.fromEntries(cfg.circuitos.map((k) => {
    const n = (vistos[k.tipo] = (vistos[k.tipo] ?? -1) + 1);
    const c = new Color(base(k.tipo)).offsetHSL(0, 0, [0, 0.12, -0.12, 0.22, -0.2][n % 5]);
    return [k.id, "#" + c.getHexString()];
  }));
}
