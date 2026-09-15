import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

/**
 * Envío de push reales via Firebase Cloud Messaging -- server-only (nunca se
 * importa desde un componente cliente). Credenciales en
 * `FIREBASE_SERVICE_ACCOUNT_JSON` (el JSON completo de la cuenta de
 * servicio, como string, nunca commiteado -- ver
 * Knowledge/29_Specs/008-push-notifications-fcm/plan.md).
 *
 * ponytail: sin retry/backoff -- si FCM falla para un token puntual, se
 * loguea y se sigue con los demás. Reintentar en el próximo tick del cron
 * (5-10 min después) ya cubre el caso transitorio, no hace falta más.
 */

function getFirebaseApp() {
  const existing = getApps();
  if (existing.length) return existing[0];

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON no está configurada -- push deshabilitado",
    );
  }
  const serviceAccount = JSON.parse(raw);
  return initializeApp({ credential: cert(serviceAccount) });
}

export type PushSendResult = {
  sent: number;
  invalidTokens: string[]; // tokens que FCM rechazó como no-registrados -- borrar de push_tokens
  errors: { token: string; message: string }[];
};

export async function sendPushToTokens(params: {
  tokens: string[];
  title: string;
  body: string;
  imageUrl?: string | null; // foto de la mascota (pets.photo_url) -- imagen grande al expandir, FCM la baja solo
}): Promise<PushSendResult> {
  const result: PushSendResult = { sent: 0, invalidTokens: [], errors: [] };
  if (!params.tokens.length) return result;

  const messaging = getMessaging(getFirebaseApp());
  const response = await messaging.sendEachForMulticast({
    tokens: params.tokens,
    notification: { title: params.title, body: params.body },
    // 010-widget-android-hero (research.md Decisión 5, T022): el único
    // caller real de esta función hoy es el cron de "comió"/"le sirvieron"
    // -- el mismo evento que amerita la notificación también amerita
    // refrescar el widget casi al instante en vez de esperar el próximo
    // ciclo de WorkManager (15 min). Todos los valores de `data` DEBEN ser
    // string (contrato de FCM). `KittypauMessagingService.kt` la intercepta
    // del lado nativo.
    data: { kittypau_widget_refresh: "1" },
    android: {
      notification: {
        icon: "ic_stat_kittypau",
        color: "#ebb6a8",
        imageUrl: params.imageUrl ?? undefined,
      },
    },
  });

  response.responses.forEach((r, i) => {
    const token = params.tokens[i];
    if (r.success) {
      result.sent++;
      return;
    }
    const code = r.error?.code ?? "";
    if (
      code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-registration-token"
    ) {
      result.invalidTokens.push(token);
    } else {
      result.errors.push({ token, message: r.error?.message ?? code });
    }
  });

  return result;
}
