
// ---------- Utilities ----------
const gbp = n => "£" + (Number(n || 0)).toFixed(2);
const val = id => parseFloat(document.getElementById(id).value) || 0;
const byId = id => document.getElementById(id);

// ---------- Extras dynamic ----------
const extrasEl = byId('extras');
const addExtraBtn = byId('addExtraBtn');

function addExtraRow(label = '', amount = '') {
  const row = document.createElement('div');
  row.className = 'extra-row';
  // Note: external JS avoids any inline </script> parsing issues
  row.innerHTML = `
    <input class="input" type="text" placeholder="Label (e.g., Travel)" value="${label}">
    <div class="field">
      <span class="prefix">£</span>
      <input class="input" type="number" placeholder="0.00" min="0" step="0.01" value="${amount}">
    </div>
  `;
  extrasEl.appendChild(row);
  attachLiveUpdate();
}
// Add 3 blank extras initially
addExtraRow(); addExtraRow(); addExtraRow();

addExtraBtn.addEventListener('click', e => { e.preventDefault(); addExtraRow(); });

// ---------- Partner split ----------
const partnerToggle   = byId('partnerToggle');
const splitEqual      = byId('splitEqual');
const splitPercent    = byId('splitPercent');
const percentRow      = byId('percentRow');
const youPctInput     = byId('youPct');
const partnerPctText  = byId('partnerPctText');

function updatePercent() {
  let youPct = parseFloat(youPctInput.value || 0);
  youPct = Math.max(0, Math.min(100, youPct));
  youPctInput.value = youPct;
  partnerPctText.textContent = (100 - youPct).toFixed(0);
}
youPctInput.addEventListener('input', updatePercent);
splitPercent.addEventListener('change', () => percentRow.style.display = 'block');
splitEqual.addEventListener('change', () => percentRow.style.display = 'none');
updatePercent();

// ---------- Floating panel ----------
const panel         = byId('panel');
const fabBtn        = byId('fabBtn');
const togglePanelBtn= byId('togglePanelBtn');

function togglePanel() {
  if (panel.classList.contains('visible')) panel.classList.remove('visible');
  else panel.classList.add('visible');
}
fabBtn.addEventListener('click', togglePanel);
togglePanelBtn.addEventListener('click', togglePanel);

// ---------- Reset & Export ----------
byId('resetBtn').addEventListener('click', () => {
  ['rent','council','wifi','phone','credit','groceries'].forEach(id => byId(id).value = '');
  byId('monthInput').value = '';
  partnerToggle.checked = false;
  splitEqual.checked = true; splitPercent.checked = false; percentRow.style.display = 'none';
  youPctInput.value = 50; updatePercent();
  extrasEl.innerHTML = ''; addExtraRow(); addExtraRow(); addExtraRow();
  calculate();
});

