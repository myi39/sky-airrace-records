(async () => {
  const res = await fetch('./data.json?ts=' + Date.now(), { cache: 'no-store' });
  const json = await res.json();
  const courseMaster = json.courseMaster || [];

  const categorySelect = document.getElementById('category');
  const courseSelect = document.getElementById('course');

  const categories = [...new Set(courseMaster.map(item => item['大会種別']))];
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  });

  categorySelect.addEventListener('change', () => {
    const selected = categorySelect.value;
    if (selected) {
      courseSelect.innerHTML = '<option value="">コースを選んでください</option>';
      courseSelect.disabled = false;
      courseMaster
        .filter(item => item['大会種別'] === selected)
        .forEach(item => {
          const opt = document.createElement('option');
          opt.value = item['コース名'];
          opt.textContent = item['コース名'];
          courseSelect.appendChild(opt);
        });
    } else {
      courseSelect.innerHTML = '<option value="">大会種別を先に選んでください</option>';
      courseSelect.disabled = true;
    }
  });

  document.getElementById('record-date').max = new Date().toISOString().slice(0, 10);

  const FIELDS = [
    {
      el: categorySelect,
      errorId: 'error-category',
      validate: el => el.value ? null : '大会種別を選択してください',
    },
    {
      el: courseSelect,
      errorId: 'error-course',
      validate: el => el.value ? null : 'コース名を選択してください',
    },
    {
      el: document.getElementById('username'),
      errorId: 'error-username',
      validate: el => {
        const v = el.value.trim();
        if (!v) return 'ユーザー名を入力してください';
        if (!v.startsWith('@')) return '@ から始まる形式で入力してください（例: @username）';
        return null;
      },
    },
    {
      el: document.getElementById('time'),
      errorId: 'error-time',
      validate: el => {
        const v = el.value.trim();
        if (!v) return 'タイムを入力してください';
        if (!/^\d+(\.\d+)?$/.test(v)) return '数値で入力してください（例: 31.31）';
        return null;
      },
    },
    {
      el: document.getElementById('record-date'),
      errorId: 'error-record-date',
      validate: el => el.value ? null : '記録日を選択してください',
    },
    {
      el: document.getElementById('link'),
      errorId: 'error-link',
      validate: el => {
        const v = el.value.trim();
        if (!v) return 'リンクを入力してください';
        if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be|x\.com|twitter\.com)(\/|$)/.test(v)) {
          return 'YouTube または X（x.com / twitter.com）のURLを入力してください';
        }
        return null;
      },
    },
    {
      el: document.getElementById('control'),
      errorId: 'error-control',
      validate: el => el.value ? null : '操作方法を選択してください',
    },
  ];

  function validateField(field) {
    const error = field.validate(field.el);
    const errorEl = document.getElementById(field.errorId);
    if (errorEl) {
      errorEl.textContent = error || '';
      errorEl.style.display = error ? 'block' : 'none';
    }
    field.el.classList.toggle('input-error', !!error);
    return !error;
  }

  FIELDS.forEach(field => {
    let touched = false;
    if (field.el.tagName === 'SELECT') {
      field.el.addEventListener('change', () => {
        touched = true;
        validateField(field);
      });
    } else {
      field.el.addEventListener('blur', () => {
        touched = true;
        validateField(field);
      });
      field.el.addEventListener('input', () => {
        if (touched) validateField(field);
      });
    }
  });

  const GAS_URL = 'YOUR_GAS_WEB_APP_URL';
  const SITE_KEY = 'YOUR_RECAPTCHA_SITE_KEY';

  const submitBtn = document.getElementById('submit-btn');

  submitBtn.addEventListener('click', async e => {
    e.preventDefault();
    const valids = FIELDS.map(f => validateField(f));
    const firstInvalidIdx = valids.indexOf(false);
    if (firstInvalidIdx !== -1) {
      const el = FIELDS[firstInvalidIdx].el;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '送信中...';

    let recaptchaToken;
    try {
      recaptchaToken = await new Promise((resolve, reject) => {
        grecaptcha.ready(() => {
          grecaptcha.execute(SITE_KEY, { action: 'submit' }).then(resolve).catch(reject);
        });
      });
    } catch (err) {
      submitBtn.textContent = '送信に失敗しました';
      submitBtn.disabled = false;
      return;
    }

    const payload = {
      category: categorySelect.value,
      course: courseSelect.value,
      username: document.getElementById('username').value.trim(),
      time: document.getElementById('time').value.trim(),
      recordDate: document.getElementById('record-date').value,
      link: document.getElementById('link').value.trim(),
      control: document.getElementById('control').value,
      notes: document.getElementById('notes').value.trim(),
      recaptchaToken,
    };

    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) {
        submitBtn.textContent = '申請完了！';
      } else {
        submitBtn.textContent = '送信に失敗しました';
        submitBtn.disabled = false;
      }
    } catch (err) {
      submitBtn.textContent = '送信に失敗しました';
      submitBtn.disabled = false;
    }
  });
})();
