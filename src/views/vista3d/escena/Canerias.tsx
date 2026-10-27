import { useEffect, useMemo } from "react";
import type { Layout3D, Vec3 } from "../../../domain/layout3d/tipos";
import { simStore } from "../../../store/simStore";
import { useEscena } from "../contexto";
import { tubosCircuito } from "../geometria";

export const RADIO_CANO = 0.011;

/* Recorridos agrupados por circuito, con una firma para no rehacer geometría de circuitos sin cambios. */
export function recorridosPorCircuito(layout: Layout3D): Map<string, { firma: string; puntos: Vec3[][] }> {
  const m = new Map<string, Vec3[][]>();
  for (const r of layout.recorridos ?? []) m.set(r.circuitoId, [...(m.get(r.circuitoId) ?? []), r.puntos]);
  return new Map([...m].map(([id, puntos]) => [id, { firma: JSON.stringify(puntos), puntos }]));
}

function CanoCircuito({ circuitoId, firma, puntos }: { circuitoId: string; firma: string; puntos: Vec3[][] }) {
  const { colores } = useEscena();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- la firma resume los puntos
  const geo = useMemo(() => tubosCircuito(puntos, RADIO_CANO), [firma]);
  useEffect(() => () => geo?.dispose(), [geo]);
  if (!geo) return null;
  return (
    <mesh geometry={geo} castShadow userData={{ seleccion: { tipo: "circuito", circuitoId } }}
      onClick={(e) => { e.stopPropagation(); simStore.getState().actions.setUi3d({ seleccion: { tipo: "circuito", circuitoId }, pestana: "circuitos" }); }}>
      <meshStandardMaterial color={colores[circuitoId]} roughness={0.5} />
    </mesh>
  );
}

export default function Canerias({ layout }: { layout: Layout3D }) {
  const grupos = useMemo(() => recorridosPorCircuito(layout), [layout]);
  return (
    <group>
      {[...grupos].map(([id, g]) => <CanoCircuito key={id} circuitoId={id} firma={g.firma} puntos={g.puntos} />)}
    </group>
  );
}
