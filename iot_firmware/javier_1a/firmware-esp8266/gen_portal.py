"""Genera captive_portal.cpp con logo KittyPau en base64 + toggle contraseña."""
import base64, os

with open("c:/Kittypau/GitHub_KP/kittypau_2026/kittypau_app/public/logo_carga.jpg", "rb") as f:
    logo_b64 = base64.b64encode(f.read()).decode("ascii")

OUT = open(
    "c:/Kittypau/GitHub_KP/kittypau_2026/iot_firmware/javier_1a/firmware-esp8266/src/captive_portal.cpp",
    "w", encoding="utf-8"
)

OUT.write(r"""// captive_portal.cpp
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

""")

# PORTAL_IMG como raw string literal (las comillas dentro son literales)
OUT.write(f'// Logo en PROGMEM separado (14 KB en flash, no en heap)\n')
OUT.write(f'static const char PORTAL_IMG[] PROGMEM = R"kp2(    <img src="data:image/jpeg;base64,{logo_b64}" alt="KittyPau">)kp2";\n')
OUT.write('\n')

OUT.write(r"""
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
""")

OUT.close()
print("OK — archivo generado.")
print(f"Logo b64: {len(logo_b64)} chars")
