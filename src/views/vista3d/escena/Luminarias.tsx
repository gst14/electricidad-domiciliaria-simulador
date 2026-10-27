import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, Matrix4, Quaternion, Vector3 } from "three";
import type { InstancedMesh } from "three";
import { claseDe } from "../../../domain/layout3d/generarLayout";
import type { Boca, Layout3D } from "../../../domain/layout3d/tipos";
import { useSimStore } from "../../../store/simStore";
import { seleccionarBoca } from "./Bocas";

export const COLOR_LUZ = new Color("#FFD9A0");
const m4 = new Matrix4(), q = new Quaternion(), uno = new Vector3(1, 1, 1);

/* Bocas de iluminación (centros y apliques de circuitos de luz). */
export function bocasDeLuz(layout: Layout3D, tipos: Record<string, string>): Boca[] {
  return layout.bocas.filter((b) => (b.tipo === "centro" || b.tipo === "aplique") && claseDe(tipos[b.circuitoId] ?? "") === "luz");
}

export const posLampara = (b: Boca) => new Vector3(...b.posicion).addScaledVector(new Vector3(...b.normal), 0.09);

export default function Luminarias({ layout }: { layout: Layout3D }) {
  const cfg = useSimStore((s) => s.cfg);
  const tipos = useMemo(() => Object.fromEntries(cfg.circuitos.map((k) => [k.id, k.tipo])), [cfg]);
  const bocas = useMemo(() => bocasDeLuz(layout, tipos), [layout, tipos]);
  const ref = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const im = ref.current;
    if (!im) return;
    bocas.forEach((b, i) => {
      im.setMatrixAt(i, m4.compose(posLampara(b), q, uno));
      im.setColorAt(i, new Color(0.25, 0.25, 0.25));
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
  }, [bocas]);

  if (!bocas.length) return null;
  return (
    <instancedMesh ref={ref} key={bocas.length} args={[undefined, undefined, bocas.length]} name="luminarias" userData={{ bocas }}
      onClick={(e) => { e.stopPropagation(); if (e.instanceId !== undefined) seleccionarBoca(bocas[e.instanceId]); }}>
      <sphereGeometry args={[0.055, 16, 12]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}
