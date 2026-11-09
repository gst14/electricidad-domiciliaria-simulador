import { useState } from "react";
import { claseDe } from "../../domain/layout3d/generarLayout";
import type { TipoBocaNueva } from "../../domain/layout3d/editarPlano";
import type { Ambiente } from "../../domain/layout3d/tipos";
import type { Circuito } from "../../domain/simulacion/tipos";
import { useSimStore } from "../../store/simStore";

export type PuntoPlano = { ambienteId: string; x: string; z: string };

export function Medidas({ ambientes, avisar }: { ambientes: Ambiente[]; avisar: (mensaje: string) => void }) {
  const [id, setId] = useState(ambientes[0].id);
  const ambiente = ambientes.find((a) => a.id === id) ?? ambientes[0];
  const cambiarMedidas = useSimStore((s) => s.actions.cambiarMedidas);
  const campos = [
    ["ancho", "Ancho"], ["largo", "Largo"], ["alto", "Alto"],
  ] as const;

  return (
    <form className="plano-destino" onSubmit={(event) => {
      event.preventDefault();
      const datos = new FormData(event.currentTarget);
      const error = cambiarMedidas(ambiente.id, {
        nombre: String(datos.get("nombre")), ancho: Number(datos.get("ancho")),
        largo: Number(datos.get("largo")), alto: Number(datos.get("alto")),
      });
      avisar(error ?? "Medidas del ambiente guardadas.");
    }}>
      <label>Ambiente a editar
        <select value={ambiente.id} onChange={(event) => setId(event.target.value)}>
          {ambientes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
      </label>
      <div className="plano-destino" key={JSON.stringify(ambiente)}>
        <label>Nombre
          <input name="nombre" type="text" defaultValue={ambiente.nombre} required />
        </label>
        <div className="plano-medidas">
          {campos.map(([campo, texto]) => (
            <label key={campo}>{texto} (m)
              <input name={campo} type="number" min={0.01} step="any" defaultValue={ambiente[campo]} required />
            </label>
          ))}
        </div>
      </div>
      <button type="submit">Guardar medidas</button>
    </form>
  );
}

export function AltaBoca({ ambientes, circuitos, punto, cambiarPunto, guardar }: {
  ambientes: Ambiente[];
  circuitos: Circuito[];
  punto: PuntoPlano;
  cambiarPunto: (punto: PuntoPlano) => void;
  guardar: (circuitoId: string, tipo: TipoBocaNueva, punto: PuntoPlano) => void;
}) {
  const [tipo, setTipo] = useState<TipoBocaNueva>(() => claseDe(circuitos[0].tipo) === "luz" ? "centro" : "toma");
  const [id, setId] = useState("");
  const ambiente = ambientes.find((a) => a.id === punto.ambienteId) ?? ambientes[0];
  const opciones = circuitos.filter((c) => (claseDe(c.tipo) === "luz") === (tipo === "centro"));
  const circuitoId = opciones.find((c) => c.id === id)?.id ?? opciones[0]?.id ?? "";

  return (
    <form className="plano-destino" onSubmit={(event) => {
      event.preventDefault();
      guardar(circuitoId, tipo, { ...punto, ambienteId: ambiente.id });
    }}>
      <p className="small muted">Tocá un punto en la planta o ingresá las coordenadas del destino.</p>
      <label>Tipo de boca
        <select value={tipo} onChange={(event) => setTipo(event.target.value as TipoBocaNueva)}>
          <option value="toma">Tomacorriente</option>
          <option value="centro">Centro de luz</option>
        </select>
      </label>
      <label>Circuito
        <select value={circuitoId} onChange={(event) => setId(event.target.value)} required>
          {opciones.length === 0 && <option value="">Sin circuitos compatibles</option>}
          {opciones.map((c) => <option key={c.id} value={c.id}>{c.id} · {c.descripcion}</option>)}
        </select>
      </label>
      <label>Ambiente de destino
        <select value={ambiente.id} onChange={(event) => cambiarPunto({ ambienteId: event.target.value, x: "0", z: "0" })}>
          {ambientes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
      </label>
      <div className="plano-coordenadas">
        <label>X desde la izquierda (m)
          <input type="number" name="x" min={0} max={ambiente.ancho} step="any" required
            value={punto.x} onChange={(event) => cambiarPunto({ ...punto, x: event.target.value })} />
        </label>
        <label>Z desde arriba (m)
          <input type="number" name="z" min={0} max={ambiente.largo} step="any" required
            value={punto.z} onChange={(event) => cambiarPunto({ ...punto, z: event.target.value })} />
        </label>
      </div>
      <button type="submit" disabled={!circuitoId}>Confirmar nueva boca</button>
    </form>
  );
}
