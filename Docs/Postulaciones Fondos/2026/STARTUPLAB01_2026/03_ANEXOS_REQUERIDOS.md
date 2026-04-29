# Start-Up Chile 2026 - Anexos requeridos (con base 2025)

## 1) Legales
- [ ] Constitucion/estatuto completo en PDF unico.
- [ ] Certificado de vigencia actualizado.
- [ ] CI/pasaporte vigente Team Leader.
- [ ] CI representante legal.

## 2) Equipo
- [ ] CV Team Leader actualizado.
- [ ] CV cofundadores/ejecutores.
- [ ] Perfil LinkedIn vigente de cada rol clave.

## 3) Producto y tracción
- [ ] Evidencia de prototipo (fotos/video/demo).
- [ ] Métricas de piloto/uso (si existen).
- [ ] Cartas de interés o recomendación (si aplica).

## 4) Comercial y financiero
- [ ] Proyección 12-24 meses.
- [ ] Plan de uso de fondos y cofinanciamiento.
- [ ] Estrategia de mercado Chile + expansión.

## Referencias 2025 sugeridas para retilizar
- `.../03_Start_Up_Chile_Build_2025/Compromiso_Dedicacion_Mauro_Lider_Equipo.md`
- `.../03_Start_Up_Chile_Build_2025/Compromiso_Dedicacion_Javier_Ejecutor.md`
- `.../03_Start_Up_Chile_Build_2025/Equipo_Fundador_Kittypau.md`
- `.../03_Start_Up_Chile_Build_2025/03_Documentos_Persona_Juridica.md`

## Marco AIoT / PetTech (Alneacion 2026)

### Terminologia oficial recomendada
- **AIoT (Artificial Intelligence of Things)**: termino principal para Kittypau.
- **Intelligent IoT**: variante de comunicacion comercial.
- **Edge AI + IoT**: cuando parte del análisis corre en dispositivo.
- **Smart IoT**: termino marketing, menos tecnico.

### Definicion recomendada de producto
**Kittypau is an AIoT platform that monitors pet feeding and hydration cycles to generate health insights and preventive alerts.**

### Categoria estrategica
**PetTech AIoT** = PetTech + IoT + IA.

Esto posiciona a Kittypau no como "solo hardware", sino como:
- infraestructura de datos longitudinales de salud animal,
- analítica preventiva,
- plataforma escalable con suscripción.

### Arquitectura actual (ya compatible con AIoT)
1. Dispositivo IoT (ESP8266/ESP32).
2. Ingestion por MQTT.
3. Bridge Node.js.
4. Persistencia en PostgreSQL/Supabase.
5. Capa de analítica/IA.
6. Dashboard web para usuario/admin.

### Estrategia tipo "Fitbit de mascotas"
- Hardware = punto de entrada.
- Datos longitudinales = ventaja competitiva.
- IA = diferencial de valor.
- Suscripción = recurrencia (modelo SaaS).

### Casos de uso preventivos (objetivo)
- Riesgo de deshidratación por baja de consumo de agua en ventana corta.
- Cambios de conducta alimentaria (horario/frecuencia/cantidad).
- Riesgo de sobrepeso por patrones de ingesta sostenidos.

### Modelo de negocio recomendado (3 capas)
1. **Hardware**: ingreso inicial por unidad.
2. **Suscripción**: dashboard avanzado, recomendaciones y alertas.
3. **Data insights (futuro)**: datos anonimizados para partners (veterinarias, investigacion, marcas).
## Contexto de Expansion del Ecosistema (Fuente: Docs/contexto.md)
- **Foco actual (core)**: `Kittypau` se mantiene como plataforma PetTech AIoT para alimentación e hidratación de mascotas.
- **Expansion en evaluacion**: `Kitty Plant` (IoT para plantas) como segunda vertical, reutilizando arquitectura y modelo de datos.
- **Vision de largo plazo**: `Senior Kitty` como posible tercera vertical para cuidados en hogar.
- **Estrategia transversal**: hardware como entrada + datos longitudinales + analítica para insights preventivos.
- **Producto y UX**: interfaz simple, menos friccion en onboarding y vista demo para explicar valor rapido.
- **Gobernanza tecnica**: conservar una base relacional coherente y contratos API estables entre web, app y dispositivos.

### Implicancias para App/Web (Kittypau)
1. `/today` y `navbar` deben mantener consistencia estricta entre mascota activa, `pet_id` y KPCL asociado.
2. Las decisiones visuales deben reforzar lectura rápida de estado real (alimentación, hidratación, ambiente, batería).
3. El backlog funcional prioriza confiabilidad de datos por sobre efectos visuales.
4. Cualquier expansión de vertical (plantas/senior) debe montarse sobre componentes reutilizables del core.


