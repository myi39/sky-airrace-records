// ========================================
// 状態管理
// ========================================
let currentPlayer = null; // 現在選択中のプレイヤー
let selectedVersion = "0.24.5~"; // 選択中のバージョン（デフォルト: 最新）
let allPlayers = []; // 全プレイヤーのリスト

// フィルター状態（全提出記録用）
let recordsCategory = ""; // 選択された大会種別
let recordsCourse = ""; // 選択されたコース
let tempRecordsSelectedVersions = []; // 一時選択されたバージョン
let tempRecordsSelectedControls = []; // 一時選択された操作方法
let tempRecordsApprovalFilter = "all"; // 一時選択された承認フィルター
let isRecordsFilterOpen = false;

// データストア
let allData = [];
let courseMaster = [];
let versionMaster = [];

// ========================================
// データ読み込みとヘルパー関数
// ========================================

/**
 * data.jsonを読み込む
 */
async function loadData() {
  try {
    const url = `./data.json?ts=${Date.now()}`;
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`データ読み込み失敗: ${response.status}`);
    }

    const data = await response.json();
    allData = data.records || [];
    courseMaster = data.courseMaster || [];
    versionMaster = data.versionMaster || [];

    console.log(`✓ データ読み込み完了: ${allData.length}件の記録`);
  } catch (error) {
    console.error("データ読み込みエラー:", error);
    throw error;
  }
}

/**
 * 全プレイヤーのリストを取得
 */
function getAllPlayers() {
  const playerSet = new Set();
  allData.forEach((record) => {
    if (record["ユーザー名"]) {
      playerSet.add(record["ユーザー名"]);
    }
  });
  return Array.from(playerSet).sort();
}

/**
 * 特定プレイヤーの全記録を取得
 */
function getPlayerRecords(username) {
  return allData.filter((record) => record["ユーザー名"] === username);
}

/**
 * 特定プレイヤーのベストタイムをコースごとに取得
 */
function getPlayerBestTimes(username, targetVersion = "0.24.5~") {
  const playerRecords = allData.filter(
    (record) =>
      record["ユーザー名"] === username &&
      record["バージョン"] === targetVersion,
  );

  const bestTimes = {};

  playerRecords.forEach((record) => {
    const key = `${record["大会種別"]}_${record["コース名"]}`;
    const currentTime = parseFloat(record["タイム"]);

    if (
      !bestTimes[key] ||
      currentTime < parseFloat(bestTimes[key]["タイム"])
    ) {
      bestTimes[key] = record;
    }
  });

  return bestTimes;
}

/**
 * 大会種別ごとにコースをグループ化
 */
function getCoursesByCategory() {
  const grouped = {};

  courseMaster.forEach((course) => {
    const category = course["大会種別"];
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(course["コース名"]);
  });

  return grouped;
}

/**
 * Xのユーザー名からハンドル部分を抽出
 */
function getXHandle(username) {
  if (!username) return "";
  return username.startsWith("@") ? username.slice(1) : username;
}

// ========================================
// アプリケーション初期化
// ========================================
async function init() {
  console.log("✓ プレイヤーページ: 初期化開始");

  // データ読み込み
  await loadData();

  // プレイヤーリスト取得
  allPlayers = getAllPlayers();
  console.log(`✓ プレイヤー数: ${allPlayers.length}人`);

  // イベントリスナー設定
  setupEventListeners();

  // URLクエリパラメータを確認
  applyUrlParams();
}

/**
 * イベントリスナー設定
 */
function setupEventListeners() {
  const searchInput = document.getElementById("playerSearchInput");
  const suggestionsEl = document.getElementById("playerSuggestions");

  // 検索入力時
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    if (query.length > 0) {
      showSuggestions(query);
    } else {
      hideSuggestions();
    }
  });

  // フォーカス時（候補を再表示）
  searchInput.addEventListener("focus", (e) => {
    const query = e.target.value.trim();
    if (query.length > 0) {
      showSuggestions(query);
    }
  });

  // 外側クリックで候補を閉じる
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-box-wrapper")) {
      hideSuggestions();
    }
  });

  // ウィンドウリサイズ時にカードサイズを再調整
  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      adjustCardSizes();
    }, 100);
  });

  // ハンバーガーメニュー外をクリックした時にメニューを閉じる
  document.addEventListener("click", (e) => {
    const navMenu = document.querySelector(".nav-menu");
    const hamburger = document.querySelector(".hamburger-icon");
    const overlay = document.querySelector(".nav-overlay");

    // メニューが開いている場合のみ処理
    if (navMenu && navMenu.classList.contains("active")) {
      // メニュー内、ハンバーガーアイコンをクリックした場合は何もしない
      if (
        !e.target.closest(".nav-menu") &&
        !e.target.closest(".hamburger-icon")
      ) {
        // メニューを閉じる
        navMenu.classList.remove("active");
        if (hamburger) hamburger.classList.remove("active");
        if (overlay) overlay.classList.remove("active");
        document.body.style.overflow = "";
      }
    }
  });
}

