from pathlib import Path

# Carpeta donde está este script
carpeta = Path(__file__).parent

archivos_md = list(carpeta.glob("*.md"))

if not archivos_md:
    print("No se encontraron archivos .md")
else:
    for archivo_md in archivos_md:
        archivo_py = archivo_md.with_suffix(".py")

        if archivo_py.exists():
            print(f"⚠ Ya existe: {archivo_py.name}")
            continue

        archivo_md.rename(archivo_py)
        print(f"✓ {archivo_md.name} -> {archivo_py.name}")

    print(f"\nConversión completada. {len(archivos_md)} archivos procesados.")