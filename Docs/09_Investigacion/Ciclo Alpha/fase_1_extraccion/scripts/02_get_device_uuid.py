"""Script 02 - Obtener UUID del dispositivo KPCL0034.
Consulta Supabase y muestra el UUID del dispositivo KPCL0034.
"""

from __future__ import annotations

from _supabase_helpers import resolve_device_record

DEVICE_CODE = "KPCL0034"


def main() -> None:
    print(f"Buscando UUID para device_id = '{DEVICE_CODE}'...")
    device = resolve_device_record(DEVICE_CODE)
    if not device:
        print(f"[ERROR] No se encontro '{DEVICE_CODE}' en public.devices")
        raise SystemExit(1)

    uuid = device["id"]
    print(f"[OK] UUID encontrado: {uuid}")
    print(f"     status   : {device.get('status')}")
    print(f"     last_seen: {device.get('last_seen')}")


if __name__ == "__main__":
    main()
