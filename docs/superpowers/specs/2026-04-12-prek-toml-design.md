# prek TOML 設定移行設計

## 目的

`prek` の設定を TOML ベースに移行し、今後 `tombi` を使う前提に合わせて設定形式を統一する。

## 方針

- 既存の `.pre-commit-config.yaml` は廃止する
- ルートに `prek.toml` を置く
- 初期 hook は `builtin` の基本セットに限定する

## 今回の hook 範囲

- `trailing-whitespace`
- `end-of-file-fixer`
- `check-yaml`
- `check-toml`
- `check-json`

## 採用理由

`prek.toml` は `tombi` と相性がよく、設定ファイル形式を TOML に寄せられる。初期 hook は外部ランタイム依存のない built-in のみとし、空に近い現状のリポジトリでも安全に導入できるようにする。

## 今回やらないこと

- `tombi` の hook 導入
- Rust や frontend 向け formatter/linter の追加
- hook の対象パスの細かな最適化
