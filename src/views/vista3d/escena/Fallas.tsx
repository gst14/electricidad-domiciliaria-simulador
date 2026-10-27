import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { Mesh, MeshBasicMaterial, MeshStandardMaterial } from "three";
import { useShallow } from "zustand/react/shallow";
import { bocaDeCarga } from "../../../domain/layout3d/generarLayout";
import type { Boca, Layout3D, Vec3 } from "../../../domain/layout3d/tipos";
import { fmt } from "../../../domain/simulacion";
import type { Config } from "../../../domain/simulacion";
import { simStore, useSimStore } from "../../../store/simStore";
import { useEscena } from "../contexto";
import { texturaGuiones, tubosCircuito } from "../geometria";
import { carcasaEnergizada, fugaATierra, hayTension, intensidadPulso } from "../mapeoVisual";
import Etiqueta from "./Etiqueta";
import { posJabalina } from "./Tablero";

const DURACION_DESTELLO = 700; // ms

/* Boca donde se ubica la falla: la elegida en el panel, o la del primer artefacto del circuito. */
export function bocaDeFalla(layout: Layout3D, cfg: Config, circuitoId: string, bocaId?: string): Boca | undefined {
  const propias = layout.bocas.filter((b) => b.circuitoId === circuitoId);
  const k = cfg.circuitos.find((c) => c.id === circuitoId);
  return propias.find((b) => b.id === bocaId) ?? (k ? bocaDeCarga(layout, k, 0) : undefined) ?? propias[0];
}

/* Camino de la fuga: de la boca al tablero por su cañería, después por el PE hasta la jabalina. */
function caminoFuga(layout: Layout3D, boca: Boca): Vec3[] {
  const rec = layout.recorridos?.find((r) => r.bocaId === boca.id)?.puntos ?? [boca.posicion, layout.tablero.posicion];
  const [tx, , tz] = layout.tablero.posicion, j = posJabalina(layout.tablero.posicion);
  return [...[...rec].reverse(), [rec[0][0], 0.04, tz], [tx, 0.04, tz], [tx, 0.04, j[2]], [j[0], 0.04, j[2]]]
    .filter((p, i, a) => i === 0 || p.some((v, c) => v !== a[i - 1][c])) as Vec3[];
}

function Fuga({ layout, circuitoId, boca }: { layout: Layout3D; circuitoId: string; boca: Boca }) {
  const { paleta, reducido } = useEscena();
  const estado = useSimStore(useShallow((s) => {
    const k = s.cfg.circuitos.find((c) => c.id === circuitoId)!;
    return { leak: s.rt.c[circuitoId].leak, tension: hayTension(s.rt, circuitoId), atierra: fugaATierra(s.cfg, s.rt, k), carcasa: carcasaEnergizada(s.cfg, s.rt, k) };
  }));
  const firma = JSON.stringify([boca.id, layout.tablero.posicion]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- la firma resume boca y tablero
  const geo = useMemo(() => tubosCircuito([caminoFuga(layout, boca)], 0.016), [firma]);
  useEffect(() => () => geo?.dispose(), [geo]);
  const tex = useMemo(() => { const t = texturaGuiones().clone(); t.repeat.set(3, 1); return t; }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  const pulso = useRef<Mesh>(null), halo = useRef<Mesh>(null);

  useFrame(({ clock }, dt) => {
    const p = intensidadPulso("rapido", clock.elapsedTime, reducido);
    if (pulso.current) pulso.current.scale.setScalar(estado.tension ? 0.8 + 0.6 * p : 1);
    if (halo.current) (halo.current.material as MeshBasicMaterial).opacity = 0.18 + 0.25 * p;
    if (!reducido && estado.atierra) tex.offset.x -= dt * 1.5;
  });

  const [x, y, z] = boca.posicion;
  return (
    <group>
      <mesh ref={pulso} position={[x, y, z]} raycast={() => null}>
        <sphereGeometry args={[0.07, 16, 12]} />
        <meshBasicMaterial color={paleta.trip} toneMapped={false} transparent opacity={estado.tension ? 0.9 : 0.5} />
      </mesh>
      {estado.atierra && geo && (
        <mesh geometry={geo} raycast={() => null} renderOrder={4}>
          <meshStandardMaterial color={paleta.trip} emissive={paleta.trip} emissiveIntensity={1.2} alphaMap={tex} transparent depthWrite={false} />
        </mesh>
      )}
      {estado.carcasa && (
        <mesh ref={halo} position={[x, Math.max(0.5, y), z]} raycast={() => null}>
          <sphereGeometry args={[0.6, 24, 16]} />
          <meshBasicMaterial color={paleta.trip} transparent opacity={0.3} depthWrite={false} />
        </mesh>
      )}
      <Etiqueta position={[x, y + 0.25, z]} className="v3d-etq alerta">
        {estado.carcasa ? `⚠ Carcasa con tensión (${fmt(estado.leak, 0)} mA, sin tierra)` : `Fuga ${fmt(estado.leak, 0)} mA${estado.atierra ? " → tierra" : ""}`}
      </Etiqueta>
    </group>
  );
}

function Destello({ boca, t0 }: { boca: Boca; t0: number }) {
  const { reducido } = useEscena();
  const ref = useRef<Mesh>(null);
  useFrame(({ invalidate }) => {
    const f = (performance.now() - t0) / DURACION_DESTELLO, m = ref.current;
    if (!m) return;
    if (f >= 1) { m.visible = false; return; }
    m.scale.setScalar(reducido ? 1 : 0.3 + f * 1.6);
    (m.material as MeshStandardMaterial).opacity = reducido ? 0.9 : 1 - f;
    invalidate();
  });
  return (
    <mesh ref={ref} position={boca.posicion} raycast={() => null}>
      <sphereGeometry args={[0.25, 20, 14]} />
      <meshBasicMaterial color="#FFF2B0" toneMapped={false} transparent />
    </mesh>
  );
}

export default function Fallas({ layout }: { layout: Layout3D }) {
  const cfg = useSimStore((s) => s.cfg);
  const fugas = useSimStore(useShallow((s) => s.cfg.circuitos.filter((k) => s.rt.c[k.id]?.leak > 0).map((k) => `${k.id}|${s.rt.c[k.id].leakBoca ?? ""}`)));
  const destellos = useSimStore((s) => s.ui3d.destellos);

  // Los destellos vencidos se limpian solos.
  useEffect(() => {
    if (!destellos.length) return;
    const id = setTimeout(() => simStore.getState().actions.setUi3d((u) => ({ destellos: u.destellos.filter((d) => performance.now() - d.t < DURACION_DESTELLO) })), DURACION_DESTELLO + 50);
    return () => clearTimeout(id);
  }, [destellos]);

  return (
    <group>
      {fugas.map((f) => {
        const [id, bocaId] = f.split("|"), boca = bocaDeFalla(layout, cfg, id, bocaId || undefined);
        return boca ? <Fuga key={f} layout={layout} circuitoId={id} boca={boca} /> : null;
      })}
      {destellos.map((d) => {
        const boca = bocaDeFalla(layout, cfg, d.circuitoId, d.bocaId);
        return boca ? <Destello key={d.t} boca={boca} t0={d.t} /> : null;
      })}
    </group>
  );
}
