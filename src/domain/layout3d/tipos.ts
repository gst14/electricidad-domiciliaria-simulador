export type Vec3 = [number, number, number];

export type TipoBoca = "centro" | "aplique" | "toma" | "llave" | "caja_paso";

/* Medidas en metros. Planta rectangular: (x, z) es la esquina de menor coordenada. */
export interface Ambiente {
  id: string;
  nombre: string;
  x: number;
  z: number;
  ancho: number; // eje X
  largo: number; // eje Z
  alto: number;
}

export interface Boca {
  id: string;
  circuitoId: string;
  tipo: TipoBoca;
  ambienteId: string;
  posicion: Vec3;
  normal: Vec3;
  cargaIndex?: number; // vincula a circuitos[i].cargas[cargaIndex]
}

export interface Recorrido {
  circuitoId: string;
  bocaId?: string;
  puntos: Vec3[];
}

export interface Layout3D {
  ambientes: Ambiente[];
  tablero: { posicion: Vec3; ambienteId: string };
  bocas: Boca[];
  recorridos?: Recorrido[];
}
