import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { iniciarSimulacion, simStore } from "./store/simStore";
import "./styles.css";

iniciarSimulacion();
// Acceso al store desde la consola para depurar (solo en desarrollo).
if (import.meta.env.DEV) window.__tablerista = simStore;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
