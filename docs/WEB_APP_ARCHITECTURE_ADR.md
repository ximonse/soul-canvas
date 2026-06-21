# ADR: Future Web App Architecture

Datum: 2026-06-21  
Status: Proposed after stable local v1  
Beslut: bygg inte webbappen innan lokal guldversion ar stabil.

## Kontext

Soul Canvas ar i dag en Vite/React/Konva-app som anvander Chrome File System Access API for `data.json` och `assets/`. Det passar lokal-first, men ar inte tillrackligt for en publik webbapp, mobil/surfplatta eller saker server-side AI.

Malbilden efter lokal guldversion:

- Privat publik webbapp for Simon.
- Inloggning.
- Server-side AI-nycklar.
- Databas + blob storage.
- Exportbar datakärna sa anvandaren inte blir inlast.
- Mojlig senare runtime via Tailscale/SSH med lokal filbaserad server.

Wandering/trails och gravity/physics controls ska inte folja med till webb-v1. De ar separata framtida experiment om de far en ny design.

## Beslut

Webbappen ska byggas runt en tydlig storage/runtime-grans, inte genom att sprida serverlogik direkt i canvas-komponenterna.

### Canonical document

Inför `CanvasDocumentV1` som gemensamt wire/export-format:

- nodes
- synapses
- sessions
- sequences
- conversations
- active document state
- asset manifest
- schema version

Dagens `data.json` migreras till detta format med bakatkompatibel parser. Befintlig trail-data far exporteras/importeras som legacy/experimental metadata, men ska inte vara krav for webb-v1.

### StorageAdapter

Frontendens app-kärna ska prata med ett adapterkontrakt:

- `listWorkspaces()`
- `loadDocument(workspaceId)`
- `saveDocument(workspaceId, document)`
- `uploadAsset(workspaceId, file, metadata)`
- `resolveAssetUrl(assetKey)`
- `exportWorkspace(workspaceId)`
- `importWorkspace(fileOrArchive)`

Adapterimplementationer:

- `fileSystemStorageAdapter` for lokal guldversion.
- `httpStorageAdapter` for webbappen.
- Senare `localServerStorageAdapter` for SSH/Tailscale-runtime.

### Webb-runtime

Rekommenderad stack:

- Next.js App Router.
- Clerk for privat auth.
- Neon Postgres for workspace metadata och dokument JSONB.
- Vercel Blob for assets/PDF-bilder/original.
- Server routes for AI.

Canvas/Konva ska vara en client-only island. Server Components ska anvandas for auth, shell och initial data, inte for canvasrendering.

## Data Och Lagring

### V1 databasmodell

Hall v1 enkel:

- `workspaces`
  - id
  - ownerUserId
  - name
  - documentJson
  - createdAt
  - updatedAt
  - schemaVersion
- `workspace_revisions`
  - id
  - workspaceId
  - documentJson
  - createdAt
  - reason
- `assets`
  - id
  - workspaceId
  - assetKey
  - blobUrl/blobPath
  - contentType
  - size
  - checksum
  - createdAt

Full normalisering av nodes/synapses skjuts upp. JSONB minskar migrationsrisk och bevarar exportbarhet.

### Asset policy

- Asset keys ska vara stabila och dokumentrelativa.
- Blob URLs ska inte sparas som canonical node content.
- Privat material ska inte bli publikt atkomligt utan auth.
- Missing assets ska kunna rapporteras i UI.

## AI

Webbappen ska inte anvanda browser-exponerade provider-klienter.

AI routes:

- OCR
- tags
- title
- summary
- reflection
- embeddings
- semantic search helper
- chat
- smart markdown import

Servern laser provider keys fran environment variables.

Frontend anropar en intern `AIClient`:

- Lokal adapter kan fortfarande anvanda nuvarande browser-key modell om vi vill.
- Webb adapter ska alltid anvanda server-side routes.
- AI-arrangering ska bara exponeras om den ar verifierbar. V1 far anropa deterministiska layoutfunktioner pa markerade kort, men ska inte marknadsforas som semantisk sortering utan explicit urval och testbar effekt.

## Auth Och Säkerhet

- Alla workspace/API-rutter maste verifiera user server-side.
- Middleware/proxy far bara vara for routing/skyddslager, inte enda auth-kontroll.
- Workspace id ska aldrig ge data utan owner check.
- AI-rutter ska rate-limitas eller atminstone skyddas per inloggad anvandare.
- Export/import ska raknas som kanslig dataoverforing.

## Migration Från Lokal V1

Migration ska vara explicit:

1. Lokal app exporterar workspace archive.
2. Webbapp importerar archive.
3. Importen validerar schema och assets.
4. Webbapp skapar workspace + blob assets.
5. Export fran webbapp ska kunna oppnas av lokal adapter igen.

Detta ar ett krav for att behalla lokal aganderatt.

## Remote-Local Runtime Senare

Nar `StorageAdapter` finns kan samma frontend koras mot en lokal Node-server:

- Servern ligger pa `bigboy` eller annan maskin.
- Atkomst via Tailscale/SSH tunnel.
- Servern laser/skriver `data.json` och `assets`.
- AI-nycklar ligger pa servern, inte i browsern.

Detta ska inte byggas fore lokal guldversion, men adaptergransen ska gora det mojligt utan ny rewrite.

## Alternativ Som Valdes Bort

### Direkt rewrite till SaaS

Avvisat for v1. For mycket risk och for manga oklara produktbeslut.

### Behalla Vite och bara lagga pa backend

Mojligt for remote-local, men svagare for publik Vercel-webbapp med auth, server routes och storage.

### Full normaliserad graph-databas direkt

Avvisat for v1. Det kan bli ratt senare, men JSONB dokumentmodell bevarar dagens fungerande arbetsmodell och gor migration enklare.

## Startvillkor För Webbapp

Webbappsarbetet far starta nar:

- `FEATURE_AUDIT.md` ar genomgatt och besluten accepterade.
- Lokal v1 har passerat stable QA.
- Export/import roundtrip finns.
- `CanvasDocumentV1` och `StorageAdapter` ar implementerade lokalt.
- AI-funktioner ar separerade fran provider-SDK-anrop i UI-floden eller har en tydlig adapterplan.
- Wandering/trails och gravity/layout ar isolerade bakom default-off feature flags i lokal app och kravs inte av canvasens karnflode.
