import json
import sys

import schemdraw
import schemdraw.elements as elm

MAX_BOCAS_USO_GENERAL = 15


def validar(cfg):
    avisos = []
    tg = cfg["tablero"]["termica_general"]["amperes"]
    for c in cfg["circuitos"]:
        if c["tipo"] in ("IUG", "TUG") and c["bocas"] > MAX_BOCAS_USO_GENERAL:
            avisos.append(f"{c['id']}: {c['bocas']} bocas supera el máximo de {MAX_BOCAS_USO_GENERAL}")
        if c["amperes"] >= tg:
            avisos.append(f"{c['id']}: {c['amperes']} A no puede igualar o superar la térmica general ({tg} A)")
    return avisos


def dibujar(cfg, salida):
    tg = cfg["tablero"]["termica_general"]
    di = cfg["tablero"]["diferencial"]
    with schemdraw.Drawing(file=salida, show=False) as d:
        d.config(fontsize=11, unit=2.5, margin=1.2)
        elm.Dot(open=True).label(f"Medidor\n{cfg['tension']}", "top", ofst=0.3)
        elm.Breaker().down().label(f"TG {tg['polos']}x{tg['amperes']} A\ncurva {tg['curva']}", "top", ofst=0.3)
        elm.Breaker().down().label(f"ID {di['polos']}x{di['amperes']} A\n{di['sensibilidad_ma']} mA", "top", ofst=0.3)
        elm.Dot()
        for c in cfg["circuitos"]:
            elm.Line().right(3)
            d.push()
            elm.Breaker().down().label(f"{c['tipo']} {c['amperes']} A", "top", ofst=0.3)
            elm.Line().down(2).label(f"{c['seccion_mm2']} mm²\n{c['bocas']} boca{'s' if c['bocas'] != 1 else ''}", "bottom", ofst=0.3)
            elm.Dot(open=True).label(f"{c['id']}\n{c['descripcion']}", "bottom")
            d.pop()


if __name__ == "__main__":
    entrada = sys.argv[1] if len(sys.argv) > 1 else "instalacion.json"
    with open(entrada, encoding="utf-8") as f:
        cfg = json.load(f)
    for a in validar(cfg):
        print("AVISO:", a)
    dibujar(cfg, "unifilar.svg")
    print("Generado unifilar.svg")
