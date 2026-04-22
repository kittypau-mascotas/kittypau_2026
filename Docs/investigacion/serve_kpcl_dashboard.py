"""Servidor local para el dashboard KPCL con refresh en un click.

Uso:
  python Docs/investigacion/serve_kpcl_dashboard.py

Luego abrir:
  http://127.0.0.1:8765/

Boton "Actualizar CSV + vista" del HTML:
- llama POST /refresh
- actualiza CSV y HTML con la data ms reciente de Supabase
- mantiene etiquetas/categorias ya guardadas en audit_events
"""

from __future__ import annotations

import json
import sys
import threading
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

THIS_DIR = Path(__file__).resolve().parent
if str(THIS_DIR) not in sys.path:
    sys.path.insert(0, str(THIS_DIR))

from plot_kpcl_experimento import OUTPUT_HTML, generate_dashboard


HOST = "127.0.0.1"
PORT = 8765
_LOCK = threading.Lock()


class Handler(BaseHTTPRequestHandler):
    server_versin = "KPCLDashboard/1.0"

    def _send_json(self, payload: dict, status: int = 200) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store, no-cache, must-revlidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_html(self, html_path: Path) -> None:
        if not html_path.exists():
            self.send_error(HTTPStatus.NOT_FOUND, "Dashboard no encontrado")
            return
        data = html_path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Cache-Control", "no-store, no-cache, must-revlidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self) -> None:  # noqa: N802
        try:
            path = urlparse(self.path).path
            if path == "/":
                self._send_html(OUTPUT_HTML)
                return
            if path == "/health":
                self._send_json({"ok": True})
                return
            self.send_error(HTTPStatus.NOT_FOUND, "Ruta no encontrada")
        except Exception as exc:  # pragma: no cover
            self._send_json({"ok": False, "error": str(exc)}, status=500)

    def do_POST(self) -> None:  # noqa: N802
        try:
            path = urlparse(self.path).path
            if path != "/refresh":
                self.send_error(HTTPStatus.NOT_FOUND, "Ruta no encontrada")
                return

            with _LOCK:
                try:
                    generate_dashboard(open_browser=False)
                    self._send_json({"ok": True, "message": "actualizado"})
                except Exception as exc:  # pragma: no cover
                    self._send_json({"ok": False, "error": str(exc)}, status=500)
        except Exception as exc:  # pragma: no cover
            self._send_json({"ok": False, "error": str(exc)}, status=500)


def main() -> None:
    # Generacion inicial para asegurar que exista el HTML antes de servir.
    generate_dashboard(open_browser=False)
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Dashboard KPCL disponible en: http://{HOST}:{PORT}/")
    print("POST /refresh actualiza CSV + HTML con la data ms reciente.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
