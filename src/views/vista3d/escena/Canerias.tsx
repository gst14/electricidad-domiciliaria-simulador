import type { ThreeEvent } from "@react-three/fiber";
import { Select } from "@react-three/postprocessing";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color } from "three";
import type { Mesh, MeshStandardMaterial } from "three";
import type { Layout3D, Vec3 } from "../../../domain/layout3d/tipos";
import type { Seleccion } from "../../../store/simStore";
import { simStore, useSimStore } from "../../../store/simStore";
import { useEscena } from "../contexto";
import { texturaGuiones, texturaRayado, tubosCircuito } from "../geometria";
import { colorNivel, estadoVisualCircuito, intensidadPulso } from "../mapeoVisual";

export const RADIO_CANO = 0.011;
const GUIONES_POR_M = 4;
const BLANCO = new Color("#ffffff");

/* Recorridos agrupados por circuito, con una firma para no rehacer geometría de circuitos sin cambios. */
export function recorridosPorCircuito(layout: Layout3D): Map<string, { firma: string; puntos: Vec3[][] }> {
  const m = new Map<string, Vec3[][]>();
  for (const r of layout.recorridos ?? []) m.set(r.circuitoId, [...(m.get(r.circuitoId) ?? []), r.puntos]);
  return new Map([...m].map(([id, puntos]) => [id, { firma: JSON.stringify(puntos), puntos }]));
}

/* Atenuación por selección: 1 si no hay selección o es este circuito. */
export function opacidadSeleccion(sel: Seleccion | null, circuitoId: string): number {
  return !sel?.circuitoId || sel.circuitoId === circuitoId ? 1 : 0.18;
}

export function eventosHover(sel: Seleccion) {
  return {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      document.body.style.cursor = "pointer";
      simStore.getState().actions.setUi3d({ hover: { ...sel, punto: e.point.toArray() as Vec3 } });
    },
    onPointerOut: () => {
      document.body.style.cursor = "";
      simStore.getState().actions.setUi3d({ hover: null });
    },
  };
}

function CanoCircuito({ circuitoId, firma, puntos }: { circuitoId: string; firma: string; puntos: Vec3[][] }) {
  const { colores, paleta, reducido } = useEscena();
  /* eslint-disable react-hooks/exhaustive-deps -- la firma resume los puntos */
  const geo = useMemo(() => tubosCircuito(puntos, RADIO_CANO), [firma]);
  const geoHalo = useMemo(() => tubosCircuito(puntos, RADIO_CANO * 2.2), [firma]);
  /* eslint-enable react-hooks/exhaustive-deps */
  useEffect(() => () => { geo?.dispose(); geoHalo?.dispose(); }, [geo, geoHalo]);

  const flujo = useMemo(() => { const t = texturaGuiones().clone(); t.repeat.set(GUIONES_POR_M, 1); return t; }, []);
  const rayas = useMemo(() => { const t = texturaRayado().clone(); t.repeat.set(10, 1); return t; }, []);
  useEffect(() => () => { flujo.dispose(); rayas.dispose(); }, [flujo, rayas]);

  const cano = useRef<Mesh>(null), halo = useRef<Mesh>(null);
  const tmp = useMemo(() => new Color(), []);

  useFrame(({ clock }, dt) => {
    const { cfg, rt, ui3d } = simStore.getState();
    const k = cfg.circuitos.find((c) => c.id === circuitoId);
    if (!k || !cano.current || !halo.current) return;
    const e = estadoVisualCircuito(cfg, rt, k);
    const m = cano.current.material as MeshStandardMaterial;
    tmp.set(colorNivel(e.nivel, colores[circuitoId], paleta));
    const p = intensidadPulso(e.pulso, clock.elapsedTime, reducido);
    if (e.pulso !== "no") tmp.lerp(BLANCO, 0.4 * p);
    m.color.copy(tmp);
    // Los guiones del flujo brillan con el mismo color del caño, así cada circuito se distingue.
    m.emissive.copy(tmp);
    m.emissiveIntensity = e.flujo > 0 ? 0.9 : 0;
    if (e.flujo > 0 && rt.running && !reducido) flujo.offset.x -= e.flujo * GUIONES_POR_M * dt;
    const op = opacidadSeleccion(ui3d.seleccion, circuitoId);
    m.opacity = op;
    cano.current.visible = !(ui3d.soloSeleccion && ui3d.seleccion?.circuitoId && op < 1);

    const h = halo.current, hm = h.material as MeshStandardMaterial;
    h.visible = cano.current.visible && (e.subdimensionado || e.izExcedida);
    hm.opacity = (e.izExcedida ? 0.45 + 0.4 * intensidadPulso("rapido", clock.elapsedTime, reducido) : 0.6) * op;
    if (e.izExcedida && !reducido) rayas.offset.x -= dt * 0.6;
  });

  const resaltado = useSimStore((s) => s.ui3d.seleccion?.circuitoId === circuitoId);
  const sel: Seleccion = { tipo: "circuito", circuitoId };
  if (!geo || !geoHalo) return null;
  return (
    <group>
      <Select enabled={resaltado}>
      <mesh ref={cano} geometry={geo} castShadow name={"cano-" + circuitoId} userData={{ seleccion: sel }}
        onClick={(e) => { e.stopPropagation(); simStore.getState().actions.setUi3d({ seleccion: sel, pestana: "circuitos" }); }}
        {...eventosHover(sel)}>
        <meshStandardMaterial color={colores[circuitoId]} roughness={0.5} emissiveMap={flujo} emissiveIntensity={0} transparent />
      </mesh>
      </Select>
      <mesh ref={halo} geometry={geoHalo} visible={false} raycast={() => null} renderOrder={3}>
        <meshStandardMaterial color={paleta.trip} emissive={paleta.trip} emissiveIntensity={0.6} alphaMap={rayas} transparent depthWrite={false} />
      </mesh>
    </group>
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
