# Web Realtime Room Frontend Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `frontend/` に `Cognito + room-centered realtime call UI` の最小実装を作る。

**Architecture:** `Vite + React` SPA を `TanStack Router` で組み、API 状態は `TanStack Query`、通話 UI 状態は `Zustand`、副作用は `Call Controller / Media Layer` に閉じる。画面は `RoomScene` 中心で組み、`1対1` も `12人以上` も `participants[]` で扱う。

**Tech Stack:** `Vite`, `React`, `TypeScript`, `TanStack Router`, `TanStack Query`, `Zustand`, `shadcn/ui`, `Vitest`, `Testing Library`

---

## File Map

- `frontend/package.json`: app scripts, deps
- `frontend/vite.config.ts`: Vite + TanStack Router plugin
- `frontend/tsconfig.json`: TS config
- `frontend/index.html`: SPA entry
- `frontend/src/main.tsx`: app bootstrap
- `frontend/src/styles/index.css`: tokens + app styles
- `frontend/src/app/providers.tsx`: Query/Router/providers
- `frontend/src/app/router.tsx`: router wiring
- `frontend/src/routes/__root.tsx`: root layout + outlet
- `frontend/src/routes/login.tsx`: login route
- `frontend/src/routes/auth/callback.tsx`: Cognito callback route
- `frontend/src/routes/rooms/$roomId.tsx`: room route
- `frontend/src/lib/config/env.ts`: env parse
- `frontend/src/lib/http/api-client.ts`: auth-aware fetch client
- `frontend/src/features/auth/*`: Cognito auth flow
- `frontend/src/features/room/*`: room query, prejoin, error states
- `frontend/src/features/call/*`: participant model, layout, store, media, controls
- `frontend/src/components/ui/*`: `shadcn/ui` primitives actually used
- `frontend/src/test/*`: Vitest setup, MSW, helpers
- `frontend/.env.example`: frontend env vars
- `frontend/README.md`: frontend setup/run notes

## Chunk 1: Scaffold + Auth Foundation

### Task 1: Scaffold Vite app, test harness, base providers

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/styles/index.css`
- Create: `frontend/src/app/providers.tsx`
- Create: `frontend/src/app/router.tsx`
- Create: `frontend/src/routes/__root.tsx`
- Create: `frontend/src/test/setup.ts`
- Create: `frontend/src/test/render.tsx`
- Test: `frontend/src/app/providers.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@/test/render'
import { AppProviders } from './providers'

