// captive_portal.cpp
// Portal cautivo KittyPau — ESP8266WebServer + DNSServer (modo AP, sin TLS)
#include "captive_portal.h"
#include "led_indicator.h"
#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <DNSServer.h>
#include <LittleFS.h>
#include <ArduinoJson.h>

#define PORTAL_TIMEOUT_MS 300000UL
#define PORTAL_AP_CHANNEL  6
#define PORTAL_IP_STR      "192.168.4.1"

// ── HTML parte 1: cabecera + logo + formulario hasta el SSID del dispositivo ──
static const char PORTAL_P1[] PROGMEM = R"kp(<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>KittyPau - Configurar WiFi</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
     background:#fdf4ff;min-height:100vh;display:flex;
     align-items:center;justify-content:center;padding:16px}
.card{background:#fff;border-radius:20px;padding:32px 28px;max-width:360px;
      width:100%;box-shadow:0 8px 32px rgba(168,85,247,.12)}
.logo{text-align:center;margin-bottom:16px}
.logo img{width:88px;height:88px;border-radius:50%;object-fit:cover;
          box-shadow:0 4px 16px rgba(168,85,247,.2)}
h1{font-size:22px;font-weight:800;color:#1e293b;text-align:center;margin-bottom:4px}
.sub{font-size:14px;color:#64748b;text-align:center;margin-bottom:28px}
label{font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:5px}
input[type=text],input[type=password]{width:100%;padding:11px 14px;
  border:1.5px solid #e2e8f0;border-radius:10px;font-size:15px;
  outline:none;background:#f8fafc}
input:focus{border-color:#c084fc;background:#fff}
.f-group{margin-bottom:18px}
.pw-wrap{position:relative}
.pw-wrap input{padding-right:46px}
.eye-btn{position:absolute;right:12px;top:50%;transform:translateY(-50%);
         background:none;border:none;cursor:pointer;padding:4px;
         color:#94a3b8;display:flex;align-items:center;width:auto}
.eye-btn:active{opacity:.6}
.submit-btn{width:100%;padding:13px;margin-top:4px;
            background:linear-gradient(135deg,#f472b6,#c084fc);
            color:#fff;font-size:16px;font-weight:700;border:none;
            border-radius:12px;cursor:pointer;letter-spacing:.3px}
.submit-btn:active{opacity:.88}
.device{font-size:11px;color:#94a3b8;text-align:center;margin-top:20px}
</style>
</head>
<body>
<div class="card">
  <div class="logo">
)kp";

// Logo en PROGMEM separado (14 KB en flash, no en heap)
static const char PORTAL_IMG[] PROGMEM = R"kp2(    <img src="data:image/jpeg;base64,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" alt="KittyPau">)kp2";


static const char PORTAL_P2[] PROGMEM = R"kp(  </div>
  <h1>KittyPau</h1>
  <p class="sub">Conecta tu comedero a tu red WiFi</p>
  <form method="POST" action="/save">
    <div class="f-group">
      <label>Nombre de red (SSID)</label>
      <input type="text" name="ssid" placeholder="Mi red WiFi"
             required autocomplete="off" autocorrect="off" autocapitalize="none">
    </div>
    <div class="f-group">
      <label>Contrase&ntilde;a</label>
      <div class="pw-wrap">
        <input type="password" name="pass" id="pass"
               placeholder="Contrase&ntilde;a" autocomplete="off">
        <button type="button" class="eye-btn" onclick="togglePass()">
          <svg id="eye-show" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
               width="20" height="20">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <svg id="eye-hide" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
               width="20" height="20" style="display:none">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        </button>
      </div>
    </div>
    <button type="submit" class="submit-btn">Conectar</button>
  </form>
  <div class="device">Dispositivo:&nbsp;)kp";

static const char PORTAL_P3[] PROGMEM = R"kp(</div>
</div>
<script>
function togglePass(){
  var i=document.getElementById('pass');
  var s=document.getElementById('eye-show');
  var h=document.getElementById('eye-hide');
  if(i.type==='password'){
    i.type='text';s.style.display='none';h.style.display='block';
  } else {
    i.type='password';s.style.display='block';h.style.display='none';
  }
}
</script>
</body>
</html>)kp";

// ── Página de confirmación ─────────────────────────────────────────────────────
static const char PORTAL_OK_HTML[] PROGMEM = R"kp(<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>KittyPau</title>
<style>
body{font-family:-apple-system,sans-serif;background:#f0fdf4;display:flex;
     align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{background:#fff;border-radius:20px;padding:36px 28px;text-align:center;
      max-width:320px;box-shadow:0 8px 32px rgba(22,163,74,.1)}
.icon{font-size:56px;margin-bottom:12px}
h1{color:#16a34a;font-size:22px;font-weight:800;margin-bottom:8px}
p{color:#64748b;font-size:14px;line-height:1.6}
</style>
</head>
<body>
<div class="card">
  <div class="icon">&#x2705;</div>
  <h1>&#xA1;Listo!</h1>
  <p>Credenciales guardadas.<br>
     El dispositivo se reiniciar&aacute; y conectar&aacute; a tu red.</p>
</div>
</body>
</html>)kp";

// ─────────────────────────────────────────────────────────────────────────────
void startCaptivePortal(const char* deviceId) {
    Serial.println(F("[Portal] No se encontro red conocida."));
    Serial.println(F("[Portal] Iniciando portal cautivo KittyPau..."));

    WiFi.disconnect(true);
    WiFi.mode(WIFI_AP);
    delay(100);

    String apSSID = String(F("AIoTChile-")) + deviceId;
    WiFi.softAP(apSSID.c_str(), nullptr, PORTAL_AP_CHANNEL);
    delay(500);

    IPAddress apIP(192, 168, 4, 1);
    Serial.print(F("[Portal] AP: "));
    Serial.print(apSSID);
    Serial.print(F("  IP: "));
    Serial.println(apIP);

    startPortalBlink();  // patrón -.. mientras el portal está activo

    DNSServer dnsServer;
    dnsServer.setErrorReplyCode(DNSReplyCode::NoError);
    dnsServer.start(53, "*", apIP);

    ESP8266WebServer server(80);

    // GET / — chunked, directo desde PROGMEM (sin heap allocation)
    server.on(F("/"), HTTP_GET, [&]() {
        server.setContentLength(CONTENT_LENGTH_UNKNOWN);
        server.send(200, F("text/html"), F(""));
        server.sendContent_P(PORTAL_P1);
        server.sendContent_P(PORTAL_IMG);
        server.sendContent_P(PORTAL_P2);
        server.sendContent(deviceId);
        server.sendContent_P(PORTAL_P3);
    });

    auto redirectHome = [&]() {
        server.sendHeader(F("Location"), F("http://" PORTAL_IP_STR "/"));
        server.send(302, F("text/plain"), F(""));
    };
    server.on(F("/generate_204"),        HTTP_GET, redirectHome);
    server.on(F("/hotspot-detect.html"), HTTP_GET, redirectHome);
    server.on(F("/ncsi.txt"),            HTTP_GET, redirectHome);
    server.on(F("/fwlink"),              HTTP_GET, redirectHome);
    server.onNotFound(redirectHome);

    server.on(F("/save"), HTTP_POST, [&]() {
        String ssid = server.arg(F("ssid"));
        String pass = server.arg(F("pass"));
        ssid.trim();
        pass.trim();

        if (ssid.length() == 0) {
            server.sendHeader(F("Location"), F("/"));
            server.send(302, F("text/plain"), F(""));
            return;
        }

        DynamicJsonDocument doc(512);
        JsonArray arr = doc.to<JsonArray>();
        JsonObject newNet = arr.createNestedObject();
        newNet[F("ssid")] = ssid;
        newNet[F("pass")] = pass;

        if (LittleFS.exists(F("/wifi.json"))) {
            File f = LittleFS.open(F("/wifi.json"), "r");
            if (f) {
                DynamicJsonDocument prev(512);
                if (!deserializeJson(prev, f)) {
                    for (JsonObject obj : prev.as<JsonArray>()) {
                        String existSSID = obj[F("ssid")].as<String>();
                        if (!existSSID.equalsIgnoreCase(ssid)) {
                            JsonObject merged = arr.createNestedObject();
                            merged[F("ssid")] = obj[F("ssid")];
                            merged[F("pass")] = obj[F("pass")];
                        }
                    }
                }
                f.close();
            }
        }

        File wf = LittleFS.open(F("/wifi.json"), "w");
        if (wf) { serializeJson(doc, wf); wf.close(); }

        File lf = LittleFS.open(F("/last_wifi.txt"), "w");
        if (lf) { lf.print(ssid); lf.close(); }

        Serial.print(F("[Portal] Credenciales guardadas -> SSID: "));
        Serial.println(ssid);

        server.send(200, F("text/html"), FPSTR(PORTAL_OK_HTML));
        delay(2500);
        ESP.restart();
    });

    server.begin();
    Serial.println(F("[Portal] Servidor HTTP listo. Esperando configuracion..."));

    unsigned long startedAt = millis();
    while (millis() - startedAt < PORTAL_TIMEOUT_MS) {
        dnsServer.processNextRequest();
        server.handleClient();
        handleLedIndicator();
        yield();
    }

    Serial.println(F("[Portal] Timeout (5 min). Reiniciando..."));
    ESP.restart();
}