/**
 * URLクエリパラメータからプレイヤーを読み取って表示
 */
function applyUrlParams() {
  const params = getUrlParams();
  if (params.user) {
    selectPlayer(params.user);
  }
}

/**
 * 検索候補を表示
 * @param {string} query - 検索クエリ
 */
function showSuggestions(query) {
  const suggestionsEl = document.getElementById("playerSuggestions");
  const lowerQuery = query.toLowerCase();

  // 候補をフィルタリング
  const matches = allPlayers.filter((player) =>
    player.toLowerCase().includes(lowerQuery),
  );

  // 候補リストを生成
  if (matches.length > 0) {
    suggestionsEl.innerHTML = matches
      .slice(0, 10) // 最大10件
      .map(
        (player) => `
        <div class="suggestion-item" onclick="selectPlayer('${player}')">
          ${player}
        </div>
      `,
      )
      .join("");
  } else {
    suggestionsEl.innerHTML =
      '<div class="suggestion-item no-results">該当するプレイヤーが見つかりません</div>';
  }

  suggestionsEl.classList.add("show");
}

/**
 * 検索候補を非表示
 */
function hideSuggestions() {
  const suggestionsEl = document.getElementById("playerSuggestions");
  suggestionsEl.classList.remove("show");
}

/**
 * プレイヤーを選択してページを更新
 * @param {string} username - プレイヤー名
 */
function selectPlayer(username) {
  currentPlayer = username;

  // URLを更新（履歴に追加）
  const newUrl = `${window.location.pathname}?user=${encodeURIComponent(username)}`;
  window.history.pushState({}, "", newUrl);

  // 検索ボックスを更新
  document.getElementById("playerSearchInput").value = username;
  hideSuggestions();

  // プレイヤーデータを表示
  renderPlayerOverview();
  renderStampRally();
  initRecordsFilter(); // フィルター初期化
  renderRecordsTable();

  // 案内を非表示、セクションを表示
  document.getElementById("searchGuide").style.display = "none";
  document.getElementById("playerOverview").style.display = "block";
  document.getElementById("stampRallySection").style.display = "block";
  document.getElementById("recordsSection").style.display = "block";
}

/**
 * プレイヤー概要を表示
 */
function renderPlayerOverview() {
  const playerNameLink = document.getElementById("playerNameLink");
  const totalRecordsCount = document.getElementById("totalRecordsCount");
  const completedCoursesCount = document.getElementById(
    "completedCoursesCount",
  );

  // X（Twitter）リンク
  const xHandle = getXHandle(currentPlayer);
  playerNameLink.textContent = currentPlayer;
  playerNameLink.href = `https://x.com/${xHandle}`;

  // 総提出記録数
  const playerRecords = getPlayerRecords(currentPlayer);
  totalRecordsCount.textContent = playerRecords.length;

  // 記録済みコース数（重複なし）
  const uniqueCourses = new Set();
  playerRecords.forEach((record) => {
    uniqueCourses.add(`${record["大会種別"]}_${record["コース名"]}`);
  });
  completedCoursesCount.textContent = uniqueCourses.size;
}

/**
 * スタンプラリー型サマリーを表示
 */
function renderStampRally() {
  renderVersionButtons();
  renderStampGrid();
}

/**
 * バージョンボタンを生成
 */
