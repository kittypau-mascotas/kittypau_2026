# Graph Report - .  (2026-07-10)

## Corpus Check
- 198 files · ~1,080,037 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 984 nodes · 1738 edges · 86 communities (76 shown, 10 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 64 edges (avg confidence: 0.81)
- Token cost: 94,505 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Admin API Core|Admin API Core]]
- [[_COMMUNITY_Chatbot Gato Demo|Chatbot Gato Demo]]
- [[_COMMUNITY_Today Page Dashboard|Today Page Dashboard]]
- [[_COMMUNITY_IoT Hardware Documentation|IoT Hardware Documentation]]
- [[_COMMUNITY_Bridge MQTT Processor|Bridge MQTT Processor]]
- [[_COMMUNITY_App Shell & Navigation|App Shell & Navigation]]
- [[_COMMUNITY_ESP8266 Firmware Core|ESP8266 Firmware Core]]
- [[_COMMUNITY_ESP32-CAM Firmware Core|ESP32-CAM Firmware Core]]
- [[_COMMUNITY_Admin Dashboard Page|Admin Dashboard Page]]
- [[_COMMUNITY_ESP8266 WiFi & LED|ESP8266 WiFi & LED]]
- [[_COMMUNITY_App Build Scripts|App Build Scripts]]
- [[_COMMUNITY_Bowl Page & Battery|Bowl Page & Battery]]
- [[_COMMUNITY_Dev Tooling Dependencies|Dev Tooling Dependencies]]
- [[_COMMUNITY_Battery & Reading Gaps|Battery & Reading Gaps]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Admin Overview Cache|Admin Overview Cache]]
- [[_COMMUNITY_Settings & New Device|Settings & New Device]]
- [[_COMMUNITY_Pet Page Selection|Pet Page Selection]]
- [[_COMMUNITY_Cat Animation Data|Cat Animation Data]]
- [[_COMMUNITY_Story Page Timeline|Story Page Timeline]]
- [[_COMMUNITY_Root Layout & Fonts|Root Layout & Fonts]]
- [[_COMMUNITY_ESP32-CAM WiFi Manager|ESP32-CAM WiFi Manager]]
- [[_COMMUNITY_Chile Timezone Utils|Chile Timezone Utils]]
- [[_COMMUNITY_ESP32-CAM MQTT Manager|ESP32-CAM MQTT Manager]]
- [[_COMMUNITY_Bridge Package Config|Bridge Package Config]]
- [[_COMMUNITY_Registration Flow UI|Registration Flow UI]]
- [[_COMMUNITY_App Runtime Dependencies|App Runtime Dependencies]]
- [[_COMMUNITY_Capacitor Android Config|Capacitor Android Config]]
- [[_COMMUNITY_Day Cycle Chart|Day Cycle Chart]]
- [[_COMMUNITY_KPCL Cost Catalog|KPCL Cost Catalog]]
- [[_COMMUNITY_ESP32-CAM Sensor Calibration|ESP32-CAM Sensor Calibration]]
- [[_COMMUNITY_Auth Register & Reset|Auth Register & Reset]]
- [[_COMMUNITY_Trial RPG Dialog Profiles|Trial RPG Dialog Profiles]]
- [[_COMMUNITY_Login & Parallax UI|Login & Parallax UI]]
- [[_COMMUNITY_Admin Demo Income|Admin Demo Income]]
- [[_COMMUNITY_Admin Javo Projects|Admin Javo Projects]]
- [[_COMMUNITY_MQTT Live Hook|MQTT Live Hook]]
- [[_COMMUNITY_Admin Format Helpers|Admin Format Helpers]]
- [[_COMMUNITY_Android Instrumented Test|Android Instrumented Test]]
- [[_COMMUNITY_Android Unit Test|Android Unit Test]]
- [[_COMMUNITY_Capacitor Native Config|Capacitor Native Config]]
- [[_COMMUNITY_Package Metadata|Package Metadata]]
- [[_COMMUNITY_API Proxy Config|API Proxy Config]]
- [[_COMMUNITY_Supabase User Server|Supabase User Server]]
- [[_COMMUNITY_MQTT Type Definitions|MQTT Type Definitions]]
- [[_COMMUNITY_Android Main Activity|Android Main Activity]]
- [[_COMMUNITY_Authenticated Fetch Helper|Authenticated Fetch Helper]]
- [[_COMMUNITY_Trial RPG Dialog Dock|Trial RPG Dialog Dock]]
- [[_COMMUNITY_Captive Portal Generator|Captive Portal Generator]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]

