#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
// worker/ は .gitignore 対象のため、リポジトリを新規cloneしただけの環境には存在しない。
// このスクリプトを実行するには事前に worker/src/lookupUserId.js をローカルに用意する必要がある
// （無い場合は ERR_MODULE_NOT_FOUND で失敗する）。
import { lookupUserId } from '../worker/src/lookupUserId.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_JSON_PATH = join(__dirname, '..', 'data.json');
const OUTPUT_CSV_PATH = join(__dirname, 'backfill-output.csv');
const DELAY_MS = 1000; // レート制限回避のためリクエスト間に待機

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const data = JSON.parse(readFileSync(DATA_JSON_PATH, 'utf-8'));
  const usernames = [...new Set(data.records.map((r) => r['ユーザー名']).filter(Boolean))].sort();

  console.log(`対象ユーザーネーム数: ${usernames.length}`);

  const rows = ['ユーザー名,ユーザーID'];
  for (const username of usernames) {
    const id = await lookupUserId(username);
    console.log(`${username} => ${id ?? 'FAILED'}`);
    rows.push(`${username},${id ?? ''}`);
    await sleep(DELAY_MS);
  }

  writeFileSync(OUTPUT_CSV_PATH, rows.join('\n') + '\n', 'utf-8');
  console.log(`出力完了: ${OUTPUT_CSV_PATH}`);
}

main();
