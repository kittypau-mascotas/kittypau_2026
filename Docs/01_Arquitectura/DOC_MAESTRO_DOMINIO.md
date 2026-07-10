# Documento Maestro de Dominio, Estrategia y Economia (Kittypau)

## Proposito
Definir las reglas de negocio, contratos, estados, estrategia y formulas economicas que deben respetar la UI, la API, el bridge y la capa de administracion.

Si algo contradice este documento, este documento gana hasta que la fuente de verdad se actualice.

## 1) Reglas de negocio criticas
### Usuario
- Un usuario puede tener multiples mascotas.
- Una mascota tiene un solo propietario por ahora.
- Puede existir mascota sin dispositivo: si.
- Puede existir dispositivo sin mascota: no, por esquema actual.

### Mascota
- `name` editable.
- `type` no editable.
- `breeds` editable, maximo 3.
- `photo_url` reemplazable.
- Eliminar mascota = soft delete.
- Al crear: `pet_state = device_pending`.

### Dispositivo
- Un solo dispositivo activo por mascota.
- Reasignar dispositivo libera el anterior.
- Si se elimina mascota, el dispositivo se bloquea.
- Al vincular: `device_state = linked`.

## 2) Estados oficiales
### Mascota (`pet_state`)
- `created`
- `completed_profile`
- `device_pending`
- `device_linked`
- `inactive`
- `archived`

### Dispositivo (`device_state`)
- `factory`
- `claimed`
- `linked`
- `offline`
- `lost`
- `error`

## 3) Contratos de API
### Login
```json
{
  "user": { "id": "uuid", "name": "Ana" },
  "has_pets": true,
  "next_step": "pet_onboarding"
}
```

### Crear mascota
```json
{
  "pet_id": "uuid",
  "profile_completion": 0.72,
  "needs_device_link": true
}
```

### Vincular dispositivo
```json
{
  "device_uuid": "uuid",
  "device_id": "KPCL0001",
  "device_state": "linked",
  "pet_state": "device_linked"
}
```

## 4) Validaciones obligatorias
### Usuario
- `email` unico.
- `phone_number` unico cuando exista.
- `care_rating` entre 1 y 10.

### Mascota
- `weight_kg` en rango por especie.
- maximo 3 razas.
- `quiltro` excluyente.

## 5) Enumeraciones oficiales
- `pet_type`
- `origin`
- `activity_level`
- `living_environment`
- `notification_channel`
- `device_state`
- `pet_state`

El frontend no debe inventar valores fuera de estas listas.

## 6) Estrategia de fotos
- Almacenamiento: Supabase Storage.
- Tamano maximo: 5MB.
- Compresion: cliente.
- Reemplazo: overwrite.
- Foto por defecto: placeholder por especie.

## 7) Permisos y seguridad
- Cada usuario solo ve sus mascotas, dispositivos y lecturas.
- Tokens con expiracin segn Supabase.
- Fase futura: cuidadores con permisos limitados.

## 8) Eventos del sistema
### Audit events actuales
- `profile_created`
- `profile_updated`
- `pet_created`
- `device_created`
- `reading_ingested`

### Eventos futuros
- `pet_updated`
- `device_linked`
- `device_unlinked`
- `activity_received`
- `alert_generated`

## 9) Onboarding y UX
- Guardar `user_onboarding_step` y `pet_onboarding_step`.
- El onboarding ocurre en un pop-up con barra de progreso.
- Flujo visual:
  - Usuario -> Mascota -> Dispositivo
- El progreso se conserva si el usuario cierra.

## 10) Modo gua y errores UX
### Modo gua
- Mostrar popup con fondo difuminado en primer ingreso.
- Guardar flag `first_time_guide_seen`.
- Reabrible desde Settings.

### Errores UX definidos
- Sin internet.
- Foto falla.
- Dispositivo ya vinculado.
- Email existente.
- Sesion expirada.

## 11) Marco AIoT / PetTech
### Terminologia oficial
- **AIoT (Artificial Intelligence of Things)**: termino principal.
- **Intelligent IoT**: variante comercial.
- **Edge AI + IoT**: anlisis parcial en dispositivo.
- **Smart IoT**: termino marketing, menos tecnico.