it('renders router outlet shell', () => {
  render(<AppProviders />)
  expect(screen.getByTestId('app-root')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test -- src/app/providers.test.tsx`
Expected: FAIL, missing app scaffold

- [ ] **Step 3: Write minimal implementation**

Create Vite React TS app files, install router/query/test deps, wire `AppProviders`, add root element with `data-testid="app-root"`.

- [ ] **Step 4: Run test, typecheck, build**

Run: `cd frontend && npm run test -- src/app/providers.test.tsx && npm run typecheck && npm run build`
Expected: PASS, zero TS errors, production build succeeds

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat(frontend): scaffold vite react app"
```

### Task 2: Add Cognito login + callback routes

**Files:**
- Create: `frontend/src/lib/config/env.ts`
- Create: `frontend/src/lib/http/api-client.ts`
- Create: `frontend/src/features/auth/cognito.ts`
- Create: `frontend/src/features/auth/auth-session.ts`
- Create: `frontend/src/features/auth/require-auth.ts`
- Create: `frontend/src/features/auth/login-page.tsx`
- Create: `frontend/src/features/auth/callback-page.tsx`
- Create: `frontend/src/routes/login.tsx`
- Create: `frontend/src/routes/auth/callback.tsx`
- Modify: `frontend/src/app/router.tsx`
- Test: `frontend/src/features/auth/require-auth.test.tsx`
- Test: `frontend/src/features/auth/callback-page.test.tsx`

- [ ] **Step 1: Write the failing guard test**

```tsx
it('redirects anonymous user to /login with returnTo', async () => {
  await expect(requireAuth('/rooms/abc')).rejects.toMatchObject({
    to: '/login',
    search: { redirect: '/rooms/abc' },
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test -- src/features/auth/require-auth.test.tsx`
Expected: FAIL, no guard/auth session yet

- [ ] **Step 3: Implement minimal auth flow**

Add env parsing, Cognito PKCE helpers, session persistence, login route, callback route, auth-aware API client, route guard.

- [ ] **Step 4: Add callback test + pass both**

Run: `cd frontend && npm run test -- src/features/auth/require-auth.test.tsx src/features/auth/callback-page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat(frontend): add cognito auth flow"
```

## Chunk 2: Room Route + Participant Layout

### Task 3: Add room query, prejoin, join/leave flow

**Files:**
- Create: `frontend/src/features/room/api/get-room.ts`
- Create: `frontend/src/features/room/api/join-room.ts`
- Create: `frontend/src/features/room/api/leave-room.ts`
- Create: `frontend/src/features/room/queries.ts`
- Create: `frontend/src/features/room/types.ts`
- Create: `frontend/src/features/room/components/prejoin-panel.tsx`
- Create: `frontend/src/features/room/components/room-error-state.tsx`
- Create: `frontend/src/routes/rooms/$roomId.tsx`
- Test: `frontend/src/routes/rooms/$roomId.test.tsx`

- [ ] **Step 1: Write the failing room route test**

```tsx
it('shows prejoin panel after room loads', async () => {
  renderRoomRoute('/rooms/room-1')
  expect(await screen.findByRole('button', { name: /join now/i })).toBeVisible()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test -- src/routes/rooms/$roomId.test.tsx`
Expected: FAIL, no room route/query yet

- [ ] **Step 3: Implement minimal room route**

Load room metadata, branch `not found / denied / retryable`, show device preview + join CTA, wire leave mutation stub.

- [ ] **Step 4: Run route tests**

Run: `cd frontend && npm run test -- src/routes/rooms/$roomId.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat(frontend): add room prejoin flow"
```

### Task 4: Add participant model, stage derivation, paging store

**Files:**
- Create: `frontend/src/features/call/model/participant.ts`
- Create: `frontend/src/features/call/model/derive-layout.ts`
- Create: `frontend/src/features/call/store/call-ui-store.ts`
- Create: `frontend/src/features/call/components/participant-tile.tsx`
- Create: `frontend/src/features/call/components/main-stage.tsx`
- Create: `frontend/src/features/call/components/participant-strip-grid.tsx`
- Test: `frontend/src/features/call/model/derive-layout.test.ts`
- Test: `frontend/src/features/call/store/call-ui-store.test.ts`

- [ ] **Step 1: Write failing layout tests**

```ts
it('uses pinned participant as stage')
it('falls back to active speaker when nothing pinned')
it('pages overflow participants after visible limit')
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm run test -- src/features/call/model/derive-layout.test.ts src/features/call/store/call-ui-store.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement minimal model + store**

Add `Participant` view model, `deriveLayout(...)`, `participantPage`, `pinnedParticipantId`, `connectionPhase`, mic/cam/share toggles.

- [ ] **Step 4: Run tests**

Run: `cd frontend && npm run test -- src/features/call/model/derive-layout.test.ts src/features/call/store/call-ui-store.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat(frontend): add participant layout state"
```

## Chunk 3: Media Controls + Hardening

### Task 5: Add call controller, device switching, bottom controls

**Files:**
- Create: `frontend/src/features/call/media/device-manager.ts`
- Create: `frontend/src/features/call/media/call-controller.ts`
- Create: `frontend/src/features/call/media/call-controller-context.tsx`
- Create: `frontend/src/features/call/components/control-bar.tsx`
- Create: `frontend/src/features/call/components/device-sheet.tsx`
- Create: `frontend/src/features/call/components/connection-banner.tsx`
- Modify: `frontend/src/routes/rooms/$roomId.tsx`
- Test: `frontend/src/features/call/media/call-controller.test.ts`
- Test: `frontend/src/features/call/components/control-bar.test.tsx`

- [ ] **Step 1: Write failing media/control tests**

```ts
it('toggles microphone intent and disables local audio track')
it('changes selected input device and rebinds preview stream')
it('shows reconnecting banner without dropping room scene')
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm run test -- src/features/call/media/call-controller.test.ts src/features/call/components/control-bar.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement minimal controller**

Keep `MediaStream` out of store, drive side effects from controller/context, wire mic/cam/share/device controls into room route.

- [ ] **Step 4: Run focused tests + app smoke**

Run: `cd frontend && npm run test -- src/features/call/media/call-controller.test.ts src/features/call/components/control-bar.test.tsx src/routes/rooms/$roomId.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat(frontend): add call controls and media controller"
```

### Task 6: Add shadcn polish, env docs, full verification

**Files:**
- Create: `frontend/src/components/ui/button.tsx`
- Create: `frontend/src/components/ui/dialog.tsx`
- Create: `frontend/src/components/ui/select.tsx`
- Create: `frontend/src/components/ui/sheet.tsx`
- Create: `frontend/src/components/ui/avatar.tsx`
- Create: `frontend/src/components/ui/badge.tsx`
- Create: `frontend/.env.example`
- Modify: `frontend/src/styles/index.css`
- Modify: `frontend/README.md`
- Test: `frontend/src/routes/rooms/$roomId.states.test.tsx`

- [ ] **Step 1: Write failing state/error UI test**

```tsx
it('renders denied, not-found, join-failed, reconnecting states distinctly')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test -- src/routes/rooms/$roomId.states.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement minimal polish/docs**

Add only used `shadcn/ui` primitives, finish state banners/dialogs, document env vars + local run + test commands.

- [ ] **Step 4: Run full verification**

Run: `cd frontend && npm run test`
Expected: PASS

Run: `cd frontend && npm run typecheck && npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat(frontend): finish room ui foundation"
```

## Unresolved Questions

- Backend `join` response exact shape: attendee token, meeting payload, participant metadata fields
- Auth token storage final policy: memory-first only or refreshable browser persistence
- Media SDK binding choice: direct WebRTC wrapper vs `Amazon Chime SDK JS` session adapter
