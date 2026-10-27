import { describe, expect, it } from "vitest";
import { EJEMPLO, normalize } from "../simulacion";
import type { Config } from "../simulacion";
import { bocaDeCarga, generarLayout } from "./generarLayout";

const ejemplo = (): Config => normalize(structuredClone(EJEMPLO));
const de = (cfg: Config, id: string) => generarLayout(cfg).bocas.filter((b) => b.circuitoId === id);

describe("generarLayout", () => {
  it("es determinístico", () => {
    expect(generarLayout(ejemplo())).toEqual(generarLayout(ejemplo()));
  });

  it("genera exactamente circuitos[i].bocas bocas por circuito", () => {
    const cfg = ejemplo();
    for (const k of cfg.circuitos) expect(de(cfg, k.id)).toHaveLength(k.bocas);
    const ids = generarLayout(cfg).bocas.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("IUG: centros en el techo y llaves a 1,10 m; TUG: tomas a 0,30 m; TUE: una boca alta para el aire", () => {
    const cfg = ejemplo(), L = generarLayout(cfg);
    const alto = L.ambientes[0].alto;
    const c1 = de(cfg, "C1");
    expect(c1.every((b) => (b.tipo === "centro" && b.posicion[1] === alto) || (b.tipo === "llave" && b.posicion[1] === 1.1))).toBe(true);
    expect(c1.some((b) => b.tipo === "llave")).toBe(true);
    expect(de(cfg, "C2").every((b) => b.tipo === "toma" && b.posicion[1] === 0.3)).toBe(true);
    const [c3] = de(cfg, "C3");
    expect(c3.posicion[1]).toBe(2);
  });

  it("las bocas quedan dentro de su ambiente", () => {
    const L = generarLayout(ejemplo());
    for (const b of L.bocas) {
      const a = L.ambientes.find((x) => x.id === b.ambienteId)!;
      expect(b.posicion[0]).toBeGreaterThanOrEqual(a.x);
      expect(b.posicion[0]).toBeLessThanOrEqual(a.x + a.ancho);
      expect(b.posicion[2]).toBeGreaterThanOrEqual(a.z);
      expect(b.posicion[2]).toBeLessThanOrEqual(a.z + a.largo);
    }
  });

  it("al cambiar las bocas de un circuito, regenera solo ese y conserva lo existente", () => {
    const cfg = ejemplo(), previo = generarLayout(cfg);
    cfg.circuitos[1].bocas = 15;
    const nuevo = generarLayout(cfg, previo);
    expect(nuevo.bocas.filter((b) => b.circuitoId === "C2")).toHaveLength(15);
    expect(nuevo.bocas.filter((b) => b.circuitoId === "C1")).toEqual(previo.bocas.filter((b) => b.circuitoId === "C1"));
    const viejasC2 = previo.bocas.filter((b) => b.circuitoId === "C2");
    expect(nuevo.bocas.filter((b) => b.circuitoId === "C2").slice(0, 14).map((b) => b.posicion)).toEqual(viejasC2.map((b) => b.posicion));
  });

  it("conserva posiciones editadas por el usuario en cfg.layout3d", () => {
    const cfg = ejemplo(), base = generarLayout(cfg);
    const editada = { ...base.bocas.find((b) => b.circuitoId === "C2")!, posicion: [1.234, 0.3, 0.02] as [number, number, number] };
    cfg.layout3d = { ambientes: base.ambientes, tablero: base.tablero, bocas: [editada] };
    const L = generarLayout(cfg);
    expect(L.bocas.find((b) => b.id === editada.id)!.posicion).toEqual([1.234, 0.3, 0.02]);
    expect(L.bocas.filter((b) => b.circuitoId === "C2")).toHaveLength(14);
  });

  it("ignora un layout3d mal formado", () => {
    const cfg = ejemplo();
    cfg.layout3d = { ambientes: "nada", bocas: 3 } as unknown as Config["layout3d"];
    expect(generarLayout(cfg)).toEqual(generarLayout(ejemplo()));
  });

  it("asocia luminarias a centros y artefactos a tomas", () => {
    const cfg = ejemplo(), L = generarLayout(cfg);
    expect(L.bocas.filter((b) => b.circuitoId === "C1" && b.tipo === "centro").every((b) => b.cargaIndex === 0)).toBe(true);
    const c2 = cfg.circuitos[1];
    c2.cargas.forEach((_, ai) => expect(bocaDeCarga(L, c2, ai)?.tipo).toBe("toma"));
    expect(new Set(c2.cargas.map((_, ai) => bocaDeCarga(L, c2, ai)!.id)).size).toBe(c2.cargas.length);
  });
});
