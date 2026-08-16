---
id: spec_correos_transaccionales
title: Correos Transaccionales — Catálogo y Plantillas
type: spec
status: active
owner: Mauro
created: 2026-08-16
updated: 2026-08-16
tags:
  - api
  - supabase-auth
  - email
  - registro
related:
  - [[00_HOME]]
  - [[05_API/README_API]]
  - [[29_Specs/002-registro-flow-unificado/spec]]
  - [[01_Proyecto/DOC_MAESTRO_DOMINIO]]
---

# Correos Transaccionales — Catálogo y Plantillas

> Registro único de todos los correos que Kittypau envía automáticamente. Cada uno documenta:
> qué lo dispara, qué mecanismo lo envía (hoy, solo Supabase Auth — sin servicio de correo
> transaccional aparte), qué variables necesita y de dónde vienen, y el asunto/cuerpo exacto a
> aplicar en el dashboard de Supabase. Se actualiza cada vez que se agrega o modifica un correo
> — no vive solo en el spec que lo originó, para que quede como referencia permanente del
> proyecto (mismo criterio que cualquier otro contrato de API en `05_API/`).

**Origen**: definido durante [[29_Specs/002-registro-flow-unificado/spec]] (User Story 1 —
verificación de correo personalizada). El mecanismo (variables `{{ .Data.campo }}` vía
`options.data` en `signUp`) está confirmado contra la documentación oficial de Supabase Auth
(`supabase.com/docs/guides/auth/auth-email-templates`) — ver `research.md` #4 de ese spec.

---

## Catálogo

| # | Correo | Trigger | Estado |
|---|---|---|---|
| 1 | Confirmación de registro (`Confirm signup`) | `supabase.auth.signUp()` | 📝 Definido acá — pendiente de aplicarse en el dashboard de Supabase (manual, requiere confirmación explícita antes de producción) |
| 2 | Recuperación de contraseña (`Reset Password`) | `supabase.auth.resetPasswordForEmail()` (`login/page.tsx`, función `sendReset`) | ⚪ Sin personalizar — usa la plantilla default de Supabase, sin marca ni variables Kittypau. Fuera de alcance de este catálogo por ahora; agregar acá cuando se decida personalizarlo |

*(Este catálogo crece a medida que se agreguen correos nuevos — no hay más que estos 2 disparadores de correo en el código hoy, confirmado por grep de `supabase.auth.signUp`/`resetPasswordForEmail`/`resend` en `login/page.tsx`.)*

---

## 1. Confirmación de registro (`Confirm signup`)

### Trigger

`supabase.auth.signUp()` — disparado al enviar el paso 1 "Usuario" del registro fusionado
(`kittypau_app/src/app/(public)/login/page.tsx`, función `onRegister`). También se puede
re-disparar manualmente desde "Reenviar confirmación" (`resendConfirmation`, usa
`supabase.auth.resend({ type: "signup" })` — reutiliza la misma plantilla).

### Variables requeridas

| Variable en la plantilla | Origen | Garantía de que no llega vacía |
|---|---|---|
| `{{ .Data.user_name }}` | `options.data.user_name` en el `signUp()` | El botón de envío del paso 1 está deshabilitado (`isRegisterValid`) hasta que el campo "Tu nombre" tenga contenido — **FR-012 del spec 002** |
| `{{ .Data.pet_name }}` | `options.data.pet_name` en el `signUp()` | Mismo mecanismo — el campo "Nombre de tu mascota" es obligatorio en el mismo paso, antes de poder crear la cuenta |
| `{{ .ConfirmationURL }}` | Generada por Supabase Auth | Siempre presente, no depende de nuestro código |

**A diferencia de la recomendación genérica de "definir un valor por defecto tipo 'tu
mascota' por si `pet_name` llega vacío"**: en Kittypau eso no puede pasar — el formulario de
registro (spec 002, User Story 2) exige ambos campos en el mismo paso, antes de permitir crear
la cuenta, así que `pet_name` nunca viaja vacío al `signUp()`. No se agrega un fallback porque
no hay caso real que lo dispare (Ponytail: no cubrir un caso que la propia UI ya hace
imposible).

### Asunto (`mailer_subjects_confirmation`)

```
¡Hola {{ .Data.user_name }} y {{ .Data.pet_name }}! Confirma tu cuenta Kittypau 🐾
```

### Cuerpo (HTML)

