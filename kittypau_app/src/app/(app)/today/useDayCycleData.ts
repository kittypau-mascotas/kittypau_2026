import { useMemo } from 'react';
import { getChileDayNightWindow } from '@/lib/time/chile';

export interface Session {
  id: string;
  type: 'food' | 'water';
  startT: number;
  endT: number;
  startValue: number;
  consumed: number;
  isConfirmed: boolean;
  durationMinutes: number;
  intensity: number; // Nuevo: Basado en log10(x+1) para analítica
}

export interface RawReading {
  t: number;
  y: number;
  deviceId?: string;
  is_water?: boolean;
}

export const useDayCycleData = (readings: RawReading[], auditEvents: any[], offsetDays: number) => {
  return useMemo(() => {
    // 1. Calcular ventana del ciclo (06:00-06:00 hora Chile Continental)
    const now = new Date();
    const baseWindow = getChileDayNightWindow(now);
    // Retroceder N días completos para el offset
    const startMs = baseWindow.startMs - offsetDays * 24 * 60 * 60 * 1000;
    const endMs = startMs + 24 * 60 * 60 * 1000;

    // 2. Filtrar y transformar puntos
    const points = readings
      .filter(r => r.t >= startMs && r.t <= endMs)
      .map(r => ({
        time: new Date(r.t),
        weight: r.y,
        raw: r as RawReading
      }));

    // 3. Reconstruir sesiones (Heurística + Eventos Audit)
    const sessions: Session[] = [];
    
    // --- PRIORIDAD 1: Eventos de Auditoría ---
    const startEvents = auditEvents.filter(e => 
      (e.category_key === 'inicio_comida' || e.category_key === 'inicio_hidratacion') &&
      e.recorded_at >= startMs && e.recorded_at <= endMs
    );

    startEvents.forEach(evt => {
      const isFood = evt.category_key === 'inicio_comida';
      // Buscar término cercano
      const termKey = isFood ? 'termino_comida' : 'termino_hidratacion';
      const termEvt = auditEvents.find(e => e.category_key === termKey && e.recorded_at > evt.recorded_at);
      
      // Buscar peso inicial en readings
      const readingAtStart = readings.find(r => Math.abs(r.t - evt.recorded_at) < 30000);
      const readingAtEnd = termEvt ? readings.find(r => Math.abs(r.t - termEvt.recorded_at) < 30000) : null;

      if (readingAtStart) {
        const consumed = readingAtEnd ? Math.max(0, readingAtStart.y - readingAtEnd.y) : 10; // Fallback si no hay fin
        sessions.push({
          id: `session-${evt.id}`,
          type: isFood ? 'food' : 'water',
          startT: evt.recorded_at,
          endT: termEvt ? termEvt.recorded_at : evt.recorded_at + 300000,
          startValue: readingAtStart.y,
          consumed: consumed,
          isConfirmed: true,
          durationMinutes: termEvt ? (termEvt.recorded_at - evt.recorded_at) / 60000 : 5,
          intensity: Math.log10(consumed + 1)
        });
      }
    });

    // --- PRIORIDAD 2: Heurística por caída de peso (Regla de Caja) ---
    // Si no hay sesiones activas en un rango, detectamos caídas bruscas
    for (let i = 1; i < points.length; i++) {
      const diff = points[i-1].weight - points[i].weight;
      const timeDiff = points[i].time.getTime() - points[i-1].time.getTime();

      // Si el peso cae más de 5g en menos de 5 minutos y no hay sesión solapada
      if (diff > 5 && timeDiff < 300000) {
        const isNearAudit = sessions.some(s => Math.abs(s.startT - points[i-1].raw.t) < 600000);
        
        if (!isNearAudit) {
          sessions.push({
            id: `auto-${points[i-1].raw.t}`,
            type: points[i-1].raw.is_water ? 'water' : 'food', // Asumiendo flag en raw data
            startT: points[i-1].raw.t,
            endT: points[i].raw.t,
            startValue: points[i-1].weight,
            consumed: diff,
            isConfirmed: false,
            durationMinutes: timeDiff / 60000,
            intensity: Math.log10(diff + 1)
          });
        }
      }
    }

    return {
      points,
      sessions,
      domain: [new Date(startMs), new Date(endMs)] as [Date, Date]
    };
  }, [readings, auditEvents, offsetDays]);
};