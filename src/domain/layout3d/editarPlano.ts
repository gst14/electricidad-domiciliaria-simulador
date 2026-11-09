import type { Config } from "../simulacion/tipos";
import { redimensionarBoca, sincronizarPlanoEditado } from "./generarLayout";
import type { Ambiente, Layout3D, Vec3 } from "./tipos";

export type MedidasAmbiente = Pick<Ambiente, "nombre" | "ancho" | "largo" | "alto">;
export type TipoBocaNueva = "toma" | "centro";

export function tieneRecorridosManuales(cfg: Config): boolean {
  const recorridos = cfg.layout3d?.recorridos;
  return Array.isArray(recorridos) && recorridos.length > 0;
}

export function superficieDibujada(ambientes: Ambiente[]): number {
  return Math.round(ambientes.reduce((area, a) => area + a.ancho * a.largo, 0) * 100) / 100;
}

export function guardarPlano(cfg: Config, layout: Layout3D): Config {
  const bocasGuardadas = cfg.layout3d?.bocas;
  const explicitos = new Set((Array.isArray(bocasGuardadas) ? bocasGuardadas : [])
    .filter((b) => b?.cargaIndex !== undefined).map((b) => b.circuitoId));
  const bocas = layout.bocas.map((boca) => {
    if (explicitos.has(boca.circuitoId)) return boca;
    const { cargaIndex: _derivado, ...ubicacion } = boca;
    return ubicacion;
  });
  const { ambientes, tablero } = layout;
  return sincronizarPlanoEditado({ ...cfg, layout3d: { modo: "editado", ambientes, tablero, bocas } });
}

function solapa(a: Ambiente, b: Ambiente): boolean {
  const solapeX = Math.min(a.x + a.ancho, b.x + b.ancho) - Math.max(a.x, b.x);
  const solapeZ = Math.min(a.z + a.largo, b.z + b.largo) - Math.max(a.z, b.z);
  // La planta automática redondea sus vértices a milímetros.
  return solapeX > 0.0010001 && solapeZ > 0.0010001;
}

export function editarAmbiente(layout: Layout3D, id: string, medidas: MedidasAmbiente): Layout3D {
  const anterior = layout.ambientes.find((a) => a.id === id);
  if (!anterior) throw new Error("El ambiente seleccionado ya no existe.");
  const nombre = medidas.nombre.trim();
  const { ancho, largo, alto } = medidas;
  if (!nombre || ![ancho, largo, alto].every((v) => Number.isFinite(v) && v >= 0.01)
      || !Number.isFinite(anterior.x + ancho) || !Number.isFinite(anterior.z + largo)
      || !Number.isFinite(ancho * largo)) {
    throw new Error("Ingresá un nombre y medidas válidas de al menos 0,01 m.");
  }

  const nuevo = { ...anterior, nombre, ancho, largo, alto };
  const ambientes = layout.ambientes.map((a) => a === anterior ? nuevo : a);
  if (ancho !== anterior.ancho || largo !== anterior.largo) {
    const conflicto = ambientes.find((a) => a !== nuevo && solapa(nuevo, a));
    if (conflicto) throw new Error(`Las nuevas medidas se superponen con ${conflicto.nombre}.`);
  }
  if (ancho === anterior.ancho && largo === anterior.largo && alto === anterior.alto) {
    return { ...layout, ambientes };
  }

  const bocas = layout.bocas.map((b) => b.ambienteId === id ? redimensionarBoca(b, anterior, nuevo) : b);
  const { tablero } = layout;
  if (tablero.ambienteId !== id) return { ...layout, ambientes, bocas };

  const [x, y, z] = tablero.posicion;
  const proporcion = (posicion: number, origen: number, dimension: number) =>
    Math.max(0, Math.min(1, (posicion - origen) / dimension));
  const posicion: Vec3 = [
    anterior.x + proporcion(x, anterior.x, anterior.ancho) * ancho,
    Math.max(0, Math.min(y, alto)),
    anterior.z + proporcion(z, anterior.z, anterior.largo) * largo,
  ];
  return { ...layout, ambientes, bocas, tablero: { ...tablero, posicion } };
}
