import { useState } from "react";
import type { MouseEvent } from "react";
import { varColorCircuito } from "../../components/colorCircuito";
import { superficieDibujada, tieneRecorridosManuales } from "../../domain/layout3d/editarPlano";
import type { Ambiente, Boca } from "../../domain/layout3d/tipos";
import { selectLayout3d, useSimStore } from "../../store/simStore";
import { AltaBoca, Medidas } from "./EdicionPlano";
import type { PuntoPlano } from "./EdicionPlano";
import "./plano.css";

const etiquetas: Record<Boca["tipo"], string> = {
  centro: "Centro de luz", aplique: "Aplique", toma: "Tomacorriente", llave: "Llave", caja_paso: "Caja de paso",
};

function Destino({ boca, ambientes, mover }: {
  boca: Boca;
  ambientes: Ambiente[];
  mover: (ambienteId: string, x: number, z: number) => void;
}) {
  const [ambienteId, setAmbienteId] = useState(boca.ambienteId);
  const ambiente = ambientes.find((a) => a.id === ambienteId) ?? ambientes[0];
  const inicial = ambiente.id === boca.ambienteId;
  const local = (valor: number, origen: number, maximo: number) => Math.min(maximo, Math.max(0, Math.round((valor - origen) * 1000) / 1000));

  return (
    <form className="plano-destino" onSubmit={(event) => {
      event.preventDefault();
      const datos = new FormData(event.currentTarget);
      mover(ambiente.id, Number(datos.get("x")), Number(datos.get("z")));
    }}>
      <label>Ambiente
        <select value={ambiente.id} onChange={(event) => setAmbienteId(event.target.value)}>
          {ambientes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
      </label>
      <div className="plano-coordenadas" key={ambiente.id}>
        <label>X desde la izquierda (m)
          <input type="number" name="x" min={0} max={ambiente.ancho} step="any" required
            defaultValue={inicial ? local(boca.posicion[0], ambiente.x, ambiente.ancho) : 0} />
        </label>
        <label>Z desde arriba (m)
          <input type="number" name="z" min={0} max={ambiente.largo} step="any" required
            defaultValue={inicial ? local(boca.posicion[2], ambiente.z, ambiente.largo) : 0} />
        </label>
      </div>
      <button type="submit">Guardar ubicación</button>
    </form>
  );
}

export default function Plano() {
  const layout = useSimStore(selectLayout3d);
  const cfg = useSimStore((s) => s.cfg);
  const { moverBoca, agregarBoca, adoptarSuperficieDibujada } = useSimStore((s) => s.actions);
  const [id, setId] = useState("");
  const [aviso, setAviso] = useState("");
  const [punto, setPunto] = useState<PuntoPlano | null>(null);
  const seleccion = layout.bocas.find((b) => b.id === id);
  const recorridosManuales = tieneRecorridosManuales(cfg);
  const dibujada = superficieDibujada(layout.ambientes);
  const destino = punto && layout.ambientes.find((a) => a.id === punto.ambienteId);
  const xPunto = punto?.x ? Number(punto.x) : NaN;
  const zPunto = punto?.z ? Number(punto.z) : NaN;
  const izquierda = Math.min(...layout.ambientes.map((a) => a.x));
  const arriba = Math.min(...layout.ambientes.map((a) => a.z));
  const ancho = Math.max(...layout.ambientes.map((a) => a.x + a.ancho)) - izquierda;
  const largo = Math.max(...layout.ambientes.map((a) => a.z + a.largo)) - arriba;
  const escala = Math.max(ancho, largo);
  const margen = escala * 0.06;
  const color = (idCircuito: string) => varColorCircuito(Math.max(0, cfg.circuitos.findIndex((c) => c.id === idCircuito)));

  function mover(ambienteId: string, x: number, z: number) {
    if (!seleccion) return;
    setAviso(moverBoca(seleccion.id, ambienteId, x, z)
      ? `Ubicación guardada para ${seleccion.id}.`
      : "No se pudo guardar esta ubicación.");
  }

  function elegirPunto(event: MouseEvent<SVGSVGElement>) {
    if (!punto || recorridosManuales) return;
    const matriz = event.currentTarget.getScreenCTM();
    if (!matriz) return;
    const { x, y: z } = new DOMPoint(event.clientX, event.clientY).matrixTransform(matriz.inverse());
    const ambiente = layout.ambientes.find((a) => x >= a.x && x <= a.x + a.ancho && z >= a.z && z <= a.z + a.largo);
    if (!ambiente) return;
    const local = (v: number, origen: number, maximo: number) => String(Math.min(maximo, Math.round((v - origen) * 1000) / 1000));
    setPunto({ ambienteId: ambiente.id, x: local(x, ambiente.x, ambiente.ancho), z: local(z, ambiente.z, ambiente.largo) });
  }

  return (
    <section className="panel plano" aria-labelledby="plano-titulo">
      <div className="plano-lienzo">
        <h2 id="plano-titulo">Plano eléctrico 2D</h2>
        <svg viewBox={`${izquierda - margen} ${arriba - margen} ${ancho + 2 * margen} ${largo + 2 * margen}`}
          className={punto ? "plano-colocando" : undefined} onClick={punto && !recorridosManuales ? elegirPunto : undefined}
          role="img" aria-label="Planta con ambientes, tablero, canalizaciones y bocas">
          {layout.ambientes.map((a) => (
            <g key={a.id}>
              <rect className="plano-ambiente" x={a.x} y={a.z} width={a.ancho} height={a.largo} />
              <text x={a.x + a.ancho / 2} y={a.z + a.largo / 2} textAnchor="middle"
                fontSize={Math.min(a.ancho / Math.max(a.nombre.length, 1) * 1.5, a.largo / 4, escala / 36)}>{a.nombre}</text>
            </g>
          ))}
          {layout.recorridos?.map((r, i) => (
            <polyline key={i} className="plano-canalizacion" stroke={color(r.circuitoId)}
              points={r.puntos.map(([x, , z]) => `${x},${z}`).join(" ")} />
          ))}
          {layout.bocas.map((b) => (
            <circle key={b.id} cx={b.posicion[0]} cy={b.posicion[2]} r={escala / (b === seleccion ? 47 : 80)}
              fill={color(b.circuitoId)} className="plano-boca">
              <title>{b.id} · {etiquetas[b.tipo]}</title>
            </circle>
          ))}
          <rect x={layout.tablero.posicion[0] - escala / 65} y={layout.tablero.posicion[2] - escala / 65}
            width={escala / 32.5} height={escala / 32.5} className="plano-tablero"><title>Tablero</title></rect>
          {destino && xPunto >= 0 && xPunto <= destino.ancho && zPunto >= 0 && zPunto <= destino.largo && (
            <circle className="plano-punto" cx={destino.x + xPunto} cy={destino.z + zPunto} r={escala / 48}>
              <title>Punto elegido</title>
            </circle>
          )}
        </svg>
        <div className="row small">
          <span>Superficie dibujada <strong>{dibujada.toLocaleString("es-AR")} m²</strong></span>
          <span>· Superficie declarada <strong>{cfg.superficie_m2.toLocaleString("es-AR")} m²</strong></span>
          {!recorridosManuales && cfg.layout3d?.modo === "editado" && cfg.superficie_m2 !== dibujada && (
            <button type="button" onClick={() => {
              adoptarSuperficieDibujada();
              setAviso("La superficie dibujada ahora es la declarada.");
            }}>Usar superficie dibujada</button>
          )}
        </div>
        <div className="row small" aria-label="Colores de los circuitos">
          {cfg.circuitos.map((c) => <span key={c.id}><span aria-hidden="true" style={{ color: color(c.id) }}>● </span>{c.id} · {c.descripcion}</span>)}
        </div>
      </div>
      <div className="plano-edicion">
        {recorridosManuales ? <p className="small muted">Este plano es de solo lectura porque contiene recorridos manuales.</p> : (
          <>
            <h2>Editar ambiente</h2>
            <Medidas ambientes={layout.ambientes} avisar={setAviso} />
            <div className="row">
              <h2>Colocar una boca</h2>
              <button type="button" aria-expanded={!!punto} onClick={() => {
                setPunto(punto ? null : { ambienteId: layout.ambientes[0].id, x: "0", z: "0" });
                setAviso("");
              }}>{punto ? "Cancelar alta" : "Agregar boca"}</button>
            </div>
            {punto && (
              <AltaBoca ambientes={layout.ambientes} circuitos={cfg.circuitos} punto={punto} cambiarPunto={setPunto}
                guardar={(circuitoId, tipo, ubicacion) => {
                  const error = agregarBoca(circuitoId, tipo, ubicacion.ambienteId, Number(ubicacion.x), Number(ubicacion.z));
                  setAviso(error ?? "Boca agregada al circuito.");
                  if (!error) setPunto(null);
                }} />
            )}
          </>
        )}
        <h2>Reubicar una boca</h2>
        <p className="small muted">Las bocas de muro se ajustan al borde más cercano. Los centros de luz quedan en el cielorraso.</p>
        <label>Boca
          <select value={seleccion?.id ?? ""} onChange={(event) => { setId(event.target.value); setAviso(""); }}>
            <option value="">Seleccioná una boca</option>
            {layout.bocas.map((b) => (
              <option key={b.id} value={b.id}>{b.id} · {etiquetas[b.tipo]} · {layout.ambientes.find((a) => a.id === b.ambienteId)?.nombre}</option>
            ))}
          </select>
        </label>
        {seleccion && !recorridosManuales && (
          <Destino key={`${seleccion.id}:${seleccion.ambienteId}:${seleccion.posicion.join(",")}`}
            boca={seleccion} ambientes={layout.ambientes} mover={mover} />
        )}
        <div className="small" role="status">{aviso}</div>
      </div>
    </section>
  );
}
