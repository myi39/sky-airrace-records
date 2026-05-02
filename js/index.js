// ========================================
// グローバル変数
// ========================================

// データ格納用
let allData = []; // 全記録データ
let courseMaster = []; // コースマスターデータ
let versionMaster = []; // バージョンマスターデータ
let controlMaster = []; // コントロールマスターデータ
let controlIconMap = {}; // 操作方法 → 絵文字 のマップ

// フィルター選択状態（一時的な選択状態）
let tempSelectedVersions = []; // 詳細フィルター内で一時選択中のバージョン
let tempSelectedControls = []; // 詳細フィルター内で一時選択中の操作方法
let tempApprovalFilter = "all"; // 詳細フィルター内で一時選択中の承認フィルター
let tempRecordMode = "best"; // 詳細フィルター内で一時選択中の表示件数

// 適用済みフィルター（OKボタンを押した後の状態）
let appliedVersions = []; // 適用済みのバージョン
let appliedControls = []; // 適用済みの操作方法
let appliedApprovalFilter = "all"; // 適用済みの承認フィルター
let appliedRecordMode = "best"; // 適用済みの表示件数

// ソート状態
let currentSort = {
  column: "タイム", // ソート対象列
  order: "asc", // 昇順/降順
};

// アコーディオンの開閉状態
let isFilterOpen = false;

// ========================================
// ユーティリティ関数（index固有）
// ========================================

/**
 * 日時を YYYY/MM/DD HH:MM 形式にフォーマット
 * @param {string} dateString - ISO形式の日付文字列
 * @returns {string} フォーマットされた日時
 */
