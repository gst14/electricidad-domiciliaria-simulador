import { CanvasTexture, CurvePath, LineCurve3, QuadraticBezierCurve3, Quaternion, RepeatWrapping, TubeGeometry, Vector3 } from "three";
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

/*
 * Un tubo por recorrido, unidos en una sola geometría por circuito. La coordenada u de las UV
 * queda en metros desde el tablero, así una textura repetida avanza igual en todos los tramos.
 */
export function tubosCircuito(recorridos: Vec3[][], radio: number): BufferGeometry | null {
  const geos = recorridos.filter((r) => r.length > 1).map((r) => {
    const camino = caminoRedondeado(r);
    const largo = camino.getLength();
    const g = new TubeGeometry(camino as never, Math.max(8, Math.ceil(largo * 12) + r.length * 6), radio, 6, false);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * largo);
    return g;
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

/* Texturas procedurales (sin archivos externos), compartidas. */
function textura(w: number, h: number, dibujar: (c: CanvasRenderingContext2D) => void): CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  dibujar(cv.getContext("2d")!);
  const t = new CanvasTexture(cv);
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}
let guiones: CanvasTexture | null = null, rayado: CanvasTexture | null = null;
/* Guiones a lo largo del caño: el flujo de corriente se dibuja desplazando su offset. */
export function texturaGuiones(): CanvasTexture {
  return (guiones ??= textura(64, 4, (c) => { c.fillStyle = "#000"; c.fillRect(0, 0, 64, 4); c.fillStyle = "#fff"; c.fillRect(0, 0, 26, 4); }));
}
/* Rayado diagonal para marcar un cable subdimensionado. */
export function texturaRayado(): CanvasTexture {
  return (rayado ??= textura(32, 32, (c) => {
    c.clearRect(0, 0, 32, 32); c.fillStyle = "#fff";
    for (let i = -32; i < 64; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 8, 0); c.lineTo(i + 8 + 32, 32); c.lineTo(i + 32, 32); c.fill(); }
  }));
}
