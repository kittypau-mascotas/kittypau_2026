"""
Recalibracion periodica CON FRENO DE CALIDAD (FR-010,
Knowledge/29_Specs/007-motor-alimentacion-produccion/plan.md).

Nunca reemplaza el modelo vigente en produccion (kittypau_app/src/lib/
motor-alimentacion/calibracion-kpcl0034.json) a ciegas. Flujo:

  0. Refresca candidatos_categoria_real.csv desde cero (re-corre las celdas
     de 08_validacion_contra_anotaciones.ipynb: categoria real por
     solapamiento de tiempo + promocion de los veredictos manuales
     guardados en revision_sin_anotacion.csv). Sin este paso,
     exportar_calibracion_produccion.py mide contra ground truth
     desactualizado -- hallazgo real: la primera version de este script no
     lo hacia, y comparaba contra datos con 18 veredictos manuales menos
     de los que ya existian.
  1. Guarda el vigente (el que ya esta en produccion) como referencia.
  2. Corre exportar_calibracion_produccion.py con los datos YA
     refrescados -> candidato nuevo.
  3. Compara accuracy_global_con_guardia del candidato vs. el vigente
     (misma metrica, misma metodologia -- ver mejora_medida, calculada
     siempre en vivo, nunca hardcodeada).
  4. Solo promueve (copia a kittypau_app/) si el candidato iguala o supera
     al vigente. Si empeora, se descarta -- el vigente sigue como esta,
     sin tocar.

Deja un registro en data/historial_recalibraciones.jsonl (una linea por
corrida, append-only) con fecha, metricas antes/despues, y si se promovio
o se descarto -- para poder auditar cada decision despues.

Pensado para correr fuera de Vercel (cron/CI local, o manual) -- nunca
en el runtime de la app Next.js. Ver plan.md "FR-010" para el diseno
completo.

Correr con: python recalibrar_con_freno.py
"""
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

NB_DIR = Path(__file__).resolve().parent
NOTEBOOK_VALIDACION = NB_DIR / "08_validacion_contra_anotaciones.ipynb"
EXPORT_SCRIPT = NB_DIR / "exportar_calibracion_produccion.py"
CANDIDATO_JSON = NB_DIR / "data" / "calibracion_kpcl0034_export.json"
PRODUCCION_JSON = (
    NB_DIR.parent.parent / "kittypau_app" / "src" / "lib" / "motor-alimentacion" / "calibracion-kpcl0034.json"
)
HISTORIAL_JSONL = NB_DIR / "data" / "historial_recalibraciones.jsonl"

# Metrica de decision: la misma que ya se reporta en produccion (accuracy
# global CON guardia -- ya incluye el efecto de la guardia fisica, es la
# metrica end-to-end mas representativa de "que tan bien clasifica de
# verdad"). Empate cuenta como mejora (>=), no se exige superar estricto.
METRICA_DECISION = ("guardia_alimentacion", "mejora_medida", "accuracy_global_con_guardia")


def leer_metrica(calibracion: dict) -> float | None:
    valor = calibracion
    for clave in METRICA_DECISION:
        if not isinstance(valor, dict) or clave not in valor:
            return None
        valor = valor[clave]
    return float(valor) if valor is not None else None


def refrescar_categoria_real() -> bool:
    """Re-corre 08_validacion_contra_anotaciones.ipynb completo (categoria_real
    por solapamiento + promocion de veredictos manuales) para que
    candidatos_categoria_real.csv refleje TODO lo revisado hasta ahora en
    app_candidatos.py, no solo lo que habia la ultima vez que se corrio a
    mano. Notebook self-contained (no depende de estado de otros notebooks)."""
    if not NOTEBOOK_VALIDACION.exists():
        print(f"ERROR: no existe {NOTEBOOK_VALIDACION}")
        return False
    nb = json.loads(NOTEBOOK_VALIDACION.read_text(encoding="utf-8"))
    codigo = "\n\n".join(
        "".join(c["source"]) for c in nb["cells"] if c["cell_type"] == "code"
    )
    temp_py = NB_DIR / "_08_refresh_temp.py"
    temp_py.write_text(codigo, encoding="utf-8")
    try:
        resultado = subprocess.run(
            [sys.executable, "-W", "error::FutureWarning", str(temp_py)],
            cwd=str(NB_DIR), capture_output=True, text=True,
        )
        if resultado.returncode != 0:
            print("ERROR corriendo 08_validacion_contra_anotaciones.ipynb (extraido):")
            print(resultado.stderr[-3000:])
            return False
        print(resultado.stdout[-1500:])
        return True
    finally:
        temp_py.unlink(missing_ok=True)


def main() -> int:
    if not PRODUCCION_JSON.exists():
        print(f"ERROR: no existe el JSON de produccion vigente en {PRODUCCION_JSON} -- "
              f"correr exportar_calibracion_produccion.py una primera vez a mano.")
        return 1

    print("Paso 0: refrescando candidatos_categoria_real.csv (anotaciones reales + "
          "veredictos manuales promovidos hasta ahora)...")
    if not refrescar_categoria_real():
        print("ERROR: no se pudo refrescar el ground truth -- no se promueve nada, "
              "se mantiene el vigente sin tocar.")
        return 1

    vigente = json.loads(PRODUCCION_JSON.read_text(encoding="utf-8"))
    metrica_vigente = leer_metrica(vigente)
    print(f"Vigente: version={vigente.get('version')}, {'.'.join(METRICA_DECISION)}={metrica_vigente}")

    print(f"\nCorriendo {EXPORT_SCRIPT.name} para generar el candidato con los datos actuales...")
    resultado = subprocess.run(
        [sys.executable, str(EXPORT_SCRIPT)],
        cwd=str(NB_DIR), capture_output=True, text=True,
    )
    if resultado.returncode != 0:
        print("ERROR: exportar_calibracion_produccion.py fallo -- no se promueve nada.")
        print(resultado.stderr[-3000:])
        return 1

    candidato = json.loads(CANDIDATO_JSON.read_text(encoding="utf-8"))
    metrica_candidato = leer_metrica(candidato)
    print(f"Candidato: version={candidato.get('version')}, {'.'.join(METRICA_DECISION)}={metrica_candidato}")

    if metrica_vigente is None or metrica_candidato is None:
        decision = "descartado"
        motivo = "no se pudo leer la metrica de decision en vigente o candidato"
    elif metrica_candidato >= metrica_vigente:
        decision = "promovido"
        motivo = f"{metrica_candidato:.4f} >= {metrica_vigente:.4f}"
        PRODUCCION_JSON.write_text(
            json.dumps(candidato, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    else:
        decision = "descartado"
        motivo = f"{metrica_candidato:.4f} < {metrica_vigente:.4f} -- el vigente se mantiene sin tocar"

    print(f"\n=> {decision.upper()}: {motivo}")

    HISTORIAL_JSONL.parent.mkdir(parents=True, exist_ok=True)
    registro = {
        "fecha": datetime.now(timezone.utc).isoformat(),
        "decision": decision,
        "motivo": motivo,
        "version_vigente": vigente.get("version"),
        "version_candidato": candidato.get("version"),
        "metrica_vigente": metrica_vigente,
        "metrica_candidato": metrica_candidato,
    }
    with HISTORIAL_JSONL.open("a", encoding="utf-8") as f:
        f.write(json.dumps(registro, ensure_ascii=False) + "\n")
    print(f"Registrado en {HISTORIAL_JSONL}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
