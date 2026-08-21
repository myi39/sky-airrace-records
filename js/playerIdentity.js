/**
 * playerIdentity.js
 *
 * ユーザーID・ユーザーネームの同一人物判定ロジック。
 * DOMに依存しない純粋関数のみを置き、index.js / player.js 両方から利用する。
 */

function resolveUserId(records, username) {
  const withId = records.find((r) => r['ユーザー名'] === username && r['ユーザーID']);
  if (withId) return withId['ユーザーID'];
  const match = records.find((r) => r['ユーザー名'] === username);
  return match ? match['ユーザー名'] : null;
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
    if (!id) return;
    if (!seen.has(id)) {
      seen.set(id, getCurrentUsername(records, id));
    }
  });
  return Array.from(seen.values()).sort();
}

function getDisplayName(records, row) {
  const playerId = row['ユーザーID'] || row['ユーザー名'];
  return playerId ? getCurrentUsername(records, playerId) : (row['ユーザー名'] || '');
}

if (typeof module !== 'undefined') {
  module.exports = { resolveUserId, getRecordsByUserId, getCurrentUsername, getAllCurrentPlayers, getDisplayName };
}

// node js/playerIdentity.js で直接実行したときだけ自己検証を行う（コード.gs の test_ 関数群と同じ流儀）
if (typeof require !== 'undefined' && require.main === module) {
  const assert = require('node:assert');

  const records = [
    { 'ユーザー名': '@old_name', 'ユーザーID': '111', 'タイムスタンプ': '2026/01/01 10:00' },
    { 'ユーザー名': '@new_name', 'ユーザーID': '111', 'タイムスタンプ': '2026/02/01 10:00' },
    { 'ユーザー名': '@solo_user', 'ユーザーID': '', 'タイムスタンプ': '2026/01/15 10:00' },
    // 部分バックフィール窓: 同一ユーザー名でID未付与レコードが先、ID付与レコードが後
    { 'ユーザー名': '@partial_backfill', 'ユーザーID': '', 'タイムスタンプ': '2026/01/01 10:00' },
    { 'ユーザー名': '@partial_backfill', 'ユーザーID': '222', 'タイムスタンプ': '2026/03/01 10:00' },
    // 逆順（ID付与レコードが先、ID未付与レコードが後）でも同じ結果になることを確認
    { 'ユーザー名': '@partial_backfill_reverse', 'ユーザーID': '333', 'タイムスタンプ': '2026/01/01 10:00' },
    { 'ユーザー名': '@partial_backfill_reverse', 'ユーザーID': '', 'タイムスタンプ': '2026/03/01 10:00' },
    // ユーザー名・ユーザーIDともに空欄のレコード（getAllCurrentPlayers のガード確認用）
    { 'ユーザー名': '', 'ユーザーID': '', 'タイムスタンプ': '2026/01/20 10:00' },
  ];

  assert.strictEqual(resolveUserId(records, '@old_name'), '111', '旧ユーザーネームからID解決できる');
  assert.strictEqual(resolveUserId(records, '@new_name'), '111', '新ユーザーネームからID解決できる');
  assert.strictEqual(resolveUserId(records, '@unknown'), null, '存在しないユーザーネームはnull');

  // 4b: 部分バックフィール窓では、配列内の順序に関わらずID付与レコードを優先する
  assert.strictEqual(
    resolveUserId(records, '@partial_backfill'),
    '222',
    'ID未付与レコードが先でも、ID付与レコードのIDを優先する',
  );
  assert.strictEqual(
    resolveUserId(records, '@partial_backfill_reverse'),
    '333',
    'ID付与レコードが先の場合も、ID付与レコードのIDを優先する',
  );

  assert.strictEqual(getRecordsByUserId(records, '111').length, 2, '同一IDの2件が統合される');

  assert.strictEqual(getCurrentUsername(records, '111'), '@new_name', '最新ユーザーネームはタイムスタンプが新しい方');
  assert.strictEqual(
    getCurrentUsername(records, '@solo_user'),
    '@solo_user',
    'ID未解決レコードは自身のユーザー名にフォールバックする',
  );

  // 4a: getDisplayName は ID解決済み行・未解決行の両方で手動計算と一致する
  const idResolvedRow = records[0]; // @old_name, ユーザーID: 111
  assert.strictEqual(
    getDisplayName(records, idResolvedRow),
    getCurrentUsername(records, idResolvedRow['ユーザーID']),
    'ID解決済み行では getCurrentUsername の結果と一致する',
  );
  assert.strictEqual(getDisplayName(records, idResolvedRow), '@new_name', 'ID解決済み行は最新ユーザーネームを返す');

  const idUnresolvedRow = records[2]; // @solo_user, ユーザーID: ''
  assert.strictEqual(
    getDisplayName(records, idUnresolvedRow),
    idUnresolvedRow['ユーザー名'],
    'ID未解決行では自身のユーザー名をそのまま返す',
  );

  // 4c: ユーザー名・ユーザーIDともに空欄のレコードは getAllCurrentPlayers に含まれない
  // 注: getAllCurrentPlayers はレコード単位で ID||ユーザー名 をキーにするため、
  // partial_backfill のようにID有無でキーが割れるケースは1人物として統合されない（既存挙動・今回のfixの対象外）。
  // ここでは「空欄レコードが undefined/空文字として混入しないこと」のみを検証する。
  const allPlayers = getAllCurrentPlayers(records);
  assert.strictEqual(allPlayers.length, 6, '空欄レコード（ユーザー名・ユーザーIDとも空欄）はスキップされる');
  assert.ok(allPlayers.includes('@new_name'), '統合後は最新ユーザーネームで表示される');
  assert.ok(allPlayers.includes('@solo_user'), '未解決レコードも一覧に含まれる');
  assert.ok(allPlayers.includes('@partial_backfill'), '部分バックフィールレコードも一覧に含まれる');
  assert.ok(allPlayers.includes('@partial_backfill_reverse'), '逆順の部分バックフィールレコードも一覧に含まれる');
  assert.ok(!allPlayers.includes(undefined), '空欄レコードから undefined が混入しない');
  assert.ok(!allPlayers.includes(''), '空欄レコードから空文字が混入しない');

  console.log('playerIdentity.js: 全テスト合格');
}