function formatDateTime(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}/${month}/${day} ${hour}:${minute}`;
}

/**
 * 時刻を HH:MM 形式にフォーマット
 * @param {string} dateString - ISO形式の日付文字列
 * @returns {string} フォーマットされた時刻
 */
function formatTime(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
}

/**
 * アプリケーション初期化
 */
function init() {
  setupEventListeners();
  loadData();
}

/**
 * イベントリスナー設定
 */
function setupEventListeners() {
  // 大会種別変更時
  document
    .getElementById("category")
    .addEventListener("change", onCategoryChange);

  // コース変更時
  document.getElementById("course").addEventListener("change", () => {
    updateFilterRecordCount();
    renderRanking();
    const category = document.getElementById("category").value;
    const course = document.getElementById("course").value;
    if (category && course) {
      gtag("event", "select_course", {
        category: category,
        course: course,
      });
    }
  });

  // アコーディオンの開閉
  document
    .getElementById("filterHeader")
    .addEventListener("click", toggleFilter);

  // OKボタン
  document
    .getElementById("applyFilterBtn")
    .addEventListener("click", applyFilter);

  // コース説明リンク
  document.getElementById("courseLinkAnchor").addEventListener("click", () => {
    gtag("event", "click_course_link", {
      category: document.getElementById("category").value,
      course: document.getElementById("course").value,
    });
  });
}

// ========================================
// データ読み込み
// ========================================

/**
 * data.jsonからデータを読み込む
 */
async function loadData() {
  const rankingTable = document.getElementById("rankingTable");
  if (rankingTable) {
    rankingTable.innerHTML =
      '<div class="loading">データを読み込んでいます...</div>';
  }

  try {
    // キャッシュ回避のためタイムスタンプ付与
    const url = `./data.json?ts=${Date.now()}`;
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      throw new Error("data.json の取得に失敗しました");
    }

    const json = await response.json();

    // データを格納
    allData = json.records || [];
    courseMaster = json.courseMaster || [];
    versionMaster = json.versionMaster || [];
    controlMaster = json.controlMaster || [];
    controlIconMap = {};
    controlMaster.forEach(item => {
      controlIconMap[item["操作方法"]] = item["操作方法_絵文字"] || "";
    });

    console.log("データ読み込み完了");
    console.log("- records:", allData.length);
    console.log("- courseMaster:", courseMaster.length);
    console.log("- versionMaster:", versionMaster.length);

    // UI初期化（フィルターUIを先に構築してからデフォルト選択を行う）
    populateVersionFilters();
    populateControlFilters(); // 内部でpopulateApprovalFilterも呼び出す
    populateCategories(); // 内部でデフォルト選択の本家/No.1を設定し、renderRankingまで呼び出す
    renderRecentSubmissions();

    // URLクエリパラメータを適用（デフォルト選択を上書き）
    applyUrlParams();
  } catch (error) {
    console.error("データ取得エラー:", error);
    if (rankingTable) {
      rankingTable.innerHTML = `
      <div class="empty-state">
        <h2>データの読み込みに失敗しました</h2>
        <p>${error.message}</p>
      </div>
    `;
    }
  }
}

// ========================================
// UI生成（セレクトボックス・フィルター）
// ========================================

/**
 * 大会種別セレクトボックスを生成
 */
function populateCategories() {
  const categorySelect = document.getElementById("category");
  categorySelect.innerHTML =
    '<option value="">-- 大会種別を選択してください --</option>';

  // 重複なしで大会種別を取得
  const categories = [
    ...new Set(courseMaster.map((item) => item["大会種別"])),
  ];

  categories.forEach((cat) => {
    // この大会種別の記録数を集計
    const count = allData.filter((row) => row["大会種別"] === cat).length;

    const option = document.createElement("option");
    option.value = cat;
    option.textContent = `${cat} （${count}件）`;
    categorySelect.appendChild(option);
  });

  // デフォルトで「本家」を選択し、コース選択とレンダリングまで実行
  if (categories.includes("本家")) {
    categorySelect.value = "本家";
    onCategoryChange();
    renderRanking();
  }
}

/**
 * URLクエリパラメータを読み取って大会種別とコースを自動選択
 */
function applyUrlParams() {
  const params = getUrlParams();

  if (params.category) {
    const categorySelect = document.getElementById("category");
    categorySelect.value = params.category;
    onCategoryChange();

    if (params.course) {
      // DOMの更新を待ってからコースを設定
      setTimeout(() => {
        const courseSelect = document.getElementById("course");
        courseSelect.value = params.course;
        updateFilterRecordCount();
        renderRanking();
      }, 50);
    } else {
      // カテゴリのみ指定されている場合
      setTimeout(() => {
        renderRanking();
      }, 50);
    }
  }
}

/**
 * 大会種別変更時の処理
 */
function onCategoryChange() {
  const category = document.getElementById("category").value;
  const courseSelect = document.getElementById("course");

  courseSelect.innerHTML =
    '<option value="">-- コースを選択してください --</option>';

  if (category) {
    courseSelect.disabled = false;

    // 選択された大会種別のコースを取得
    const courses = courseMaster.filter(
      (item) => item["大会種別"] === category,
    );

    courses.forEach((item) => {
      // このコースの記録数を集計
      const count = allData.filter(
        (row) =>
          row["大会種別"] === category &&
          row["コース名"] === item["コース名"],
      ).length;

      const option = document.createElement("option");
      option.value = item["コース名"];
      option.textContent = `${item["コース名"]} （${count}件）`;
      courseSelect.appendChild(option);
    });

    // デフォルトで「No.1」を選択（大会種別が「本家」の場合）
    if (
      category === "本家" &&
      courses.find((c) => c["コース名"] === "No.1")
    ) {
      courseSelect.value = "No.1";
    }

    updateFilterRecordCount();
  } else {
    courseSelect.disabled = true;
    updateFilterRecordCount();
    renderRanking();
  }
}

/**
 * バージョンフィルターのチェックボックスを生成
 */
function populateVersionFilters() {
  const container = document.getElementById("versionFilterOptions");
  container.innerHTML = "";

  // バージョンマスタを新しい順に並べる
  const versions = versionMaster
    .map((row) => row[Object.keys(row)[0]])
    .reverse();

  versions.forEach((version) => {
    const chip = document.createElement("div");
    chip.className = "filter-chip selected"; // デフォルトで選択状態
    chip.textContent = version;
    chip.dataset.version = version;

    chip.addEventListener("click", () => {
      chip.classList.toggle("selected");
      onFilterChange();
    });

    container.appendChild(chip);

    // 初期状態として全て選択
    tempSelectedVersions.push(version);
  });
}

/**
 * 操作方法フィルターのチェックボックスを生成
 */
function populateControlFilters() {
  const container = document.getElementById("controlFilterOptions");
  container.innerHTML = "";

  controlMaster.forEach(item => {
    const controlType = item["操作方法"];
    const icon = item["操作方法_絵文字"] || "";
    const chip = document.createElement("div");
    chip.className = "filter-chip selected"; // デフォルトで選択状態
    chip.innerHTML = icon ? `<span class="filter-icon">${icon}</span>${controlType}` : controlType;
    chip.dataset.control = controlType;

    chip.addEventListener("click", () => {
      chip.classList.toggle("selected");
      onFilterChange();
    });

    container.appendChild(chip);

    // 初期状態として全て選択
    tempSelectedControls.push(controlType);
  });

  // 承認フィルターのボタンを生成
  populateApprovalFilter();

  // 表示件数フィルターのボタンを生成
  populateRecordModeFilter();

  // 初期状態を適用済みに設定
  appliedVersions = [...tempSelectedVersions];
  appliedControls = [...tempSelectedControls];
  appliedApprovalFilter = tempApprovalFilter;
  appliedRecordMode = tempRecordMode;
  updateFilterRecordCount();
}

/**
 * 承認フィルターのボタンを生成
 */
function populateApprovalFilter() {
  const container = document.getElementById("approvalFilterOptions");
  container.innerHTML = "";

  // コンテナに縦並びのラジオボタン風レイアウトを適用
  container.className = "approval-options";

  // 「すべて」項目
  const allItem = document.createElement("div");
  allItem.className = "approval-item selected"; // デフォルトで選択状態
  allItem.innerHTML = `
    <div class="approval-indicator"></div>
    <span class="approval-label">すべて</span>
  `;

  // 「承認済のみ」項目
  const approvedItem = document.createElement("div");
  approvedItem.className = "approval-item";
  approvedItem.innerHTML = `
    <div class="approval-indicator"></div>
    <span class="approval-label">承認済のみ</span>
  `;

  // クリックイベント（相互排他的）
  allItem.addEventListener("click", () => {
    allItem.classList.add("selected");
    approvedItem.classList.remove("selected");
    tempApprovalFilter = "all";
    onFilterChange();
  });

  approvedItem.addEventListener("click", () => {
    approvedItem.classList.add("selected");
    allItem.classList.remove("selected");
    tempApprovalFilter = "approved";
    onFilterChange();
  });

  container.appendChild(allItem);
  container.appendChild(approvedItem);
}

/**
 * 表示件数フィルターのボタンを生成
 */
function populateRecordModeFilter() {
  const container = document.getElementById("recordModeFilterOptions");
  container.innerHTML = "";
  container.className = "approval-options";

  const allItem = document.createElement("div");
  allItem.className = "approval-item";
  allItem.innerHTML = `
    <div class="approval-indicator"></div>
    <span class="approval-label">すべて</span>
  `;

  const bestItem = document.createElement("div");
  bestItem.className = "approval-item selected";
  bestItem.innerHTML = `
    <div class="approval-indicator"></div>
    <span class="approval-label">プレイヤーごとに最速のみ</span>
  `;

  allItem.addEventListener("click", () => {
    allItem.classList.add("selected");
    bestItem.classList.remove("selected");
    tempRecordMode = "all";
    onFilterChange();
  });

  bestItem.addEventListener("click", () => {
    bestItem.classList.add("selected");
    allItem.classList.remove("selected");
    tempRecordMode = "best";
    onFilterChange();
  });

  container.appendChild(allItem);
  container.appendChild(bestItem);
}

// ========================================
// アコーディオンフィルター操作
// ========================================

/**
 * アコーディオンフィルターの開閉
 */
function toggleFilter() {
  isFilterOpen = !isFilterOpen;
  const content = document.getElementById("filterContent");
  const header = document.getElementById("filterHeader");

  if (isFilterOpen) {
    content.classList.add("open");
    header.classList.add("active");
  } else {
    content.classList.remove("open");
    header.classList.remove("active");
  }
}

/**
 * フィルターのチェックボックス変更時の処理
 */
function onFilterChange() {
  // 一時選択状態を更新
  tempSelectedVersions = [];
  document
    .querySelectorAll("#versionFilterOptions .filter-chip.selected")
    .forEach((chip) => {
      tempSelectedVersions.push(chip.dataset.version);
    });

  tempSelectedControls = [];
  document
    .querySelectorAll("#controlFilterOptions .filter-chip.selected")
    .forEach((chip) => {
      tempSelectedControls.push(chip.dataset.control);
    });

  // 記録数とボタン状態を更新
  updateFilterRecordCount();
  updateApplyButtonState();
}

/**
 * フィルター内の記録数表示を更新
 */
function updateFilterRecordCount() {
  const category = document.getElementById("category").value;
  const course = document.getElementById("course").value;
  const countDisplay = document.getElementById("filterRecordCount");

  // バージョンまたは操作方法が選択されていない場合
  if (
    tempSelectedVersions.length === 0 ||
    tempSelectedControls.length === 0
  ) {
    countDisplay.textContent = "記録数: -";
    countDisplay.classList.add("error");
    return;
  }

  countDisplay.classList.remove("error");

  if (!category || !course) {
    countDisplay.textContent = "記録数: 0件";
    return;
  }

  // 一時選択状態に基づいて記録数を計算
  let filteredData = allData.filter(
    (row) => row["大会種別"] === category && row["コース名"] === course,
  );

  // バージョンフィルター
  if (tempSelectedVersions.length > 0) {
    filteredData = filteredData.filter((row) =>
      tempSelectedVersions.includes(row["バージョン"]),
    );
  }

  // 操作方法フィルター
  if (tempSelectedControls.length > 0) {
    filteredData = filteredData.filter((row) =>
      tempSelectedControls.includes(row["操作方法"]),
    );
  }

  // 承認フィルター
  if (tempApprovalFilter === "approved") {
    filteredData = filteredData.filter((row) => row["承認状態"] === "OK");
  }

  // 表示件数フィルター
  if (tempRecordMode === "best") {
    const bestByPlayer = new Map();
    filteredData.forEach((row) => {
      const player = row["ユーザー名"];
      const existing = bestByPlayer.get(player);
      if (!existing || parseFloat(row["タイム"]) < parseFloat(existing["タイム"])) {
        bestByPlayer.set(player, row);
      }
    });
    filteredData = Array.from(bestByPlayer.values());
  }

  countDisplay.textContent = `記録数: ${filteredData.length}件`;
}

/**
 * OKボタンの有効/無効状態を更新
 */
function updateApplyButtonState() {
  const applyBtn = document.getElementById("applyFilterBtn");
  const errorMsg = document.getElementById("filterError");

  // バージョンまたは操作方法が1つも選択されていない場合は無効化
  if (
    tempSelectedVersions.length === 0 ||
    tempSelectedControls.length === 0
  ) {
    applyBtn.disabled = true;
    errorMsg.classList.add("show");
  } else {
    applyBtn.disabled = false;
    errorMsg.classList.remove("show");
  }
}

/**
 * フィルターを適用（OKボタン押下時）
 */
function applyFilter() {
  // 一時選択状態を適用済みに反映
  appliedVersions = [...tempSelectedVersions];
  appliedControls = [...tempSelectedControls];
  appliedApprovalFilter = tempApprovalFilter;
  appliedRecordMode = tempRecordMode;

  // ランキングを再描画
  renderRanking();

  // アコーディオンを閉じる
  if (isFilterOpen) {
    toggleFilter();
  }

  // GA4 イベント送信
  gtag("event", "filter_applied", {
    category: document.getElementById("category").value,
    course: document.getElementById("course").value,
    versions: appliedVersions.length > 0 ? appliedVersions.join(",") : "all",
    controls: appliedControls.length > 0 ? appliedControls.join(",") : "all",
    approval: appliedApprovalFilter,
    record_mode: appliedRecordMode,
  });
}

// ========================================
// ソート機能
// ========================================

/**
 * ランキングのソート処理
 * @param {string} column - ソート対象の列名
 */
function sortRanking(column) {
  // 同じ列をクリックした場合は昇順/降順を切り替え
  if (currentSort.column === column) {
    currentSort.order = currentSort.order === "asc" ? "desc" : "asc";
  } else {
    // 別の列の場合、デフォルトの順序を設定
    currentSort.column = column;
    currentSort.order = column === "タイム" ? "asc" : "asc";
  }

  renderRanking();
}

// ========================================
// レンダリング
// ========================================

/**
 * コース説明リンクを更新
 */
function updateCourseLink(category, course) {
  const row = document.getElementById("courseLinkRow");
  const anchor = document.getElementById("courseLinkAnchor");

  if (!category || !course) {
    row.style.display = "none";
    return;
  }

  const courseInfo = courseMaster.find(
    (c) => c["大会種別"] === category && c["コース名"] === course,
  );

  if (courseInfo && courseInfo["コースlink"]) {
    anchor.href = courseInfo["コースlink"];
    row.style.display = "";
  } else {
    row.style.display = "none";
  }
}

/**
 * ランキングテーブルをレンダリング
 */
function renderRanking() {
  const category = document.getElementById("category").value;
  const course = document.getElementById("course").value;
  const rankingTable = document.getElementById("rankingTable");

  // コース説明リンクの更新
  updateCourseLink(category, course);

  // 大会種別・コース未選択時
  if (!category || !course) {
    rankingTable.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎮</div>
        <h2>大会種別とコースを選択してください</h2>
        <p>上記のフィルターから表示したいランキングを選んでください</p>
      </div>
    `;
    return;
  }

  // データフィルタリング
  let filteredData = allData.filter(
    (row) => row["大会種別"] === category && row["コース名"] === course,
  );

  // 適用済みバージョンフィルター
  if (appliedVersions.length > 0) {
    filteredData = filteredData.filter((row) =>
      appliedVersions.includes(row["バージョン"]),
    );
  }

  // 適用済み操作方法フィルター
  if (appliedControls.length > 0) {
    filteredData = filteredData.filter((row) =>
      appliedControls.includes(row["操作方法"]),
    );
  }

  // 適用済み承認フィルター
  if (appliedApprovalFilter === "approved") {
    filteredData = filteredData.filter((row) => row["承認状態"] === "OK");
  }

  // プレイヤーごとに最速タイム1件に絞る
  if (appliedRecordMode === "best") {
    const bestByPlayer = new Map();
    filteredData.forEach((row) => {
      const player = row["ユーザー名"];
      const existing = bestByPlayer.get(player);
      if (!existing || parseFloat(row["タイム"]) < parseFloat(existing["タイム"])) {
        bestByPlayer.set(player, row);
      }
    });
    filteredData = Array.from(bestByPlayer.values());
  }

  // ソート処理
  filteredData.sort((a, b) => {
    let valueA, valueB;

    if (currentSort.column === "タイム") {
      valueA = parseFloat(a["タイム"]);
      valueB = parseFloat(b["タイム"]);
    } else if (currentSort.column === "記録日") {
      valueA = new Date(a["記録日"]).getTime();
      valueB = new Date(b["記録日"]).getTime();
    } else if (currentSort.column === "ユーザー名") {
      valueA = (a["ユーザー名"] || "").toLowerCase();
      valueB = (b["ユーザー名"] || "").toLowerCase();
      return currentSort.order === "asc"
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    }

    return currentSort.order === "asc"
      ? valueA - valueB
      : valueB - valueA;
  });

  // データなしの場合
  if (filteredData.length === 0) {
    rankingTable.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <h2>該当するレコードがありません</h2>
        <p>フィルター条件を変更してみてください</p>
      </div>
    `;
    return;
  }

  // テーブル生成
  let html = `
    <table>
      <thead>
        <tr>
          <th class="sortable ${currentSort.column === "ユーザー名" ? "sort-" + currentSort.order : ""}"
              onclick="sortRanking('ユーザー名')">プレイヤー</th>
          <th class="sortable ${currentSort.column === "タイム" ? "sort-" + currentSort.order : ""}"
              onclick="sortRanking('タイム')">タイム</th>
          <th class="sortable ${currentSort.column === "記録日" ? "sort-" + currentSort.order : ""}"
              onclick="sortRanking('記録日')">記録日</th>
          <th>操作</th>
          <th>バージョン</th>
          <th>動画</th>
          <th>状態</th>
          <th>補足</th>
        </tr>
      </thead>
      <tbody>
  `;

  filteredData.forEach((row) => {
    const statusClass =
      row["承認状態"] === "OK" ? "status-approved" : "status-pending";
    const statusText = row["承認状態"] === "OK" ? "承認済" : "未承認";

    // プレイヤー名からXのURLを生成
    const username = row["ユーザー名"] || "";
    const xHandle = username.startsWith("@")
      ? username.slice(1)
      : username;
    const playerDisplay = xHandle
      ? `<a href="player.html?user=${encodeURIComponent(username)}" class="player-link" onclick="gtag('event','select_player',{player_name:'${username}',source:'ranking',category:'${category}',course:'${course}'})">${username}</a>`
      : "-";

    // 操作方法のアイコンを取得
    const controlIcon =
      controlIconMap[row["操作方法"]] || row["操作方法"] || "-";

    // 補足事項ボタン
    const noteText = row["補足事項"] || "";
    const noteCell = noteText
      ? `<button class="note-btn" data-note="${noteText.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}" onclick="openNoteModal(this.dataset.note)">i</button>`
      : "";

    html += `
      <tr>
        <td>${playerDisplay}</td>
        <td><strong>${row["タイム"]}秒</strong></td>
        <td>${formatDate(row["記録日"])}</td>
        <td class="control-cell">${controlIcon}</td>
        <td>${row["バージョン"] || "-"}</td>
        <td>${row["リンク"] ? `<a href="${row["リンク"]}" target="_blank" class="video-link" onclick="gtag('event','click_video_link',{player_name:'${username}',course:'${row["コース名"]}',category:'${row["大会種別"]}',source:'ranking'})">▶</a>` : "-"}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>${noteCell}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  rankingTable.innerHTML = html;
}

