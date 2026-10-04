# ForensicLens Architectural Decisions

## 1. Local-First & Privacy First
Digital forensic evidence often includes highly sensitive PII, system credentials, or proprietary files. ForensicLens processes all evidence locally in the user's client environment (IndexedDB / Web Workers in PWA mode, or filesystem in Tauri native mode). No remote server transfers take place during evidence processing.

## 2. Evidence Provenance & Chain of Custody
All domain models are structured around traceability back to source evidence items:

```text
Artifact (e.g. Browser History URL Record)
  ↓
Source File (e.g. History sqlite db)
  ↓
Evidence Item (e.g. Chrome_User_Data.zip)
  ↓
Case (e.g. CASE-2026-001)
```

## 3. Filesystem Abstraction Layer
To enable seamless migration to **Tauri** desktop native execution without refactoring UI components or domain repositories, file access operations are routed through `src/services/filesystem/index.ts`.
- **PWA Mode**: Implements `BrowserFileSystemService` using `File` & `ArrayBuffer`.
- **Tauri Mode (Future)**: Will implement `TauriFileSystemService` interfacing with native Rust APIs for streaming large raw disk images (`.raw`, `.dd`, `.E01`).

## 4. Separation of Concerns
- **UI Components**: Pure presentation, layout, and user interaction.
- **Zustand Stores**: Lightweight application UI state (active case context, sidebar state, global search open status).
- **Repositories**: Pure data access functions encapsulating IndexedDB / Dexie operations.
- **Domain Logic / Workers**: Isolated background worker threads for resource-intensive forensic hashing and analysis.
