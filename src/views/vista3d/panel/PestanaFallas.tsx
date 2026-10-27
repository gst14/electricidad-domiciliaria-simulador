import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { bocaDeCarga } from "../../../domain/layout3d/generarLayout";
import { fmt } from "../../../domain/simulacion";
import { selectLayout3d, useSimStore } from "../../../store/simStore";
import { CampoSelect } from "./campos";

const TIPO_BOCA: Record<string, string> = { centro: "Centro", aplique: "Aplique", toma: "Toma", llave: "Llave", caja_paso: "Caja de paso" };

export default function PestanaFallas() {
  const actions = useSimStore((s) => s.actions);
  const cfg = useSimStore((s) => s.cfg);
  const layout = useSimStore(selectLayout3d);
  const sel = useSimStore((s) => s.ui3d.seleccion);
  const activas = useSimStore(useShallow((s) => s.cfg.circuitos.filter((k) => s.rt.c[k.id]?.leak > 0).map((k) => `${k.id}|${s.rt.c[k.id].leak}`)));
  const sens = cfg.tablero.diferencial.sensibilidad_ma;

  const [ci, setCi] = useState(() => Math.max(0, cfg.circuitos.findIndex((k) => k.id === sel?.circuitoId)));
  const k = cfg.circuitos[Math.min(ci, cfg.circuitos.length - 1)];
  // Destino de la falla: un artefacto (va a su boca) o una boca del circuito.
  const destinos = useMemo(() => {
    if (!k) return [];
    const ambiente = (id: string) => layout.ambientes.find((a) => a.id === id)?.nombre ?? "";
    const arts = k.cargas.map((a, ai) => { const b = bocaDeCarga(layout, k, ai); return b ? [b.id, `${a.nombre} (${ambiente(b.ambienteId)})`] as const : null; }).filter((x) => x !== null);
    const bocas = layout.bocas.filter((b) => b.circuitoId === k.id).map((b) => [b.id, `${TIPO_BOCA[b.tipo]} ${b.id} · ${ambiente(b.ambienteId)}`] as const);
    const vistos = new Set<string>();
    return [...arts, ...bocas].filter(([id]) => (vistos.has(id) ? false : (vistos.add(id), true)));
  }, [k, layout]);
  const [destino, setDestino] = useState("");
  const bocaId = destinos.some(([id]) => id === destino) ? destino : destinos[0]?.[0] ?? "";
  const [ma, setMa] = useState(30);

  if (!k) return null;
  return (
    <div className="stack" style={{ gap: 16 }}>
      <fieldset>
        <legend>Inyectar falla</legend>
        <div className="grilla">
          <CampoSelect etiqueta="Circuito" valor={ci} opciones={cfg.circuitos.map((c, i) => [i, `${c.id} ${c.descripcion}`] as const)} onChange={(v) => { setCi(v); setDestino(""); }} />
          <CampoSelect etiqueta="Boca o artefacto" valor={bocaId} opciones={destinos} onChange={setDestino} />
          <label className="campo">
            <span>Corriente de fuga</span>
            <span className="campo-in">
              <input type="number" min={1} max={1000} value={ma} onChange={(e) => setMa(Math.max(0, Number(e.target.value) || 0))} />
              <span className="muted">mA</span>
            </span>
          </label>
        </div>
        <p className="muted small">El diferencial de {sens} mA corta con {fmt(sens * 0.75, 0)} mA o más.</p>
        <div className="row">
          <button className="primario" disabled={!(ma > 0)} onClick={() => actions.setLeak(ci, ma, bocaId)}>Inyectar fuga</button>
          <button className="danger" onClick={() => actions.short(ci, bocaId)}>Cortocircuito</button>
        </div>
      </fieldset>
      <fieldset>
        <legend>Fallas activas</legend>
        {activas.length ? (
          <ul className="rearmes">
            {activas.map((f) => {
              const [id, leak] = f.split("|"), i = cfg.circuitos.findIndex((c) => c.id === id);
              return <li key={id} className="rearme"><span>{id}: fuga de {leak} mA</span><button onClick={() => actions.setLeak(i, 0)}>Reparar</button></li>;
            })}
          </ul>
        ) : <p className="muted small">No hay fallas de aislación.</p>}
        <button disabled={!activas.length} onClick={() => cfg.circuitos.forEach((c, i) => { if (activas.some((f) => f.startsWith(c.id + "|"))) actions.setLeak(i, 0); })}>
          Limpiar fallas
        </button>
      </fieldset>
    </div>
  );
}