### Definicion de producto
**Kittypau is an AIoT platform that monitors pet feeding and hydration cycles to generate health insights and preventive alerts.**

### Categoria estrategica
**PetTech AIoT** = PetTech + IoT + IA.

Esto posiciona a Kittypau como:
- infraestructura de datos longitudinales de salud animal,
- analitica preventiva,
- plataforma escalable con suscripcion.

### Estrategia tipo Fitbit de mascotas
- Hardware = punto de entrada.
- Datos longitudinales = ventaja competitiva.
- IA = diferencial de valor.
- Suscripcion = recurrencia.

### Casos de uso preventivos
- Riesgo de deshidratacin por baja de consumo de agua.
- Cambios de conducta alimentaria.
- Riesgo de sobrepeso por patrnes de ingesta sostenidos.

## 12) Modelo de negocio
### Capas recomendadas
1. Hardware: ingreso inicial por unidad.
2. Suscripcion: dashboard avanzado, recomendaciones y alertas.
3. Data insights futuro: datos anonimizados para partners.

### KPI / economics de negocio
- `MRR = usuarios_premium * precio_mensual`
- `ARR = MRR * 12`
- `LTV = ARPU * (1 / churn)`
- `LTV/CAC = LTV / CAC`

### Caminos de monetizacion
1. **Camino A - Hardware + Suscripcion**
   - KPI critico: `LTV/CAC > 3`
   - Objetivo: predictibilidad y valor SaaS.
2. **Camino C - Freemium escalable**
   - KPI critico: conversin free->paid y retencion.
   - Objetivo: crecimiento de base y conversin.
3. **Camino B - Hardware premium sin suscripcion**
   - KPI critico: margen bruto unitario.
   - Objetivo: caja tactica.

## 13) Modelo economico resumido
### Costo unitario del kit
`costo_unitario_kit = BOM + manufactura + overhead_unitario`

### Overhead unitario
`overhead_unitario = costos_mensuales_totales / unidades_mes`

### Break-even
`break_even_unidades = costos_fijos_mensuales / margen_unitario`

### Valor SaaS
`valor_saas = ARR * multiplo_saas`

### Regla ejecutiva
- objetivo operacinal: `LTV/CAC > 3`
- crecimiento sano: churn bajo y retencion alta

## 14) Fuentes de datos economicas
- `public.finance_purchases`
- `public.finance_kit_components`
- `public.finance_provider_plans`
- `public.finance_monthly_snapshots`
- `public.finance_admin_summary`
- `public.finance_kpcl_profiles`
- `public.finance_kpcl_profile_components`

## 15) Economico operativo
- Hardware, manufactura, cloud, soporte, garantias y logistica deben reflejarse en la capa financiera.
- Los reemplazos y garantias suben overhead y empujan el break-even.
- El dashboard admin debe mostrar costo unitario, OPEX y costo por KPCL.

## 16) Contexto de expansin
- Foco actual: `Kittypau` como PetTech AIoT para alimentacin e hidratacin de mascotas.
- Expansiones en evaluacion: `Kitty Plant` y `Senior Kitty`.
- La gobernanza tecnica debe preservar una base relacional coherente y contratos API estables.

## 17) Implicancias para App/Web
1. `/today` y `navbar` deben mantener consistencia entre mascota activa, `pet_id` y KPCL.
2. La UI debe reforzar lectura rpida de estado real.
3. El backlog funcional prioriza confiabilidad de datos sobre efectos visuales.
4. Cualquier expansin debe retilizar componentes del core.

## 18) Referencias relacionadas
- [FUENTE_DE_VERDAD.md](FUENTE_DE_VERDAD.md)
- [PLAN_MAESTRO.md](PLAN_MAESTRO.md)
- [ANALISIS_ECONOMICO_KITTYPAU.md](ANALISIS_ECONOMICO_KITTYPAU.md)
- [KITTYPAU_MODELO_ESTRATEGICO_Y_METRICAS.md](KITTYPAU_MODELO_ESTRATEGICO_Y_METRICAS.md)



