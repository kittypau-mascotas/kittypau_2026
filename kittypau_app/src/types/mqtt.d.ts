declare module "mqtt" {
  export type MqttMessage = {
    toString(): string;
  };

  export type MqttClientOptions = {
    username?: string;
    password?: string;
    clientId?: string;
    clean?: boolean;
    reconnectPeriod?: number;
  };

  export interface MqttClient {
    on(event: "connect", callback: () => void): MqttClient;
    on(
      event: "message",
      callback: (topic: string, message: MqttMessage) => void,
    ): MqttClient;
    on(event: "error", callback: (error: Error) => void): MqttClient;
    on(event: "offline", callback: () => void): MqttClient;
    on(event: "reconnect", callback: () => void): MqttClient;
    subscribe(topic: string, options?: { qos?: number }): void;
    end(force?: boolean): void;
  }

  export function connect(url: string, options?: MqttClientOptions): MqttClient;

  const mqtt: {
    connect: typeof connect;
  };

  export default mqtt;
}
