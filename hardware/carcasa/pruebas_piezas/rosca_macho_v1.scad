                                                                                    -// ============================================================
// ROSCA MACHO — KP Carcasa v1
// ============================================================
// Hembra medida en fotos:
//   ID = 22.5 mm  (diámetro interior del anillo hembra)
//   OD = 25.5 mm  (diámetro exterior del anillo hembra)
//   H  = 5.0  mm  (altura del anillo)
//   Profundidad rosca = 2.0 mm
//
// CÓMO AJUSTAR:
//   Si el macho no entra → aumentar TOL (ej: 0.4 → 0.5)
//   Si el macho entra muy flojo → disminuir TOL (ej: 0.4 → 0.2)
//   Si el paso no coincide → ajustar PITCH (probar 1.2, 1.5, 2.0)
// ============================================================

$fn = 100;

// === PARÁMETROS PRINCIPALES ===
PITCH   = 1.5;   // Paso de rosca [mm] — ajustar si las vueltas no coinciden
DEPTH   = 2.0;   // Profundidad de rosca [mm]
HEIGHT  = 5.0;   // Altura rosca [mm]
TOL     = 0.4;   // Tolerancia radial [mm] — aumentar si aprieta

// === CALCULADOS ===
MAJOR_D  = 22.5 - TOL * 2;          // Diámetro crestas con tolerancia
MINOR_D  = MAJOR_D - 2 * DEPTH;     // Diámetro valles
MAJ_R    = MAJOR_D / 2;
MIN_R    = MINOR_D / 2;

BASE_D   = 27.0;   // Diámetro flange de agarre
BASE_H   = 3.0;    // Altura flange
STEPS    = 80;     // Segmentos por vuelta (calidad helix)

// === MODELO ===
union() {
    // Flange de agarre (para probar a mano)
    cylinder(d = BASE_D, h = BASE_H);

    // Núcleo (cuerpo del macho)
    translate([0, 0, BASE_H])
        cylinder(d = MINOR_D, h = HEIGHT + 0.1);

    // Rosca helicoidal
    translate([0, 0, BASE_H])
        helix_thread(MAJ_R, MIN_R, PITCH, HEIGHT, STEPS);
}

// =========================
//  Módulo de rosca helicoidal
//  Perfil triangular simétrico
// =========================
module helix_thread(r_maj, r_min, pitch, height, spt) {
    total_steps = ceil(height / pitch * spt) + spt;

    for (i = [0 : total_steps - 1]) {
        a0 = i       * 360 / spt;
        a1 = (i + 1) * 360 / spt;
        z0 = i       * pitch / spt;
        z1 = (i + 1) * pitch / spt;

        // Flanco ascendente: valle → cresta
        zc0 = z0 + pitch * 0.5;
        zc1 = z1 + pitch * 0.5;

        if (z0 < height && zc0 > 0) {
            hull() {
                tp(r_min, a0, clamp(z0,  0, height));
                tp(r_min, a1, clamp(z1,  0, height));
                tp(r_maj, a0, clamp(zc0, 0, height));
                tp(r_maj, a1, clamp(zc1, 0, height));
            }
        }

        // Flanco descendente: cresta → valle
        zv0 = z0 + pitch;
        zv1 = z1 + pitch;

        if (zc0 < height && zv0 > 0) {
            hull() {
                tp(r_maj, a0, clamp(zc0, 0, height));
                tp(r_maj, a1, clamp(zc1, 0, height));
                tp(r_min, a0, clamp(zv0, 0, height));
                tp(r_min, a1, clamp(zv1, 0, height));
            }
        }
    }
}

// Punto auxiliar de rosca
module tp(r, angle, z) {
    rotate([0, 0, angle])
        translate([r, 0, z])
            sphere(r = 0.01, $fn = 3);
}

// Clamp helper
function clamp(v, lo, hi) = max(lo, min(hi, v));