function renderVersionButtons() {
  const container = document.getElementById("versionButtons");

  // versionMasterから全バージョンを取得
  const versions = versionMaster.map((v) => v["バージョン"]);

  // 各バージョンでのコース数を計算
  const playerRecords = getPlayerRecords(currentPlayer);

  container.innerHTML = versions
    .map((version) => {
      // このバージョンで記録があるコースを重複なしで取得
      const coursesInVersion = new Set();
      playerRecords.forEach((record) => {
        if (record["バージョン"] === version) {
          coursesInVersion.add(
            `${record["大会種別"]}_${record["コース名"]}`,
          );
        }
      });

      const courseCount = coursesInVersion.size;

      return `
      <button
        class="version-btn ${version === selectedVersion ? "selected" : ""}"
        onclick="changeVersion('${version}')"
      >
        <span class="version-name">${version}</span>
        <span class="version-course-count">${courseCount}コース</span>
      </button>
    `;
    })
    .join("");
}

/**
 * バージョン変更
 * @param {string} version - 選択されたバージョン
 */
function changeVersion(version) {
  selectedVersion = version;
  renderVersionButtons();
  renderStampGrid();
}

/**
 * スタンプラリーグリッドを生成
 */
function renderStampGrid() {
  const container = document.getElementById("stampRallyGrid");

  // プレイヤーのベストタイムを取得
  const bestTimes = getPlayerBestTimes(currentPlayer, selectedVersion);

  // 大会種別ごとにコースをグループ化
  const coursesByCategory = getCoursesByCategory();

  // グリッドHTML生成
  let html = "";

  for (const category in coursesByCategory) {
    const courses = coursesByCategory[category];

    html += `
      <div class="category-group">
        <div class="category-header">${category}</div>
        <div class="course-grid">
    `;

    courses.forEach((courseName) => {
      const key = `${category}_${courseName}`;
      const record = bestTimes[key];

      if (record) {
        // 記録あり
        html += `
          <div class="course-card has-record" onclick="navigateToCourse('${category}', '${courseName}')">
            <div class="course-name">${courseName}</div>
            <div class="course-time">${record["タイム"]}</div>
            <div class="course-date">${formatDate(record["記録日"])}</div>
          </div>
        `;
      } else {
        // 記録なし
        html += `
          <div class="course-card no-record" onclick="navigateToCourse('${category}', '${courseName}')">
            <div class="course-name">${courseName}</div>
            <div class="course-time">-</div>
            <div class="course-date"></div>
          </div>
        `;
      }
    });

    html += `
        </div>
      </div>
    `;
  }

  container.innerHTML = html;

  // カードサイズを調整
  adjustCardSizes();
}

/**
 * カードのサイズを動的に調整
 * 横幅: stamprallygridの横幅からカード5つと動的な隙間4つを考慮して計算
 * 縦幅: 横幅と同じだが、100pxが上限
 * フォントサイズ: カードサイズに応じて動的に調整
 */
