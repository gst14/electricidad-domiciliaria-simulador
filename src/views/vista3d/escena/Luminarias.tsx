import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Color, Matrix4, Quaternion, Vector3 } from "three";
import type { InstancedMesh } from "three";
import { claseDe } from "../../../domain/layout3d/generarLayout";
import type { Boca, Layout3D } from "../../../domain/layout3d/tipos";
import type { SimState } from "../../../store/simStore";
import { simStore, useSimStore } from "../../../store/simStore";
import { useEscena } from "../contexto";
import { luzEncendida } from "../mapeoVisual";
import { hoverBocas, seleccionarBoca } from "./Bocas";
import { opacidadSeleccion } from "./Canerias";

export const COLOR_LUZ = new Color("#FFD9A0");
const ENCENDIDA = COLOR_LUZ.clone().multiplyScalar(3.2); // > 1: el Bloom la hace brillar
const MAX_LUCES = 4;
const m4 = new Matrix4(), q = new Quaternion(), uno = new Vector3(1, 1, 1), color = new Color(), fondo = new Color();

/* Bocas de iluminación (centros y apliques de circuitos de luz). */
export function bocasDeLuz(layout: Layout3D, tipos: Record<string, string>): Boca[] {
  return layout.bocas.filter((b) => (b.tipo === "centro" || b.tipo === "aplique") && claseDe(tipos[b.circuitoId] ?? "") === "luz");
}

export const posLampara = (b: Boca) => new Vector3(...b.posicion).addScaledVector(new Vector3(...b.normal), 0.09);

function encendida(s: SimState, b: Boca): boolean {
  const k = s.cfg.circuitos.find((c) => c.id === b.circuitoId);
  return !!k && b.cargaIndex !== undefined && luzEncendida(s.rt, k, k.cargas[b.cargaIndex]);
}

/* Ambiente "activo": el de la boca seleccionada o el elegido con la cámara. */
function ambienteActivo(s: SimState, layout: Layout3D): string | undefined {
  const sel = s.ui3d.seleccion;
  if (sel?.bocaId) return layout.bocas.find((b) => b.id === sel.bocaId)?.ambienteId;
  if (s.ui3d.camara.preset === "ambiente") return s.ui3d.camara.ambienteId;
  return undefined;
}

export default function Luminarias({ layout }: { layout: Layout3D }) {
  const { paleta } = useEscena();
  const cfg = useSimStore((s) => s.cfg);
  const tipos = useMemo(() => Object.fromEntries(cfg.circuitos.map((k) => [k.id, k.tipo])), [cfg]);
  const bocas = useMemo(() => bocasDeLuz(layout, tipos), [layout, tipos]);
  const ref = useRef<InstancedMesh>(null);
  const visto = useRef<{ version: number; ui: unknown }>({ version: -1, ui: null });
  const [luces, setLuces] = useState<[number, number, number][]>([]);

  useLayoutEffect(() => {
    const im = ref.current;
    if (!im) return;
    bocas.forEach((b, i) => im.setMatrixAt(i, m4.compose(posLampara(b), q, uno)));
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    visto.current.version = -1;
  }, [bocas]);

  useFrame(() => {
    const im = ref.current, s = simStore.getState();
    if (!im || (visto.current.version === s.version && visto.current.ui === s.ui3d)) return;
    visto.current = { version: s.version, ui: s.ui3d };
    bocas.forEach((b, i) => {
      color.copy(encendida(s, b) ? ENCENDIDA : fondo.set(paleta.muted));
      if (opacidadSeleccion(s.ui3d.seleccion, b.circuitoId) < 1) color.lerp(fondo.set(paleta.bg), s.ui3d.soloSeleccion ? 1 : 0.7);
      im.setColorAt(i, color);
    });
    if (im.instanceColor) im.instanceColor.needsUpdate = true;

    // Luces dinámicas reales: como máximo 4, solo en el ambiente activo.
    const amb = ambienteActivo(s, layout);
    const nuevas = amb ? bocas.filter((b) => b.ambienteId === amb && encendida(s, b)).slice(0, MAX_LUCES).map((b) => posLampara(b).toArray() as [number, number, number]) : [];
    if (JSON.stringify(nuevas) !== JSON.stringify(luces)) setLuces(nuevas);
  });

  if (!bocas.length) return null;
  return (
    <group>
      <instancedMesh ref={ref} key={bocas.length} args={[undefined, undefined, bocas.length]} name="luminarias" userData={{ bocas }}
        onClick={(e) => { e.stopPropagation(); if (e.instanceId !== undefined) seleccionarBoca(bocas[e.instanceId]); }}
        {...hoverBocas(bocas)}>
        <sphereGeometry args={[0.055, 16, 12]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {luces.map((p, i) => <pointLight key={i} position={[p[0], p[1] - 0.15, p[2]]} color={COLOR_LUZ} intensity={2.2} distance={4.5} decay={2} />)}
    </group>
  );
}
