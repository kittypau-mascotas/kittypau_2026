#!/usr/bin/env python3
"""
Generador STL — Rosca Macho KP v1
Ejecutar: python generar_rosca_macho.py
"""

import math, struct, os

# ============================================================
#  PARAMETROS ROSCA
# ============================================================
MAJOR_R  = 11.25
DEPTH    =  2.0
PITCH    =  2.5
HEIGHT   =  5.0
TOL      =  0.5
N        =  120

# ============================================================
#  PARAMETROS ORIFICIOS
#  Los orificios atraviesan de LADO A LADO (en Y) a media altura
#  Los centros estan en el plano XZ: (x=+/-3, z=2.5)
# ============================================================
HOLE_D       = 3.0
HOLE_R       = HOLE_D / 2
# (x, z) de cada orificio — atraviesan el cilindro en direccion Y
HOLE_CX      =  3.0   # distancia del eje al centro de cada orificio
HOLE_CZ      =  2.5   # altura del centro (mid-height)
HOLE_M       =  72    # segmentos por orificio
# ============================================================

minor_r = MAJOR_R - TOL - DEPTH
major_r = MAJOR_R - TOL
Z0, Z1  = 0.0, HEIGHT

# Para cada orificio, hasta donde sale del cilindro en Y
# (el orificio entra por y=-y_ext y sale por y=+y_ext)
Y_EXT = math.sqrt(max(0.0, minor_r**2 - HOLE_CX**2))

print(f"O crestas:  {major_r*2:.2f} mm")
print(f"O valles:   {minor_r*2:.2f} mm")
print(f"Paso:       {PITCH} mm ({HEIGHT/PITCH:.1f} vueltas)")
print(f"Orificios:  O{HOLE_D}mm, centros x=+/-{HOLE_CX}mm, z={HOLE_CZ}mm")
print(f"            tuneles Y: {-Y_EXT:.1f} a {Y_EXT:.1f} mm")

# ── helpers ──────────────────────────────────────────────────
tris = []

def cpt(r, a, z):
    return (r*math.cos(a), r*math.sin(a), float(z))

def norm(p1, p2, p3):
    ax,ay,az = p2[0]-p1[0],p2[1]-p1[1],p2[2]-p1[2]
    bx,by,bz = p3[0]-p1[0],p3[1]-p1[1],p3[2]-p1[2]
    nx,ny,nz = ay*bz-az*by, az*bx-ax*bz, ax*by-ay*bx
    m = math.sqrt(nx*nx+ny*ny+nz*nz)
    return (nx/m,ny/m,nz/m) if m>1e-12 else (0.,0.,1.)

def T(p1,p2,p3):  tris.append((p1,p2,p3))
def Q(p1,p2,p3,p4): T(p1,p2,p3); T(p1,p3,p4)
def clamp(v,lo,hi): return max(lo,min(hi,v))

def in_hole_xz(x, z):
    """True si (x,z) cae dentro de algun orificio (plano XZ)."""
    for cx, cz in [( HOLE_CX, HOLE_CZ),
                   (-HOLE_CX, HOLE_CZ)]:
        if (x-cx)**2 + (z-cz)**2 <= HOLE_R**2:
            return True
    return False

# ── 1. TAPA INFERIOR z=0 (normal -z) ───────────────────────
for i in range(N):
    a0,a1 = i*2*math.pi/N, (i+1)*2*math.pi/N
    T((0.,0.,0.), cpt(minor_r,a1,0), cpt(minor_r,a0,0))

# ── 2. CILINDRO EJE — subdividido en Z, salteando orificios ─
NZ = 120
for i in range(N):
    a0,a1 = i*2*math.pi/N, (i+1)*2*math.pi/N
    xm = minor_r * math.cos((a0+a1)/2)   # x de la cara del cilindro
    for j in range(NZ):
        z0 = Z0 + j*HEIGHT/NZ
        z1 = Z0 + (j+1)*HEIGHT/NZ
        zm = (z0+z1)/2
        if not in_hole_xz(xm, zm):
            Q(cpt(minor_r,a0,z0), cpt(minor_r,a1,z0),
              cpt(minor_r,a1,z1), cpt(minor_r,a0,z1))

