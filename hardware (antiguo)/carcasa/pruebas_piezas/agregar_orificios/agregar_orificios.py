"""
Agrega 2 orificios pasantes a la rosca macho KP
Fusion 360 Script — ejecutar con Shift+S > Run
"""

import adsk.core
import adsk.fusion
import traceback

# ============================================================
HOLE_D           = 3.0   # mm — diametro de cada orificio
DIST_FROM_CENTER = 3.0   # mm — distancia del eje Z al centro de cada orificio
HOLE_Z           = 2.5   # mm — altura del centro (mid-height pieza 5mm)
# ============================================================

def run(context):
    ui = None
    try:
        app    = adsk.core.Application.get()
        ui     = app.userInterface
        design = adsk.fusion.Design.cast(app.activeProduct)
        root   = design.rootComponent

        if root.bRepBodies.count == 0:
            ui.messageBox('No hay ningun body.\nImporta el STL de la rosca primero.')
            return

        # Sketch en plano XZ: circulos extruidos en Y = agujeros de lado a lado
        sk    = root.sketches.add(root.xZConstructionPlane)
        circs = sk.sketchCurves.sketchCircles
        r = (HOLE_D / 2) / 10.0
        d = DIST_FROM_CENTER / 10.0
        z = HOLE_Z / 10.0

        circs.addByCenterRadius(adsk.core.Point3D.create( d, 0, z), r)
        circs.addByCenterRadius(adsk.core.Point3D.create(-d, 0, z), r)

        if sk.profiles.count < 2:
            ui.messageBox('Solo ' + str(sk.profiles.count) + ' perfil(es) detectados. Esperaba 2.')
            return

        extrudes = root.features.extrudeFeatures

        for i in range(2):
            prof   = sk.profiles.item(i)
            ext_in = extrudes.createInput(
                prof,
                adsk.fusion.FeatureOperations.CutFeatureOperation
            )
            ext_in.setAllExtent(adsk.fusion.ExtentDirections.SymmetricExtentDirection)
            extrudes.add(ext_in)

        ui.messageBox('Listo: 2 orificios creados.')

    except:
        if ui:
            ui.messageBox('Error:\n' + traceback.format_exc())
