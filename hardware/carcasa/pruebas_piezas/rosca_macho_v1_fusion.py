"""
ROSCA MACHO — KP Carcasa v1
Script para Fusion 360 API

Cómo usar:
  1. Abre Fusion 360
  2. Tools > Add-Ins > Scripts and Add-Ins (Shift+S)
  3. Clic en "+" junto a "My Scripts"
  4. Selecciona esta carpeta o copia el archivo
  5. Click en "Run"

Hembra medida:
  ID = 22.5 mm  (diámetro interior del anillo)
  OD = 25.5 mm  (diámetro exterior)
  H  = 5.0  mm  (altura)
  Profundidad rosca = 2.0 mm

Si no encaja:
  Apretado → aumentar TOL_MM (prueba 0.6, 0.7...)
  Flojo    → disminuir TOL_MM (prueba 0.3, 0.2...)
  Vueltas no casan → ajustar PITCH_MM (probar 1.2 o 2.0)
"""

import adsk.core
import adsk.fusion
import traceback


# ============================================================
#   PARÁMETROS — ajusta aquí antes de correr
# ============================================================
MAJOR_R_MM  = 11.25   # Radio de crestas = ID_hembra / 2 = 22.5/2
DEPTH_MM    =  2.0    # Profundidad del perfil de rosca [mm]
PITCH_MM    =  1.5    # Paso de rosca [mm] (probar 1.2 / 1.5 / 2.0)
HEIGHT_MM   =  5.0    # Altura de la zona roscada [mm]
TOL_MM      =  0.5    # Tolerancia radial [mm] (aumentar si aprieta)

FLANGE_R_MM = 13.5    # Radio del flange de agarre [mm]
FLANGE_H_MM =  3.0    # Altura del flange [mm]
# ============================================================


def mm(value):
    """Convierte mm a cm (unidad interna de Fusion 360)."""
    return value / 10.0


