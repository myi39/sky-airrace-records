# GAS セキュリティ強化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `コード.gs` の `doPost` にペイロードキー allowlist チェックを追加し、`doGet` に不正なアクションへの早期拒否を追加する。

**Architecture:** 各検証ロジックをピュアなヘルパー関数（`hasUnknownPayloadKeys`, `isValidAction`）として抽出し、GAS エディタで単体テスト可能にする。エントリーポイント（`doPost`, `doGet`）はヘルパーを呼ぶだけにする。

**Tech Stack:** Google Apps Script（GAS）、手動テスト実行（GAS エディタ上）

---

> **GAS のワークフロー:** `コード.gs` をローカルで編集後、GAS エディタに手動でコピー＆ペーストして反映する。テストは GAS エディタで対象関数を選択して「実行」ボタンで走らせ、ログで PASS/FAIL を確認する。

---

## ファイル構成

| ファイル | 変更内容 |
|----------|----------|
| `コード.gs` | ヘルパー関数追加、`doPost`・`doGet` に呼び出し追加、テスト関数追加 |

---

## Task 1: doPost ペイロードキー allowlist チェック

**Files:**
- Modify: `コード.gs`（`doPost` 関数、ユーティリティセクション、テストセクション）

- [ ] **Step 1: テスト関数を書く（GAS エディタに追加）**

`コード.gs` の末尾（`// ========================================` セクション内）に追加：

```javascript
function testHasUnknownPayloadKeys() {
  const assert = (cond, msg) => {
    if (!cond) throw new Error("FAIL: " + msg);
    console.log("PASS: " + msg);
  };

  assert(!hasUnknownPayloadKeys({
    category: "本家", course: "No.1", username: "@test",
    time: "31.31", recordDate: "2026-01-01",
    link: "https://youtube.com/watch?v=xxx",
    control: "タッチ", notes: "", recaptchaToken: "token",
  }), "許可キーのみ → false");

  assert(hasUnknownPayloadKeys({
    category: "本家", course: "No.1", username: "@test",
    time: "31.31", recordDate: "2026-01-01",
    link: "https://youtube.com/watch?v=xxx",
    control: "タッチ", notes: "", recaptchaToken: "token",
    __proto__: "x",
  }), "不正キー __proto__ → true");

  assert(hasUnknownPayloadKeys({
    category: "本家", extraField: "evil",
  }), "不正キー extraField → true");

  assert(!hasUnknownPayloadKeys({
    category: "本家",
  }), "許可キーの部分集合 → false");

  console.log("=== testHasUnknownPayloadKeys 全テスト合格 ===");
}
```

- [ ] **Step 2: テストを GAS エディタで実行して失敗を確認**

GAS エディタで `testHasUnknownPayloadKeys` を選択して実行。
期待結果: `ReferenceError: hasUnknownPayloadKeys is not defined`

- [ ] **Step 3: ヘルパー関数を実装する**

`コード.gs` の `// ユーティリティ` セクション（`sanitizeForSheet` の前）に追加：

```javascript
const ALLOWED_PAYLOAD_KEYS = [
  "category", "course", "username", "time",
  "recordDate", "link", "control", "notes", "recaptchaToken",
];

function hasUnknownPayloadKeys(payload) {
  return Object.keys(payload).some(function(k) {
    return !ALLOWED_PAYLOAD_KEYS.includes(k);
  });
}
```

- [ ] **Step 4: テストを再実行して合格を確認**

GAS エディタで `testHasUnknownPayloadKeys` を実行。
期待結果: ログに `=== testHasUnknownPayloadKeys 全テスト合格 ===`

- [ ] **Step 5: `doPost` にチェックを組み込む**

`doPost` の `JSON.parse` 直後（`// reCAPTCHA 検証` の前）に追加：

```javascript
    // ペイロードキー allowlist チェック
    if (hasUnknownPayloadKeys(payload)) {
      console.log("doPost 終了: 不正なパラメータキー");
      return jsonResponse({ success: false, error: "invalid_params" });
    }
```

変更後の `doPost` 冒頭はこの順になる：
1. `JSON.parse`
2. ログ出力
3. **allowlist チェック** ← 追加
4. reCAPTCHA 検証
5. フィールドバリデーション
6. シート書き込み

- [ ] **Step 6: コミット**

```
git add コード.gs
git commit -m "feat: add payload key allowlist check to doPost"
```

---

## Task 2: doGet アクション早期拒否

**Files:**
- Modify: `コード.gs`（`doGet` 関数、ユーティリティセクション、テストセクション）