# ── 3. TAPA SUPERIOR z=Z1 (normal +z) ───────────────────────
ct = (0.,0.,Z1)
for i in range(N):
    a0,a1 = i*2*math.pi/N, (i+1)*2*math.pi/N
    T(ct, cpt(minor_r,a0,Z1), cpt(minor_r,a1,Z1))

# ── 4. HELICE DE ROSCA — saltea zonas de orificios ──────────
total_steps = int(math.ceil(HEIGHT/PITCH*N)) + N

for i in range(total_steps):
    a0 = i     * 2*math.pi/N
    a1 = (i+1) * 2*math.pi/N
    zv0 = Z0 + i     * PITCH/N
    zv1 = Z0 + (i+1) * PITCH/N
    zc0 = zv0 + PITCH*0.5;  zc1 = zv1 + PITCH*0.5
    zn0 = zv0 + PITCH;      zn1 = zv1 + PITCH

    def mQ(p1,p2,p3,p4):
        xm=(p1[0]+p2[0]+p3[0]+p4[0])/4
        zm=(p1[2]+p2[2]+p3[2]+p4[2])/4
        if not in_hole_xz(xm,zm): Q(p1,p2,p3,p4)

    if zv0 < Z1 and zc0 > Z0:
        mQ(cpt(minor_r,a0,clamp(zv0,Z0,Z1)), cpt(minor_r,a1,clamp(zv1,Z0,Z1)),
           cpt(major_r,a1,clamp(zc1,Z0,Z1)), cpt(major_r,a0,clamp(zc0,Z0,Z1)))

    if zc0 < Z1 and zn0 > Z0:
        mQ(cpt(major_r,a0,clamp(zc0,Z0,Z1)), cpt(major_r,a1,clamp(zc1,Z0,Z1)),
           cpt(minor_r,a1,clamp(zn1,Z0,Z1)), cpt(minor_r,a0,clamp(zn0,Z0,Z1)))

# ── 5. TUNELES DE ORIFICIOS (eje Y, salen por las paredes) ───
for sign in [+1, -1]:
    cx = sign * HOLE_CX
    cz = HOLE_CZ
    y_ext = math.sqrt(max(0.0, minor_r**2 - cx**2))

    for i in range(HOLE_M):
        a0 = i     * 2*math.pi/HOLE_M
        a1 = (i+1) * 2*math.pi/HOLE_M
        # circulo en plano XZ centrado en (cx, cz)
        hx0 = cx + HOLE_R*math.cos(a0);  hz0 = cz + HOLE_R*math.sin(a0)
        hx1 = cx + HOLE_R*math.cos(a1);  hz1 = cz + HOLE_R*math.sin(a1)

        # pared interior del tunel (en Y, normal hacia adentro)
        Q((hx0,-y_ext,hz0), (hx1,-y_ext,hz1),
          (hx1, y_ext,hz1), (hx0, y_ext,hz0))

        # tapas en los extremos del tunel
        T((cx,-y_ext,cz), (hx1,-y_ext,hz1), (hx0,-y_ext,hz0))
        T((cx, y_ext,cz), (hx0, y_ext,hz0), (hx1, y_ext,hz1))

# ── ESCRITURA STL ─────────────────────────────────────────────
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rosca_macho_v1.stl")
header = b"KP Rosca Macho v1" + b"\x00"*63

with open(out,"wb") as f:
    f.write(header)
    f.write(struct.pack("<I",len(tris)))
    for p1,p2,p3 in tris:
        n = norm(p1,p2,p3)
        f.write(struct.pack("<fff",*n))
        f.write(struct.pack("<fff",*p1))
        f.write(struct.pack("<fff",*p2))
        f.write(struct.pack("<fff",*p3))
        f.write(struct.pack("<H",0))

print(f"\nSTL generado: {out}")
print(f"  Triangulos: {len(tris)}")
