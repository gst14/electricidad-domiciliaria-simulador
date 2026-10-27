// Verifica que three.js no esté en el bundle inicial: solo en el chunk diferido de la vista 3D.
import { readFileSync, readdirSync } from "node:fs";

const html = readFileSync("dist/index.html", "utf8");
const entrada = html.match(/src="\/assets\/(index-[^"]+\.js)"/)?.[1];
if (!entrada) throw new Error("No se encontró el chunk de entrada en dist/index.html");
const codigo = readFileSync(`dist/assets/${entrada}`, "utf8");
const vista3d = readdirSync("dist/assets").find((f) => f.startsWith("Vista3D-") && f.endsWith(".js"));

const errores = [];
if (codigo.includes("WebGLRenderer")) errores.push(`${entrada} incluye three.js`);
if (!vista3d) errores.push("No hay un chunk separado para la vista 3D");
else if (!readFileSync(`dist/assets/${vista3d}`, "utf8").includes("WebGLRenderer")) errores.push(`${vista3d} no contiene three.js`);
if (errores.length) { console.error("✗ " + errores.join("\n✗ ")); process.exit(1); }
console.log(`✓ Bundle inicial sin three.js (${entrada}, ${(codigo.length / 1024).toFixed(0)} kB); vista 3D en ${vista3d}`);
