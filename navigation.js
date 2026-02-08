/**
 * navigation.js
 *
 * Sky Air Race 記録システム - ナビゲーション管理
 *
 * 機能概要:
 * - ハンバーガーメニューの生成とスタイル適用
 * - メニューの開閉制御とアニメーション
 * - 現在のページのハイライト表示
 * - レスポンシブ対応（モバイル・デスクトップ）
 */

// ========================================
// ナビゲーション初期化
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
      </ul>
      
      <!-- メニューフッター -->
      <div class="menu-footer">
        <p class="menu-footer-text">改善・要望はRemyiの<a href="https://x.com/Re_myi_" target="_blank"> X </a>または<a href="https://marshmallow-qa.com/re_myi_" target="_blank"> マシュマロ </a>まで</p>
      </div>
    </nav>
  `;
}

// ========================================
// イベント処理
// ========================================

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

  // ESCキー → メニューを閉じる
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sideMenu.classList.contains("open")) {
      closeMenu();
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
// スタイル定義
// ========================================

/**
 * ナビゲーション用のCSSスタイルを動的に追加
 * ページ読み込み時に自動実行される
 */
function injectNavigationStyles() {
  const style = document.createElement("style");
  style.textContent = `
    /* ========================================
       ハンバーガーボタン
       ======================================== */
    .hamburger-btn {
      position: fixed;
      top: 0;
      right: 0;
      z-index: 1001;
      width: 50px;
      height: 50px;
      background: white;
      border: none;
      border-radius: 0 0 0 12px; /* 右上角を直角、左下のみ丸く */
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    /* メニュー開閉時にボタンを非表示 */
    .hamburger-btn.active {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }
    
    /* ホバー時の拡大効果 */
    .hamburger-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
    
    /* ハンバーガーアイコンの線 */
    .hamburger-line {
      width: 24px;
      height: 3px;
      background: #667eea;
      border-radius: 2px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    /* メニュー開閉時のアイコンアニメーション（×印への変形） */
    .hamburger-btn.active .hamburger-line:nth-child(1) {
      transform: translateY(9px) rotate(45deg);
    }
    
    .hamburger-btn.active .hamburger-line:nth-child(2) {
      opacity: 0;
      transform: scaleX(0);
    }
    
    .hamburger-btn.active .hamburger-line:nth-child(3) {
      transform: translateY(-9px) rotate(-45deg);
    }
    
    /* ========================================
       オーバーレイ（背景の暗転）
       ======================================== */
    .menu-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 999;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(2px);
    }
    
    .menu-overlay.active {
      opacity: 1;
      visibility: visible;
    }
    
    /* ========================================
       サイドメニュー（右側からスライド）
       ======================================== */
    .side-menu {
      position: fixed;
      top: 0;
      right: 0;
      width: 280px;
      height: 100%;
      background: white;
      z-index: 1000;
      transform: translateX(100%); /* 初期状態は右側に隠す */
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
    }
    
    /* メニューを表示 */
    .side-menu.open {
      transform: translateX(0);
    }
    
    /* メニューヘッダー */
    .menu-header {
      padding: 24px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-align: center;
    }
    
    .menu-title {
      font-size: 1.4em;
      font-weight: 700;
      margin: 0;
      line-height: 1.3;
    }
    
    .menu-subtitle {
      font-size: 0.7em;
      font-weight: 500;
      opacity: 0.95;
    }
    
    /* メニューリスト */
    .menu-list {
      list-style: none;
      padding: 20px 0;
      margin: 0;
      flex: 1;
    }
    
    /* メニュー項目 */
    .menu-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 24px;
      color: #333;
      text-decoration: none;
      transition: all 0.2s;
      position: relative;
    }
    
    /* 左側のアクセントバー（ホバー・選択時に表示） */
    .menu-item::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      width: 4px;
      background: #667eea;
      transform: scaleY(0);
      transition: transform 0.2s;
    }
    
    /* ホバー時の背景色変更 */
    .menu-item:hover {
      background: #f5f5f5;
    }
    
    /* ホバー・選択時のアクセントバー表示 */
    .menu-item:hover::before,
    .menu-item.active::before {
      transform: scaleY(1);
    }
    
    /* 現在のページ */
    .menu-item.active {
      background: #f0f4ff;
      color: #667eea;
      font-weight: 600;
    }
    
    .menu-icon {
      font-size: 1.5em;
    }
    
    .menu-label {
      font-size: 1.1em;
    }
    
    /* メニューフッター */
    .menu-footer {
      padding: 20px;
      border-top: 1px solid #e0e0e0;
      background: #f9f9f9;
    }
    
    .menu-footer-text {
      font-size: 0.85em;
      color: #666;
      margin: 0;
      line-height: 1.5;
    }
    
    .menu-footer-text a {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
    }
    
    .menu-footer-text a:hover {
      text-decoration: underline;
    }
    
    /* ========================================
       レスポンシブ対応（モバイル）
       ======================================== */
    @media (max-width: 600px) {
      /* モバイルではメニュー幅を固定 */
      .side-menu {
        width: 200px;
      }
      
      /* ハンバーガーボタンを小さく */
      .hamburger-btn {
        top: 0;
        right: 0;
        width: 45px;
        height: 45px;
        border-radius: 0 0 0 10px;
      }
      
      /* メニュー項目を小さく */
      .menu-item {
        padding: 12px 16px; /* パディングを減らす */
        gap: 12px; /* アイコンとテキストの間隔を狭く */
      }
      
      /* 絵文字アイコンを小さく */
      .menu-icon {
        font-size: 1.2em;
      }
      
      /* テキストラベルを小さく */
      .menu-label {
        font-size: 0.9em;
      }
    }
  `;

  document.head.appendChild(style);
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
    injectNavigationStyles();
    initNavigation();
  });
} else {
  injectNavigationStyles();
  initNavigation();
}
