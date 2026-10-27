import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalize } from "./simulacion";
import { generarLayout } from "./layout3d/generarLayout";
import { crearSimStore } from "../store/simStore";

const original = JSON.parse(readFileSync(new URL("../../instalacion.json", import.meta.url), "utf8"));

// Claves que lee unifilar.py.
const CLAVES_PY = ["tension", "tablero", "circuitos"];
const CLAVES_CIRCUITO_PY = ["id", "tipo", "descripcion", "amperes", "seccion_mm2", "bocas"];

describe("retrocompatibilidad", () => {
  it("el JSON de ejemplo sin layout3d se carga y genera un layout", () => {
    const cfg = normalize(structuredClone(original));
    const L = generarLayout(cfg);
    expect(L.bocas).toHaveLength(original.circuitos.reduce((s: number, k: { bocas: number }) => s + k.bocas, 0));
    expect(L.recorridos).toHaveLength(L.bocas.length);
  });

  it("el JSON exportado sigue teniendo lo que usa unifilar.py y no agrega layout3d", () => {
    const st = crearSimStore(normalize(structuredClone(original)));
    const exportado = JSON.parse(JSON.stringify(st.getState().cfg));
    for (const c of CLAVES_PY) expect(exportado).toHaveProperty(c);
    expect(exportado.tablero.termica_general).toMatchObject(original.tablero.termica_general);
    expect(exportado.tablero.diferencial).toMatchObject(original.tablero.diferencial);
    exportado.circuitos.forEach((k: Record<string, unknown>, i: number) => {
      for (const c of CLAVES_CIRCUITO_PY) expect(k[c]).toEqual(original.circuitos[i][c]);
    });
    expect(exportado).not.toHaveProperty("layout3d");
    for (const c of Object.keys(original)) expect(exportado).toHaveProperty(c);
  });

  it("un layout3d en el JSON se conserva al normalizar y exportar", () => {
    const cfg = normalize(structuredClone(original));
    const L = generarLayout(cfg);
    const conLayout = normalize({ ...original, layout3d: { ambientes: L.ambientes, tablero: L.tablero, bocas: L.bocas } });
    expect(JSON.parse(JSON.stringify(conLayout)).layout3d.bocas).toHaveLength(L.bocas.length);
  });
});
