/**
 * Kittypau Analytics Processor v1.0
 *
 * Recibe lecturas raw del Bridge y las convierte en sesiones de
 * alimentación/hidratación procesadas para la analytics DB.
 *
 * Lógica:
 *  1. State machine por device: IDLE → ACTIVE → IDLE
 *  2. Sesión se abre cuando el peso baja > SESSION_THRESHOLD gramos
 *  3. Sesión se cierra cuando el peso se estabiliza por STABLE_COUNT lecturas
 *  4. Z-score calculado contra baseline rolling 30 sesiones por mascota
 *  5. Insert a pet_sessions + upsert incremental a pet_daily_summary
 */

const { createClient } = require('@supabase/supabase-js');

// ── Configuración ─────────────────────────────────────────────
const SESSION_THRESHOLD_G   = 5;    // caída mínima en gramos para abrir sesión
const STABLE_COUNT          = 2;    // lecturas consecutivas estables para cerrar sesión
const STABLE_TOLERANCE_G    = 3;    // varianza máxima en gramos considerada "estable"
const BASELINE_WINDOW       = 30;   // últimas N sesiones para calcular baseline
const ZSCORE_HIGH_THRESHOLD = 1.5;
const ZSCORE_LOW_THRESHOLD  = -1.5;

// ── Cliente analytics ─────────────────────────────────────────
let analyticsClient = null;

function initAnalyticsClient() {
  const url = process.env.SUPABASE_ANALYTICS_URL;
  const key = process.env.SUPABASE_ANALYTICS_SERVICE_KEY;

  if (!url || !key) {
    console.warn('[PROCESSOR] SUPABASE_ANALYTICS_URL o SUPABASE_ANALYTICS_SERVICE_KEY no definidos — analytics desactivado.');
    return null;
  }

  return createClient(url, key);
}

// ── Estado en memoria ─────────────────────────────────────────

/**
 * deviceState: Map<deviceId, {
 *   phase: 'idle' | 'active',
 *   weightBefore: number,        peso estable antes de la sesión
 *   sessionStart: Date,
 *   stableCount: number,         lecturas estables consecutivas en fase ACTIVE
 *   lastWeight: number,          última lectura de peso
 *   tempAccum: number[],         temperaturas acumuladas durante la sesión
 *   humAccum:  number[],
 *   petId: string | null,
 *   ownerId: string | null,
 *   deviceType: string,          'food_bowl' | 'water_bowl'
 * }>
 */
const deviceState = new Map();

/**
 * petBaseline: Map<petId, {
 *   sessions: number[],          últimas N grams_consumed
 *   mean: number,
 *   stddev: number,
 * }>
 */
const petBaseline = new Map();

// ── Helpers ───────────────────────────────────────────────────

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr, mean) {
  if (arr.length < 2) return 1; // evitar división por cero, retorna 1 para Z-score = 0
  const variance = arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / arr.length;
  return Math.sqrt(variance) || 1;
}

function updateBaseline(petId, gramsConsumed) {
  if (!petId) return;
  const b = petBaseline.get(petId) ?? { sessions: [], mean: 0, stddev: 1 };
  b.sessions.push(gramsConsumed);
  if (b.sessions.length > BASELINE_WINDOW) b.sessions.shift();
  b.mean   = avg(b.sessions);
  b.stddev = stddev(b.sessions, b.mean);
  petBaseline.set(petId, b);
}

function calcZScore(petId, gramsConsumed) {
  const b = petBaseline.get(petId);
  if (!b || b.sessions.length < 3) return 0; // no hay suficiente historial
  return (gramsConsumed - b.mean) / b.stddev;
}

