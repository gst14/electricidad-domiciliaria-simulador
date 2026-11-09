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

  it("reubica una boca, recalcula su recorrido y conserva el circuito al reabrir", () => {
    const st = nuevo();
    const inicial = st.getState();
    const layout = selectLayout3d(inicial);
    const boca = layout.bocas.find((b) => b.circuitoId === "C2")!;
    const destino = layout.ambientes.find((a) => a.id !== boca.ambienteId)!;

    expect(inicial.actions.moverBoca(boca.id, destino.id, destino.ancho / 2, 0)).toBe(true);
    const editado = st.getState();
    const actual = selectLayout3d(editado);
    const movida = actual.bocas.find((b) => b.id === boca.id)!;
    expect(movida.ambienteId).toBe(destino.id);
    expect(movida.circuitoId).toBe(boca.circuitoId);
    expect(movida.posicion[2]).toBeCloseTo(destino.z + 0.02);
    expect(movida.normal).toEqual([0, 0, 1]);
    expect(actual.recorridos?.find((r) => r.bocaId === boca.id)?.puntos.at(-1)).toEqual(movida.posicion);
    expect(editado.cfg.circuitos).toBe(inicial.cfg.circuitos);
    expect(editado.rt).toBe(inicial.rt);
    expect(selectLayout3d(crearSimStore(normalize(JSON.parse(JSON.stringify(editado.cfg)))).getState()).bocas)
      .toContainEqual(movida);
    inicial.actions.restoreSample();
    expect(selectLayout3d(st.getState()).bocas).toContainEqual(boca);
  });

  it("mantiene intactos los proyectos con recorridos manuales", () => {
    const st = nuevo();
    const layout = selectLayout3d(st.getState());
    const cfg = { ...st.getState().cfg, layout3d: layout };
    const importado = crearSimStore(cfg);
    const [boca] = layout.bocas;
    expect(importado.getState().actions.moverBoca(boca.id, boca.ambienteId, 1, 1)).toBe(false);
    expect(importado.getState().actions.cambiarMedidas(layout.ambientes[0].id, layout.ambientes[0])).toContain("manuales");
    expect(importado.getState().actions.agregarBoca("C2", "toma", boca.ambienteId, 1, 1)).toContain("manuales");
    expect(importado.getState().cfg).toBe(cfg);
  });

  it("redimensiona un ambiente sin despegar las bocas de sus paredes", () => {
    const st = nuevo();
    const { actions, cfg } = st.getState();
    const original = selectLayout3d(st.getState());
    const ambiente = original.ambientes[0];
    const ancho = ambiente.ancho / 2;
    expect(actions.moverBoca("C2-b01", ambiente.id, ambiente.ancho / 4, 0)).toBe(true);
    const anterior = selectLayout3d(st.getState());
    expect(actions.cambiarMedidas(ambiente.id, { ...ambiente, nombre: "Sala", ancho, alto: 3 })).toBeNull();

    const layout = selectLayout3d(st.getState());
    const boca = layout.bocas.find((b) => b.id === "C2-b01")!;
    expect(boca.posicion).toEqual([expect.closeTo(ambiente.x + ancho / 4, 2), 0.3, ambiente.z + 0.02]);
    expect(boca.normal).toEqual([0, 0, 1]);
    expect(layout.bocas.filter((b) => b.ambienteId === ambiente.id && b.tipo === "centro")
      .every((b) => b.posicion[1] === 3)).toBe(true);
    expect(layout.tablero.posicion[0]).toBeCloseTo(anterior.tablero.posicion[0] / 2);
    expect(layout.ambientes[0]).toMatchObject({ nombre: "Sala", ancho, alto: 3 });
    expect(st.getState().cfg.superficie_m2).toBe(cfg.superficie_m2);
    actions.adoptarSuperficieDibujada();
    expect(st.getState().cfg.superficie_m2).toBeLessThan(cfg.superficie_m2);

    const recargado = nuevo();
    expect(recargado.getState().actions.applyText(JSON.stringify(st.getState().cfg))).toBeNull();
    expect(selectLayout3d(recargado.getState())).toEqual(layout);
  });

  it("rechaza solapamientos e intentos de alta inválidos antes de guardar", () => {
    const st = nuevo();
    const { actions, cfg } = st.getState();
    const [a, vecino] = selectLayout3d(st.getState()).ambientes;
    expect(actions.cambiarMedidas(a.id, { ...a, ancho: a.ancho * 2 })).toContain(vecino.nombre);
    expect(actions.agregarBoca("C2", "centro", a.id, 1, 1)).toContain("compatible");
    expect(actions.agregarBoca("C2", "toma", a.id, -1, 0)).toContain("ubicación");
    expect(st.getState().cfg).toBe(cfg);
  });

  it("guarda un alta como geometría del circuito y deriva su cantidad también al importar", () => {
    const st = nuevo();
    const { actions, cfg, rt } = st.getState();
    const { ambientes, bocas } = selectLayout3d(st.getState());
    const ambiente = ambientes[0];
    expect(actions.agregarBoca("C2", "toma", ambiente.id, 1, 0)).toBeNull();
    const editado = st.getState().cfg;
    const nueva = editado.layout3d?.bocas.find((b) => !bocas.some((vieja) => vieja.id === b.id));
    expect(nueva).toMatchObject({ circuitoId: "C2", tipo: "toma", ambienteId: ambiente.id });
    expect(selectLayout3d(st.getState()).recorridos?.find((r) => r.bocaId === nueva?.id)?.puntos.at(-1)).toEqual(nueva?.posicion);
    const cantidad = cfg.circuitos[C2].bocas + 1;
    expect(st.getState().rt).toBe(rt);
    expect(circuitoModificado(st.getState(), C2)).toBe(false);
    actions.setCircuito(C2, { amperes: 20, bocas: 0 });
    expect(st.getState().cfg.circuitos[C2]).toMatchObject({ amperes: 20, bocas: cantidad });
    actions.resetCircuito(C2);
    expect(st.getState().cfg.circuitos[C2]).toMatchObject({ amperes: cfg.circuitos[C2].amperes, bocas: cantidad });

    const archivo = structuredClone(st.getState().cfg);
    archivo.circuitos[C2].bocas = 100;
    expect(actions.applyText(JSON.stringify(archivo))).toBeNull();
    expect(st.getState().cfg.circuitos[C2].bocas).toBe(cantidad);
    expect(st.getState().cfg.layout3d?.bocas).toContainEqual(nueva);
    archivo.layout3d!.bocas.push(archivo.layout3d!.bocas[0]);
    expect(actions.applyText(JSON.stringify(archivo))).toContain("repetidas");
    expect(st.getState().cfg.layout3d?.bocas).toContainEqual(nueva);
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
