# Tablerista

Simulador de instalación eléctrica monofásica 220 V: medidor, térmica general, diferencial y circuitos IUG, TUG y TUE. Encendé artefactos, provocá fallas y mirá qué protección actúa.

Todo energizado

Corriente0 A

Potencia0 kW

Energía0 kWh

Fuga a tierra0 mA

Tiempo simulado00:00:00

## Tablero principal

Tocá una palanca para abrir o rearmar. La barra naranja es el calentamiento del bimetal: al llenarse, dispara.

FaseNeutroTierra (PE)Corriente circulando

## Esquema unifilar en vivo

## Circuitos

## Verificación del proyecto

## Registro de eventos

## Configuración (JSON)

JSON de la instalación

### Cómo se modela

Cada artefacto consume `I = P ÷ (V × fp)`. Los motores (heladera, aire, bomba) usan factor de potencia menor a 1.

Las termomagnéticas tienen dos disparos. El térmico acumula calor cuando la corriente pasa 1,13 × In y tarda menos cuanto mayor es la sobrecarga. El magnético es instantáneo ante un cortocircuito (curva B: 4 × In, C: 8 × In, D: 15 × In).

El diferencial no mira la corriente total, sino la diferencia entre fase y neutro. Corta cuando la fuga supera el 75 % de su sensibilidad. Sin jabalina, la fuga no tiene camino a tierra y la carcasa queda con tensión.

La temperatura del cable sube con el cuadrado de I ÷ Iz. Si la térmica es más grande que lo que soporta el cable, el cable pasa los 70 °C del PVC antes de que la protección actúe.

Capacidades de cable aproximadas (PVC en cañería). Es una herramienta didáctica: el proyecto real lo firma un electricista matriculado según AEA 90364.