import { describe, expect, it } from "vitest";
import { EJEMPLO, freshRuntime, normalize, step } from "../../domain/simulacion";
import type { Config } from "../../domain/simulacion";
import {
  carcasaEnergizada, colorNivel, COLOR_NIVEL, estadoTierra, estadoVisualCircuito, fugaATierra, hayAnimacion,
  intensidadPulso, nivelDeCarga,
} from "./mapeoVisual";

const preparar = (fn?: (c: Config) => void) => {
  const cfg = normalize(structuredClone(EJEMPLO));
  fn?.(cfg);
  const rt = freshRuntime(cfg);
  step(cfg, rt, 0);
  return { cfg, rt };
};
const conCorriente = (In: number, I: number) => {
  // Una carga resistiva que consume exactamente I amperes en C2.
  const { cfg, rt } = preparar((c) => { c.circuitos[1].amperes = In; c.circuitos[1].cargas = [{ nombre: "x", potencia_w: I * 220, encendida: true }]; });
  return estadoVisualCircuito(cfg, rt, cfg.circuitos[1]);
};

describe("nivelDeCarga", () => {
  it.each([
    [0.59, "normal", "no"], [0.6, "ambar", "no"], [0.89, "ambar", "no"],
    [0.9, "naranja", "lento"], [1, "naranja", "lento"], [1.01, "rojo", "rapido"],
  ])("%s → %s", (c, nivel, pulso) => expect(nivelDeCarga(c)).toEqual({ nivel, pulso }));
});

describe("estadoVisualCircuito", () => {
  it("calcula carga y etiqueta con porcentaje", () => {
    const e = conCorriente(10, 8.2);
    expect(e.carga).toBeCloseTo(0.82);
    expect(e.nivel).toBe("ambar");
    expect(e.etiqueta).toBe("82 %");
    expect(e.flujo).toBeGreaterThan(0);
  });

  it("toma del motor el tiempo hasta disparo solo con sobrecarga térmica", () => {
    expect(conCorriente(10, 9).eta).toBeNull();
    const e = conCorriente(10, 15);
    expect(e.nivel).toBe("rojo");
    expect(e.eta).toBeGreaterThan(0);
  });

  it("térmica de circuito disparada: sin tensión, sin flujo, DISPARADA", () => {
    const { cfg, rt } = preparar();
    rt.c.C2.on = false; rt.c.C2.tripped = true;
    step(cfg, rt, 0);
    const e = estadoVisualCircuito(cfg, rt, cfg.circuitos[1]);
    expect(e).toMatchObject({ conTension: false, nivel: "sin_tension", flujo: 0, etiqueta: "DISPARADA", pulso: "no" });
    expect(estadoVisualCircuito(cfg, rt, cfg.circuitos[0]).conTension).toBe(true);
  });

  it.each(["id", "tg"] as const)("%s disparado apaga todos los circuitos", (p) => {
    const { cfg, rt } = preparar();
    rt[p].on = false; rt[p].tripped = true;
    step(cfg, rt, 0);
    for (const k of cfg.circuitos) expect(estadoVisualCircuito(cfg, rt, k)).toMatchObject({ conTension: false, flujo: 0, etiqueta: "SIN TENSIÓN" });
  });

  it("marca subdimensionado si In > Iz y excedida si I > Iz", () => {
    const { cfg, rt } = preparar((c) => { c.circuitos[0].seccion_mm2 = 1; c.circuitos[0].amperes = 16; });
    expect(estadoVisualCircuito(cfg, rt, cfg.circuitos[0])).toMatchObject({ subdimensionado: true, izExcedida: false, iz: 12 });
    expect(conCorriente(32, 22)).toMatchObject({ subdimensionado: true, izExcedida: true }); // 2,5 mm²: Iz 21 A
    expect(conCorriente(16, 10)).toMatchObject({ subdimensionado: false, izExcedida: false });
  });
});

describe("fallas y tierra", () => {
  it("sin jabalina una fuga deja la carcasa con tensión; con jabalina va a tierra", () => {
    const sin = preparar((c) => { c.puesta_tierra.jabalina = false; });
    sin.rt.c.C2.leak = 15;
    expect(carcasaEnergizada(sin.cfg, sin.rt, sin.cfg.circuitos[1])).toBe(true);
    expect(fugaATierra(sin.cfg, sin.rt, sin.cfg.circuitos[1])).toBe(false);
    const con = preparar();
    con.rt.c.C2.leak = 15;
    expect(carcasaEnergizada(con.cfg, con.rt, con.cfg.circuitos[1])).toBe(false);
    expect(fugaATierra(con.cfg, con.rt, con.cfg.circuitos[1])).toBe(true);
  });

  it("estado de la puesta a tierra con los umbrales de validate", () => {
    const t = (jabalina: boolean, r: number) => estadoTierra(preparar((c) => { c.puesta_tierra = { jabalina, resistencia_ohm: r }; }).cfg);
    expect(t(true, 10)).toBe("ok");
    expect(t(true, 11)).toBe("warn");
    expect(t(true, 41)).toBe("error");
    expect(t(false, 5)).toBe("error");
  });
});

describe("animación", () => {
  it("con movimiento reducido no hay pulsos ni animación", () => {
    expect(intensidadPulso("rapido", 0.3, true)).toBe(1);
    expect(intensidadPulso("no", 0.3)).toBe(0);
    const { cfg, rt } = preparar();
    expect(hayAnimacion(cfg, rt, true)).toBe(false);
  });

  it("en pausa y sin pulsos no se anima", () => {
    const { cfg, rt } = preparar();
    expect(hayAnimacion(cfg, rt, false)).toBe(true); // corriendo, con corriente
    rt.running = false;
    expect(hayAnimacion(cfg, rt, false)).toBe(false);
  });

  it("colorNivel usa el color del circuito en carga normal", () => {
    const p = { trip: "#f00", line: "#ccc" };
    expect(colorNivel("normal", "#123456", p)).toBe("#123456");
    expect(colorNivel("ambar", "#123456", p)).toBe(COLOR_NIVEL.ambar);
    expect(colorNivel("rojo", "#123456", p)).toBe("#f00");
    expect(colorNivel("sin_tension", "#123456", p)).toBe("#ccc");
  });
});
