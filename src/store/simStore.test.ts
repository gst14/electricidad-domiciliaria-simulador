import { describe, expect, it } from "vitest";
import { EJEMPLO, freshRuntime, normalize, step } from "../domain/simulacion";
import { circuitoModificado, crearSimStore, selectLayout3d } from "./simStore";

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

  it("el layout 3D no cambia al encender cargas o cambiar amperes, sí al cambiar bocas", () => {
    const st = nuevo(), a = st.getState().actions;
    const L0 = selectLayout3d(st.getState());
    a.toggleLoad(C2, 2, true);
    a.setCircuito(C2, { amperes: 20 });
    expect(selectLayout3d(st.getState())).toBe(L0);
    a.setCircuito(C2, { bocas: 10 });
    const L1 = selectLayout3d(st.getState());
    expect(L1).not.toBe(L0);
    expect(L1.bocas.filter((b) => b.circuitoId === "C2")).toHaveLength(10);
  });

  describe("restablecer circuito", () => {
    it("vuelve el circuito a la configuración del proyecto sin tocar los demás", () => {
      const st = nuevo(), a = st.getState().actions;
      expect(circuitoModificado(st.getState(), C2)).toBe(false);
      a.setCircuito(C2, { amperes: 25, seccion_mm2: 1.5, bocas: 3 });
      a.toggleLoad(C2, 2, true);
      a.removeLoad(C2, 0);
      a.setCircuito(0, { amperes: 6 });
      expect(circuitoModificado(st.getState(), C2)).toBe(true);
      a.resetCircuito(C2);
      expect(st.getState().cfg.circuitos[C2]).toEqual(st.getState().base.circuitos[C2]);
      expect(circuitoModificado(st.getState(), C2)).toBe(false);
      expect(st.getState().cfg.circuitos[0].amperes).toBe(6);
    });

    it("el proyecto de referencia es el último JSON aplicado", () => {
      const st = nuevo(), a = st.getState().actions;
      const json = structuredClone(st.getState().cfg);
      json.circuitos[C2].amperes = 20;
      expect(a.applyText(JSON.stringify(json))).toBeNull();
      a.setCircuito(C2, { amperes: 32 });
      a.resetCircuito(C2);
      expect(st.getState().cfg.circuitos[C2].amperes).toBe(20);
    });

    it("un circuito que no estaba en el proyecto no se puede restablecer", () => {
      const st = nuevo(), a = st.getState().actions;
      const json = structuredClone(st.getState().cfg);
      json.circuitos.push({ ...json.circuitos[C2], id: "C9" });
      a.applyText(JSON.stringify(json));
      a.restoreSample();
      const cfg = st.getState().cfg;
      expect(cfg.circuitos.some((k) => k.id === "C9")).toBe(false); // el ejemplo pasa a ser el proyecto
      const otro = crearSimStore(normalize({ ...structuredClone(EJEMPLO), circuitos: [...structuredClone(EJEMPLO).circuitos, { ...EJEMPLO.circuitos[1], id: "C9" }] }), normalize(structuredClone(EJEMPLO)));
      otro.getState().actions.setCircuito(3, { amperes: 10 });
      expect(circuitoModificado(otro.getState(), 3)).toBe(false);
      otro.getState().actions.resetCircuito(3);
      expect(otro.getState().cfg.circuitos[3].amperes).toBe(10);
    });
  });
});
