// ========================================
// 状態管理
// ========================================
let challengeMaster = [];
let challengeRecords = [];

// 適用済みフィルター
let selectedChallenge = "";
let selectedRankFilter = ""; // "" = 全て
let tempApprovalFilter = "all";
let isFilterOpen = false;

// ========================================
// データ読み込み
// ========================================
async function loadData() {
  const url = `./challenge.json?ts=${Date.now()}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`データ読み込み失敗: ${response.status}`);
  const data = await response.json();
  challengeMaster = data.challengeMaster || [];
  challengeRecords = data.challengeRecords || [];
  console.log(`✓ チャレンジデータ読み込み完了: マスタ${challengeMaster.length}件 / 記録${challengeRecords.length}件`);
}

// ========================================
// ヘルパー
// ========================================

/**
 * ランク一覧内でのインデックスを返す（見つからない場合は -1）
 */
function getRankIndex(rankList, rank) {
  return rankList.indexOf(rank);
}

/**
 * あるレコードが「最低ランク rankMin 以上」かどうかを判定
 * rankMin が "" の場合は全て通す
 */
function meetsRankFilter(record, rankList, rankMin) {
  if (!rankMin) return true;
  const recordIdx = getRankIndex(rankList, record["ランク"]);
  const minIdx = getRankIndex(rankList, rankMin);
  return recordIdx >= minIdx;
}

// ========================================
// 初期化
// ========================================
async function init() {
  await loadData();
  populateChallengeSelect();
  initApprovalFilter();
  setupEventListeners();
  console.log("✓ チャレンジページ: 初期化完了");
}

/**
 * チャレンジ選択セレクトボックスを生成
 */
function populateChallengeSelect() {
  const select = document.getElementById("challengeSelect");
  challengeMaster.forEach((c) => {
    const option = document.createElement("option");
    option.value = c["チャレンジ名"];
    option.textContent = c["チャレンジ名"];
    select.appendChild(option);
  });
}

/**
 * 承認フィルターを生成
 */
function initApprovalFilter() {
  const container = document.getElementById("approvalFilterOptions");
  container.className = "approval-options";
  const types = [
    { value: "all", label: "すべて" },
    { value: "approved", label: "承認済のみ" },
  ];
  types.forEach((type) => {
    const item = document.createElement("div");
    item.className = type.value === "all" ? "approval-item selected" : "approval-item";
    item.dataset.value = type.value;
    item.innerHTML = `
      <div class="approval-indicator"></div>
      <span class="approval-label">${type.label}</span>
    `;
    item.addEventListener("click", () => {
      container.querySelectorAll(".approval-item").forEach((el) => el.classList.remove("selected"));
      item.classList.add("selected");
      updateFilterCount();
    });
    container.appendChild(item);
  });
}

/**
 * イベントリスナーを設定
 */
function setupEventListeners() {
  // チャレンジ選択変更
  document.getElementById("challengeSelect").addEventListener("change", onChallengeChange);

  // フィルターアコーディオン
  document.getElementById("filterHeader").addEventListener("click", toggleFilterAccordion);

  // 表示ボタン
  document.getElementById("applyFilterBtn").addEventListener("click", applyFilter);
}

// ========================================
// チャレンジ選択変更
// ========================================
function onChallengeChange() {
  const challengeName = document.getElementById("challengeSelect").value;
  const challenge = challengeMaster.find((c) => c["チャレンジ名"] === challengeName);

  // 説明
  const descEl = document.getElementById("challengeDescription");
  if (challenge && challenge["説明"]) {
    descEl.textContent = challenge["説明"];
    descEl.style.display = "block";
  } else {
    descEl.style.display = "none";
  }

  // ランクフィルター
  const rankGroup = document.getElementById("rankFilterGroup");
  const rankOptions = document.getElementById("rankFilterOptions");
  rankOptions.innerHTML = "";
  selectedRankFilter = "";

  if (challenge && challenge["ランク一覧"].length > 0) {
    rankGroup.style.display = "block";

    // 「全て」チップ
    const allChip = createRankChip("全て", true);
    allChip.addEventListener("click", () => {
      rankOptions.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("selected"));
      allChip.classList.add("selected");
      selectedRankFilter = "";
      updateFilterCount();
    });
    rankOptions.appendChild(allChip);

    // 各ランクのチップ
    challenge["ランク一覧"].forEach((rank) => {
      const chip = createRankChip(rank, false);
      chip.addEventListener("click", () => {
        rankOptions.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("selected"));
        chip.classList.add("selected");
        selectedRankFilter = rank;
        updateFilterCount();
      });
      rankOptions.appendChild(chip);
    });
  } else {
    rankGroup.style.display = "none";
  }

  updateFilterCount();
}

function createRankChip(label, isSelected) {
  const chip = document.createElement("div");
  chip.className = `filter-chip${isSelected ? " selected" : ""}`;
  chip.textContent = label;
  return chip;
}

// ========================================
// フィルター件数更新
// ========================================
function updateFilterCount() {
  const challengeName = document.getElementById("challengeSelect").value;
  const countEl = document.getElementById("filterRecordCount");
  const errorEl = document.getElementById("filterError");
  const applyBtn = document.getElementById("applyFilterBtn");

  if (!challengeName) {
    countEl.textContent = "達成者数: -";
    errorEl.style.display = "block";
    applyBtn.disabled = true;
    return;
  }

  errorEl.style.display = "none";
  applyBtn.disabled = false;

  // 承認フィルター取得
  const approvalSelected = document.querySelector("#approvalFilterOptions .approval-item.selected");
  const approvalFilter = approvalSelected ? approvalSelected.dataset.value : "all";

  const challenge = challengeMaster.find((c) => c["チャレンジ名"] === challengeName);
  const rankList = challenge ? challenge["ランク一覧"] : [];

  const count = challengeRecords.filter((r) => {
    if (r["チャレンジ名"] !== challengeName) return false;
    if (!meetsRankFilter(r, rankList, selectedRankFilter)) return false;
    if (approvalFilter === "approved" && r["承認状態"] !== "OK") return false;
    return true;
  }).length;

  countEl.textContent = `達成者数: ${count}人`;
  countEl.classList.remove("error");
}

// ========================================
// フィルター適用・テーブル描画
// ========================================
function applyFilter() {
  selectedChallenge = document.getElementById("challengeSelect").value;

  const approvalSelected = document.querySelector("#approvalFilterOptions .approval-item.selected");
  tempApprovalFilter = approvalSelected ? approvalSelected.dataset.value : "all";

  renderAchieversTable();

  // フィルターを閉じる
  const header = document.getElementById("filterHeader");
  const content = document.getElementById("filterContent");
  header.classList.remove("active");
  content.classList.remove("open");
  isFilterOpen = false;
}

function renderAchieversTable() {
  const container = document.getElementById("achieversTable");
  const challenge = challengeMaster.find((c) => c["チャレンジ名"] === selectedChallenge);
  const rankList = challenge ? challenge["ランク一覧"] : [];
  const hasRanks = rankList.length > 0;

  // フィルタリング
  const filtered = challengeRecords.filter((r) => {
    if (r["チャレンジ名"] !== selectedChallenge) return false;
    if (!meetsRankFilter(r, rankList, selectedRankFilter)) return false;
    if (tempApprovalFilter === "approved" && r["承認状態"] !== "OK") return false;
    return true;
  });

  // 達成日昇順でソート
  filtered.sort((a, b) => new Date(a["達成日"]) - new Date(b["達成日"]));

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <h2>達成者がいません</h2>
        <p>条件に合う達成記録が見つかりませんでした</p>
      </div>
    `;
    return;
  }

  const rows = filtered.map((r, i) => {
    const username = r["ユーザー名"] || "";
    const xHandle = username.startsWith("@") ? username.slice(1) : username;
    const playerLink = xHandle
      ? `<a href="player.html?user=${encodeURIComponent(username)}" class="player-link">${username}</a>`
      : "-";
    const rankCell = hasRanks
      ? `<td><span class="rank-badge">${r["ランク"] || "-"}</span></td>`
      : "";
    const statusClass = r["承認状態"] === "OK" ? "status-approved" : "status-pending";
    const statusText = r["承認状態"] === "OK" ? "承認済" : "未承認";

    return `
      <tr>
        <td>${i + 1}</td>
        <td>${formatDate(r["達成日"])}</td>
        <td>${playerLink}</td>
        ${rankCell}
        <td>${r["リンク"] ? `<a href="${r["リンク"]}" target="_blank" class="video-link">▶</a>` : "-"}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
      </tr>
    `;
  }).join("");

  const rankHeader = hasRanks ? "<th>ランク</th>" : "";

  container.innerHTML = `
    <div class="achievers-table-container">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>達成日</th>
            <th>プレイヤー</th>
            ${rankHeader}
            <th>動画</th>
            <th>状態</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// ========================================
// フィルターアコーディオン
// ========================================
function toggleFilterAccordion() {
  const header = document.getElementById("filterHeader");
  const content = document.getElementById("filterContent");
  isFilterOpen = !isFilterOpen;
  if (isFilterOpen) {
    header.classList.add("active");
    content.classList.add("open");
  } else {
    header.classList.remove("active");
    content.classList.remove("open");
  }
}

// ========================================
// 起動
// ========================================
init();
