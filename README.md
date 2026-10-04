# ForensicLens — Digital Forensics Investigation Workstation

ForensicLens is a production-style digital forensics investigation application inspired by professional forensic tools (such as Autopsy), designed with a local-first architecture for web and desktop (Tauri).

## Features (Phase 1 Foundation)

- **Local-First Processing**: Built around IndexedDB (via Dexie) so sensitive evidence never leaves the local environment by default.
- **Evidence Provenance & Chain of Custody**: Data modeling linking Artifact &rarr; Source File &rarr; Evidence Item &rarr; Case.
- **Desktop Forensic Workstation Aesthetic**: Professional light UI tuned for technical investigation density.
- **Case & Evidence Management**: Create cases with deterministic IDs (`CASE-2026-001`), drag & drop file imports, filter, bookmark, and track evidence details.
- **Audit Event Logging**: Immutable logging for key case actions and evidence provenance.
- **Filesystem Abstraction Layer**: Keeps core domain logic decoupled from browser vs. native desktop (Tauri) file handling.
- **PWA Ready**: Offline caching shell powered by `vite-plugin-pwa`.

## Tech Stack

- **Framework**: React 19 + TypeScript (Strict Mode)
- **Build Tool**: Vite 8
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Database / Persistence**: Dexie.js (IndexedDB)
- **Icons**: Lucide React
- **PWA**: vite-plugin-pwa

## Project Architecture

```text
forensic-lens/
├── src/
│   ├── app/            # Application entry, router, providers
│   ├── components/     # Layout, navigation, common UI elements
│   ├── pages/          # Page views (Dashboard, Cases, Evidence, Placeholders)
│   ├── services/       # Repositories & Filesystem abstraction layer
│   ├── stores/         # Zustand global stores (case, sidebar, ui)
│   ├── types/          # Strict TypeScript interfaces (Case, Evidence, AuditLog)
│   ├── utils/          # Formatters & demo data loader
│   ├── db/             # IndexedDB / Dexie schema
│   ├── main.tsx        # React entry
│   └── index.css       # Tailwind & workstation styles
├── src-tauri/          # Placeholder folder for future Tauri native wrapper
├── docs/               # Architecture and roadmap documentation
├── vite.config.ts      # Vite & PWA configuration
└── tsconfig.app.json   # Strict TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm

### Installation & Development

```bash
# Clone repository and navigate to folder
cd forensic-lens

# Install dependencies
npm install

# Start development server
npm run dev
```

Open `http://localhost:5173` in your browser.

### Building for Production

```bash
npm run build
```

## Phase 1 Scope & Verification

1. Open ForensicLens
2. Click **Load Demo Investigation** in the header to seed `CASE-2026-001` with sample evidence records.
3. Create new cases via the **Case Management** tab.
4. Drag & drop local files into **Evidence Management** tab.
5. Reload the page — all cases and evidence persist reliably in IndexedDB.

---

## Future Roadmap

- **Phase 2**: Multi-threaded File Hashing (SHA-256 / MD5 Web Workers).
- **Phase 3**: Image Forensics (EXIF extraction, GPS map plotting, perceptual hashing / pHash).
- **Phase 4**: Browser Analysis (Chrome, Edge, Firefox history & cache artifact parser).
- **Phase 5**: Unified Investigation Timeline & Keyword Search.
- **Phase 6**: PDF / HTML Forensic Report Generator.
- **Phase 7**: Tauri Desktop Packaging (Windows Native App).
