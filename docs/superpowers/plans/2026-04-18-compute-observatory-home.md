# Compute Observatory Home Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 認証後 `/` を Three.js ベースの `Compute Observatory` ホームへ置換する。

**Architecture:** `HomePage` で未認証/認証済み表示を分岐。認証済み側は `3D scene layer` と `overlay layer` に分離し、モック値生成を別層に切る。初回は UI 演出優先、実 API 接続なし。

**Tech Stack:** `React`, `TypeScript`, `TanStack Query`, `Three.js`, `Vitest`, `Testing Library`

---

## File Map

- `frontend/package.json`: `three` 追加
- `frontend/src/features/home/home-page.tsx`: 認証済みホーム切替
- `frontend/src/features/home/components/compute-observatory-page.tsx`: 認証後ホーム骨格
- `frontend/src/features/home/components/compute-scene.tsx`: Three.js 初期化/破棄/resize
- `frontend/src/features/home/components/compute-overlay.tsx`: 左下入力 + 右側指標
- `frontend/src/features/home/model/mock-observatory.ts`: モック数値/演出トリガ
- `frontend/src/features/home/home-page.test.tsx`: 認証状態ごとの表示
- `frontend/src/features/home/model/mock-observatory.test.ts`: モック挙動
- `frontend/src/styles/index.css`: 新ホームのトークン/レイアウト

## Chunk 1: Home Shell

### Task 1: 認証済みホームの分岐を追加

**Files:**
- Modify: `frontend/src/features/home/home-page.tsx`
- Test: `frontend/src/features/home/home-page.test.tsx`

- [ ] Step 1: 認証済みなら `Compute Observatory` を出す failing test 追加
- [ ] Step 2: Run `cd frontend && npm run test -- src/features/home/home-page.test.tsx`
- [ ] Step 3: `HomePage` を public/authenticated 分岐へ変更
- [ ] Step 4: 同テスト再実行
- [ ] Step 5: Commit `feat(frontend): switch authenticated home to observatory shell`

### Task 2: 認証後ホーム骨格を置く

**Files:**
- Create: `frontend/src/features/home/components/compute-observatory-page.tsx`
- Modify: `frontend/src/features/home/home-page.tsx`
- Test: `frontend/src/features/home/home-page.test.tsx`

- [ ] Step 1: overlay と scene のプレースホルダ表示 test 追加
- [ ] Step 2: Run `cd frontend && npm run test -- src/features/home/home-page.test.tsx`
- [ ] Step 3: `compute-observatory-page.tsx` 作成、2 層レイアウトを実装
- [ ] Step 4: 同テスト再実行
- [ ] Step 5: Commit `feat(frontend): add observatory page shell`

## Chunk 2: Mock Model + Overlay

### Task 3: モック指標モデルを作る

**Files:**
- Create: `frontend/src/features/home/model/mock-observatory.ts`
- Test: `frontend/src/features/home/model/mock-observatory.test.ts`

- [ ] Step 1: `dispatch(count)` で指標が増減する failing test 追加
- [ ] Step 2: Run `cd frontend && npm run test -- src/features/home/model/mock-observatory.test.ts`
- [ ] Step 3: request count 起点のモック値生成を最小実装
- [ ] Step 4: 同テスト再実行
- [ ] Step 5: Commit `feat(frontend): add observatory mock metrics`

### Task 4: Overlay UI を実装

**Files:**
- Create: `frontend/src/features/home/components/compute-overlay.tsx`
- Modify: `frontend/src/features/home/components/compute-observatory-page.tsx`
- Modify: `frontend/src/styles/index.css`
- Test: `frontend/src/features/home/home-page.test.tsx`

- [ ] Step 1: `Request Count` と全指標表示の failing test 追加
- [ ] Step 2: Run `cd frontend && npm run test -- src/features/home/home-page.test.tsx`
- [ ] Step 3: 左下入力 + `Dispatch`、右側全指標パネル実装
- [ ] Step 4: 同テスト再実行
- [ ] Step 5: Commit `feat(frontend): add observatory overlay panel`

## Chunk 3: Three.js Scene

### Task 5: Scene 初期化/破棄を追加

**Files:**
- Create: `frontend/src/features/home/components/compute-scene.tsx`
- Modify: `frontend/src/features/home/components/compute-observatory-page.tsx`
- Test: `frontend/src/features/home/home-page.test.tsx`

- [ ] Step 1: canvas mount の failing test 追加
- [ ] Step 2: Run `cd frontend && npm run test -- src/features/home/home-page.test.tsx`
- [ ] Step 3: Three.js renderer/camera/scene の最小初期化と cleanup 実装
- [ ] Step 4: 同テスト再実行
- [ ] Step 5: Commit `feat(frontend): mount compute scene`

### Task 6: CPU グリッドと流入演出を追加

**Files:**
- Modify: `frontend/src/features/home/components/compute-scene.tsx`
- Modify: `frontend/src/features/home/model/mock-observatory.ts`
- Modify: `frontend/src/styles/index.css`

- [ ] Step 1: scene config を small units に分割する
- [ ] Step 2: CPU グリッド、主幹ライン、完了収束点を追加
- [ ] Step 3: `Dispatch` に反応する粒子量/発光トリガを追加
- [ ] Step 4: Run `cd frontend && npm run test -- src/features/home/home-page.test.tsx src/features/home/model/mock-observatory.test.ts`
- [ ] Step 5: Commit `feat(frontend): add observatory visual motion`

## Chunk 4: Polish + Verification

### Task 7: レスポンシブとトーン調整

**Files:**
- Modify: `frontend/src/styles/index.css`
- Modify: `frontend/src/features/home/components/compute-overlay.tsx`

- [ ] Step 1: 狭幅で overlay が崩れないよう調整
- [ ] Step 2: 黒ガラス + アンバー発光のトークン整理
- [ ] Step 3: Run `cd frontend && npm run test -- src/features/home/home-page.test.tsx`
- [ ] Step 4: Run `cd frontend && npm run typecheck && npm run build`
- [ ] Step 5: Commit `style(frontend): polish observatory layout`

### Task 8: 最終確認

**Files:**
- Modify: 必要な差分のみ

- [ ] Step 1: Run `cd frontend && npm run test`
- [ ] Step 2: Run `cd frontend && npm run typecheck`
- [ ] Step 3: Run `cd frontend && npm run build`
- [ ] Step 4: 失敗あれば最小修正して再実行
- [ ] Step 5: Commit `feat(frontend): finish compute observatory home`

## Unresolved Questions

- なし
