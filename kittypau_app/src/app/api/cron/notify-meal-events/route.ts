import { NextRequest, NextResponse } from "next/server";
import { apiError, logRequestEnd, startRequestTimer } from "../../_utils";
import { supabaseServer } from "@/lib/supabase/server";
import { isFoodDeviceRole } from "@/lib/device-role";
import {
  fetchHungerBarForDevice,
  resolveFoodDevice,
} from "@/lib/hunger-bar-server";
import { sendPushToTokens } from "@/lib/push/fcm";

/**
 * POST /api/cron/notify-meal-events
 * Push real (FCM) para "comió"/"le sirvieron", disparado server-side --
 * reemplaza (para el caso de app cerrada) al polling client-side de
 * `useHungerBarEventNotifications` en `today/page.tsx`, que solo funciona
 * con la app abierta. Ver Knowledge/29_Specs/008-push-notifications-fcm/plan.md.
 *
 * Disparo externo (no Vercel Cron -- ver plan.md para por qué): pensado para
 * pg_cron + pg_net desde Supabase, llamando este endpoint cada 5-10 min con
 * el header `Authorization: Bearer $CRON_SECRET` (mismo patrón que
 * `bridge/health-check`). El secret NUNCA va commiteado -- se configura a
 * mano en el SQL editor de Supabase (`net.http_post` con el header) y en
 * las env vars de Vercel.
 *
 * Recorre TODOS los pets con comedero activo (no solo KPCL0034) -- otros
 * dispositivos usan las reglas simples v1, mismo alcance que ya tiene
 * `computeHungerBar`. Dedupe contra `push_notified_meal_events` para no
 * reenviar el mismo evento en cada corrida (los eventos siguen apareciendo
 * en `events` mientras estén dentro de WINDOW_DAYS).
 *
 * ponytail: recorre pets uno por uno, secuencial -- con pocos pets (uso
 * personal/de prueba) es simple y suficiente. Si esto corre para muchos
 * usuarios reales, paralelizar o paginar es el upgrade obvio, no antes.
 *
 * `pets.photo_url` (URL pública de Supabase Storage, `getPublicUrl()`) viaja
 * como `imageUrl` del push -- FCM la baja sola y la muestra como imagen
 * grande al expandir la notificación. Solo esta ruta (push real); las
 * LocalNotifications de `useHungerBarEventNotifications` siguen con el
 * ícono Kittypau fijo -- `largeIcon` de ese plugin no acepta una URL/foto
 * dinámica, solo un drawable empaquetado en el APK (límite de la
 * plataforma, no decisión de diseño).
 */

type PetConDevice = {
  pet_id: string;
  user_id: string;
  pet_name: string | null;
  pet_photo_url: string | null;
};

async function petsConComedero(): Promise<PetConDevice[]> {
  const { data, error } = await supabaseServer
    .from("devices")
    .select(
      "device_id, device_type, pet_id, pets!inner(id, user_id, name, photo_url)",
    )
    .eq("status", "active")
    .not("pet_id", "is", null);
  if (error) throw new Error(error.message);

  const vistos = new Set<string>();
  const resultado: PetConDevice[] = [];
  for (const row of data ?? []) {
    if (!isFoodDeviceRole(row.device_id, row.device_type)) continue;
    const pet = Array.isArray(row.pets) ? row.pets[0] : row.pets;
    if (!pet || vistos.has(pet.id)) continue;
    vistos.add(pet.id);
    resultado.push({
      pet_id: pet.id,
      user_id: pet.user_id,
      pet_name: pet.name,
      pet_photo_url: pet.photo_url ?? null,
    });
  }
  return resultado;
}

export async function POST(req: NextRequest) {
  const startedAt = startRequestTimer(req);
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null;
  const isCronAuth =
    !!bearerToken &&
    !!process.env.CRON_SECRET &&
    bearerToken === process.env.CRON_SECRET;
  if (!isCronAuth) {
    return apiError(req, 401, "UNAUTHORIZED", "Unauthorized");
  }

  let pets: PetConDevice[];
  try {
    pets = await petsConComedero();
  } catch (err) {
    return apiError(
      req,
      500,
      "SUPABASE_ERROR",
      err instanceof Error ? err.message : String(err),
    );
  }

  let eventosNuevos = 0;
  let pushEnviados = 0;
  const errores: string[] = [];

  for (const pet of pets) {
    try {
      const device = await resolveFoodDevice(pet.pet_id);
      if (!device) continue;
      const { events } = await fetchHungerBarForDevice(device);

      const confirmados = events.filter(
        (e) =>
          !e.isProvisional &&
          (e.category === "alimentacion" || e.category === "servido"),
      );
      if (!confirmados.length) continue;

      // Dedupe: qué de esto ya se notificó antes.
      const { data: yaNotificados, error: dedupeError } = await supabaseServer
        .from("push_notified_meal_events")
        .select("category, event_started_at")
        .eq("pet_id", pet.pet_id)
        .in(
          "event_started_at",
          confirmados.map((e) => e.startAt),
        );
      if (dedupeError) throw new Error(dedupeError.message);
      const notificadosSet = new Set(
        (yaNotificados ?? []).map((r) => `${r.category}:${r.event_started_at}`),
      );

      const nuevos = confirmados.filter(
        (e) => !notificadosSet.has(`${e.category}:${e.startAt}`),
      );
      if (!nuevos.length) continue;

      const { data: tokens, error: tokensError } = await supabaseServer
        .from("push_tokens")
        .select("token")
        .eq("user_id", pet.user_id);
      if (tokensError) throw new Error(tokensError.message);
      const tokenList = (tokens ?? []).map((t) => t.token);

      for (const evento of nuevos) {
        const nombre = pet.pet_name ?? "Tu mascota";
        const title =
          evento.category === "alimentacion" ? "¡Comió!" : "Plato servido";
        const body =
          evento.category === "alimentacion"
            ? `${nombre} acaba de comer.`
            : `Se sirvió comida en el plato de ${nombre}.`;

        if (tokenList.length) {
          const resultado = await sendPushToTokens({
            tokens: tokenList,
            title,
            body,
            imageUrl: pet.pet_photo_url,
          });
          pushEnviados += resultado.sent;
          if (resultado.invalidTokens.length) {
            await supabaseServer
              .from("push_tokens")
              .delete()
              .in("token", resultado.invalidTokens);
          }
        }

        // Se registra como notificado aunque no haya tokens (usuario sin
        // celular registrado) -- evita reintentar por siempre lo mismo.
        await supabaseServer.from("push_notified_meal_events").upsert(
          {
            pet_id: pet.pet_id,
            category: evento.category,
            event_started_at: evento.startAt,
          },
          { onConflict: "pet_id,category,event_started_at" },
        );
        eventosNuevos++;
      }
    } catch (err) {
      errores.push(
        `pet ${pet.pet_id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  logRequestEnd(req, startedAt, 200, {
    pets: pets.length,
    eventos_nuevos: eventosNuevos,
    push_enviados: pushEnviados,
    errores: errores.length,
  });
  return NextResponse.json({
    ok: true,
    pets_revisados: pets.length,
    eventos_nuevos: eventosNuevos,
    push_enviados: pushEnviados,
    errores,
  });
}
