import { describe, expect, it } from "vitest";
import { EJEMPLO, freshRuntime, normalize, step } from "../domain/simulacion";
import { crearSimStore } from "./simStore";

const nuevo = () => crearSimStore(normalize(structuredClone(EJEMPLO)));
const C2 = 1; // índice del circuito de tomas en el ejemplo

describe("simStore", () => {
  it("encender una carga cambia la corriente del circuito", () => {
    const st = nuevo();
    const antes = st.getState().rt.c.C2.I;
    st.getState().actions.toggleLoad(C2, 2, true); // pava 2000 W
    expect(st.getState().rt.c.C2.I).toBeCloseTo(antes + 2000 / 220, 6);
  });

  it("cambiar amperes reemplaza cfg y conserva rt", () => {
    const st = nuevo();
    const rt = st.getState().rt, cfg = st.getState().cfg;
    st.getState().actions.setCircuito(C2, { amperes: 20 });
    expect(st.getState().cfg).not.toBe(cfg);
    expect(st.getState().cfg.circuitos[C2].amperes).toBe(20);
    expect(st.getState().rt).toBe(rt);
  });

  it("una sobrecarga en TUG dispara la térmica por efecto térmico", () => {
    const st = nuevo(), a = st.getState().actions;
    [2, 3, 4].forEach((ai) => a.toggleLoad(C2, ai, true)); // ~24 A sobre 16 A
    for (let i = 0; i < 100 && !st.getState().rt.c.C2.tripped; i++) a.tick(0.5); // ×60 → 30 s simulados por tick
    a.tick(0); // el motor recalcula corrientes en el paso siguiente al disparo
    const s = st.getState().rt.c.C2;
    expect(s.tripped).toBe(true);
    expect(s.I).toBe(0);
  });

  it("bajar la térmica por debajo de la carga hace disparar antes", () => {
    const tiempo = (amperes: number) => {
      const st = nuevo(), a = st.getState().actions;
      a.setCircuito(C2, { amperes });
      [2, 3].forEach((ai) => a.toggleLoad(C2, ai, true));
      let n = 0;
      while (!st.getState().rt.c.C2.tripped && n < 1000) { a.tick(0.5); n++; }
      return n;
    };
    expect(tiempo(10)).toBeLessThan(tiempo(16));
  });

  it("una fuga ≥ 75 % de la sensibilidad dispara el diferencial y corta todo", () => {
    const st = nuevo();
    st.getState().actions.setLeak(C2, 30, "C2-b01");
    st.getState().actions.tick(0);
    const rt = st.getState().rt;
    expect(rt.id.tripped).toBe(true);
    expect(rt.I).toBe(0);
    expect(rt.c.C2.leakBoca).toBe("C2-b01");
  });

  it("rearmar solo cierra protecciones abiertas", () => {
    const st = nuevo(), a = st.getState().actions;
    a.rearmar("tg");
    expect(st.getState().rt.tg.on).toBe(true);
    a.lever("tg");
    expect(st.getState().rt.tg.on).toBe(false);
    a.rearmar("tg");
    expect(st.getState().rt.tg.on).toBe(true);
  });

  it("cada acción incrementa version", () => {
    const st = nuevo(), v = st.getState().version;
    st.getState().actions.togglePlay();
    expect(st.getState().version).toBe(v + 1);
  });

  it("el tick da el mismo resultado que llamar al motor como lo hacía el hook anterior", () => {
    const st = nuevo(), a = st.getState().actions;
    const cfg = st.getState().cfg, ref = freshRuntime(cfg);
    a.toggleLoad(C2, 4, true);
    const cfg2 = st.getState().cfg;
    step(cfg2, ref, 0);
    for (let i = 0; i < 50; i++) { a.tick(0.1); step(cfg2, ref, ref.running ? 0.1 * ref.speed : 0); }
    const { log: _l1, ...x } = st.getState().rt;
    const { log: _l2, ...y } = ref;
    expect(x).toEqual(y);
  });
});
