"use client";

/**
 * useMqttLive — conexión WebSocket directa a HiveMQ para datos en vivo.
 *
 * Usa credenciales read-only (NEXT_PUBLIC_MQTT_*_READONLY) para que
 * el browser pueda suscribirse sin exponer las credenciales del Bridge.
 *
 * Requiere variables de entorno:
 *   NEXT_PUBLIC_MQTT_BROKER          (ej: abc123.s1.eu.hivemq.cloud)
 *   NEXT_PUBLIC_MQTT_PORT_WS         (ej: 8884)
 *   NEXT_PUBLIC_MQTT_USER_READONLY
 *   NEXT_PUBLIC_MQTT_PASS_READONLY
 */

import { useEffect, useRef, useState } from "react";
import mqtt from "mqtt";

export type LiveReading = {
  deviceId: string;
  weight: number | null;
  temperature: number | null;
  humidity: number | null;
  lightLux: number | null;
  lightPercent: number | null;
  batteryLevel: number | null;
  receivedAt: string;
};

type UseMqttLiveResult = {
  reading: LiveReading | null;
  connected: boolean;
  error: string | null;
};

export function useMqttLive(deviceId: string | null): UseMqttLiveResult {
  const [reading, setReading] = useState<LiveReading | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<mqtt.MqttClient | null>(null);

  useEffect(() => {
    if (!deviceId) return;

    const broker = process.env.NEXT_PUBLIC_MQTT_BROKER;
    const port = process.env.NEXT_PUBLIC_MQTT_PORT_WS ?? "8884";
    const username = process.env.NEXT_PUBLIC_MQTT_USER_READONLY;
    const password = process.env.NEXT_PUBLIC_MQTT_PASS_READONLY;

    if (!broker || !username || !password) {
      setError("MQTT read-only credentials not configured.");
      return;
    }

    const client = mqtt.connect(`wss://${broker}:${port}/mqtt`, {
      username,
      password,
      clientId: `kp-web-${deviceId}-${Math.random().toString(16).slice(2, 8)}`,
      clean: true,
      reconnectPeriod: 5000,
    });

    clientRef.current = client;

    client.on("connect", () => {
      setConnected(true);
      setError(null);
      client.subscribe(`${deviceId}/SENSORS`, { qos: 0 });
    });

    client.on("message", (_topic, message) => {
      try {
        const data = JSON.parse(message.toString()) as Record<string, unknown>;
        setReading({
          deviceId,
          weight:       toNum(data.weight),
          temperature:  toNum(data.temp),
          humidity:     toNum(data.hum),
          lightLux:     toNum((data.light as Record<string, unknown>)?.lux),
          lightPercent: toNum((data.light as Record<string, unknown>)?.['%']),
          batteryLevel: toNum(data.battery),
          receivedAt:   new Date().toISOString(),
        });
      } catch {
        // mensaje malformado — ignorar
      }
    });

    client.on("error", (err) => {
      setError(err.message);
    });

    client.on("offline", () => {
      setConnected(false);
    });

    client.on("reconnect", () => {
      setConnected(false);
    });

    return () => {
      client.end(true);
      clientRef.current = null;
      setConnected(false);
    };
  }, [deviceId]);

  return { reading, connected, error };
}

function toNum(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
