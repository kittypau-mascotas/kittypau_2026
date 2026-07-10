"""
Agrega 2 orificios pasantes al body de la rosca macho
======================================================
Ejecutar en Fusion 360: Shift+S > Scripts > Run

Orificios: Ø3mm, centros a ±3mm del eje, a media altura (Z=2.5mm)
Dirección: de lado a lado (eje Y)

IMPORTANTE: corre esto sobre el diseño que ya tiene la rosca importada
"""

import adsk.core
import adsk.fusion
import traceback

# ============================================================
#  PARÁMETROS
# ============================================================
HOLE_D          = 3.0    # mm — diámetro de cada orificio
DIST_FROM_CENTER = 3.0   # mm — distancia del eje al centro de cada orificio
HOLE_Z          = 2.5    # mm — altura del centro de los orificios (mid-height de 5mm)
# ============================================================


def mm(v):
    return v / 10.0  # Fusion usa cm internamente


def run(context):
    ui = None
    try:
        app    = adsk.core.Application.get()
        ui     = app.userInterface
        design = adsk.fusion.Design.cast(app.activeProduct)

        if not design:
            ui.messageBox('Abre un diseno de Fusion 360 primero.')
            return

        root = design.rootComponent

        # Buscar el body de la rosca (el primero disponible)
        if root.bRepBodies.count == 0:
            ui.messageBox('No hay ningún body en el diseño.\nImporta primero el STL de la rosca.')
            return

        thread_body = root.bRepBodies.item(0)

        # ─────────────────────────────────────────
        # Sketch en plano XZ (normal = Y)
        # Los círculos en XZ se extruyen en dirección Y → agujeros de lado a lado
        # ─────────────────────────────────────────
        sk = root.sketches.add(root.xZConstructionPlane)
        sk.name = 'sk_orificios'
        circles = sk.sketchCurves.sketchCircles

        r = mm(HOLE_D / 2)
        d = mm(DIST_FROM_CENTER)
        z = mm(HOLE_Z)

        # En el plano XZ: eje horizontal = X mundo, eje vertical = Z mundo
        # Point3D(x, y, z) con y=0 para estar en el plano XZ
        circles.addByCenterRadius(adsk.core.Point3D.create( d, 0, z), r)   # orificio derecho
        circles.addByCenterRadius(adsk.core.Point3D.create(-d, 0, z), r)   # orificio izquierdo

        if sk.profiles.count < 2:
            ui.messageBox(
                f'Solo se detectaron {sk.profiles.count} perfiles.\n'
                'Verifica que los circulos no se superpongan con otras geometrias.'
            )
            return

        extrudes = root.features.extrudeFeatures

        # Cortar con cada perfil por separado
        for idx in range(2):
            prof = sk.profiles.item(idx)
            ext_in = extrudes.createInput(
                prof,
                adsk.fusion.FeatureOperations.CutFeatureOperation
            )
            # Corte simétrico: va en ambas direcciones desde el plano XZ → atraviesa completo
            ext_in.setSymmetricExtent(
                adsk.core.ValueInput.createByReal(mm(40)),  # 40mm cada lado, más que suficiente
                True
            )
            ext_in.participantBodies = [thread_body]
            extrudes.add(ext_in)

        ui.messageBox(
            'Orificios creados.\n\n'
            f'  Diametro: {HOLE_D} mm\n'
            f'  Centro a eje: {DIST_FROM_CENTER} mm\n'
            f'  Altura Z: {HOLE_Z} mm\n'
            f'  Direccion: eje Y (lado a lado)'
        )

    except Exception:
        if ui:
            ui.messageBox('Error:\n\n' + traceback.format_exc())
