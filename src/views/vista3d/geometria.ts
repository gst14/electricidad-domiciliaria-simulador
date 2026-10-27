import { CurvePath, LineCurve3, QuadraticBezierCurve3, Quaternion, TubeGeometry, Vector3 } from "three";
import type { BufferGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Vec3 } from "../../domain/layout3d/tipos";

const RADIO_CODO = 0.05;

/* Camino de tramos rectos con codos levemente redondeados. */
export function caminoRedondeado(puntos: Vec3[]): CurvePath<Vector3> {
  const p = puntos.map((v) => new Vector3(...v)), path = new CurvePath<Vector3>();
  if (p.length < 2) return path;
  let desde = p[0];
  for (let i = 1; i < p.length - 1; i++) {
    const a = p[i - 1], b = p[i], c = p[i + 1];
    const rc = Math.min(RADIO_CODO, a.distanceTo(b) / 2, b.distanceTo(c) / 2);
    const entrada = b.clone().add(a.clone().sub(b).normalize().multiplyScalar(rc));
    const salida = b.clone().add(c.clone().sub(b).normalize().multiplyScalar(rc));
    if (desde.distanceTo(entrada) > 1e-6) path.add(new LineCurve3(desde, entrada));
    path.add(new QuadraticBezierCurve3(entrada, b, salida));
    desde = salida;
  }
  path.add(new LineCurve3(desde, p[p.length - 1]));
  return path;
}

/* Un tubo por recorrido, unidos en una sola geometría por circuito. */
export function tubosCircuito(recorridos: Vec3[][], radio: number): BufferGeometry | null {
  const geos = recorridos.filter((r) => r.length > 1).map((r) => {
    const camino = caminoRedondeado(r);
    const largo = camino.getLength();
    return new TubeGeometry(camino as never, Math.max(8, Math.ceil(largo * 12) + r.length * 6), radio, 6, false);
  });
  if (!geos.length) return null;
  const g = mergeGeometries(geos);
  geos.forEach((x) => x.dispose());
  return g;
}

const Z = new Vector3(0, 0, 1);
/* Rotación que lleva +Z a la normal de la boca. */
export function rotacionDesdeNormal(n: Vec3): Quaternion {
  return new Quaternion().setFromUnitVectors(Z, new Vector3(...n).normalize());
}
