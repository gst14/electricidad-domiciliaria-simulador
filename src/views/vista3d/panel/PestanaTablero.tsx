import { useShallow } from "zustand/react/shallow";
import type { ClaveProteccion } from "../../../store/simStore";
import { useSimStore } from "../../../store/simStore";
import { estadoTierra } from "../mapeoVisual";
import { CampoNumero, CampoSelect } from "./campos";

const CURVAS = [["B", "B"], ["C", "C"], ["D", "D"]] as const;
const SENSIBILIDADES = [[10, "10 mA"], [30, "30 mA"], [100, "100 mA"], [300, "300 mA"]] as const;

function Rearme({ clave, nombre }: { clave: ClaveProteccion; nombre: string }) {
  const actions = useSimStore((s) => s.actions);
  const estado = useSimStore((s) => {
    const b = clave === "tg" ? s.rt.tg : clave === "id" ? s.rt.id : s.rt.c[clave];
    return !b ? "on" : b.tripped ? "disparada" : b.on ? "on" : "abierta";
  });
  return (
    <li className="rearme">
      <span>{nombre}</span>
      <span className={"pill" + (estado === "disparada" ? " trip" : estado === "abierta" ? " off" : "")}>
        {estado === "disparada" ? "⚠ DISPARADA" : estado === "abierta" ? "ABIERTA" : "CERRADA"}
      </span>
      {estado === "on"
        ? <button onClick={() => actions.lever(clave)}>Bajar</button>
        : <button className="primario" onClick={() => actions.rearmar(clave)}>Rearmar</button>}
    </li>
  );
}

export default function PestanaTablero() {
  const actions = useSimStore((s) => s.actions);
  const { tg, di, pe, circuitos } = useSimStore(useShallow((s) => ({
    tg: s.cfg.tablero.termica_general, di: s.cfg.tablero.diferencial, pe: s.cfg.puesta_tierra, circuitos: s.cfg.circuitos,
  })));
  const cfg = useSimStore((s) => s.cfg);
  const tierra = estadoTierra(cfg);
  return (
    <div className="stack" style={{ gap: 16 }}>
      <fieldset>
        <legend>Térmica general</legend>
        <div className="grilla">
          <CampoNumero etiqueta="Corriente" valor={tg.amperes} unidad="A" min={1} max={125} onCommit={(v) => actions.setTablero({ termica_general: { amperes: v } })} />
          <CampoSelect etiqueta="Curva" valor={tg.curva} opciones={CURVAS} onChange={(v) => actions.setTablero({ termica_general: { curva: v } })} />
        </div>
      </fieldset>
      <fieldset>
        <legend>Diferencial</legend>
        <div className="grilla">
          <CampoNumero etiqueta="Corriente" valor={di.amperes} unidad="A" min={1} max={125} onCommit={(v) => actions.setTablero({ diferencial: { amperes: v } })} />
          <CampoSelect etiqueta="Sensibilidad" valor={di.sensibilidad_ma} opciones={SENSIBILIDADES.some(([v]) => v === di.sensibilidad_ma) ? SENSIBILIDADES : [...SENSIBILIDADES, [di.sensibilidad_ma, `${di.sensibilidad_ma} mA`] as const]}
            onChange={(v) => actions.setTablero({ diferencial: { sensibilidad_ma: v } })} />
        </div>
        <button onClick={actions.testId}>Probar diferencial (botón T)</button>
      </fieldset>
      <fieldset>
        <legend>Puesta a tierra</legend>
        <div className="grilla">
          <label className="campo check">
            <input type="checkbox" className="sw" checked={pe.jabalina} onChange={(e) => actions.setPuestaTierra({ jabalina: e.target.checked })} />
            <span>Jabalina instalada</span>
          </label>
          <CampoNumero etiqueta="Resistencia" valor={pe.resistencia_ohm} unidad="Ω" min={0} max={1000} onCommit={(v) => actions.setPuestaTierra({ resistencia_ohm: v })} />
        </div>
        {tierra !== "ok" && (
          <p className={"aviso " + tierra}>
            {!pe.jabalina ? "⚠ Sin puesta a tierra: una falla de aislación deja la carcasa con tensión."
              : tierra === "error" ? `⚠ ${pe.resistencia_ohm} Ω supera el máximo de 40 Ω.` : `${pe.resistencia_ohm} Ω funciona, pero lo recomendable es 10 Ω o menos.`}
          </p>
        )}
      </fieldset>
      <fieldset>
        <legend>Protecciones</legend>
        <ul className="rearmes">
          <Rearme clave="tg" nombre="Térmica general" />
          <Rearme clave="id" nombre="Diferencial" />
          {circuitos.map((k) => <Rearme key={k.id} clave={k.id} nombre={`${k.id} ${k.descripcion}`} />)}
        </ul>
        <button onClick={actions.rearmAll}>Rearmar todo</button>
      </fieldset>
    </div>
  );
}