byId('exportBtn').addEventListener('click', () => {
  const month = byId('monthInput').value || 'Unspecified';
  const base = [
    ['Rent', val('rent')],
    ['Council Tax', val('council')],
    ['Wi‑Fi', val('wifi')],
    ['Phone Bill', val('phone')],
    ['Credit Card', val('credit')],
    ['Groceries', val('groceries')],
  ];
  const extras = Array.from(extrasEl.children).map(row => {
    const [labelInput, amountWrap] = row.children;
    const label = labelInput.value || 'Extra';
    const amount = parseFloat(amountWrap.querySelector('input[type="number"]').value || 0);
    return [label, amount];
  });

  const monthlyTotal = sumAll(base) + sumAll(extras);
  const yearlyTotal  = monthlyTotal * 12;

  let youShare = '', partnerShare = '', splitMeta = '';
  if (partnerToggle.checked) {
    if (splitPercent.checked) {
      const youPct = parseFloat(youPctInput.value || 0);
      youShare    = monthlyTotal * (youPct / 100);
      partnerShare= monthlyTotal - youShare;
      splitMeta   = `Percentage (${youPct}% / ${(100 - youPct).toFixed(0)}%)`;
    } else {
      youShare    = monthlyTotal / 2;
      partnerShare= monthlyTotal / 2;
      splitMeta   = 'Equal (50% / 50%)';
    }
  }

  let rows = [
    ['Month', month],
    ...base,
    ...extras,
    ['Monthly Total', monthlyTotal.toFixed(2)],
    ['Yearly Total', yearlyTotal.toFixed(2)],
  ];
  if (partnerToggle.checked) {
    rows.push(['Split Type', splitMeta]);
    rows.push(['Your Share (Monthly)', (youShare || 0).toFixed(2)]);
    rows.push(['Partner Share (Monthly)', (partnerShare || 0).toFixed(2)]);
  }

  const csv = 'data:text/csv;charset=utf-8,' +
              'Category,Amount (£)\n' + rows.map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = encodeURI(csv);
  a.download = `cost_of_living_${month.replace(/-/g,'_') || 'unspecified'}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
});

// ---------- Calculation ----------
const monthlyTotalEl = byId('monthlyTotal');
const yearlyTotalEl  = byId('yearlyTotal');
const monthLabelEl   = byId('monthLabel');
const yourShareEl    = byId('yourShare');
const partnerShareEl = byId('partnerShare');
const partnerBreakEl = byId('partnerBreak');
const splitDescEl    = byId('splitDesc');

function sumAll(list) { return list.reduce((s, [_, n]) => s + Number(n || 0), 0); }

function gatherExtras() {
  return Array.from(extrasEl.children).map(row => {
    const [labelInput, amountWrap] = row.children;
    const amountInput = amountWrap.querySelector('input[type="number"]');
    return [labelInput.value || 'Extra', parseFloat(amountInput.value || 0)];
  });
}

function calculate() {
  const base = [
    ['Rent', val('rent')],
    ['Council Tax', val('council')],
    ['Wi‑Fi', val('wifi')],
    ['Phone Bill', val('phone')],
    ['Credit Card', val('credit')],
    ['Groceries', val('groceries')],
  ];
  const extras = gatherExtras();

  const month = byId('monthInput').value || '';
  monthLabelEl.textContent = month ? `• ${month}` : '';

  const monthlyTotal = sumAll(base) + sumAll(extras);
  const yearlyTotal  = monthlyTotal * 12;
  monthlyTotalEl.textContent = gbp(monthlyTotal);
  yearlyTotalEl.textContent  = gbp(yearlyTotal);

  if (partnerToggle.checked) {
    partnerBreakEl.style.display = 'block';
    if (splitPercent.checked) {
      const youPct = parseFloat(youPctInput.value || 0);
      const yourShare    = monthlyTotal * (youPct / 100);
      const partnerShare = monthlyTotal - yourShare;
      yourShareEl.textContent    = gbp(yourShare);
      partnerShareEl.textContent = gbp(partnerShare);
      splitDescEl.textContent    = `Percentage (${youPct}% / ${(100 - youPct).toFixed(0)}%)`;
    } else {
      const share = monthlyTotal / 2;
      yourShareEl.textContent    = gbp(share);
      partnerShareEl.textContent = gbp(share);
      splitDescEl.textContent    = 'Equal (50% / 50%)';
    }
  } else {
    partnerBreakEl.style.display = 'none';
  }
}

byId('calcBtn').addEventListener('click', calculate);

function attachLiveUpdate() {
  const inputs = document.querySelectorAll(
    '.input, #monthInput, #youPct, #partnerToggle, #splitEqual, #splitPercent'
  );
  inputs.forEach(el => el.addEventListener('input', calculate));
  partnerToggle.addEventListener('change', calculate);
  splitEqual.addEventListener('change', calculate);
  splitPercent.addEventListener('change', calculate);
}

// Initial hooks
attachLiveUpdate();
calculate();
