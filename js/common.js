/**
 * common.js
 *
 * Sky Air Race 記録システム - 共通モジュール
 *
 * 内容:
 * - 共通定数（CONTROL_TYPES）
 * - 共通ユーティリティ関数（formatDate, getUrlParams）
 * - ナビゲーション管理（旧 navigation.js）
 */

// ========================================
// 共通定数
// ========================================

// 操作方法の表示用アイコンマッピング
const CONTROL_TYPES = {
  タッチ: "👆",
  "タッチ（箒あり）": "👆🧹",
  コントローラー: "🎮",
  "コントローラー（箒あり）": "🎮🧹",
};

// ========================================
// 共通ユーティリティ関数
// ========================================

/**
 * ISO日付文字列を "YYYY/MM/DD" 形式にフォーマット
 * @param {string} dateString - ISO形式の日付文字列
 * @returns {string} フォーマットされた日付
 */
function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "-";

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}/${m}/${d}`;
}

/**
 * URLクエリパラメータを取得
 * @returns {Object} パラメータのキーバリューペア
 */
function getUrlParams() {
  const params = {};
  const searchParams = new URLSearchParams(window.location.search);
  for (const [key, value] of searchParams) {
    params[key] = value;
  }
  return params;
}

// ========================================
// ナビゲーション（旧 navigation.js）
// ========================================

/**
 * ページにナビゲーションメニューを追加
 * DOMContentLoaded時に自動実行される
 */
function initNavigation() {
  // ナビゲーションHTMLを生成してページに挿入
  const navHTML = createNavigationHTML();
  document.body.insertAdjacentHTML("afterbegin", navHTML);

  // イベントリスナーを設定
  setupNavigationEvents();

  // 現在のページをハイライト表示
  highlightCurrentPage();

  // 補足事項モーダルを初期化
  initNoteModal();

  console.log("✓ ナビゲーション初期化完了");
}

/**
 * ナビゲーションのHTML構造を生成
 * @returns {string} ナビゲーション全体のHTML文字列
 */
function createNavigationHTML() {
  return `
    <!-- ハンバーガーメニューボタン（右上固定） -->
    <button id="hamburgerBtn" class="hamburger-btn" aria-label="メニューを開く">
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
    </button>

    <!-- オーバーレイ（背景クリックでメニューを閉じる） -->
    <div id="menuOverlay" class="menu-overlay"></div>

    <!-- サイドメニュー（右側からスライド） -->
    <nav id="sideMenu" class="side-menu">
      <!-- メニューヘッダー -->
      <div class="menu-header">
        <h2 class="menu-title">Sky Air Race<br><span class="menu-subtitle">記録まとめ</span></h2>
      </div>

      <!-- メニュー項目 -->
      <ul class="menu-list">
        <li>
          <a href="index.html" class="menu-item" data-page="index">
            <span class="menu-icon">📊</span>
            <span class="menu-label">レコードリスト</span>
          </a>
        </li>
        <li>
          <a href="player.html" class="menu-item" data-page="player">
            <span class="menu-icon">👤</span>
            <span class="menu-label">プレイヤー</span>
          </a>
        </li>
        <li>
          <a href="about.html" class="menu-item" data-page="about">
            <span class="menu-icon">📄</span>
            <span class="menu-label">サイトについて</span>
          </a>
        </li>
      </ul>

      <!-- メニューフッター -->
      <div class="menu-footer">
        <p class="menu-footer-text">改善・要望はRemyiの<a href="https://x.com/Re_myi_" target="_blank"> X </a>または<a href="https://marshmallow-qa.com/re_myi_" target="_blank"> マシュマロ </a>まで</p>
      </div>
    </nav>
  `;
}

/**
 * ナビゲーションのイベントリスナーを設定
 * ボタンクリック、オーバーレイクリック、ESCキー処理を登録
 */
function setupNavigationEvents() {
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const menuOverlay = document.getElementById("menuOverlay");
  const sideMenu = document.getElementById("sideMenu");

  // ハンバーガーボタンクリック → メニュー開閉切り替え
  hamburgerBtn.addEventListener("click", () => {
    sideMenu.classList.contains("open") ? closeMenu() : openMenu();
  });

  // オーバーレイクリック → メニューを閉じる
  menuOverlay.addEventListener("click", closeMenu);

  // ESCキー → メニューまたはモーダルを閉じる
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (sideMenu.classList.contains("open")) {
        closeMenu();
      }
      closeNoteModal();
    }
  });
}

/**
 * メニューを開く
 * ハンバーガーアイコンを非表示にし、オーバーレイとメニューを表示
 */
function openMenu() {
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const menuOverlay = document.getElementById("menuOverlay");
  const sideMenu = document.getElementById("sideMenu");

  hamburgerBtn.classList.add("active");
  menuOverlay.classList.add("active");
  sideMenu.classList.add("open");

  // スクロールを無効化（メニュー表示中は背景をスクロールさせない）
  document.body.style.overflow = "hidden";
}

/**
 * メニューを閉じる
 * ハンバーガーアイコンを表示に戻し、オーバーレイとメニューを非表示
 */
function closeMenu() {
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const menuOverlay = document.getElementById("menuOverlay");
  const sideMenu = document.getElementById("sideMenu");

  hamburgerBtn.classList.remove("active");
  menuOverlay.classList.remove("active");
  sideMenu.classList.remove("open");

  // スクロールを再有効化
  document.body.style.overflow = "";
}

/**
 * 現在のページのメニュー項目をハイライト表示
 * URLから現在のページを判定し、該当メニュー項目にactiveクラスを付与
 */
function highlightCurrentPage() {
  const currentPage =
    window.location.pathname.split("/").pop().replace(".html", "") || "index";
  const menuItems = document.querySelectorAll(".menu-item");

  menuItems.forEach((item) => {
    if (item.dataset.page === currentPage) {
      item.classList.add("active");
    }
  });
}

// ========================================
// 補足事項モーダル
// ========================================

/**
 * 補足事項モーダルをDOMに挿入してイベントを設定
 */
function initNoteModal() {
  const overlay = document.createElement("div");
  overlay.id = "noteModalOverlay";
  overlay.className = "note-modal-overlay";
  overlay.innerHTML = `
    <div class="note-modal">
      <button class="note-modal-close" onclick="closeNoteModal()">✕</button>
      <div class="note-modal-title">補足事項</div>
      <div class="note-modal-body" id="noteModalBody"></div>
    </div>
  `;
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeNoteModal();
  });
  document.body.appendChild(overlay);
}

/**
 * 補足事項モーダルを表示
 * @param {string} text - 表示するテキスト
 */
function openNoteModal(text) {
  document.getElementById("noteModalBody").textContent = text;
  document.getElementById("noteModalOverlay").classList.add("active");
}

/**
 * 補足事項モーダルを閉じる
 */
function closeNoteModal() {
  const overlay = document.getElementById("noteModalOverlay");
  if (overlay) overlay.classList.remove("active");
}

// ========================================
// 自動初期化
// ========================================

/**
 * DOMContentLoaded時にナビゲーションを自動初期化
 * 既に読み込み済みの場合は即座に実行
 */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
  });
} else {
  initNavigation();
}

// ツールチップの外側クリックで閉じる
document.addEventListener("click", (e) => {
  document.querySelectorAll(".approval-tooltip[open]").forEach((details) => {
    if (!details.contains(e.target)) {
      details.removeAttribute("open");
    }
  });
});