function adjustCardSizes() {
  // 少し遅延を入れて、DOMが完全にレンダリングされてから実行
  setTimeout(() => {
    const grids = document.querySelectorAll(".course-grid");

    grids.forEach((grid) => {
      // グリッドの横幅を取得
      const gridWidth = grid.offsetWidth;

      // カード間の隙間をグリッド幅の2%に設定（動的）
      const gapSize = gridWidth * 0.02;
      grid.style.gap = `${gapSize}px`;

      // カード1つの横幅を計算（隙間4つ分を引く）
      const cardWidth = (gridWidth - gapSize * 4) / 5;

      // カードの縦幅は横幅と同じだが、100pxが上限
      const cardHeight = Math.min(cardWidth, 100);

      // フォントサイズをカードサイズに応じて調整
      // ベースサイズに対するスケール比率を計算（100pxを基準とする）
      const scale = cardHeight / 100;

      // このグリッド内の全カードにサイズとフォントサイズを適用
      const cards = grid.querySelectorAll(".course-card");
      cards.forEach((card) => {
        card.style.width = `${cardWidth}px`;
        card.style.height = `${cardHeight}px`;

        // 各要素のフォントサイズを調整
        const courseName = card.querySelector(".course-name");
        const courseTime = card.querySelector(".course-time");
        const courseDate = card.querySelector(".course-date");

        // コースタイムのサイズを設定
        if (courseTime) {
          courseTime.style.fontSize = `${1.3 * scale}em`;
        }

        // コース名のサイズを決定
        if (courseName) {
          const hasJapanese =
            /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(
              courseName.textContent,
            );

          // 日本語なしコース名の基本サイズを計算
          const baseCourseFontSize = 0.95 * scale;

          if (hasJapanese) {
            // 日本語が含まれる場合
            // まず日本語なしコース名のサイズを設定して、実際のピクセルサイズを取得
            courseName.style.fontSize = `${baseCourseFontSize}em`;

            setTimeout(() => {
              const baseCoursePixelSize = parseFloat(
                getComputedStyle(courseName).fontSize,
              );

              if (baseCoursePixelSize >= 10) {
                // 基本サイズが10px以上の場合: -2px
                const japaneseSize = baseCoursePixelSize - 2;
                courseName.style.fontSize = `${japaneseSize}px`;

                // 2行になるかチェック
                setTimeout(() => {
                  const lineHeight = parseFloat(
                    getComputedStyle(courseName).lineHeight,
                  );
                  const actualHeight = courseName.offsetHeight;

                  if (actualHeight > lineHeight * 1.5) {
                    // 2行の場合は日本語なしコース名サイズの0.8倍
                    courseName.style.fontSize = `${baseCoursePixelSize * 0.8}px`;
                  }
                }, 10);
              } else {
                // 基本サイズが10px未満の場合: 8px固定
                courseName.style.fontSize = "8px";
              }
            }, 10);
          } else {
            // アルファベット・数字・記号のみの場合
            courseName.style.fontSize = `${baseCourseFontSize}em`;

            // 2行になるかチェック
            setTimeout(() => {
              const lineHeight = parseFloat(
                getComputedStyle(courseName).lineHeight,
              );
              const actualHeight = courseName.offsetHeight;

              if (actualHeight > lineHeight * 1.5) {
                // 2行の場合は現在のサイズの0.8倍
                const currentSize = parseFloat(
                  getComputedStyle(courseName).fontSize,
                );
                courseName.style.fontSize = `${currentSize * 0.8}px`;
              }
            }, 10);
          }
        }

        if (courseDate) {
          if (courseDate.textContent.trim() !== "" && courseName) {
            // courseName の最終ピクセルサイズを取得
            const courseNamePixelSize = parseFloat(
              getComputedStyle(courseName).fontSize,
            );
            // courseName の 0.6 倍
            courseDate.style.fontSize = `${courseNamePixelSize * 0.6}px`;
          } else {
            courseDate.style.fontSize = `${0.7 * scale}em`;
          }
        }
        card.classList.add("is-ready");
      });
    });
  }, 50);
}

/**
 * コースカードクリック時 → レコード一覧ページへ遷移
 * @param {string} category - 大会種別
 * @param {string} course - コース名
 */
function navigateToCourse(category, course) {
  const url = `index.html?category=${encodeURIComponent(category)}&course=${encodeURIComponent(course)}`;
  window.location.href = url;
}

/**
 * 提出記録一覧テーブルを表示（フィルター適用済み）
 */
function renderRecordsTable() {
  const tbody = document.getElementById("recordsTableBody");

  // プレイヤーの全記録を取得（申請日降順）
  let records = getPlayerRecords(currentPlayer).sort(
    (a, b) =>
      new Date(b["タイムスタンプ"]) - new Date(a["タイムスタンプ"]),
  );

  // フィルター適用
  records = records.filter((record) => {
    // 大会種別フィルター
    if (recordsCategory && record["大会種別"] !== recordsCategory) {
      return false;
    }

    // コースフィルター
    if (recordsCourse && record["コース名"] !== recordsCourse) {
      return false;
    }

    // バージョンフィルター
    if (
      tempRecordsSelectedVersions.length > 0 &&
      !tempRecordsSelectedVersions.includes(record["バージョン"])
    ) {
      return false;
    }

    // 操作方法フィルター
    if (
      tempRecordsSelectedControls.length > 0 &&
      !tempRecordsSelectedControls.includes(record["操作方法"])
    ) {
      return false;
    }

    // 承認フィルター
    if (
      tempRecordsApprovalFilter === "approved" &&
      record["承認状態"] !== "OK"
    ) {
      return false;
    }

    return true;
  });

  if (records.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="9" style="text-align: center;">該当する記録がありません</td></tr>';
    return;
  }

  // テーブル行を生成
  tbody.innerHTML = records
    .map((record) => {
      const statusClass =
        record["承認状態"] === "OK"
          ? "status-approved"
          : "status-pending";
      const statusText =
        record["承認状態"] === "OK" ? "承認済" : "未承認";
      const controlIcon =
        CONTROL_TYPES[record["操作方法"]] || record["操作方法"] || "-";

      return `
      <tr>
        <td>${formatDate(record["タイムスタンプ"])}</td>
        <td>${record["大会種別"] || "-"}</td>
        <td>${record["コース名"] || "-"}</td>
        <td><strong>${record["タイム"]}秒</strong></td>
        <td>${formatDate(record["記録日"])}</td>
        <td class="control-cell">${controlIcon}</td>
        <td>${record["バージョン"] || "-"}</td>
        <td>${record["リンク"] ? `<a href="${record["リンク"]}" target="_blank" class="video-link">▶</a>` : "-"}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
      </tr>
    `;
    })
    .join("");
}

