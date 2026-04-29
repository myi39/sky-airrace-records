(async () => {
  const res = await fetch("./data.json?ts=" + Date.now(), {
    cache: "no-store",
  });
  const json = await res.json();
  const courseMaster = json.courseMaster || [];

  const categorySelect = document.getElementById("category");
  const courseSelect = document.getElementById("course");

  const categories = [...new Set(courseMaster.map((item) => item["大会種別"]))];
  categories.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  });

  categorySelect.addEventListener("change", () => {
    const selected = categorySelect.value;
    if (selected) {
      courseSelect.innerHTML =
        '<option value="">コースを選んでください</option>';
      courseSelect.disabled = false;
      courseMaster
        .filter((item) => item["大会種別"] === selected)
        .forEach((item) => {
          const opt = document.createElement("option");
          opt.value = item["コース名"];
          opt.textContent = item["コース名"];
          courseSelect.appendChild(opt);
        });
    } else {
      courseSelect.innerHTML =
        '<option value="">大会種別を先に選んでください</option>';
      courseSelect.disabled = true;
    }
  });

  document.getElementById("record-date").max = new Date()
    .toISOString()
    .slice(0, 10);

  const FIELDS = [
    {
      el: categorySelect,
      errorId: "error-category",
      validate: (el) => (el.value ? null : "大会種別を選択してください"),
    },
    {
      el: courseSelect,
      errorId: "error-course",
      validate: (el) => (el.value ? null : "コース名を選択してください"),
    },
    {
      el: document.getElementById("username"),
      errorId: "error-username",
      validate: (el) => {
        const v = el.value.trim();
        if (!v) return "ユーザー名を入力してください";
        if (!v.startsWith("@"))
          return "@ から始まる形式で入力してください（例: @username）";
        return null;
      },
    },
    {
      el: document.getElementById("time"),
      errorId: "error-time",
      validate: (el) => {
        const v = el.value.trim();
        if (!v) return "タイムを入力してください";
        if (!/^\d+(\.\d+)?$/.test(v))
          return "数値で入力してください（例: 31.31）";
        return null;
      },
    },
    {
      el: document.getElementById("record-date"),
      errorId: "error-record-date",
      validate: (el) => (el.value ? null : "記録日を選択してください"),
    },
    {
      el: document.getElementById("link"),
      errorId: "error-link",
      validate: (el) => {
        const v = el.value.trim();
        if (!v) return "リンクを入力してください";
        if (
          !/^https?:\/\/(www\.)?(youtube\.com|youtu\.be|x\.com|twitter\.com)(\/|$)/.test(
            v,
          )
        ) {
          return "YouTube または X（x.com / twitter.com）のURLを入力してください";
        }
        return null;
      },
    },
    {
      el: document.getElementById("control"),
      errorId: "error-control",
      validate: (el) => (el.value ? null : "操作方法を選択してください"),
    },
  ];

  function validateField(field) {
    const error = field.validate(field.el);
    const errorEl = document.getElementById(field.errorId);
    if (errorEl) {
      errorEl.textContent = error || "";
      errorEl.style.display = error ? "block" : "none";
    }
    field.el.classList.toggle("input-error", !!error);
    return !error;
  }

  FIELDS.forEach((field) => {
    let touched = false;
    if (field.el.tagName === "SELECT") {
      field.el.addEventListener("change", () => {
        touched = true;
        validateField(field);
      });
    } else {
      field.el.addEventListener("blur", () => {
        touched = true;
        validateField(field);
      });
      field.el.addEventListener("input", () => {
        if (touched) validateField(field);
      });
    }
  });

  const GAS_URL =
    "https://script.google.com/macros/s/AKfycbxCJxqlXfQiM6k7dyAdqpuHkMcaomm3DFntPp5GQsav2GjxIWSv-7gOQcPl_2eyFulE8w/exec";
  const SITE_KEY = "6LcW8M8sAAAAADc9zZzAc2Uh9LoreX2HQL5T5QDq";

  const submitBtn = document.getElementById("submit-btn");
  const confirmModal = document.getElementById("confirm-modal");
  const resultModal = document.getElementById("result-modal");
  const modalBackBtn = document.getElementById("modal-back-btn");
  const modalSubmitBtn = document.getElementById("modal-submit-btn");
  const resultCloseBtn = document.getElementById("result-close-btn");

  function openModal(modal) {
    modal.classList.add("open");
  }

  function closeModal(modal) {
    modal.classList.remove("open");
  }

  function populateConfirmList() {
    const list = document.getElementById("confirm-list");
    list.innerHTML = "";
    const items = [
      { label: "大会種別", value: categorySelect.value },
      { label: "コース名", value: courseSelect.value },
      { label: "ユーザー名", value: document.getElementById("username").value.trim() },
      { label: "タイム", value: document.getElementById("time").value.trim() + " 秒" },
      { label: "記録日", value: document.getElementById("record-date").value },
      { label: "リンク", value: document.getElementById("link").value.trim() },
      { label: "操作方法", value: document.getElementById("control").value },
    ];
    const notes = document.getElementById("notes").value.trim();
    if (notes) items.push({ label: "補足事項", value: notes });
    items.forEach(({ label, value }) => {
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value;
      list.appendChild(dt);
      list.appendChild(dd);
    });
  }

  function showResult(success) {
    const icon = document.getElementById("result-icon");
    const message = document.getElementById("result-message");
    if (success) {
      icon.textContent = "✓";
      icon.className = "result-icon result-icon-success";
      message.textContent = "申請が完了しました！\n反映まで数分かかります。";
      resultCloseBtn.textContent = "レコードリストに移動";
      resultCloseBtn.dataset.action = "navigate";
    } else {
      icon.textContent = "✕";
      icon.className = "result-icon result-icon-error";
      message.textContent = "申請に失敗しました。\nしばらく待ってもう一度お試しください。";
      resultCloseBtn.textContent = "閉じる";
      resultCloseBtn.dataset.action = "close";
    }
    openModal(resultModal);
  }

  submitBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const valids = FIELDS.map((f) => validateField(f));
    const firstInvalidIdx = valids.indexOf(false);
    if (firstInvalidIdx !== -1) {
      const el = FIELDS[firstInvalidIdx].el;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
      return;
    }
    populateConfirmList();
    openModal(confirmModal);
  });

  modalBackBtn.addEventListener("click", () => {
    closeModal(confirmModal);
  });

  modalSubmitBtn.addEventListener("click", async () => {
    modalSubmitBtn.disabled = true;
    modalSubmitBtn.textContent = "送信中...";

    let recaptchaToken;
    try {
      recaptchaToken = await new Promise((resolve, reject) => {
        grecaptcha.ready(() => {
          grecaptcha
            .execute(SITE_KEY, { action: "submit" })
            .then(resolve)
            .catch(reject);
        });
      });
    } catch (err) {
      console.error("reCAPTCHA error:", err);
      modalSubmitBtn.disabled = false;
      modalSubmitBtn.textContent = "送信する";
      closeModal(confirmModal);
      showResult(false);
      return;
    }

    const payload = {
      category: categorySelect.value,
      course: courseSelect.value,
      username: document.getElementById("username").value.trim(),
      time: document.getElementById("time").value.trim(),
      recordDate: document.getElementById("record-date").value,
      link: document.getElementById("link").value.trim(),
      control: document.getElementById("control").value,
      notes: document.getElementById("notes").value.trim(),
      recaptchaToken,
    };

    try {
      const res = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      closeModal(confirmModal);
      modalSubmitBtn.disabled = false;
      modalSubmitBtn.textContent = "送信する";
      showResult(result.success);
    } catch (err) {
      closeModal(confirmModal);
      modalSubmitBtn.disabled = false;
      modalSubmitBtn.textContent = "送信する";
      showResult(false);
    }
  });

  resultCloseBtn.addEventListener("click", () => {
    if (resultCloseBtn.dataset.action === "navigate") {
      location.href = "./index.html";
    } else {
      closeModal(resultModal);
    }
  });
})();
