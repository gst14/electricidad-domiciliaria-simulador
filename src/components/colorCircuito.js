// Color de cada circuito según su orden en el tablero (tokens --c1…--c8 del tema).
export const CANT_COLORES = 8;
export const varColorCircuito = (ci) => `var(--c${(ci % CANT_COLORES) + 1})`;
