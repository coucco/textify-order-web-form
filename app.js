const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

// ── Prices ──────────────────────────────────────────────────────────────────
const PRICES = {
  coursework: { label: 'Курсовая работа',  price: 3500  },
  diploma:    { label: 'Дипломная работа', price: 9900  },
  project:    { label: 'Проект',           price: 5500  },
  report:     { label: 'Доклад / реферат', price: 1800  },
  essay:      { label: 'Эссе',             price: 1200  },
  practice:   { label: 'Отчёт по практике',price: 4200  },
  article:    { label: 'Научная статья',   price: 6800  },
  other:      { label: 'Другое',           price: 2000  },
};

// ── DOM ──────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const F = {
  name:     { el: $('firstName'), wrap: $('f-name')     },
  surname:  { el: $('lastName'),  wrap: $('f-surname')  },
  phone:    { el: $('phone'),     wrap: $('f-phone')    },
  tg:       { el: $('tgUser'),    wrap: $('f-tg')       },
  work:     { el: $('workType'),  wrap: $('f-work')     },
  theme:     { el: $('theme'),  wrap: $('f-theme')     },
  deadline: { el: $('deadline'),  wrap: $('f-deadline') },
  reqs:     { el: $('reqs'),      wrap: $('f-reqs')     },
  comment:  { el: $('comment'),   wrap: $('f-comment')  },
  promo:  { el: $('promo'),   wrap: $('f-promo')  },
};

const priceCard    = $('priceCard');
const priceService = $('priceService');
const priceAmount  = $('priceAmount');
const payBtn       = $('payBtn');
const btnLabel     = $('btnLabel');
const contactError = $('contactError');
const successScreen= $('successScreen');
const formWrap     = $('formWrap');
const payWrap      = $('payWrap');

// ── Auto-grow textareas ──────────────────────────────────────────────────────
function autoGrow(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

[F.reqs.el, F.comment.el].forEach(ta => {
  ta.addEventListener('input', () => autoGrow(ta));
});

// ── Phone formatting ─────────────────────────────────────────────────────────
F.phone.el.addEventListener('input', function () {
  let v = this.value.replace(/\D/g, '');
  if (v.startsWith('8')) v = '7' + v.slice(1);
  if (!v) { this.value = ''; return; }
  let f = '+';
  if (v.length >= 1) f += v.slice(0, 1);
  if (v.length >= 2) f += ' ' + v.slice(1, 4);
  if (v.length >= 5) f += ' ' + v.slice(4, 7);
  if (v.length >= 8) f += '-' + v.slice(7, 9);
  if (v.length >= 10) f += '-' + v.slice(9, 11);
  this.value = f;
  clearErr(F.phone.wrap);
  contactError.classList.remove('show');
});

// ── Telegram username — enforce @ prefix ─────────────────────────────────────
F.tg.el.addEventListener('input', function () {
  let v = this.value.trim();
  if (v && !v.startsWith('@')) this.value = '@' + v.replace(/^@+/, '');
  clearErr(F.tg.wrap);
  contactError.classList.remove('show');
});

F.tg.el.addEventListener('blur', function () {
  if (this.value === '@') this.value = '';
});

// ── Date formatting — dd.mm.yyyy ─────────────────────────────────────────────
F.deadline.el.addEventListener('input', function () {
  let v = this.value.replace(/\D/g, '');
  if (v.length > 2) v = v.slice(0, 2) + '.' + v.slice(2);
  if (v.length > 5) v = v.slice(0, 5) + '.' + v.slice(5);
  if (v.length > 10) v = v.slice(0, 10);
  this.value = v;
  clearErr(F.deadline.wrap);
});

// ── Clear errors on input ────────────────────────────────────────────────────
['name', 'surname', 'work', 'reqs', 'comment'].forEach(k => {
  F[k].el.addEventListener('input', () => clearErr(F[k].wrap));
  F[k].el.addEventListener('change', () => clearErr(F[k].wrap));
});

function clearErr(wrap) { wrap.classList.remove('invalid'); }
function setErr(wrap)   { wrap.classList.add('invalid'); }

// ── Work type → price card ───────────────────────────────────────────────────
F.work.el.addEventListener('change', function () {
  clearErr(F.work.wrap);
  const s = PRICES[this.value];
  if (s) {
    priceService.textContent = s.label;
    priceAmount.innerHTML    = s.price.toLocaleString('ru-RU') + '<span>₽</span>';
    priceCard.classList.add('visible');
  } else {
    priceCard.classList.remove('visible');
  }
});

// ── Validate date dd.mm.yyyy ──────────────────────────────────────────────────
function isValidDate(s) {
  if (!s) return true; // optional
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(s)) return false;
  const [d, m, y] = s.split('.').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(y, m - 1, d);
  return date >= new Date(new Date().setHours(0,0,0,0));
}

