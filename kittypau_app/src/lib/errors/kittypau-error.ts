export type KittypauErrorType =
  | "not_found"
  | "app_crash"
  | "backend_unavailable"
  | "mqtt_broker_down"
  | "mqtt_unstable"
  | "bridge_offline"
  | "iot_outage"
  | "unknown";

export type KittypauErrorContent = {
  code: string;
  title: string;
  description: string;
};

export function getKittypauErrorContent(
  type: KittypauErrorType,
): KittypauErrorContent {
  switch (type) {
    case "not_found":
      return {
        code: "404",
        title: "Seccion no disponible",
        description:
          "Esta ruta no existe o fue movida. Vuelve al inicio de sesion para continuar.",
      };
    case "mqtt_broker_down":
      return {
        code: "MQTT",
        title: "Broker no disponible",
        description:
          "No pudimos conectarnos al broker MQTT. Reintenta en unos segundos.",
      };
    case "mqtt_unstable":
      return {
        code: "MQTT",
        title: "Conexion inestable",
        description:
          "Detectamos problemas de conexion con MQTT. Reintenta o revisa tu red.",
      };
    case "bridge_offline":
      return {
        code: "BRIDGE",
        title: "Bridge sin conexion",
        description:
          "El bridge no esta respondiendo. Esto puede afectar lecturas y comandos.",
      };
    case "iot_outage":
      return {
        code: "IOT",
        title: "Dispositivos sin conexion",
        description:
          "Varios dispositivos IoT aparecen sin conexion. Reintenta mas tarde.",
      };
    case "backend_unavailable":
      return {
        code: "SERVICIO",
        title: "Servicio no disponible",
        description:
          "Kittypau no puede acceder al servicio en este momento. Reintenta mas tarde.",
      };
    case "app_crash":
      return {
        code: "ERROR",
        title: "Problema en la app",
        description:
          "Ocurrio un problema inesperado dentro de Kittypau. Puedes reintentar o volver al login.",
      };
    case "unknown":
    default:
      return {
        code: "ERROR",
        title: "Algo salio mal",
        description:
          "Ocurrio un problema inesperado. Reintenta o vuelve al inicio de sesion.",
      };
  }
}

export function parseKittypauErrorType(raw: unknown): KittypauErrorType {
  if (typeof raw !== "string") return "unknown";
  const normalized = raw.trim().toLowerCase();
  switch (normalized) {
    case "404":
    case "not_found":
    case "not-found":
      return "not_found";
    case "app":
    case "app_crash":
    case "crash":
      return "app_crash";
    case "backend":
    case "backend_unavailable":
    case "unavailable":
      return "backend_unavailable";
    case "broker":
    case "mqtt_broker_down":
    case "mqtt-broker-down":
      return "mqtt_broker_down";
    case "mqtt":
    case "mqtt_unstable":
    case "mqtt-unstable":
      return "mqtt_unstable";
    case "bridge":
    case "bridge_offline":
    case "bridge-offline":
      return "bridge_offline";
    case "iot":
    case "iot_outage":
    case "iot-outage":
      return "iot_outage";
    default:
      return "unknown";
  }
}

export function inferKittypauErrorTypeFromError(
  error: unknown,
): KittypauErrorType {
  if (!error) return "unknown";
  if (typeof error === "string") return parseKittypauErrorType(error);
  if (typeof error !== "object") return "unknown";

  const maybe = error as { message?: unknown; code?: unknown; name?: unknown };
  const message = typeof maybe.message === "string" ? maybe.message : "";
  const code = typeof maybe.code === "string" ? maybe.code : "";
  const name = typeof maybe.name === "string" ? maybe.name : "";
  const combined = `${name} ${code} ${message}`.toLowerCase();

  const prefixMatch = message.match(/kp[_-]error[:=]([a-z0-9_-]+)/i)?.[1];
  if (prefixMatch) return parseKittypauErrorType(prefixMatch);

  if (combined.includes("mqtt") && combined.includes("broker"))
    return "mqtt_broker_down";
  if (combined.includes("mqtt")) return "mqtt_unstable";
  if (combined.includes("bridge") && combined.includes("offline"))
    return "bridge_offline";
  if (combined.includes("bridge")) return "bridge_offline";
  if (combined.includes("iot") || combined.includes("device_outage"))
    return "iot_outage";
  if (
    combined.includes("fetch failed") ||
    combined.includes("econnrefused") ||
    combined.includes("ecanceled") ||
    combined.includes("timeout") ||
    combined.includes("service unavailable")
  ) {
    return "backend_unavailable";
  }

  return "unknown";
}

export function createKittypauError(
  type: KittypauErrorType,
  message?: string,
): Error {
  return new Error(`KP_ERROR:${type}${message ? ` ${message}` : ""}`);
}
