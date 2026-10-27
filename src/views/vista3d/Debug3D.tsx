import { useControls } from "leva";
import { useEffect } from "react";

/* Panel de depuración (solo en desarrollo, con ?debug en la URL). Nunca se incluye en producción. */
export default function Debug3D({ onCambio }: { onCambio: (v: { efectos: boolean; dpr: number }) => void }) {
  const v = useControls("Vista 3D", { efectos: true, dpr: { value: 1.5, min: 1, max: 2, step: 0.25 } });
  useEffect(() => onCambio(v), [v, onCambio]);
  return null;
}