- [ ] **Step 1: テスト関数を書く（GAS エディタに追加）**

`コード.gs` の末尾に追加：

```javascript
function testIsValidAction() {
  const assert = (cond, msg) => {
    if (!cond) throw new Error("FAIL: " + msg);
    console.log("PASS: " + msg);
  };

  assert(isValidAction("update-data-github"), "update-data-github は許可");
  assert(isValidAction("post-message-discord"), "post-message-discord は許可");
  assert(!isValidAction("delete-all-records"), "delete-all-records は拒否");
  assert(!isValidAction(""), "空文字は拒否");
  assert(!isValidAction(undefined), "undefined は拒否");
  assert(!isValidAction(null), "null は拒否");
  assert(!isValidAction("UPDATE-DATA-GITHUB"), "大文字混在は拒否");

  console.log("=== testIsValidAction 全テスト合格 ===");
}
```

- [ ] **Step 2: テストを GAS エディタで実行して失敗を確認**

GAS エディタで `testIsValidAction` を選択して実行。
期待結果: `ReferenceError: isValidAction is not defined`

- [ ] **Step 3: ヘルパー関数を実装する**

`コード.gs` の `// ユーティリティ` セクション（`hasUnknownPayloadKeys` の後）に追加：

```javascript
const ALLOWED_ACTIONS = ["update-data-github", "post-message-discord"];

function isValidAction(action) {
  return typeof action === "string" && ALLOWED_ACTIONS.includes(action);
}
```

- [ ] **Step 4: テストを再実行して合格を確認**

GAS エディタで `testIsValidAction` を実行。
期待結果: ログに `=== testIsValidAction 全テスト合格 ===`

- [ ] **Step 5: `doGet` に早期拒否を組み込み、末尾のフォールスルーを削除する**

現在の `doGet` を以下のように変更する：

```javascript
function doGet(e) {
  const action = (e.parameter && e.parameter.action) || "update-data-github";
  console.log("=== doGet 開始: action=" + action + " ===");

  // 許可アクション以外は即拒否
  if (!isValidAction(action)) {
    console.log("=== doGet 終了: 不正なアクション ===");
    return ContentService.createTextOutput("❌ 不正なアクション");
  }

  if (action === "update-data-github") {
    try {
      updateGitHubJSON();
      console.log("=== doGet 完了: GitHub更新成功 ===");
      return ContentService.createTextOutput(
        "✅ GitHub更新完了！\n更新日時: " + new Date().toLocaleString("ja-JP"),
      );
    } catch (error) {
      console.log("=== doGet エラー: GitHub更新失敗: " + error + " ===");
      return ContentService.createTextOutput(
        "❌ GitHub更新エラー\n" + error.toString(),
      );
    }
  }

  if (action === "post-message-discord") {
    const record = getLatestRecord();
    if (!record) {
      console.log("=== doGet 終了: Discord送信対象なし ===");
      return ContentService.createTextOutput("❌ データが見つかりませんでした");
    }
    try {
      sendDiscordNotification(
        record.category,
        record.course,
        record.username,
        record.time,
        record.recordDate,
        record.link,
        record.controlType,
        record.version,
        record.supplementaryNote,
      );
      console.log("=== doGet 完了: Discord送信成功 ===");
      return ContentService.createTextOutput(
        "✅ Discord送信完了！\n送信日時: " + new Date().toLocaleString("ja-JP"),
      );
    } catch (error) {
      console.log("=== doGet エラー: Discord送信失敗: " + error + " ===");
      return ContentService.createTextOutput(
        "❌ Discord送信エラー\n" + error.toString(),
      );
    }
  }
}
```

削除する箇所: 元のコードの末尾にあった以下のフォールスルー（早期拒否で到達不能になるため）：
```javascript
// 削除する
console.log("=== doGet 終了: 不明なアクション=" + action + " ===");
return ContentService.createTextOutput(
  "❌ 不明なアクション: " + action + "\n使用可能: update-data-github / post-message-discord",
);
```

- [ ] **Step 6: コミット**

```
git add コード.gs
git commit -m "feat: add early rejection for invalid action in doGet"
```

---

## 完了後の確認

- [ ] GAS エディタで `testHasUnknownPayloadKeys` を実行 → 全テスト合格
- [ ] GAS エディタで `testIsValidAction` を実行 → 全テスト合格
- [ ] GAS エディタで `testValidatePayload` を実行 → 既存テストが引き続き合格（リグレッションなし）
