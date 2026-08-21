/**
 * playerIdentity.js
 *
 * ユーザーID・ユーザーネームの同一人物判定ロジック。
 * DOMに依存しない純粋関数のみを置き、index.js / player.js 両方から利用する。
 */

function resolveUserId(records, username) {
  const match = records.find((r) => r['ユーザー名'] === username);
  if (!match) return null;
  return match['ユーザーID'] || match['ユーザー名'];
}

function getRecordsByUserId(records, userId) {
  return records.filter((r) => (r['ユーザーID'] || r['ユーザー名']) === userId);
}

function getCurrentUsername(records, userId) {
  const playerRecords = getRecordsByUserId(records, userId);
  if (playerRecords.length === 0) return userId;
  const latest = playerRecords.reduce((a, b) =>
    new Date(a['タイムスタンプ']) > new Date(b['タイムスタンプ']) ? a : b,
  );
  return latest['ユーザー名'];
}

function getAllCurrentPlayers(records) {
  const seen = new Map();
  records.forEach((r) => {
    const id = r['ユーザーID'] || r['ユーザー名'];
    if (!seen.has(id)) {
      seen.set(id, getCurrentUsername(records, id));
    }
  });
  return Array.from(seen.values()).sort();
}

if (typeof module !== 'undefined') {
  module.exports = { resolveUserId, getRecordsByUserId, getCurrentUsername, getAllCurrentPlayers };
}

// node js/playerIdentity.js で直接実行したときだけ自己検証を行う（コード.gs の test_ 関数群と同じ流儀）
if (typeof require !== 'undefined' && require.main === module) {
  const assert = require('node:assert');

  const records = [
    { 'ユーザー名': '@old_name', 'ユーザーID': '111', 'タイムスタンプ': '2026/01/01 10:00' },
    { 'ユーザー名': '@new_name', 'ユーザーID': '111', 'タイムスタンプ': '2026/02/01 10:00' },
    { 'ユーザー名': '@solo_user', 'ユーザーID': '', 'タイムスタンプ': '2026/01/15 10:00' },
  ];

  assert.strictEqual(resolveUserId(records, '@old_name'), '111', '旧ユーザーネームからID解決できる');
  assert.strictEqual(resolveUserId(records, '@new_name'), '111', '新ユーザーネームからID解決できる');
  assert.strictEqual(resolveUserId(records, '@unknown'), null, '存在しないユーザーネームはnull');

  assert.strictEqual(getRecordsByUserId(records, '111').length, 2, '同一IDの2件が統合される');

  assert.strictEqual(getCurrentUsername(records, '111'), '@new_name', '最新ユーザーネームはタイムスタンプが新しい方');
  assert.strictEqual(
    getCurrentUsername(records, '@solo_user'),
    '@solo_user',
    'ID未解決レコードは自身のユーザー名にフォールバックする',
  );

  const allPlayers = getAllCurrentPlayers(records);
  assert.strictEqual(allPlayers.length, 2, '同一人物は1件に統合される');
  assert.ok(allPlayers.includes('@new_name'), '統合後は最新ユーザーネームで表示される');
  assert.ok(allPlayers.includes('@solo_user'), '未解決レコードも一覧に含まれる');

  console.log('playerIdentity.js: 全テスト合格');
}
