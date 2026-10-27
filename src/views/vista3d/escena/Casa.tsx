import { useMemo } from "react";
import { DoubleSide, Plane, Vector3 } from "three";
import type { Ambiente } from "../../../domain/layout3d/tipos";
import { useShallow } from "zustand/react/shallow";
import { useSimStore } from "../../../store/simStore";
import { useEscena } from "../contexto";
import Etiqueta from "./Etiqueta";

export const ESPESOR_MURO = 0.1;
export const ALTURA_CORTE = 1.2;
const PLANO_CORTE = new Plane(new Vector3(0, -1, 0), ALTURA_CORTE);

interface Muro { x: number; z: number; ancho: number; largo: number; alto: number }
const r = (n: number) => Math.round(n * 1000) / 1000;

/* Une los lados de todos los ambientes por línea, para que los muros compartidos no se dupliquen. */
export function murosDe(amb: Ambiente[]): Muro[] {
  const lineas = new Map<string, { eje: "x" | "z"; c: number; tramos: [number, number][]; alto: number }>();
  const add = (eje: "x" | "z", c: number, a: number, b: number, alto: number) => {
    const k = eje + r(c), l = lineas.get(k) ?? { eje, c: r(c), tramos: [], alto };
    l.tramos.push([r(a), r(b)]); l.alto = Math.max(l.alto, alto); lineas.set(k, l);
  };
  for (const a of amb) {
    add("z", a.z, a.x, a.x + a.ancho, a.alto);
    add("z", a.z + a.largo, a.x, a.x + a.ancho, a.alto);
    add("x", a.x, a.z, a.z + a.largo, a.alto);
    add("x", a.x + a.ancho, a.z, a.z + a.largo, a.alto);
  }
  const out: Muro[] = [];
  for (const l of lineas.values()) {
    const t = l.tramos.sort((p, q) => p[0] - q[0]), unidos: [number, number][] = [];
    for (const s of t) {
      const u = unidos[unidos.length - 1];
      if (u && s[0] <= u[1] + 1e-3) u[1] = Math.max(u[1], s[1]); else unidos.push([...s]);
    }
    for (const [a, b] of unidos) {
      out.push(l.eje === "z"
        ? { x: (a + b) / 2, z: l.c, ancho: b - a + ESPESOR_MURO, largo: ESPESOR_MURO, alto: l.alto }
        : { x: l.c, z: (a + b) / 2, ancho: ESPESOR_MURO, largo: b - a, alto: l.alto });
    }
  }
  return out;
}

export default function Casa({ ambientes }: { ambientes: Ambiente[] }) {
  const { paleta } = useEscena();
  const { rayosX, corte, techo, capas } = useSimStore(useShallow((s) => ({ rayosX: s.ui3d.rayosX, corte: s.ui3d.corte, techo: s.ui3d.techo, capas: s.ui3d.capas })));
  const muros = useMemo(() => murosDe(ambientes), [ambientes]);
  const W = Math.max(...ambientes.map((a) => a.x + a.ancho)), L = Math.max(...ambientes.map((a) => a.z + a.largo));
  const alto = Math.max(...ambientes.map((a) => a.alto));
  const clip = corte ? [PLANO_CORTE] : [];

  if (!capas.casa) return null;
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[W / 2, -0.001, L / 2]} receiveShadow>
        <planeGeometry args={[W + 6, L + 6]} />
        <meshStandardMaterial color={paleta.bg} roughness={1} />
      </mesh>
      {ambientes.map((a) => (
        <group key={a.id}>
          <mesh rotation-x={-Math.PI / 2} position={[a.x + a.ancho / 2, 0, a.z + a.largo / 2]} receiveShadow>
            <planeGeometry args={[a.ancho, a.largo]} />
            <meshStandardMaterial color={paleta.module} roughness={0.9} />
          </mesh>
          {capas.etiquetas && (
            <Etiqueta position={[a.x + a.ancho / 2, 0.02, a.z + a.largo / 2]} className="v3d-amb">
              {a.nombre}
            </Etiqueta>
          )}
        </group>
      ))}
      {muros.map((m, i) => (
        <mesh key={i} position={[m.x, m.alto / 2, m.z]} castShadow={!rayosX} receiveShadow renderOrder={rayosX ? 2 : 0}>
          <boxGeometry args={[m.ancho, m.alto, m.largo]} />
          <meshStandardMaterial color={paleta.surface} roughness={0.95} transparent={rayosX} opacity={rayosX ? 0.15 : 1}
            depthWrite={!rayosX} clippingPlanes={clip} side={DoubleSide} />
        </mesh>
      ))}
      {techo && !corte && (
        <mesh rotation-x={Math.PI / 2} position={[W / 2, alto + 0.05, L / 2]}>
          <planeGeometry args={[W + ESPESOR_MURO, L + ESPESOR_MURO]} />
          <meshStandardMaterial color={paleta.rail} transparent={rayosX} opacity={rayosX ? 0.15 : 1} depthWrite={!rayosX} side={DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
