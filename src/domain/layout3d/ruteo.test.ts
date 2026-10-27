import { describe, expect, it } from "vitest";
import { EJEMPLO, normalize } from "../simulacion";
import { generarLayout } from "./generarLayout";
import { BAJO_LOSA, rutear } from "./ruteo";

const L = generarLayout(normalize(structuredClone(EJEMPLO)));

describe("ruteo", () => {
  it("todos los tramos son ortogonales (cambia una sola coordenada)", () => {
    for (const rec of L.recorridos!) {
      for (let i = 1; i < rec.puntos.length; i++) {
        const cambios = [0, 1, 2].filter((c) => rec.puntos[i][c] !== rec.puntos[i - 1][c]);
        expect(cambios).toHaveLength(1);
      }
    }
  });

  it("arranca en el tablero (con el carril del circuito) y termina en la boca", () => {
    for (const rec of L.recorridos!) {
      const boca = L.bocas.find((b) => b.id === rec.bocaId)!;
      const [x, y, z] = rec.puntos[0];
      expect(y).toBe(L.tablero.posicion[1]);
      expect(z).toBe(L.tablero.posicion[2]);
      expect(Math.abs(x - L.tablero.posicion[0])).toBeLessThan(0.5);
      expect(rec.puntos.at(-1)).toEqual(boca.posicion);
    }
  });

  it("los tramos horizontales van por el cielorraso", () => {
    const alto = L.ambientes[0].alto;
    for (const rec of L.recorridos!) expect(rec.puntos.some((p) => p[1] === alto - BAJO_LOSA)).toBe(true);
  });

  it("circuitos distintos no comparten el tramo de salida", () => {
    const b = L.bocas[0];
    const a = rutear(L.tablero.posicion, b, L.ambientes, 0), c = rutear(L.tablero.posicion, b, L.ambientes, 1);
    expect(a[1]).not.toEqual(c[1]);
    expect(a[2][2]).not.toBe(c[2][2]);
  });
});
