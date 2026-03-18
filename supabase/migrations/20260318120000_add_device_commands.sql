-- Cola de comandos para dispositivos IoT.
-- La API web inserta aquí; el bridge lo lee, publica vía MQTT y marca como sent.

CREATE TABLE public.device_commands (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id   text        NOT NULL,
  command     jsonb       NOT NULL,
  status      text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'sent', 'failed')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  sent_at     timestamptz
);

CREATE INDEX idx_device_commands_pending
  ON public.device_commands (device_id, created_at)
  WHERE status = 'pending';
