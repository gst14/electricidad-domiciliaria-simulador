import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { varColorCircuito } from "../../../components/colorCircuito";
import { CATALOGO, fmt, hms, IZ, loadA, validate } from "../../../domain/simulacion";
import type { Circuito } from "../../../domain/simulacion";
import { simStore, useSimStore } from "../../../store/simStore";
import { estadoVisualCircuito } from "../mapeoVisual";
import { CampoNumero, CampoSelect } from "./campos";

const CURVAS = [["B", "B"], ["C", "C"], ["D", "D"]] as const;
const SECCIONES = Object.keys(IZ).map(Number).sort((a, b) => a - b).map((s) => [s, `${fmt(s)} mm² · Iz ${IZ[s]} A`] as const);

function Indicadores({ k }: { k: Circuito }) {
  useSimStore((s) => s.version);
  const { cfg, rt } = simStore.getState();
  const e = estadoVisualCircuito(cfg, rt, k);
  const pct = Math.min(100, e.carga * 100);
  return (
    <div className="ind" aria-live="off">
      <div className="ind-fila">
        <span>Corriente <b className="num">{fmt(e.I)} A</b></span>
        <span className={"pill nivel-" + e.nivel}>{e.nivel === "rojo" ? "⚠ " : ""}{e.etiqueta}</span>
      </div>
      <div className="gauge" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(e.carga * 100)} aria-label={`Carga de ${k.id}`}>
        <div className={"fill nivel-" + e.nivel} style={{ width: pct + "%" }} />
      </div>
      <div className="ind-fila small muted">
        <span>In {k.amperes} A · Iz {e.iz} A</span>
        <span>{e.eta !== null ? `Dispara en ~${hms(e.eta)} sim.` : e.disparada ? "Térmica disparada" : ""}</span>
      </div>
      {e.subdimensionado && <p className="aviso error">⚠ Cable subdimensionado: la térmica de {k.amperes} A supera lo que soporta el cable (Iz ≈ {e.iz} A).</p>}
      {!e.subdimensionado && e.izExcedida && <p className="aviso error">⚠ La corriente supera la capacidad del cable (Iz ≈ {e.iz} A).</p>}
    </div>
  );
}

function Cargas({ k, ci }: { k: Circuito; ci: number }) {
  const actions = useSimStore((s) => s.actions);
  const cfg = useSimStore((s) => s.cfg);
  const [pick, setPick] = useState(0);
  return (
    <div className="cargas">
      <h4>Cargas</h4>
      {k.cargas.length ? k.cargas.map((a, ai) => (
        <div className="carga" key={ai}>
          <input type="checkbox" className="sw" id={`v3-sw-${ci}-${ai}`} checked={a.encendida} onChange={(e) => actions.toggleLoad(ci, ai, e.target.checked)} />
          <label htmlFor={`v3-sw-${ci}-${ai}`}>{a.nombre}<span className="muted small"> · {fmt(loadA(cfg, a))} A</span></label>
          <CampoNumero etiqueta={`Potencia de ${a.nombre}`} valor={a.potencia_w} unidad="W" min={0} max={20000} paso={10} compacto
            onCommit={(v) => actions.setCarga(ci, ai, { potencia_w: v })} />
          <button className="x" aria-label={`Quitar ${a.nombre}`} onClick={() => actions.removeLoad(ci, ai)}>×</button>
        </div>
      )) : <p className="muted small">Sin cargas. Agregá una desde la lista.</p>}
      <div className="adder">
        <label className="sr" htmlFor={`v3-add-${ci}`}>Carga para {k.id}</label>
        <select id={`v3-add-${ci}`} value={pick} onChange={(e) => setPick(+e.target.value)}>
          {CATALOGO.map((a, i) => <option key={i} value={i}>{a.n} · {a.w} W</option>)}
        </select>
        <button onClick={() => actions.addLoad(ci, pick)}>Agregar</button>
      </div>
    </div>
  );
}

function FichaCircuito({ k, ci, avisos }: { k: Circuito; ci: number; avisos: [string, string][] }) {
  const actions = useSimStore((s) => s.actions);
  const seleccionado = useSimStore((s) => s.ui3d.seleccion?.circuitoId === k.id);
  const ref = useRef<HTMLDetailsElement>(null);
  const [abierto, setAbierto] = useState(ci === 0);

  // Al seleccionar el circuito en 3D, la ficha se abre y queda a la vista.
  useEffect(() => {
    if (!seleccionado) return;
    setAbierto(true);
    // Solo se desplaza el panel, no la página.
    const el = ref.current, cont = el?.closest(".panel3d-scroll");
    if (el && cont) cont.scrollTo({ top: el.getBoundingClientRect().top - cont.getBoundingClientRect().top + cont.scrollTop - 8, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [seleccionado]);

  return (
    <details ref={ref} className={"ficha" + (seleccionado ? " sel" : "")} open={abierto}
      onToggle={(e) => setAbierto((e.target as HTMLDetailsElement).open)}>
      <summary>
        <span className="cdot" style={{ "--cc": varColorCircuito(ci) } as CSSProperties} aria-hidden="true" /><span className="cid">{k.id}</span><span className="ctitle">{k.descripcion}</span><span className={`chip ${k.tipo}`}>{k.tipo}</span>
      </summary>
      <div className="ficha-cuerpo">
        <button className="link" aria-pressed={seleccionado}
          onClick={() => actions.setUi3d({ seleccion: seleccionado ? null : { tipo: "circuito", circuitoId: k.id } })}>
          {seleccionado ? "Quitar resaltado en 3D" : "Resaltar en 3D"}
        </button>
        <Indicadores k={k} />
        <div className="grilla">
          <CampoNumero etiqueta="Térmica" valor={k.amperes} unidad="A" min={1} max={125} onCommit={(v) => actions.setCircuito(ci, { amperes: v })} />
          <CampoSelect etiqueta="Curva" valor={k.curva} opciones={CURVAS} onChange={(v) => actions.setCircuito(ci, { curva: v })} />
          <CampoSelect etiqueta="Sección" valor={k.seccion_mm2} opciones={SECCIONES.some(([s]) => s === k.seccion_mm2) ? SECCIONES : [...SECCIONES, [k.seccion_mm2, `${fmt(k.seccion_mm2)} mm²`] as const]}
            onChange={(v) => actions.setCircuito(ci, { seccion_mm2: v })} />
          <CampoNumero etiqueta="Bocas" valor={k.bocas} min={0} max={40} entero onCommit={(v) => actions.setCircuito(ci, { bocas: v })} />
        </div>
        {avisos.length > 0 && (
          <ul className="avisos">
            {avisos.map(([sev, msg], i) => <li key={i} className={"aviso " + sev}><b>{sev === "error" ? "Error" : "Aviso"}</b> {msg.replace(/^[^:]+:\s*/, "")}</li>)}
          </ul>
        )}
        <Cargas k={k} ci={ci} />
      </div>
    </details>
  );
}

export default function PestanaCircuitos() {
  const cfg = useSimStore((s) => s.cfg);
  const checks = useMemo(() => validate(cfg).checks, [cfg]);
  return (
    <div className="stack" style={{ gap: 10 }}>
      {cfg.circuitos.map((k, ci) => (
        <FichaCircuito key={k.id} k={k} ci={ci} avisos={checks.filter(([s, m]) => s !== "ok" && m.startsWith(k.id + ":"))} />
      ))}
    </div>
  );
}
