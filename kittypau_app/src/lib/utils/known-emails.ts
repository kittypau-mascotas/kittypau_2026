/**
 * Autocompletado de email acotado a este dispositivo — a diferencia del
 * autocompletado nativo del navegador (que puede venir sincronizado entre
 * varios dispositivos vía la cuenta de Chrome/Edge del usuario, mostrando
 * emails que nunca se usaron en ESTE navegador), esta lista vive en
 * localStorage, que nunca sincroniza entre dispositivos — solo recuerda
 * los emails con los que realmente se inició sesión o se registró una
 * cuenta en este mismo navegador.
 */

const STORAGE_KEY = "kittypau_known_emails";
const MAX_REMEMBERED = 8;

export function getKnownEmails(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

/** Guarda `email` como "usado en este dispositivo" — lo mueve al frente si ya
 * estaba (más reciente primero) y recorta la lista a MAX_REMEMBERED. */
export function rememberEmailOnThisDevice(email: string): void {
  if (typeof window === "undefined") return;
  const trimmed = email.trim();
  if (!trimmed) return;
  try {
    const current = getKnownEmails();
    const withoutDuplicate = current.filter(
      (e) => e.toLowerCase() !== trimmed.toLowerCase(),
    );
    const next = [trimmed, ...withoutDuplicate].slice(0, MAX_REMEMBERED);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage puede fallar (modo privado, cuota llena) -- no bloquear el login/registro por esto.
  }
}