function classify(zScore) {
  if (zScore > ZSCORE_HIGH_THRESHOLD)  return 'high';
  if (zScore < ZSCORE_LOW_THRESHOLD)   return 'low';
  return 'normal';
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

// ── Core: procesar una lectura ────────────────────────────────

/**
 * @param {string} deviceId          KPCL0031
 * @param {object} reading           { weight, temp, hum, ... }
 * @param {object} deviceMeta        { id (UUID), pet_id, owner_id, device_type, plate_weight_grams }
 */
async function processReading(deviceId, reading, deviceMeta) {
  if (!analyticsClient) return;

  const weightRaw = reading.weight;
  if (weightRaw == null || !Number.isFinite(weightRaw)) return;

  const weight = Math.round(weightRaw);
  const petId      = deviceMeta?.pet_id   ?? null;
  const ownerId    = deviceMeta?.owner_id  ?? null;
  const deviceType = deviceMeta?.device_type === 'water_bowl' ? 'water' : 'food';

  // Inicializar estado del device si es la primera lectura
  if (!deviceState.has(deviceId)) {
    deviceState.set(deviceId, {
      phase:       'idle',
      weightBefore: weight,
      sessionStart: null,
      stableCount:  0,
      lastWeight:   weight,
      tempAccum:    [],
      humAccum:     [],
      petId,
      ownerId,
      deviceType,
    });
    return; // primera lectura solo inicializa
  }

  const state = deviceState.get(deviceId);

  // Actualizar meta por si el device fue reclamado después de inicializar
  if (petId   && !state.petId)   state.petId   = petId;
  if (ownerId && !state.ownerId) state.ownerId = ownerId;

  const weightDrop = state.weightBefore - weight;

  if (reading.temp != null) state.tempAccum.push(reading.temp);
  if (reading.hum  != null) state.humAccum.push(reading.hum);

  // ── STATE MACHINE ─────────────────────────────────────────
  if (state.phase === 'idle') {

    if (weightDrop >= SESSION_THRESHOLD_G) {
      // ► Abrir sesión
      state.phase        = 'active';
      state.sessionStart = new Date();
      state.tempAccum    = [];
      state.humAccum     = [];
      console.log(`[PROCESSOR] ▶ Sesión abierta ${deviceId} (${deviceType}) — antes: ${state.weightBefore}g, ahora: ${weight}g`);
    } else {
      // Actualizar peso de referencia estable mientras está IDLE
      state.weightBefore = weight;
    }

  } else if (state.phase === 'active') {

    const isStable = Math.abs(weight - state.lastWeight) <= STABLE_TOLERANCE_G;

    if (isStable) {
      state.stableCount++;
    } else {
      state.stableCount = 0;
    }

    if (state.stableCount >= STABLE_COUNT) {
      // ► Cerrar sesión
      const sessionEnd     = new Date();
      const gramsConsumed  = Math.max(0, state.weightBefore - weight);
      const zScore         = calcZScore(state.petId, gramsConsumed);
      const classification = classify(zScore);
      const baselineMean   = petBaseline.get(state.petId)?.mean ?? null;

      const session = {
        owner_id:         state.ownerId,
        pet_id:           state.petId,
        device_id:        deviceId,
        session_type:     deviceType,
        session_start:    state.sessionStart.toISOString(),
        session_end:      sessionEnd.toISOString(),
        grams_consumed:   deviceType === 'food'  ? gramsConsumed : null,
        water_ml:         deviceType === 'water' ? gramsConsumed : null, // 1g ≈ 1ml
        classification,
        anomaly_score:    parseFloat(zScore.toFixed(3)),
        baseline_grams:   baselineMean ? parseFloat(baselineMean.toFixed(2)) : null,
        avg_temperature:  state.tempAccum.length ? parseFloat(avg(state.tempAccum).toFixed(1)) : null,
        avg_humidity:     state.humAccum.length  ? parseFloat(avg(state.humAccum).toFixed(1))  : null,
        is_premium_data:  true,
      };

      await persistSession(session, gramsConsumed, deviceType);
      updateBaseline(state.petId, gramsConsumed);

      console.log(`[PROCESSOR] ■ Sesión cerrada ${deviceId} — consumo: ${gramsConsumed}g | clase: ${classification} | Z: ${zScore.toFixed(2)}`);

      // Reset state
      state.phase        = 'idle';
      state.weightBefore = weight;
      state.stableCount  = 0;
      state.tempAccum    = [];
      state.humAccum     = [];
    }
  }

  state.lastWeight = weight;
}

// ── Persistencia ──────────────────────────────────────────────

async function persistSession(session, gramsConsumed, sessionType) {
  if (!session.owner_id || !session.pet_id) return; // device no reclamado

  const { error } = await analyticsClient
    .from('pet_sessions')
    .insert(session);

  if (error) {
    console.error(`[PROCESSOR] Error insertando sesión: ${error.message}`);
    return;
  }

  await upsertDailySummary(session, gramsConsumed, sessionType);
}

async function upsertDailySummary(session, gramsConsumed, sessionType) {
  const date = todayDateString();

  const { data: existing } = await analyticsClient
    .from('pet_daily_summary')
    .select('id, total_food_grams, total_water_ml, food_sessions, water_sessions, anomaly_count, readings_processed, first_session_at')
    .eq('pet_id', session.pet_id)
    .eq('summary_date', date)
    .maybeSingle();

  const isAnomaly = session.classification !== 'normal';

  if (existing) {
    const update = {
      anomaly_count:      existing.anomaly_count + (isAnomaly ? 1 : 0),
      readings_processed: existing.readings_processed + 1,
      processed_at:       new Date().toISOString(),
      last_session_at:    session.session_end,
      first_session_at:   existing.first_session_at ?? session.session_start,
    };

    if (sessionType === 'food') {
      update.total_food_grams = (existing.total_food_grams ?? 0) + gramsConsumed;
      update.food_sessions    = existing.food_sessions + 1;
    } else {
      update.total_water_ml = (existing.total_water_ml ?? 0) + gramsConsumed;
      update.water_sessions = existing.water_sessions + 1;
    }

    await analyticsClient
      .from('pet_daily_summary')
      .update(update)
      .eq('id', existing.id);

  } else {
    await analyticsClient
      .from('pet_daily_summary')
      .insert({
        owner_id:           session.owner_id,
        pet_id:             session.pet_id,
        summary_date:       date,
        total_food_grams:   sessionType === 'food'  ? gramsConsumed : 0,
        total_water_ml:     sessionType === 'water' ? gramsConsumed : 0,
        food_sessions:      sessionType === 'food'  ? 1 : 0,
        water_sessions:     sessionType === 'water' ? 1 : 0,
        anomaly_count:      isAnomaly ? 1 : 0,
        skipped_meals:      0,
        first_session_at:   session.session_start,
        last_session_at:    session.session_end,
        readings_processed: 1,
      });
  }
}

// ── Init / Export ─────────────────────────────────────────────

function init() {
  analyticsClient = initAnalyticsClient();
  if (analyticsClient) {
    console.log('[PROCESSOR] ✓ Analytics processor iniciado');
  }
}

module.exports = { init, processReading };