// ── Validate ──────────────────────────────────────────────────────────────────
function validate() {
  let ok = true;
  const data = {};

  data.firstName = F.name.el.value.trim();
  if (!data.firstName) { setErr(F.name.wrap); ok = false; }

  data.lastName = F.surname.el.value.trim();
  if (!data.lastName) { setErr(F.surname.wrap); ok = false; }

  // contact: at least one of phone / tg
  const phoneDigits = F.phone.el.value.replace(/\D/g, '');
  const tgVal       = F.tg.el.value.trim();
  const hasPhone    = phoneDigits.length >= 11;
  const hasTg       = tgVal.length >= 2 && tgVal.startsWith('@');

  if (!hasPhone && !hasTg) {
    if (!hasPhone) setErr(F.phone.wrap);
    if (!hasTg)   setErr(F.tg.wrap);
    contactError.classList.add('show');
    ok = false;
  }

  data.phone    = hasPhone ? phoneDigits : null;
  data.telegram = hasTg   ? tgVal       : null;

  data.workType = F.work.el.value;
  if (!data.workType) { setErr(F.work.wrap); ok = false; }

  // required: theme
  const dk = F.theme.el.value.trim();
  if (!dk) {
    setErr(F.theme.wrap);
    ok = false;
  }
  data.theme = dk || null;

  // optional: deadline
  const dl = F.deadline.el.value.trim();
  if (dl && !isValidDate(dl)) {
    setErr(F.deadline.wrap);
    ok = false;
  }
  data.deadline = dl || null;

  // optional: reqs, comment
  data.requirements = F.reqs.el.value.trim() || null;
  data.comment      = F.comment.el.value.trim() || null;

  //optional: promo
  data.promo      = F.promo.el.value.trim() || null;

  if (!ok) return null;

  const svc    = PRICES[data.workType];
  data.amount  = svc.price;
  data.currency= 'RUB';
  data.userId  = tg?.initDataUnsafe?.user?.id ?? null;
  data.initData= tg?.initData ?? null;

  return data;
}

// ── Pay ──────────────────────────────────────────────────────────────────────
async function handlePay() {
  const payload = validate();
  if (!payload) return;

  setLoading(true);

  try {
    /*
     * ЗАМЕНИТЕ URL на адрес вашего сервера.
     * Сервер:
     *   1. Принимает JSON с данными формы
     *   2. Создаёт платёж через YooKassa API (server-side)
     *   3. Возвращает { confirmation_url } или { success: true }
     */
    const res  = await fetch('https://your-server.example.com/api/payment/create', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    if (!res.ok) throw new Error('Server error ' + res.status);
    const data = await res.json();

    if (data.confirmation_url) {
      if (tg) {
        tg.openLink(data.confirmation_url);
        tg.onEvent('popup_closed', showSuccess);
      } else {
        window.location.href = data.confirmation_url;
      }
    } else if (data.success) {
      showSuccess();
    } else {
      throw new Error(data.error || 'Неизвестная ошибка');
    }

  } catch (err) {
    console.error(err);
    setLoading(false);
    const msg = 'Ошибка оплаты: ' + err.message;
    if (tg) tg.showAlert(msg); else alert(msg);
  }
}

function setLoading(on) {
  payBtn.disabled = on;
  if (on) {
    btnLabel.innerHTML = '<div class="spinner"></div> Обработка...';
  } else {
    btnLabel.innerHTML = `
      <svg class="btn-icon" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="1.8"
           stroke-linecap="round" stroke-linejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="3"/>
        <line x1="1" y1="10" x2="23" y2="10"/>
      </svg>Оплатить`;
  }
}

function showSuccess() {
  formWrap.style.display  = 'none';
  payWrap.style.display   = 'none';
  successScreen.classList.add('show');
  if (tg) setTimeout(() => tg.close(), 2800);
}

window.handlePay = handlePay;