def run(context):
    ui = None
    try:
        app    = adsk.core.Application.get()
        ui     = app.userInterface
        design = adsk.fusion.Design.cast(app.activeProduct)

        if not design:
            ui.messageBox('Abre un diseño de Fusion 360 primero.')
            return

        root = design.rootComponent

        # --- Radios calculados (con tolerancia) ---
        maj_r = mm(MAJOR_R_MM - TOL_MM)   # cresta del macho
        min_r = mm(MAJOR_R_MM - TOL_MM - DEPTH_MM)  # valle del macho
        pitch  = mm(PITCH_MM)
        height = mm(HEIGHT_MM)
        fl_r   = mm(FLANGE_R_MM)
        fl_h   = mm(FLANGE_H_MM)

        sketches = root.sketches
        extrudes = root.features.extrudeFeatures
        xy = root.xYConstructionPlane
        xz = root.xZConstructionPlane

        # ─────────────────────────────────────────
        # PASO 1 — Flange de agarre
        # ─────────────────────────────────────────
        sk1 = sketches.add(xy)
        sk1.name = 'sk_flange'
        sk1.sketchCurves.sketchCircles.addByCenterRadius(
            adsk.core.Point3D.create(0, 0, 0), fl_r
        )
        prof1 = sk1.profiles.item(0)
        ext1  = extrudes.createInput(
            prof1,
            adsk.fusion.FeatureOperations.NewBodyFeatureOperation
        )
        ext1.setDistanceExtent(False, adsk.core.ValueInput.createByReal(fl_h))
        body = extrudes.add(ext1)
        body.name = 'Flange'

        # ─────────────────────────────────────────
        # PASO 2 — Núcleo roscado (cilindro menor)
        # ─────────────────────────────────────────
        sk2 = sketches.add(xy)
        sk2.name = 'sk_shaft'
        sk2.sketchCurves.sketchCircles.addByCenterRadius(
            adsk.core.Point3D.create(0, 0, 0), min_r
        )
        prof2 = sk2.profiles.item(0)
        ext2  = extrudes.createInput(
            prof2,
            adsk.fusion.FeatureOperations.JoinFeatureOperation
        )
        ext2.setDistanceExtent(
            False,
            adsk.core.ValueInput.createByReal(fl_h + height + pitch)
        )
        extrudes.add(ext2)

        # ─────────────────────────────────────────
        # PASO 3 — Perfil triangular de rosca (en plano XZ)
        #
        # Plano XZ → normal = Y, ejes en sketch: X=mundo X, Y=mundo Z
        # Los puntos usan coordenadas 3D mundo (Y=0 para estar en XZ)
        #   P1: valle inferior  (min_r, 0, fl_h)
        #   P2: cresta          (maj_r, 0, fl_h + pitch/2)
        #   P3: valle superior  (min_r, 0, fl_h + pitch)
        # ─────────────────────────────────────────
        sk3   = sketches.add(xz)
        sk3.name = 'sk_thread_profile'
        lines = sk3.sketchCurves.sketchLines

        p1 = adsk.core.Point3D.create(min_r, 0,              fl_h)
        p2 = adsk.core.Point3D.create(maj_r, 0,              fl_h + pitch * 0.5)
        p3 = adsk.core.Point3D.create(min_r, 0,              fl_h + pitch)

        lines.addByTwoPoints(p1, p2)
        lines.addByTwoPoints(p2, p3)
        lines.addByTwoPoints(p3, p1)

        if sk3.profiles.count == 0:
            ui.messageBox(
                'No se detectó perfil de rosca.\n'
                'Posiblemente las dimensiones dejen el triángulo fuera del cuerpo.\n'
                f'maj_r={maj_r*10:.2f}mm  min_r={min_r*10:.2f}mm  pitch={PITCH_MM}mm'
            )
            return

        prof3 = sk3.profiles.item(0)

        # ─────────────────────────────────────────
        # PASO 4 — Coil (rosca helicoidal)
        # ─────────────────────────────────────────
        coilFeats = root.features.coilFeatures
        axis      = root.zConstructionAxis

        coilIn = coilFeats.createInput(prof3, axis)
        coilIn.coilType     = adsk.fusion.CoilTypes.PitchAndHeightCoilType
        coilIn.isClockwise  = True
        coilIn.pitch        = adsk.core.ValueInput.createByReal(pitch)
        coilIn.height       = adsk.core.ValueInput.createByReal(height)
        coilIn.operation    = adsk.fusion.FeatureOperations.JoinFeatureOperation

        coilFeats.add(coilIn)

        # ─────────────────────────────────────────
        # PASO 5 — Chaflán de entrada (lead-in)
        #   Facilita el inicio del rosqueado a mano
        # ─────────────────────────────────────────
        try:
            z_top_thread = fl_h + height
            sk4   = sketches.add(xy)
            sk4.name = 'sk_chamfer_top'
            sk4.sketchCurves.sketchCircles.addByCenterRadius(
                adsk.core.Point3D.create(0, 0, 0), maj_r
            )

            # Plano offset en z = fl_h + height
            planes    = root.constructionPlanes
            planeIn   = planes.createInput()
            offset_val = adsk.core.ValueInput.createByReal(fl_h + height)
            planeIn.setByOffset(xy, offset_val)
            top_plane = planes.add(planeIn)

            sk5   = sketches.add(top_plane)
            sk5.sketchCurves.sketchCircles.addByCenterRadius(
                adsk.core.Point3D.create(0, 0, 0), min_r
            )

            # Loft para chaflán cónico
            lofts  = root.features.loftFeatures
            loftIn = lofts.createInput(
                adsk.fusion.FeatureOperations.CutFeatureOperation
            )
            loftIn.loftSections.add(sk4.profiles.item(0))
            loftIn.loftSections.add(sk5.profiles.item(0))
            lofts.add(loftIn)
        except Exception:
            # El chaflán es opcional; si falla, la rosca sigue siendo válida
            pass

        ui.messageBox(
            '✓ Rosca macho creada correctamente\n\n'
            f'  Ø cresta:  {(MAJOR_R_MM - TOL_MM)*2:.2f} mm\n'
            f'  Ø valle:   {(MAJOR_R_MM - TOL_MM - DEPTH_MM)*2:.2f} mm\n'
            f'  Paso:      {PITCH_MM} mm\n'
            f'  Tolerancia:{TOL_MM} mm\n'
            f'  Vueltas:   {HEIGHT_MM/PITCH_MM:.1f}\n\n'
            'Si no encaja → ajusta TOL_MM en el script y vuelve a correr.'
        )

    except Exception:
        if ui:
            ui.messageBox('Error inesperado:\n\n' + traceback.format_exc())
