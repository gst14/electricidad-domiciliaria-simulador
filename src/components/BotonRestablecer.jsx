import { circuitoBase, circuitoModificado, useSimStore } from "../store/simStore";

// Vuelve el circuito a como estaba en el proyecto cargado (JSON aplicado o ejemplo).
export default function BotonRestablecer({ ci }) {
  const existe = useSimStore((s) => !!circuitoBase(s, ci));
  const modificado = useSimStore((s) => circuitoModificado(s, ci));
  const reset = useSimStore((s) => s.actions.resetCircuito);
  const id = useSimStore((s) => s.cfg.circuitos[ci]?.id);
  const motivo = !existe ? "Este circuito no estaba en el proyecto cargado" : modificado ? "Volver a la configuración del proyecto" : "Sin cambios respecto del proyecto";
  return (
    <button className="restablecer" disabled={!modificado} title={motivo} aria-label={`Restablecer ${id}. ${motivo}`} onClick={() => reset(ci)}>
      ↺ Restablecer
    </button>
  );
}