/**
 * 最近の申請テーブルをレンダリング
 */
function renderRecentSubmissions() {
  const container = document.getElementById("recentSubmissionsTable");

  if (allData.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><p>申請データがありません</p></div>';
    return;
  }

  // タイムスタンプでソート（新しい順）
  const sortedData = [...allData].sort((a, b) => {
    const dateA = new Date(a["タイムスタンプ"]);
    const dateB = new Date(b["タイムスタンプ"]);
    return dateB - dateA;
  });

  // 最新5件を取得
  const recentData = sortedData.slice(0, 5);

  let html = `
    <table>
      <thead>
        <tr>
          <th>申請日時</th>
          <th>大会種別</th>
          <th>コース</th>
          <th>プレイヤー</th>
          <th>タイム</th>
          <th>記録日</th>
          <th>操作</th>
          <th>バージョン</th>
          <th>動画</th>
        </tr>
      </thead>
      <tbody>
  `;

  recentData.forEach((row) => {
    const username = row["ユーザー名"] || "";
    const xHandle = username.startsWith("@")
      ? username.slice(1)
      : username;
    const playerDisplay = xHandle
      ? `<a href="player.html?user=${encodeURIComponent(username)}" class="player-link" onclick="gtag('event','select_player',{player_name:'${username}',source:'recent',category:'${row["大会種別"] || ""}',course:'${row["コース名"] || ""}'})">${username}</a>`
      : "-";

    // 操作方法のアイコンを取得
    const controlIcon =
      controlIconMap[row["操作方法"]] || row["操作方法"] || "-";

    html += `
      <tr>
        <td class="datetime-cell"><span class="date-part">${formatDate(row["タイムスタンプ"])}</span><span class="time-part">${formatTime(row["タイムスタンプ"])}</span></td>
        <td>${row["大会種別"] || "-"}</td>
        <td>${row["コース名"] || "-"}</td>
        <td>${playerDisplay}</td>
        <td><strong>${row["タイム"]}秒</strong></td>
        <td>${formatDate(row["記録日"])}</td>
        <td class="control-cell">${controlIcon}</td>
        <td>${row["バージョン"] || "-"}</td>
        <td>${row["リンク"] ? `<a href="${row["リンク"]}" target="_blank" class="video-link" onclick="gtag('event','click_video_link',{player_name:'${username}',course:'${row["コース名"]}',category:'${row["大会種別"]}',source:'recent'})">▶</a>` : "-"}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

// ========================================
// アプリケーション起動
// ========================================
init();