```html
<h2>¡Bienvenidos a Kittypau, {{ .Data.user_name }} y {{ .Data.pet_name }}! 🐾</h2>

<p>
  Gracias por registrarte en <strong>Kittypau</strong>. Estás recibiendo este correo porque
  creaste una cuenta con nosotros y queremos confirmar que fuiste vos quien se registró, antes
  de activar tu perfil y el de {{ .Data.pet_name }}.
</p>

<p>Para completar tu registro, seguí estos pasos:</p>

<ol>
  <li>Hacé clic en el botón de abajo para confirmar tu correo electrónico.</li>
  <li>Vas a volver automáticamente a Kittypau, directo al paso Mascota — sin tener que
      ingresar tu email y contraseña de nuevo.</li>
  <li>Completá el perfil de {{ .Data.pet_name }} y vinculá tu dispositivo Kittypau para
      empezar a monitorear su alimentación e hidratación.</li>
</ol>

<p style="text-align: center; margin: 32px 0;">
  <a href="{{ .ConfirmationURL }}"
     style="background-color: #ebb6a8; color: #1f2937; padding: 14px 28px;
            border-radius: 8px; text-decoration: none; font-weight: bold;
            display: inline-block;">
    Confirmar mi correo
  </a>
</p>

<p>
  Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br>
  <a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a>
</p>

<p>
  Si vos no creaste esta cuenta, podés ignorar este mensaje.
</p>

<p>¡Nos vemos adentro!<br>El equipo de Kittypau 🐱</p>
```

*(Color del botón `#ebb6a8`: conversión del token `--primary: 12 62% 79%` de
`globals.css` — el mismo coral suave que usa el botón "Crear mi cuenta" en la app, para que el
correo no se sienta desconectado de la marca. Los clientes de correo no soportan variables CSS,
por eso va como hex literal.)*

### Dónde se aplica (dashboard de Supabase, manual — no vía código)

1. Authentication → Providers → Email → activar el toggle **"Confirm email"**.
2. Authentication → Email Templates → **"Confirm signup"** → pegar el asunto de arriba en
   `mailer_subjects_confirmation` y el cuerpo HTML en el editor de la plantilla.
3. Guardar.

Ambos pasos son cambios de configuración en el proyecto Supabase de producción — requieren
confirmación explícita antes de aplicarse (Principio III, no-negociables del proyecto). Están
trackeados como **T002** en `Knowledge/29_Specs/002-registro-flow-unificado/tasks.md`.

### Cómo probarlo una vez aplicado

Ver `Knowledge/29_Specs/002-registro-flow-unificado/quickstart.md` § Escenario 1 — usar un
correo real controlado (no uno descartable tipo `@kittypau-test.local`, esos no reciben nada)
para ver la plantilla final renderizada.

**✅ Probado en producción 2026-08-16** con la cuenta de prueba `usuario_1`/`mascota_1`
(`frentecalamari@gmail.com`, ver `Knowledge/20_Testing/README_Testing.md`): asunto y cuerpo
llegaron correctamente personalizados, botón "Confirmar mi correo" funcional.

### Pendiente — remitente del correo (no es parte de este spec, anotado para no perderlo)

El correo llega desde `Supabase Auth <noreply@mail.app.supabase.io>` — es el remitente fijo
del servicio de correo built-in de Supabase (gratis, con rate limits, "no pensado para apps de
producción" según el propio dashboard). Para que llegue como `Kittypau <...>` hace falta
configurar **SMTP propio** en Authentication → Emails → SMTP Settings, lo que requiere:

1. Cuenta en un proveedor SMTP (Resend, SendGrid, Postmark, Amazon SES, Brevo, etc.).
2. Dominio propio verificado para envío (con registros DNS SPF/DKIM) — no se puede enviar
   como `@kittypau.cl` (o el dominio que se use) sin verificarlo primero.
3. Cargar esas credenciales SMTP en el dashboard de Supabase.

Fuera de alcance de [[29_Specs/002-registro-flow-unificado/spec]] — depende de conseguir un
dominio y un proveedor SMTP, decisión de Mauro para más adelante.

---

## Ver también

- [[05_API/README_API]] — resto de contratos de la API
- [[29_Specs/002-registro-flow-unificado/spec]] — User Story 1, FR-001 a FR-004, FR-014
- [[29_Specs/002-registro-flow-unificado/research.md]] — hallazgo técnico de Supabase Auth email templates (#4)