## God Nodes (most connected - your core abstractions)
1. `apiError()` - 65 edges
2. `startRequestTimer()` - 56 edges
3. `logRequestEnd()` - 56 edges
4. `getUserClient()` - 52 edges
5. `checkRateLimit()` - 27 edges
6. `getRateKeyFromRequest()` - 26 edges
7. `scripts` - 23 edges
8. `supabaseServer` - 21 edges
9. `enforceBodySize()` - 20 edges
10. `POST()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `MQTT-to-Webhook Bridge Pattern (HiveMQ Free plan lacks native webhooks)` --semantically_similar_to--> `Bridge Node.js (bridge.js, wildcard subscribe, auto-registro)`  [INFERRED] [semantically similar]
  bridge/README.md → iot_firmware/javier_1a/Hitos-Pendientes_javier.md
- `Kittypau App Next.js README` --conceptually_related_to--> `Stack Decision: Next.js 16 + Supabase + Vercel (old Vite+Express app archived)`  [INFERRED]
  kittypau_app/README.md → iot_firmware/javier_1a/Hitos-Pendientes_javier.md
- `Bridge Service (bridge.js, DEVICES array)` --semantically_similar_to--> `Bridge Node.js (bridge.js, wildcard subscribe, auto-registro)`  [INFERRED] [semantically similar]
  iot_firmware/javier_1a/MANUAL_USUARIO_javier.md → iot_firmware/javier_1a/Hitos-Pendientes_javier.md
- `Supabase Schema (devices TEXT PK, sensor_readings, latest_readings view)` --semantically_similar_to--> `Supabase Schema Evolution (UUID PK -> device_id TEXT PK, no JOINs)`  [INFERRED] [semantically similar]
  iot_firmware/javier_1a/MANUAL_USUARIO_javier.md → iot_firmware/javier_1a/Hitos-Pendientes_javier.md
- `HiveMQ Cloud MQTT Broker` --conceptually_related_to--> `HiveMQ Cloud Configuration (Kittypau1 user, port 8883)`  [INFERRED]
  iot_firmware/javier_1a/Hitos-Pendientes_javier.md → iot_firmware/javier_1a/MANUAL_USUARIO_javier.md

## Import Cycles
- 1-file cycle: `kittypau_app/src/app/api/onboarding/status/route.ts -> kittypau_app/src/app/api/onboarding/status/route.ts`

## Hyperedges (group relationships)
- **IoT Data Flow Pipeline: ESP8266 -> HiveMQ -> Bridge -> Supabase -> App Web** — hitos_esp8266_firmware, hitos_hivemq_cloud, hitos_bridge_nodejs, hitos_supabase_schema, hitos_app_web_nextjs [EXTRACTED 1.00]
- **Firmware v2.0.0 Sensor Suite Upgrade (BH1750 + AHT10 + Battery Divider)** — bh1750_sensor, aht10_sensor, battery_voltage_divider [INFERRED 0.85]
- **Username/Password + setInsecure() TLS Auth Pattern Across Firmware Projects** — esp32cam_hivemq_auth, esp8266_hivemq_auth, manual_hivemq_config [INFERRED 0.75]

## Communities (86 total, 10 thin omitted)

### Community 0 - "Admin API Core"
Cohesion: 0.06
Nodes (94): GET(), ADMIN_ROLES, AdminPermissions, AdminRole, getAdminPermissions(), normalizeAdminRole(), AuditEvent, logAudit() (+86 more)

### Community 1 - "Chatbot Gato Demo"
Cohesion: 0.05
Nodes (59): ChatbotGatoClientRequest, ChatbotGatoClientResponse, fetchChatbotGatoResponse(), DEMO_BLOCK_PROMPTS, DemoBlockId, DemoBlockPrompt, getDemoBlockPrompt(), getDemoPromptSequence() (+51 more)

### Community 2 - "Today Page Dashboard"
Cohesion: 0.04
Nodes (50): ApiDevice, ApiPet, ApiProfile, ApiReading, AuditEvent, BOWL_CATEGORY_CHOICES, BowlCategoryChoice, buildWellnessState() (+42 more)

### Community 3 - "IoT Hardware Documentation"
Cohesion: 0.06
Nodes (50): AHT10 Temp/Humidity Sensor (replaces DHT11 for precision), Battery Voltage Divider on A0 (replaces hardcoded battery constants), BH1750 Digital Light Sensor (replaces LDR for real lux), Bridge MQTT -> API README, Bridge Heartbeat (bridge -> API), device_code Fallback Extraction from MQTT Topic, MQTT-to-Webhook Bridge Pattern (HiveMQ Free plan lacks native webhooks), WEBHOOK_TOKEN / BRIDGE_HEARTBEAT_TOKEN Security Match (+42 more)

### Community 4 - "Bridge MQTT Processor"
Cohesion: 0.07
Nodes (35): appendIpHistory(), checkOfflineDevices(), { createClient }, DEVICE_TYPE_MAP, DEVICES, { execSync }, getRpiStatus(), handleSensorData() (+27 more)

### Community 5 - "App Shell & Navigation"
Cohesion: 0.08
Nodes (23): Error(), GlobalError(), AppNav(), clientNavItems, demoNavItems, NavItem, specialNavItems, KittypauErrorScreen() (+15 more)

### Community 6 - "ESP8266 Firmware Core"
Cohesion: 0.08
Nodes (34): BatteryReading, JsonDocument, MqttEvent, appendBatteryTelemetry(), loop(), onMqttEvent(), publishDeviceStatus(), setup() (+26 more)

### Community 7 - "ESP32-CAM Firmware Core"
Cohesion: 0.08
Nodes (20): String, JsonDocument, MqttEvent, appendBatteryTelemetry(), loop(), onMqttEvent(), publishDeviceStatus(), setup() (+12 more)

### Community 8 - "Admin Dashboard Page"
Cohesion: 0.06
Nodes (31): ADMIN_TEST_CATALOG, AdminPermissions, AdminSummary, AdminTestHistoryItem, AdminTestResult, AdminTestRun, AuditEvent, AuditFilter (+23 more)

### Community 9 - "ESP8266 WiFi & LED"
Cohesion: 0.13
Nodes (21): blinkLED(), startWifiBlink(), stopWifiBlink(), addDefaultNetworkUnique(), loadWifiCredentials(), printKnownNetworks(), saveWifiCredentials(), WifiCredential (+13 more)

### Community 10 - "App Build Scripts"
Cohesion: 0.09
Nodes (23): scripts, android:add, android:assets, android:build:debug, android:open, android:sync, build, build-check (+15 more)

### Community 11 - "Bowl Page & Battery"
Cohesion: 0.12
Nodes (14): formatBatterySourceLabel(), ApiDevice, ApiPet, ApiReading, batteryLabel(), BowlPage(), CHART_RANGES, ChartRangeKey (+6 more)

### Community 12 - "Dev Tooling Dependencies"
Cohesion: 0.10
Nodes (21): devDependencies, @capacitor/android, @capacitor/assets, @capacitor/cli, @capacitor/core, eslint, eslint-config-next, eslint-config-prettier (+13 more)

### Community 13 - "Battery & Reading Gaps"
Cohesion: 0.20
Nodes (17): BatterySource, BatteryState, normalizeBatterySource(), normalizeBatteryState(), resolveBatteryState(), computeReadingGapMinutes(), getReadingGapAlertThresholdMinutes(), hasReadingGapExceeded() (+9 more)

### Community 14 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 15 - "Admin Overview Cache"
Cohesion: 0.14
Nodes (15): getAdminOverviewCacheVersion(), getCacheJson(), setCacheJson(), upstashCommand(), AdminObjectStat, fetchVercelUsageSummary(), FinanceMonthlySnapshotRow, FinanceProviderRow (+7 more)

### Community 16 - "Settings & New Device"
Cohesion: 0.11
Nodes (8): AlertVariant, OperationalAction, OperationalActionsCardProps, ApiPet, DEVICE_TYPES, ApiProfile, defaultState, LoadState

### Community 17 - "Pet Page Selection"
Cohesion: 0.16
Nodes (12): ApiDevice, ApiPet, ApiReading, defaultState, formatTimestamp(), LoadState, PetPage(), canUseWindow() (+4 more)

### Community 18 - "Cat Animation Data"
Cohesion: 0.13
Nodes (14): cycle, sleepGapMs, steps, defaults, breathSeconds, poseMult, extraParts, pawBack2 (+6 more)

### Community 19 - "Story Page Timeline"
Cohesion: 0.15
Nodes (11): ApiDevice, ApiPet, ApiSession, applyCustomLimits(), AuditEvent, buildStory(), CategoryPair, defaultState (+3 more)

### Community 20 - "Root Layout & Fonts"
Cohesion: 0.15
Nodes (9): fraunces, geistMono, inter, lato, metadata, RootLayout(), titanOne, viewport (+1 more)

### Community 21 - "ESP32-CAM WiFi Manager"
Cohesion: 0.21
Nodes (11): addDefaultNetworkUnique(), loadWifiCredentials(), printKnownNetworks(), saveWifiCredentials(), WifiCredential, pass, ssid, wifiManagerAddSSID() (+3 more)

### Community 22 - "Chile Timezone Utils"
Cohesion: 0.19
Nodes (11): CHILE_LOCALE, CHILE_TZ, chileFormat(), chileLongDate(), chileShortDate(), chileShortTime(), getChileDayNightWindow(), getChileHour() (+3 more)

### Community 23 - "ESP32-CAM MQTT Manager"
Cohesion: 0.23
Nodes (10): byte, MqttEvent, MqttEventHandler, mqttCallback(), mqttManagerLoop(), mqttManagerPublishSensorData(), mqttManagerPublishStatus(), mqttManagerSetEventHandler() (+2 more)

### Community 24 - "Bridge Package Config"
Cohesion: 0.17
Nodes (11): dependencies, dotenv, mqtt, @supabase/supabase-js, description, main, name, private (+3 more)

### Community 25 - "Registration Flow UI"
Cohesion: 0.17
Nodes (7): AVATAR_OPTIONS, defaultStatus, FieldCardProps, Pet, RegistroFlowProps, RegistroStatus, TooltipIconProps

### Community 26 - "App Runtime Dependencies"
Cohesion: 0.17
Nodes (12): dependencies, @capacitor/local-notifications, chart.js, d3, lucide-react, mqtt, next, react (+4 more)

### Community 27 - "Capacitor Android Config"
Cohesion: 0.18
Nodes (10): android, allowMixedContent, appId, appName, server, allowNavigation, androidScheme, cleartext (+2 more)

### Community 28 - "Day Cycle Chart"
Cohesion: 0.33
Nodes (5): ChartPoint, Props, AuditEvent, RawReading, Session

### Community 29 - "KPCL Cost Catalog"
Cohesion: 0.25
Nodes (7): resolveKpclCatalog(), DEFAULT_KPCL_COST_CATALOG, has3dPrintForKpcl(), KitComponent, KPCL_3D_PRINT_STATUS, KpclCatalog, resolveCatalogKeyByModelAndType()

### Community 30 - "ESP32-CAM Sensor Calibration"
Cohesion: 0.36
Nodes (6): loadCalibrationFactor(), saveCalibrationFactor(), sensorsInit(), sensorsReadAndPublish(), sensorsSetCalibrationFactor(), String

### Community 31 - "Auth Register & Reset"
Cohesion: 0.39
Nodes (3): ResetPasswordPage(), getSupabaseBrowser(), preemptiveClearStaleSession()

### Community 32 - "Trial RPG Dialog Profiles"
Cohesion: 0.38
Nodes (4): TRIAL_RPG_DIALOG_PROFILES, TrialRpgDialogMode, TrialRpgDialogProfile, TrialRpgDialogProps

### Community 33 - "Login & Parallax UI"
Cohesion: 0.48
Nodes (4): ParallaxRoot(), LoginPage(), AppFlavor, isNativeFlavorEnabled()

### Community 34 - "Admin Demo Income"
Cohesion: 0.33
Nodes (3): DemoIngresoItem, DemoIngresoResponseErr, DemoIngresoResponseOk

### Community 36 - "Admin Javo Projects"
Cohesion: 0.47
Nodes (5): AdminJavoPage(), badgeColor(), boolPill(), JAVO_PROJECTS, JavoProject

### Community 37 - "MQTT Live Hook"
Cohesion: 0.40
Nodes (3): LiveReading, useMqttLive(), UseMqttLiveResult

### Community 38 - "Admin Format Helpers"
Cohesion: 0.50
Nodes (4): AdminPage(), formatClp(), formatJpy(), formatLastSeenShort()

### Community 41 - "Capacitor Native Config"
Cohesion: 0.50
Nodes (3): allowedHosts, config, isDev

### Community 42 - "Package Metadata"
Cohesion: 0.50
Nodes (3): name, private, version

### Community 43 - "API Proxy Config"
Cohesion: 0.67
Nodes (3): config, proxy(), withCorsHeaders()

### Community 45 - "MQTT Type Definitions"
Cohesion: 0.50
Nodes (3): MqttClient, MqttClientOptions, MqttMessage

## Ambiguous Edges - Review These
- `MQTT Commands (tare, calibrate) via DEVICE_ID/cmd` → `CALIBRATE_WEIGHT Command (tare / set_scale)`  [AMBIGUOUS]
  iot_firmware/javier_1a/MANUAL_USUARIO_javier.md · relation: conceptually_related_to

## Knowledge Gaps
- **347 isolated node(s):** `appId`, `appName`, `webDir`, `url`, `cleartext` (+342 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `MQTT Commands (tare, calibrate) via DEVICE_ID/cmd` and `CALIBRATE_WEIGHT Command (tare / set_scale)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `apiError()` connect `Admin API Core` to `Chatbot Gato Demo`, `Battery & Reading Gaps`, `Admin Overview Cache`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `chileCompactDatetime()` connect `Story Page Timeline` to `Chatbot Gato Demo`, `Today Page Dashboard`, `Bowl Page & Battery`, `Pet Page Selection`, `Chile Timezone Utils`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `logRequestEnd()` connect `Admin API Core` to `Chatbot Gato Demo`, `Battery & Reading Gaps`, `Admin Overview Cache`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `apiError()` (e.g. with `GET()` and `POST()`) actually correct?**
  _`apiError()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Are the 7 inferred relationships involving `startRequestTimer()` (e.g. with `GET()` and `POST()`) actually correct?**
  _`startRequestTimer()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Are the 7 inferred relationships involving `logRequestEnd()` (e.g. with `GET()` and `POST()`) actually correct?**
  _`logRequestEnd()` has 7 INFERRED edges - model-reasoned connections that need verification._