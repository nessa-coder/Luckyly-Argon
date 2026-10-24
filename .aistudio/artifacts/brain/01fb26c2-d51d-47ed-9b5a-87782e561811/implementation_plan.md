# Implementation Plan: Google Drive Code Sync Agent

Build an intelligent code synchronization agent that reads code files from a dedicated Google Drive folder, compares them against the local codebase, and updates the application safely.

---

## 1. Architectural Overview & Workflow

```
[ Google Drive Folder ] 
      │ (Drive v3 API - files.list / files.get)
      ▼
[ Google Drive Sync Agent (Server-Side) ]
      ├── 1. Discovers and validates files in target folder
      ├── 2. Filters code extensions (.ts, .tsx, .json, .css, .html, etc.)
      ├── 3. Performs security checks (blocks path traversal ../)
      ├── 4. Downloads content and writes to local repository
      └── 5. Triggers build validation and returns sync audit log
```

---

## 2. Trigger Options for the Agent

We will support three flexible trigger methods so you can use whichever best fits your workflow:

1. **Option A: In-App Admin Sync Modal (Visual & Interactive)**
   - An intuitive "Google Drive Sync" panel accessible from the app interface.
   - Displays connected Google account status, target Drive folder name/ID, and a "Scan & Sync Now" button.
   - Shows live progress, file diff counts, and an audit list of all updated files.

2. **Option B: Server API & Webhook Endpoint (`POST /api/drive/sync-code`)**
   - Protected endpoint on the Express server (`/api/drive/sync-code`).
   - Can be triggered programmatically via `curl`, GitHub Actions, Google Cloud Scheduler, or Google Drive push webhooks whenever files change in Drive.

3. **Option C: CLI Script / Background Runner (`npm run sync:drive`)**
   - A command-line script (`scripts/syncFromDrive.ts`) that can be run on-demand or as a background service to poll the Drive folder.

---

## 3. Core Capabilities & Safety Guards

- **Recursive Folder Traversal**:
  - Recursively scans subdirectories inside the designated Google Drive folder (e.g., `src/`, `components/`, etc.) and mirrors the exact directory structure locally.
- **Path Sanitization & Security**:
  - Restricts file writes strictly within the project root directory.
  - Automatically ignores sensitive files (`.env`, `.git/`, `node_modules/`).
- **Audit & Rollback**:
  - Logs every file created or modified with timestamps and sizes.
  - Keeps a snapshot of overwritten files so changes can be reverted if needed.
- **Verification**:
  - Runs automatic TypeScript/linter checks after syncing to ensure code compiles cleanly without breaking the dev server.

---

## 4. Proposed Next Steps
Upon your approval, we will:
1. Build the server-side Drive Sync Engine (`server/driveSyncAgent.ts` & `/api/drive/sync-code`).
2. Implement the in-app interactive trigger modal (`src/components/DriveCodeSyncModal.tsx`).
3. Add the CLI runner (`npm run sync:drive`).
4. Add automated unit and integration tests to ensure reliable, safe synchronization.
