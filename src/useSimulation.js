import { useEffect, useReducer, useRef, useState } from "react";
import { CATALOGO, EJEMPLO, freshRuntime, logEv, normalize, step, trip } from "./lib/sim";

const KEY = "tablerista-cfg";
const store = {
  get() { try { return localStorage.getItem(KEY); } catch { return null; } },
  set(v) { try { localStorage.setItem(KEY, v); } catch { /* sin storage */ } },
};
function initialCfg() {
  try { const saved = store.get(); return normalize(saved ? JSON.parse(saved) : structuredClone(EJEMPLO)); }
  catch { return normalize(structuredClone(EJEMPLO)); }
}

// cfg es estado inmutable de React; rt (runtime) es mutable y vive en un ref,
// el intervalo lo avanza y fuerza un render cada 100 ms.
export function useSimulation() {
  const [cfg, setCfg] = useState(initialCfg);
  const cfgRef = useRef(cfg);
  const rtRef = useRef(null);
  if (!rtRef.current) rtRef.current = freshRuntime(cfg);
  const [, tick] = useReducer((n) => n + 1, 0);

  useEffect(() => { store.set(JSON.stringify(cfg, null, 2)); }, [cfg]);

  useEffect(() => {
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now(), dt = Math.min(0.5, (now - last) / 1000), rt = rtRef.current;
      last = now;
      step(cfgRef.current, rt, rt.running ? dt * rt.speed : 0);
      tick();
    }, 100);
    return () => clearInterval(id);
  }, []);

  const act = (fn) => { fn(rtRef.current, cfgRef.current); step(cfgRef.current, rtRef.current, 0); tick(); };
  const commit = (next, rt) => {
    cfgRef.current = next;
    if (rt) rtRef.current = rt;
    setCfg(next);
    step(next, rtRef.current, 0);
    tick();
  };
  const editCfg = (fn) => { const next = structuredClone(cfgRef.current); fn(next); commit(next); };
  const breaker = (rt, key) => (key === "tg" ? rt.tg : key === "id" ? rt.id : rt.c[key]);

  const actions = {
    lever: (key) => act((rt) => {
      const b = breaker(rt, key);
      const name = key === "tg" ? "Térmica general" : key === "id" ? "Diferencial" : "Térmica " + key;
      if (b.on) { b.on = false; logEv(rt, "info", `${name} abierta manualmente.`); }
      else { b.on = true; b.tripped = false; logEv(rt, "ok", `${name} rearmada.`); }
    }),
    testId: () => act((rt) => {
      if (rt.id.on) trip(rt, rt.id, "Diferencial", "botón de prueba presionado. Así se verifica una vez por mes que el mecanismo funciona.");
    }),
    addLoad: (ci, idx) => editCfg((c) => {
      const a = CATALOGO[idx];
      c.circuitos[ci].cargas.push({ nombre: a.n, potencia_w: a.w, ...(a.fp ? { fp: a.fp } : {}), encendida: true });
    }),
    removeLoad: (ci, ai) => editCfg((c) => { c.circuitos[ci].cargas.splice(ai, 1); }),
    toggleLoad: (ci, ai, on) => editCfg((c) => { c.circuitos[ci].cargas[ai].encendida = on; }),
    setLeak: (ci, v) => act((rt, c) => {
      const k = c.circuitos[ci];
      rt.c[k.id].leak = v;
      logEv(rt, "info", v ? `${k.id}: falla de aislación de ${v} mA hacia la carcasa.` : `${k.id}: aislación reparada.`);
    }),
    short: (ci) => act((rt, c) => {
      const k = c.circuitos[ci], s = rt.c[k.id];
      if (rt.tg.on && rt.id.on && s.on) trip(rt, s, `Térmica ${k.id}`, "cortocircuito, más de 1000 A en milisegundos. Disparo magnético instantáneo; la general no llega a actuar (selectividad).");
      else logEv(rt, "info", `${k.id} no tiene tensión: el cortocircuito no hace nada.`);
    }),
    togglePlay: () => { rtRef.current.running = !rtRef.current.running; tick(); },
    setSpeed: (s) => { rtRef.current.speed = s; tick(); },
    rearmAll: () => act((rt) => {
      [rt.tg, rt.id, ...Object.values(rt.c)].forEach((b) => { b.on = true; b.tripped = false; b.heat = 0; });
      logEv(rt, "ok", "Todas las protecciones rearmadas.");
    }),
    clearLog: () => { rtRef.current.log = []; tick(); },
    // Devuelve el mensaje de error, o null si se aplicó.
    applyText: (txt) => {
      try {
        const next = normalize(JSON.parse(txt));
        commit(next, freshRuntime(next, rtRef.current));
        logEv(rtRef.current, "ok", `Configuración aplicada: ${next.circuitos.length} circuitos.`);
        return null;
      } catch (err) {
        return (err instanceof SyntaxError ? "El JSON no es válido: " : "") + err.message;
      }
    },
    restoreSample: () => {
      const next = normalize(structuredClone(EJEMPLO));
      const rt = freshRuntime(next, rtRef.current);
      rt.simT = 0; rt.kwh = 0; rt.log = [];
      commit(next, rt);
      logEv(rt, "ok", "Ejemplo restaurado.");
    },
  };

  return { cfg, rt: rtRef.current, actions };
}
