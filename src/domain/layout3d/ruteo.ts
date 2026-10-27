import type { Ambiente, Boca, Recorrido, Vec3 } from "./tipos";

export const BAJO_LOSA = 0.1; // la cañería corre 10 cm por debajo de la losa
export const SEPARACION_CARRIL = 0.04; // circuitos en paralelo, 4 cm entre sí
const SALIDA_MURO = 0.12; // la cañería se despega del muro del tablero antes de avanzar

const igual = (a: Vec3, b: Vec3) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const r = (n: number) => Math.round(n * 1000) / 1000;

/*
 * Recorrido ortogonal tablero → boca: sube por el muro hasta el cielorraso, sale del muro,
 * avanza en X y después en Z, y baja (o sube, si es un centro) hasta la boca.
 * `carril` desplaza el tramo compartido para que los circuitos no se superpongan.
 */
export function rutear(tablero: Vec3, boca: Boca, ambientes: Ambiente[], carril: number): Vec3[] {
  const alto = ambientes.find((a) => a.id === boca.ambienteId)?.alto ?? Math.max(...ambientes.map((a) => a.alto));
  const yc = r(alto - BAJO_LOSA), d = carril * SEPARACION_CARRIL;
  const [tx, ty, tz] = tablero, [bx, by, bz] = boca.posicion;
  const zSalida = r(tz + SALIDA_MURO + d);
  const pts: Vec3[] = [
    [r(tx + d), ty, tz],
    [r(tx + d), yc, tz],
    [r(tx + d), yc, zSalida],
    [bx, yc, zSalida],
    [bx, yc, bz],
    [bx, by, bz],
  ];
  return pts.filter((p, i) => i === 0 || !igual(p, pts[i - 1]));
}

export function rutearTodo(tablero: Vec3, bocas: Boca[], ambientes: Ambiente[], carriles: Record<string, number>): Recorrido[] {
  return bocas.map((b) => ({ circuitoId: b.circuitoId, bocaId: b.id, puntos: rutear(tablero, b, ambientes, carriles[b.circuitoId] ?? 0) }));
}
