import { useState } from "react";
import { varColorCircuito } from "./colorCircuito";
import BotonRestablecer from "./BotonRestablecer";
import { CATALOGO, etaDisparo, fmt, hms, izOf, loadA } from "../domain/simulacion/sim.js";

const LEAKS = [[0, "Sana"], [15, "Humedad 15 mA"], [60, "Falla 60 mA"]];

export default function CircuitCard({ cfg, rt, k, ci, actions }) {
  const [pick, setPick] = useState(0);
  const s = rt.c[k.id], on = rt.tg.on && rt.id.on && s.on;
  const iz = izOf(k.seccion_mm2), scale = Math.max(k.amperes, iz, s.I) * 1.25, t = etaDisparo(s, s.I, k.amperes);
  const eta = s.tripped ? "Disparado" : t !== null ? `Dispara en ~${hms(t)} simulado` : s.heat > 0.01 ? "Enfriándose" : "Sin sobrecarga";
  return (
    <article className={"card" + (s.tripped ? " down" : "")}>
      <div className="chead">
        <span className="cdot" style={{ "--cc": varColorCircuito(ci) }} aria-hidden="true" /><span className="cid">{k.id}</span><span className="ctitle">{k.descripcion}</span><span className={`chip ${k.tipo}`}>{k.tipo}</span>
        <span className={"pill" + (s.tripped ? " trip" : on ? "" : " off")}>{s.tripped ? "Disparó" : on ? "Con tensión" : "Sin tensión"}</span>
        <BotonRestablecer ci={ci} />
      </div>
      <div className="spec">{k.amperes} A · curva {k.curva} · {fmt(k.seccion_mm2)} mm² (Iz ≈ {iz} A) · {k.bocas} boca{k.bocas === 1 ? "" : "s"}</div>
      <div className="mini">
        <div className="gline"><span>Corriente <b className="num">{fmt(s.I)} A</b></span><span className="muted">In {k.amperes} A · Iz {iz} A</span></div>
        <div className="gauge">
          <div className={"fill" + (s.I > k.amperes * 1.13 ? " over" : "")} style={{ width: Math.min(100, s.I / scale * 100) + "%" }} />
          <div className="mk" title="In" style={{ left: (k.amperes / scale * 100) + "%" }} />
          <div className="mk iz" title="Iz cable" style={{ left: (iz / scale * 100) + "%" }} />
        </div>
      </div>
      <div className="twocol">
        <div className="mini"><span className="muted">Bimetal</span><div className="heat" style={{ height: 6 }}><i style={{ width: Math.min(100, s.heat * 100) + "%" }} /></div><span className="num small">{eta}</span></div>
        <div className="mini"><span className="muted">Cable</span>
          <div className="heat" style={{ height: 6 }}><i style={{ width: Math.min(100, (s.temp - 30) / 60 * 100) + "%", background: s.temp >= 70 ? "var(--trip)" : "var(--neutro)" }} /></div>
          <span className="num small">{fmt(s.temp, 0)} °C{s.temp >= 70 ? " · sobre el límite del PVC" : ""}</span></div>
      </div>
      <div className="loads">
        {k.cargas.length ? k.cargas.map((a, ai) => (
          <div className="load" key={ai}>
            <input type="checkbox" className="sw" id={`sw-${ci}-${ai}`} checked={a.encendida} onChange={(e) => actions.toggleLoad(ci, ai, e.target.checked)} />
            <label htmlFor={`sw-${ci}-${ai}`}>{a.nombre}</label>
            <span className="w">{fmt(a.potencia_w, 0)} W · {fmt(loadA(cfg, a))} A</span>
            <button className="x" aria-label={`Quitar ${a.nombre}`} onClick={() => actions.removeLoad(ci, ai)}>×</button>
          </div>
        )) : <p className="empty" style={{ margin: "4px 0" }}>Sin artefactos. Agregá uno desde la lista.</p>}
      </div>
      <div className="adder">
        <label className="sr" htmlFor={`add-${ci}`}>Artefacto para {k.id}</label>
        <select id={`add-${ci}`} value={pick} onChange={(e) => setPick(+e.target.value)}>
          {CATALOGO.map((a, i) => <option key={i} value={i}>{a.n} · {a.w} W</option>)}
        </select>
        <button onClick={() => actions.addLoad(ci, pick)}>Agregar</button>
      </div>
      <div className="faults"><span className="muted">Aislación</span>
        <span className="seg" role="group" aria-label={`Estado de aislación de ${k.id}`}>
          {LEAKS.map(([v, label]) => <button key={v} aria-pressed={s.leak === v} onClick={() => actions.setLeak(ci, v)}>{label}</button>)}
        </span>
        <button className="danger" onClick={() => actions.short(ci)}>Cortocircuito</button>
      </div>
    </article>
  );
}
