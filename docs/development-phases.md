# ForensicLens Development Roadmap

## Phase 1 — Project Foundation & Case Shell [COMPLETED]
- React + TypeScript + Vite + Tailwind CSS foundation.
- Desktop forensic workstation UI layout (Header, Collapsible Sidebar, Breadcrumbs).
- Case Management (Create case, list, filter, deterministic `CASE-2026-001` ID generation).
- Evidence Management (Drag & drop file import, metadata drawer, bookmarking).
- Local IndexedDB persistence via Dexie.js.
- Immutable Audit Event Logging foundation.
- Realistic Demo Investigation loader.
- Filesystem abstraction layer.
- PWA manifest & offline caching setup via `vite-plugin-pwa`.

## Phase 2 — Hashing & Chain of Custody (Next Phase)
- Web Worker multi-threaded hashing engine (SHA-256 / MD5).
- Hash verification & integrity checks.

## Phase 3 — Image Forensics & EXIF Analysis
- EXIF & IPTC metadata parser.
- GPS coordinate extraction & offline map visualization.
- Perceptual Hashing (pHash) for image similarity search.

## Phase 4 — Browser Artifact Analysis
- History, Cookies, and Downloads parser for Chromium (Chrome, Edge) & Firefox.
- Domain frequency & search query extraction.

## Phase 5 — Unified Timeline & Correlation Engine
- Cross-artifact chronological correlation.
- Global forensic search (Regex / Keyword searching across files & browser artifacts).

## Phase 6 — Forensic Reporting
- PDF / HTML report generator with evidence hash verification tables.

## Phase 7 — Tauri Desktop Packaging
- Rust desktop shell integration with direct OS filesystem access.
