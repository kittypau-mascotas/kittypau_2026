from __future__ import annotations

import argparse
import sys
from pathlib import Path


TEXT_EXTENSIONS = {
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
    ".md",
    ".css",
    ".scss",
    ".html",
    ".txt",
    ".yml",
    ".yaml",
    ".mjs",
    ".cjs",
    ".sql",
    ".ps1",
    ".py",
    ".sh",
}

SKIP_PARTS = {
    "node_modules",
    ".next",
    ".git",
    "archive",
    "kittypau_1a_docs_legacy",
    "capacitor_www",
    ".vercel",
}

SKIP_PATH_FRAGMENTS = (
    "android/app/build",
    "android/build",
)

SUSPICIOUS_SUBSTRINGS = (
    "Ã¡",
    "Ã©",
    "Ã­",
    "Ã³",
    "Ãº",
    "Ã±",
    "Ã‘",
    "Â¿",
    "Â¡",
    "Â°",
    "â€”",
    "â€“",
    "â€œ",
    "â€\x9d",
    "â€\x9c",
    "â€¦",
    "â†’",
    "âœ",
    "\ufffd",
    "sesi?n",
    "gu?a",
    "gu?e",
    "m?scota",
    "m?dulo",
    "versi?n",
    "operaci?n",
    "alimentaci?n",
    "hidrataci?n",
    "bater?a",
)

DEFAULT_TARGETS = (
    "Docs",
    "kittypau_app/src",
    "kittypau_app/README.md",
    "kittypau_app/package.json",
    "kittypau_app/tsconfig.json",
    "kittypau_app/next.config.ts",
    "kittypau_app/eslint.config.mjs",
    "kittypau_app/capacitor.config.ts",
    "kittypau_app/postcss.config.mjs",
)


def should_skip(path: Path) -> bool:
    rel = path.as_posix()
    if any(part in SKIP_PARTS for part in path.parts):
        return True
    return any(fragment in rel for fragment in SKIP_PATH_FRAGMENTS)


def iter_text_files(target: Path):
    if target.is_file():
        if target.suffix.lower() in TEXT_EXTENSIONS and not should_skip(target):
            yield target
        return
    for path in target.rglob("*"):
        if path.is_file() and path.suffix.lower() in TEXT_EXTENSIONS and not should_skip(path):
            yield path


def collect_issues(root: Path, targets: list[str]) -> list[tuple[str, str]]:
    issues: list[tuple[str, str]] = []
    seen: set[Path] = set()
    for raw_target in targets:
        target = (root / raw_target).resolve()
        if not target.exists():
            continue
        for path in iter_text_files(target):
            resolved = path.resolve()
            if resolved in seen:
                continue
            seen.add(resolved)
            rel = path.relative_to(root).as_posix()
            try:
                text = path.read_text(encoding="utf-8")
            except UnicodeDecodeError as exc:
                issues.append((rel, f"non-utf8: {exc}"))
                continue
            for token in SUSPICIOUS_SUBSTRINGS:
                if token in text:
                    issues.append((rel, f"suspicious token: {token!r}"))
                    break
    return issues


def main() -> int:
    parser = argparse.ArgumentParser(description="Check repository text files for encoding issues.")
    parser.add_argument("targets", nargs="*", help="Optional paths to scan relative to repo root.")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    targets = args.targets or list(DEFAULT_TARGETS)
    issues = collect_issues(repo_root, targets)

    if issues:
        print("Encoding check failed. Suspicious files detected:")
        for rel, reason in issues:
            print(f"- {rel}: {reason}")
        return 1

    print("Encoding check OK.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
