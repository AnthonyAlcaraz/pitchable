# Plan 02-04 Summary: Frontend KB Management Page

## Status: COMPLETE

## What was built
- **KnowledgeBasePage** — Two-column layout: upload/text-input left, search/document-list right
- **FileUploadZone** — react-dropzone with drag-and-drop, accepts PDF/DOCX/MD/TXT, 20MB limit, loading state
- **DocumentList** — Document rows with source icon, file size, chunk count, status badge, delete button, empty state
- **DocumentStatusBadge** — Colored badges: blue (UPLOADED), yellow-pulse (PARSING), purple-pulse (EMBEDDING), green (READY), red (ERROR)
- **TextUrlInput** — Toggle text/URL mode, optional title, submit with loading state
- **useKbStore** — Zustand store: fetchDocuments, uploadFile, createTextSource, createUrlSource, deleteDocument, search, clearSearch
- **API client uploadFile** — FormData multipart upload with auth and token refresh
- **Auto-polling** — Refreshes document list every 3s while any document is processing
- **DeckPilot renamed to Pitchable** in sidebar, mobile header, dashboard page

## Files created
- `apps/web/src/pages/KnowledgeBasePage.tsx`
- `apps/web/src/components/knowledge-base/FileUploadZone.tsx`
- `apps/web/src/components/knowledge-base/DocumentList.tsx`
- `apps/web/src/components/knowledge-base/DocumentStatusBadge.tsx`
- `apps/web/src/components/knowledge-base/TextUrlInput.tsx`
- `apps/web/src/stores/kb.store.ts`

## Files modified
- `apps/web/src/lib/api.ts` — Added uploadFile method
- `apps/web/src/App.tsx` — Added /knowledge-base route
- `apps/web/src/components/layout/AppLayout.tsx` — Added KB nav item, BookOpen icon, DeckPilot→Pitchable
- `apps/web/src/pages/DashboardPage.tsx` — DeckPilot→Pitchable

## Dependencies added
- `react-dropzone@^15.0.0`

## Verification
- TypeScript: 0 errors (`npx tsc --noEmit`)
- 4 components in knowledge-base/
- Route /knowledge-base in App.tsx
- Sidebar nav includes Knowledge Base between Dashboard and Settings
