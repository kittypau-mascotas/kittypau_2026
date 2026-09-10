"use client";

import Image from "next/image";
import SocialLinks from "@/app/_components/social-links";
import type { DemoIdentity } from "@/lib/demo-identity";

// Navbar de la demo pública (Knowledge/29_Specs/009-demo-today-en-vivo).
// Reusa las clases `.app-nav-*` del navbar real para verse igual, pero la
// demo es de UNA sola vista (FR-015): solo "Hoy" está activo, el resto se
// muestra inerte. Sin "Cerrar sesión" / "Ajustes" / "Editar perfil" -- nada
// propio de una sesión con cuenta (FR-014).

const INACTIVE_ITEMS = ["Story", "Mascota", "Plato"] as const;

export default function DemoNav({
  identity,
  onCreateAccount,
}: {
  identity: DemoIdentity;
  onCreateAccount: () => void;
}) {
  return (
    <nav className="app-nav app-nav-main-mode app-nav-sidebar">
      <div className="app-nav-inner">
        <div className="app-nav-brand">
          <span className="app-nav-logo-wrap" aria-hidden="true">
            <Image
              src="/logo_carga.jpg"
              alt="Kittypau"
              width={44}
              height={44}
              className="brand-mark app-nav-logo"
            />
          </span>
          <span className="app-nav-brand-stack text-center">
            <span className="brand-title app-nav-brand-title">Kittypau</span>
            <span className="app-nav-brand-subtitle kp-pettech-tagline block text-center">
              PetTech AIoT
            </span>
          </span>
        </div>

        <div className="app-nav-social-top">
          <SocialLinks size="sm" />
        </div>

        <div className="app-nav-user-top">
          <div className="app-nav-user app-nav-user-static">
            <Image
              src={identity.avatarSrc}
              alt="Avatar"
              width={38}
              height={38}
              unoptimized
              className="app-nav-avatar"
            />
            <span className="app-nav-user-meta">
              <span className="app-nav-user-name">
                {identity.ownerName} - Prueba
              </span>
              <span className="app-nav-user-sub">
                <span>{identity.petName}</span>
              </span>
            </span>
          </div>
        </div>

        <div className="app-nav-links">
          <span className="app-nav-link is-active" aria-current="page">
            Hoy
          </span>
          {INACTIVE_ITEMS.map((label) => (
            <span
              key={label}
              className="app-nav-link"
              aria-disabled="true"
              title="Disponible al crear tu cuenta"
              style={{ opacity: 0.4, cursor: "not-allowed" }}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="app-nav-links-extra">
          <button
            type="button"
            onClick={onCreateAccount}
            className="kp-brand-soft-action mt-1 block w-full rounded-[calc(var(--radius)-6px)] px-3 py-2 text-left text-xs font-semibold"
          >
            Crear cuenta
          </button>
        </div>

        <div className="app-nav-contact">
          <span className="text-center">Kittypau · IoT Chile S.A</span>
          <span className="kp-pettech-tagline">PetTech AIoT</span>
          <a href="mailto:kittypau.mascotas@gmail.com">
            kittypau.mascotas@gmail.com
          </a>
        </div>
      </div>
    </nav>
  );
}
