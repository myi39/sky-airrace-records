# GAS セキュリティ強化設計

- 日付: 2026-05-09
- ブランチ: feature/submit-form
- 対象ファイル: `コード.gs`, `js/submit.js`（innerHTML 対策は対応不要と判断）

## スコープ

| # | タスク | 対象 |
|---|--------|------|
| 1 | 予期しないパラメータの拒否（allowlist） | `コード.gs` の `doPost` |
| 2 | doGet パラメータ検証（早期拒否） | `コード.gs` の `doGet` |

### 除外した対応

- **送信元チェック**: reCAPTCHA v3 + スコア閾値 + フィールドバリデーションで十分。GAS は HTTP ヘッダー（Referer / Origin）にアクセスできないため実装コストに見合わない。Cloud Functions 移行時に改めて実装する。
- **innerHTML 対策**: 現状の innerHTML 3箇所はすべてハードコード文字列またはクリアのみ。ユーザー入力の表示はすでに `textContent` / `createElement` で実装済みのため対応不要。

---

## 1. 予期しないパラメータの拒否

### 目的

攻撃者が余分なキーを送り込んでサーバー側の挙動を操作するのを防ぐ。

### 実装方針

`doPost` の `JSON.parse` 直後、reCAPTCHA 検証の前に allowlist チェックを追加する。

```javascript
const ALLOWED_PAYLOAD_KEYS = [
  "category", "course", "username", "time",
  "recordDate", "link", "control", "notes", "recaptchaToken"
];

const unknownKeys = Object.keys(payload).filter(k => !ALLOWED_PAYLOAD_KEYS.includes(k));
if (unknownKeys.length > 0) {
  console.log("doPost 終了: 不正なパラメータ=" + unknownKeys.join(", "));
  return jsonResponse({ success: false, error: "invalid_params" });
}
```

### 判断メモ

- `notes` は任意フィールドだが allowlist に含める（値の有無は `validatePayload` で許容済み）
- チェック失敗時はエラー内容を詳細に返さない（どのキーが原因かは外部に教えない）

---

## 2. doGet パラメータ検証

### 目的

`action` に想定外の値が渡されたとき、if チェーンを全部評価してから最後に応答するのではなく、入口で即拒否する。

### 実装方針

`action` 取得直後に allowlist チェックで早期 return する。既存の if チェーンはそのまま残す。

```javascript
const ALLOWED_ACTIONS = ["update-data-github", "post-message-discord"];
if (!ALLOWED_ACTIONS.includes(action)) {
  console.log("=== doGet 終了: 不正なアクション=" + action + " ===");
  return ContentService.createTextOutput("❌ 不正なアクション");
}
```

### 判断メモ

- エラーメッセージに `action` の値を含めない（利用可能アクションをリークしない）
- 既存のフォールスルー処理（最終 return）は削除してよい

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `コード.gs` | `doPost` に allowlist チェック追加、`doGet` に早期拒否追加 |
