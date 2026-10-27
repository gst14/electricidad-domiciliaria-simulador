import { useEffect, useId, useRef, useState } from "react";

export const DEBOUNCE_MS = 150;

/*
 * Valor local que se confirma en el store 150 ms después de la última tecla (o al salir del campo).
 * Mientras hay una edición pendiente no se pisa con el valor externo.
 */
export function useDebouncedCommit<T>(externo: T, commit: (v: T) => void, ms = DEBOUNCE_MS) {
  const [local, setLocal] = useState(externo);
  const pendiente = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitRef = useRef(commit);
  commitRef.current = commit;
  useEffect(() => { if (!pendiente.current) setLocal(externo); }, [externo]);
  useEffect(() => () => { if (pendiente.current) clearTimeout(pendiente.current); }, []);
  const cambiar = (v: T) => {
    setLocal(v);
    if (pendiente.current) clearTimeout(pendiente.current);
    pendiente.current = setTimeout(() => { pendiente.current = null; commitRef.current(v); }, ms);
  };
  const confirmar = () => {
    if (!pendiente.current) return;
    clearTimeout(pendiente.current);
    pendiente.current = null;
    commitRef.current(local);
  };
  return [local, cambiar, confirmar] as const;
}

interface CampoNumeroProps {
  etiqueta: string;
  valor: number;
  unidad?: string;
  min?: number;
  max?: number;
  paso?: number;
  entero?: boolean;
  compacto?: boolean; // la etiqueta queda solo para lectores de pantalla
  onCommit: (v: number) => void;
}

/* Número con debounce: solo confirma valores válidos dentro de [min, max]. */
export function CampoNumero({ etiqueta, valor, unidad, min = 0, max = Infinity, paso = 1, entero, compacto, onCommit }: CampoNumeroProps) {
  const id = useId();
  const [texto, cambiar, confirmar] = useDebouncedCommit(String(valor), (t) => {
    const n = entero ? Math.round(Number(t)) : Number(t);
    if (t.trim() !== "" && Number.isFinite(n) && n >= min && n <= max && n !== valor) onCommit(n);
  });
  const n = Number(texto), invalido = texto.trim() === "" || !Number.isFinite(n) || n < min || n > max;
  return (
    <label className={"campo" + (compacto ? " compacto" : "")} htmlFor={id}>
      <span className={compacto ? "sr" : undefined}>{etiqueta}</span>
      <span className="campo-in">
        <input id={id} type="number" inputMode="decimal" value={texto} min={min} max={Number.isFinite(max) ? max : undefined} step={paso}
          aria-invalid={invalido || undefined} onChange={(e) => cambiar(e.target.value)} onBlur={confirmar}
          onKeyDown={(e) => { if (e.key === "Enter") confirmar(); }} />
        {unidad && <span className="muted">{unidad}</span>}
      </span>
    </label>
  );
}

interface CampoSelectProps<T extends string | number> {
  etiqueta: string;
  valor: T;
  opciones: readonly (readonly [T, string])[];
  onChange: (v: T) => void;
}

export function CampoSelect<T extends string | number>({ etiqueta, valor, opciones, onChange }: CampoSelectProps<T>) {
  const id = useId();
  return (
    <label className="campo" htmlFor={id}>
      <span>{etiqueta}</span>
      <select id={id} value={String(valor)} onChange={(e) => {
        const o = opciones.find(([v]) => String(v) === e.target.value);
        if (o) onChange(o[0]);
      }}>
        {opciones.map(([v, t]) => <option key={String(v)} value={String(v)}>{t}</option>)}
      </select>
    </label>
  );
}
