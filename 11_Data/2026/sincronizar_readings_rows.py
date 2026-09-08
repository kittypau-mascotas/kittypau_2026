"""
Sincroniza readings_rows.csv (solo APPEND -- nunca se modifica lo ya escrito,
ver CLAUDE.md "Arquitectura de datos") con lo nuevo que llego a Supabase desde
la ultima sincronizacion. Lee las credenciales de kittypau_app/.env.local
(SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY), consulta `readings` con
recorded_at estrictamente posterior a la ultima fila ya guardada, y agrega
esas filas al final del CSV -- mismo esquema de columnas exacto.

Correr con: python sincronizar_readings_rows.py
"""
import csv
import os
from pathlib import Path

from supabase import create_client

ROOT = Path(__file__).resolve().parent
CSV_PATH = ROOT / "readings_rows.csv"
ENV_LOCAL = ROOT.parent.parent / "kittypau_app" / ".env.local"

COLUMNAS = [
    "id", "device_id", "pet_id", "weight_grams", "water_ml", "flow_rate",
    "temperature", "humidity", "battery_level", "recorded_at", "ingested_at",
    "clock_invalid", "battery_voltage", "battery_state", "battery_source",
    "battery_is_estimated", "light_percent", "light_lux", "light_condition",
    "battery_updated_at",
]


def cargar_env(ruta: Path) -> dict:
    valores = {}
    for linea in ruta.read_text(encoding="utf-8").splitlines():
        linea = linea.strip()
        if not linea or linea.startswith("#") or "=" not in linea:
            continue
        clave, _, valor = linea.partition("=")
        valores[clave.strip()] = valor.strip().strip('"').strip("'")
    return valores


def ultima_fecha_csv(ruta: Path) -> str:
    with ruta.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        ultima = None
        for fila in reader:
            ultima = fila["recorded_at"]
    if ultima is None:
        raise SystemExit(f"{ruta} no tiene filas -- no se puede determinar desde donde sincronizar")
    return ultima


def main() -> None:
    env = cargar_env(ENV_LOCAL)
    url = env.get("SUPABASE_URL") or env.get("NEXT_PUBLIC_SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise SystemExit("Falta SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY en .env.local")

    desde = ultima_fecha_csv(CSV_PATH)
    print(f"Ultima fila en readings_rows.csv: recorded_at={desde}")

    cliente = create_client(url, key)
    nuevas_totales = 0
    pagina = 0
    tamanio_pagina = 1000
    filas_nuevas = []
    while True:
        resultado = (
            cliente.table("readings")
            .select(",".join(COLUMNAS))
            .gt("recorded_at", desde)
            .order("recorded_at", desc=False)
            .range(pagina * tamanio_pagina, (pagina + 1) * tamanio_pagina - 1)
            .execute()
        )
        filas = resultado.data
        if not filas:
            break
        filas_nuevas.extend(filas)
        nuevas_totales += len(filas)
        print(f"  pagina {pagina}: {len(filas)} filas (acumulado {nuevas_totales})")
        if len(filas) < tamanio_pagina:
            break
        pagina += 1

    if not filas_nuevas:
        print("\nNo hay filas nuevas desde la ultima sincronizacion -- nada que hacer.")
        return

    with CSV_PATH.open("a", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNAS)
        for fila in filas_nuevas:
            writer.writerow({c: fila.get(c, "") for c in COLUMNAS})

    dispositivos = {}
    for fila in filas_nuevas:
        dispositivos[fila.get("device_id", "?")] = dispositivos.get(fila.get("device_id", "?"), 0) + 1
    print(f"\n{nuevas_totales} filas nuevas agregadas a {CSV_PATH.name} (solo append, nada se modifico).")
    print("Por device_id:", dispositivos)


if __name__ == "__main__":
    main()