// ========================================
// 全提出記録のフィルター機能
// ========================================

/**
 * フィルターを初期化（マスターから作成）
 */
function initRecordsFilter() {
  // 大会種別セレクトボックスを生成（マスターから）
  const categories = [
    ...new Set(courseMaster.map((item) => item["大会種別"])),
  ];
  const categorySelect = document.getElementById("recordsCategorySelect");
  categorySelect.innerHTML = '<option value="">すべて</option>';
  categories.forEach((cat) => {
    const playerRecords = getPlayerRecords(currentPlayer);
    const count = playerRecords.filter(
      (r) => r["大会種別"] === cat,
    ).length;
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = `${cat} （${count}件）`;
    categorySelect.appendChild(option);
  });

  // バージョンフィルターを生成（マスターから）
  const versionOptions = document.getElementById(
    "recordsVersionFilterOptions",
  );
  versionMaster.forEach((item) => {
    const version = item["バージョン"];
    const chip = document.createElement("div");
    chip.className = "filter-chip selected";
    chip.dataset.version = version;
    chip.textContent = version;
    chip.addEventListener("click", function () {
      this.classList.toggle("selected");
      onRecordsFilterChange();
    });
    versionOptions.appendChild(chip);
  });

  // 操作方法フィルターを生成（マスターから）
  const controlOptions = document.getElementById(
    "recordsControlFilterOptions",
  );
  Object.entries(CONTROL_TYPES).forEach(([controlType, icon]) => {
    const chip = document.createElement("div");
    chip.className = "filter-chip selected";
    chip.innerHTML = `<span class="filter-icon">${icon}</span>${controlType}`;
    chip.dataset.control = controlType;
    chip.addEventListener("click", function () {
      this.classList.toggle("selected");
      onRecordsFilterChange();
    });
    controlOptions.appendChild(chip);
  });

  // 承認の有無フィルターを生成
  const approvalOptions = document.getElementById(
    "recordsApprovalFilterOptions",
  );
  const approvalTypes = [
    { value: "all", label: "すべて" },
    { value: "approved", label: "承認済のみ" },
  ];
  approvalTypes.forEach((type) => {
    const item = document.createElement("div");
    item.className =
      type.value === "all" ? "approval-item selected" : "approval-item";
    item.dataset.value = type.value;
    item.innerHTML = `
      <div class="approval-indicator"></div>
      <span class="approval-label">${type.label}</span>
    `;
    item.addEventListener("click", () => {
      document
        .querySelectorAll("#recordsApprovalFilterOptions .approval-item")
        .forEach((el) => {
          el.classList.remove("selected");
        });
      item.classList.add("selected");
      onRecordsFilterChange();
    });
    approvalOptions.appendChild(item);
  });

  // 大会種別変更イベント
  categorySelect.addEventListener("change", onRecordsCategoryChange);

  // コース変更イベント
  const courseSelect = document.getElementById("recordsCourseSelect");
  courseSelect.addEventListener("change", updateRecordsFilterRecordCount);

  // アコーディオンイベント
  const header = document.getElementById("recordsFilterHeader");
  header.addEventListener("click", toggleRecordsFilterAccordion);

  // 表示ボタンイベント
  const applyBtn = document.getElementById("recordsApplyFilterBtn");
  applyBtn.addEventListener("click", applyRecordsFilter);

  // 初期化時は全選択状態
  tempRecordsSelectedVersions = versionMaster.map((v) => v["バージョン"]);
  tempRecordsSelectedControls = Object.keys(CONTROL_TYPES);
  tempRecordsApprovalFilter = "all";

  // 初期記録数を更新
  updateRecordsFilterRecordCount();
}

/**
 * 大会種別変更時の処理
 */
