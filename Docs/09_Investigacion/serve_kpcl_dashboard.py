"""Servidor local para el dashboard KPCL con refresh y sync automaticos."""

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
TRACE_LOG = THIS_DIR / "kpcl_server_trace.log"


def _trace(message: str) -> None:
    try:
        with TRACE_LOG.open("a", encoding="utf-8") as handle:
            handle.write(message + "\n")
    except OSError:
        pass


class Handler(BaseHTTPRequestHandler):
    server_version = "KPCLDashboard/2.0"

    def _send_json(self, payload: dict, status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
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
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _read_json_body(self) -> dict:
        raw_len = self.headers.get("Content-Length", "0")
        try:
            length = int(raw_len)
        except ValueError:
            length = 0
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        if not raw:
            return {}
        payload = json.loads(raw.decode("utf-8"))
        if isinstance(payload, dict):
            return payload
        if isinstance(payload, list):
            return {"events": payload}
        raise ValueError("JSON body must be an object or list")

    def do_GET(self) -> None:  # noqa: N802
        try:
            path = urlparse(self.path).path
            _trace(f"GET {self.path}")
            if path == "/":
                # Servimos el HTML ya generado para abrir rapido; el cliente
                # hace autoload y el boton de refresh recompone la data fresca.
                if not OUTPUT_HTML.exists():
                    with _LOCK:
                        generate_dashboard(open_browser=False)
                self._send_html(OUTPUT_HTML)
                return
            if path == "/health":
                self._send_json({"ok": True})
                return
            if path == "/favicon.ico":
                self.send_response(HTTPStatus.NO_CONTENT)
                self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
                self.send_header("Pragma", "no-cache")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            self.send_error(HTTPStatus.NOT_FOUND, "Ruta no encontrada")
        except Exception as exc:  # pragma: no cover
            _trace(f"GET ERROR {self.path}: {exc!r}")
            self._send_json({"ok": False, "error": str(exc)}, status=500)

    def do_POST(self) -> None:  # noqa: N802
        try:
            path = urlparse(self.path).path
            if path == "/refresh":
                with _LOCK:
                    generate_dashboard(open_browser=False)
                self._send_json({"ok": True, "message": "actualizado"})
                return

            self.send_error(HTTPStatus.NOT_FOUND, "Ruta no encontrada")
        except Exception as exc:  # pragma: no cover
            self._send_json({"ok": False, "error": str(exc)}, status=500)


def main() -> None:
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    _trace("SERVER START")
    print(f"Dashboard KPCL disponible en: http://{HOST}:{PORT}/")
    print("Lanzador rapido: .\\Docs\\investigacion\\abrir_kpcl_dashboard.ps1")
    print("GET / sirve la vista generada; autoload refresca al abrir.")
    print("POST /refresh actualiza CSV + HTML con la data mas reciente.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
