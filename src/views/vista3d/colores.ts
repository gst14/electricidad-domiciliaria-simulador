import { useEffect, useState } from "react";
import type { Config } from "../../domain/simulacion";

const TOKENS = ["bg", "surface", "module", "ink", "muted", "line", "rail", "fase", "neutro", "tierra", "live", "trip", "ok", "warn",
  "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8"] as const;
export type Paleta = Record<(typeof TOKENS)[number], string>;

const DEFECTO: Paleta = {
  bg: "#E8EBEA", surface: "#F7F8F6", module: "#FDFDFB", ink: "#1B2226", muted: "#5B666C", line: "#CBD2D4", rail: "#B4BCBF",
  fase: "#8E5530", neutro: "#3A8FBF", tierra: "#5A962B", live: "#C9830A", trip: "#C4381F", ok: "#2C7A4B", warn: "#A86E12",
  c1: "#7A4FC9", c2: "#0F8C7A", c3: "#C23D86", c4: "#3557C9", c5: "#5E8A12", c6: "#0E86A8", c7: "#9C3FB0", c8: "#5E6F86",
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
 * Color de cada circuito según su orden (tokens --c1…--c8), igual que en la vista Tablero.
 * Son tonos que no se confunden con los de alarma (ámbar, naranja, rojo) ni con fase/neutro/tierra.
 */
export function coloresCircuitos(cfg: Config, p: Paleta): Record<string, string> {
  const tonos = [p.c1, p.c2, p.c3, p.c4, p.c5, p.c6, p.c7, p.c8];
  return Object.fromEntries(cfg.circuitos.map((k, i) => [k.id, tonos[i % tonos.length]]));
}
