// ── Telegram WebApp init ────────────────────────────────────────────────────
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

// ── Prices per service ──────────────────────────────────────────────────────
const PRICES = {
  plumbing:    { label: 'Сантехника',              price: 2500  },
  electrical:  { label: 'Электрика',               price: 2000  },
  painting:    { label: 'Покраска / штукатурка',   price: 1800  },
  tiling:      { label: 'Укладка плитки',          price: 3000  },
  flooring:    { label: 'Напольные покрытия',      price: 2800  },
  carpentry:   { label: 'Столярные работы',        price: 3500  },
  welding:     { label: 'Сварочные работы',        price: 4000  },
  roofing:     { label: 'Кровельные работы',       price: 5000  },
  hvac:        { label: 'Отопление / вентиляция',  price: 3200  },
  cleaning:    { label: 'Уборка / клининг',        price: 1500  },
  moving:      { label: 'Грузоперевозки / переезд',price: 2200  },
  landscaping: { label: 'Ландшафтные работы',      price: 4500  },
  other:       { label: 'Другое',                  price: 1000  },
};

// ── DOM refs ────────────────────────────────────────────────────────────────
const fields = {
  name:    { el: document.getElementById('firstName'), wrap: document.getElementById('f-name')    },
  surname: { el: document.getElementById('lastName'),  wrap: document.getElementById('f-surname') },
  phone:   { el: document.getElementById('phone'),     wrap: document.getElementById('f-phone')   },
  work:    { el: document.getElementById('workType'),  wrap: document.getElementById('f-work')    },
};

const priceCard    = document.getElementById('priceCard');
const priceService = document.getElementById('priceService');
const priceAmount  = document.getElementById('priceAmount');
const payBtn       = document.getElementById('payBtn');
const btnLabel     = document.getElementById('btnLabel');
const successScreen= document.getElementById('successScreen');
const formWrap     = document.getElementById('formWrap');
const payWrap      = document.getElementById('payWrap');

// ── Phone formatting ────────────────────────────────────────────────────────
fields.phone.el.addEventListener('input', function () {
  let val = this.value.replace(/\D/g, '');
  if (val.startsWith('8')) val = '7' + val.slice(1);
  if (val.length === 0) { this.value = ''; return; }

  let fmt = '+';
  if (val.length >= 1)  fmt += val.substring(0, 1);
  if (val.length >= 2)  fmt += ' ' + val.substring(1, 4);
  if (val.length >= 5)  fmt += ' ' + val.substring(4, 7);
  if (val.length >= 8)  fmt += '-' + val.substring(7, 9);
  if (val.length >= 10) fmt += '-' + val.substring(9, 11);

  this.value = fmt;
  clearError(fields.phone.wrap);
});

// ── Clear errors on input ───────────────────────────────────────────────────
['name', 'surname'].forEach(key => {
  fields[key].el.addEventListener('input', () => clearError(fields[key].wrap));
});

// ── Work type change: show price card ──────────────────────────────────────
fields.work.el.addEventListener('change', function () {
  clearError(fields.work.wrap);
  const service = PRICES[this.value];
  if (service) {
    priceService.textContent = service.label;
    priceAmount.innerHTML    = service.price.toLocaleString('ru-RU') + '<span>₽</span>';
    priceCard.classList.add('visible');
  } else {
    priceCard.classList.remove('visible');
  }
});

// ── Validation ──────────────────────────────────────────────────────────────
function clearError(wrap) {
  wrap.classList.remove('invalid');
}

function setError(wrap) {
  wrap.classList.add('invalid');
}

function validate() {
  let ok   = true;
  const data = {};

  data.firstName = fields.name.el.value.trim();
  if (!data.firstName) { setError(fields.name.wrap); ok = false; }

  data.lastName = fields.surname.el.value.trim();
  if (!data.lastName) { setError(fields.surname.wrap); ok = false; }

  const digits = fields.phone.el.value.replace(/\D/g, '');
  if (digits.length < 11) { setError(fields.phone.wrap); ok = false; }
  data.phone = digits;

  data.workType = fields.work.el.value;
  if (!data.workType) { setError(fields.work.wrap); ok = false; }

  if (!ok) return null;

  const service   = PRICES[data.workType];
  data.amount     = service.price;
  data.currency   = 'RUB';
  data.userId     = tg?.initDataUnsafe?.user?.id   ?? null;
  data.initData   = tg?.initData ?? null;

  return data;
}

// ── Payment ─────────────────────────────────────────────────────────────────
async function handlePay() {
  const payload = validate();
  if (!payload) return;

  setLoading(true);

  try {
    /*
     * ЗАМЕНИТЕ URL на адрес вашего сервера.
     * Сервер должен:
     *   1. Принять JSON с данными формы
     *   2. Создать платёж через YooKassa API (server-side, с секретным ключом)
     *   3. Вернуть { confirmation_url } или { success: true }
     */
    const res = await fetch('https://your-server.example.com/api/payment/create', {
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
    if (tg) {
      tg.showAlert('Ошибка оплаты: ' + err.message);
    } else {
      alert('Ошибка: ' + err.message);
    }
  }
}

// ── UI helpers ──────────────────────────────────────────────────────────────
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
      </svg>
      Оплатить`;
  }
}

function showSuccess() {
  formWrap.style.display  = 'none';
  payWrap.style.display   = 'none';
  successScreen.classList.add('show');
  if (tg) {
    setTimeout(() => tg.close(), 2800);
  }
}

// ── Expose to HTML ───────────────────────────────────────────────────────────
window.handlePay = handlePay;
