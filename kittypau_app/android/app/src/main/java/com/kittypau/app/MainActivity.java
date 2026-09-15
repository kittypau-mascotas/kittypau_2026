package com.kittypau.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    // Knowledge/29_Specs/010-widget-android-hero User Story 3 (FR-011):
    // tocar el widget abre la app directo en /today de esa mascota, o en el
    // login si la sesión no es válida. `singleTask` ya está declarado en
    // AndroidManifest.xml -- MainActivity solo tiene una instancia viva, así
    // que un tap con la app ya abierta llega por onNewIntent(), no onCreate().
    public static final String EXTRA_TARGET_PATH = "com.kittypau.app.EXTRA_TARGET_PATH";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin propio del widget de Android (contracts/widget-pin-plugin.md)
        // -- vive directo en este módulo, no es un paquete de Capacitor
        // publicado aparte, así que necesita registro manual (no lo cubre el
        // auto-discovery de plugins instalados via npm). Debe ir ANTES de
        // super.onCreate().
        registerPlugin(KittypauWidgetPlugin.class);
        super.onCreate(savedInstanceState);
        navigateFromIntentIfAny(getIntent());
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        navigateFromIntentIfAny(intent);
    }

    // Mismo dominio que capacitor.config.ts (appServerUrl) / WidgetRefreshWorker.API_BASE_URL.
    private static final String SERVER_ORIGIN = "https://kittypau-app.vercel.app";

    // ⚠️ No compilado en este entorno (research.md Decisión 0 de
    // Knowledge/29_Specs/010-widget-android-hero) -- lo menos verificable sin
    // un dispositivo real: confirmar que `getBridge().getWebView().loadUrl(...)`
    // navega la SPA (Next.js) al path pedido sin romper la sesión ya cargada
    // en el WebView; si el comportamiento real difiere, es el punto exacto a
    // ajustar (tasks.md T024).
    private void navigateFromIntentIfAny(Intent intent) {
        if (intent == null) return;
        String path = intent.getStringExtra(EXTRA_TARGET_PATH);
        if (path == null || path.isEmpty()) return;
        if (getBridge() == null || getBridge().getWebView() == null) return;
        getBridge().getWebView().loadUrl(SERVER_ORIGIN + path);
    }
}