function onRecordsCategoryChange() {
  const category = document.getElementById("recordsCategorySelect").value;
  const courseSelect = document.getElementById("recordsCourseSelect");

  courseSelect.innerHTML =
    '<option value="">-- コースを選択してください --</option>';

  if (category) {
    courseSelect.disabled = false;

    // 選択された大会種別のコースを取得（マスターから）
    const courses = courseMaster.filter(
      (item) => item["大会種別"] === category,
    );
    const playerRecords = getPlayerRecords(currentPlayer);

    courses.forEach((item) => {
      const courseName = item["コース名"];
      const count = playerRecords.filter(
        (r) => r["大会種別"] === category && r["コース名"] === courseName,
      ).length;

      const option = document.createElement("option");
      option.value = courseName;
      option.textContent = `${courseName} （${count}件）`;
      courseSelect.appendChild(option);
    });
  } else {
    courseSelect.disabled = true;
  }

  updateRecordsFilterRecordCount();
}

/**
 * フィルター変更時の処理（記録数更新）
 */
function onRecordsFilterChange() {
  // 一時選択状態を更新
  tempRecordsSelectedVersions = [];
  document
    .querySelectorAll(
      "#recordsVersionFilterOptions .filter-chip.selected",
    )
    .forEach((chip) => {
      tempRecordsSelectedVersions.push(chip.dataset.version);
    });

  tempRecordsSelectedControls = [];
  document
    .querySelectorAll(
      "#recordsControlFilterOptions .filter-chip.selected",
    )
    .forEach((chip) => {
      tempRecordsSelectedControls.push(chip.dataset.control);
    });

  // 承認フィルター
  const selectedApproval = document.querySelector(
    "#recordsApprovalFilterOptions .approval-item.selected",
  );
  if (selectedApproval) {
    tempRecordsApprovalFilter = selectedApproval.dataset.value;
  }

  updateRecordsFilterRecordCount();
}

/**
 * フィルター記録数を更新
 */
function updateRecordsFilterRecordCount() {
  const category = document.getElementById("recordsCategorySelect").value;
  const course = document.getElementById("recordsCourseSelect").value;
  const playerRecords = getPlayerRecords(currentPlayer);

  // フィルター条件に合致する記録数を計算
  const filteredCount = playerRecords.filter((record) => {
    if (category && record["大会種別"] !== category) return false;
    if (course && record["コース名"] !== course) return false;
    if (
      tempRecordsSelectedVersions.length > 0 &&
      !tempRecordsSelectedVersions.includes(record["バージョン"])
    )
      return false;
    if (
      tempRecordsSelectedControls.length > 0 &&
      !tempRecordsSelectedControls.includes(record["操作方法"])
    )
      return false;
    if (
      tempRecordsApprovalFilter === "approved" &&
      record["承認状態"] !== "OK"
    )
      return false;
    return true;
  }).length;

  const countEl = document.getElementById("recordsFilterRecordCount");
  const errorEl = document.getElementById("recordsFilterError");
  const applyBtn = document.getElementById("recordsApplyFilterBtn");

  // バリデーション
  const isValid =
    tempRecordsSelectedVersions.length > 0 &&
    tempRecordsSelectedControls.length > 0;

  if (!isValid) {
    countEl.textContent = `記録数: -`;
    countEl.classList.add("error");
    errorEl.classList.add("show");
    applyBtn.disabled = true;
  } else {
    countEl.textContent = `記録数: ${filteredCount}件`;
    countEl.classList.remove("error");
    errorEl.classList.remove("show");
    applyBtn.disabled = false;
  }
}

/**
 * フィルターを適用してテーブルを更新
 */
function applyRecordsFilter() {
  recordsCategory = document.getElementById(
    "recordsCategorySelect",
  ).value;
  recordsCourse = document.getElementById("recordsCourseSelect").value;
  renderRecordsTable();

  // フィルターを閉じる
  const header = document.getElementById("recordsFilterHeader");
  const content = document.getElementById("recordsFilterContent");
  header.classList.remove("active");
  content.classList.remove("open");
  isRecordsFilterOpen = false;
}

/**
 * フィルターアコーディオンの開閉
 */
function toggleRecordsFilterAccordion() {
  const header = document.getElementById("recordsFilterHeader");
  const content = document.getElementById("recordsFilterContent");

  isRecordsFilterOpen = !isRecordsFilterOpen;

  if (isRecordsFilterOpen) {
    header.classList.add("active");
    content.classList.add("open");
  } else {
    header.classList.remove("active");
    content.classList.remove("open");
  }
}

// ========================================
// アプリケーション起動
// ========================================
init();
