
/* Plain, defensive JS (ES5 style) — no fancy syntax */

// ===== Helpers =====
function el(id){ return document.getElementById(id); }
function toGBP(n){ return "£" + (Number(n||0)).toFixed(2); }
function num(id){
  var v = parseFloat(el(id) && el(id).value);
  return isNaN(v) ? 0 : v;
}
function sumPairs(arr){
  var s = 0;
  for(var i=0; i<arr.length; i++){ s += Number(arr[i][1] || 0); }
  return s;
}

// ===== Dynamic lists =====
var extrasEl      = null;
var subsCustomEl  = null;

// ===== Chart =====
var pieCanvas = null;
var pieLegend = null;
var ctx       = null;

// ===== Events wiring =====
function wireEvents(){
  // Inputs that trigger calculation on input/change
  var ids = [
    'monthInput','rent','council','electricity','gas','water','wifi','phone',
    'groceries','transport','hhSuppliesAmt','hhInsuranceAmt',
    'ccYou','ccPartner','salaryYou','salaryPartner',
    'subNetflix','subDisney','subPrime','subSpotify',
    'subNetflixAmt','subDisneyAmt','subPrimeAmt','subSpotifyAmt',
    'partnerToggle','splitEqual','splitPercent','youPct'
  ];
  for(var i=0;i<ids.length;i++){
    var node = el(ids[i]); if(!node) continue;
    var evt = (node.type === 'checkbox' || node.tagName === 'SELECT' || node.type === 'radio') ? 'change' : 'input';
    node.addEventListener(evt, calculate);
  }

  el('addExtraBtn').addEventListener('click', function(e){ e.preventDefault(); addExtra("", ""); });
  el('addSubBtn').addEventListener('click', function(e){ e.preventDefault(); addCustomSub(); });
  el('calcBtn').addEventListener('click', function(){ calculate(); openPanel(); });
  el('togglePanelBtn').addEventListener('click', togglePanel);
  el('fabBtn').addEventListener('click', togglePanel);
  el('resetBtn').addEventListener('click', resetAll);
  el('exportBtn').addEventListener('click', exportCSV);

  // Percent row toggle
  el('splitEqual').addEventListener('change', function(){ showPercent(false); });
  el('splitPercent').addEventListener('change', function(){ showPercent(true); });
  el('youPct').addEventListener('input', updatePercent);
}

// ===== UI helpers =====
function showPercent(show){ el('percentRow').style.display = show ? 'block' : 'none'; }
function updatePercent(){
  var p = parseFloat(el('youPct').value || 0);
  if (isNaN(p)) p = 0; if (p < 0) p = 0; if (p > 100) p = 100;
  el('youPct').value = p;
  el('partnerPctText').textContent = (100 - p).toFixed(0);
}
function togglePanel(){
  var p = el('panel');
  p.style.display = (p.style.display === 'none' || p.style.display === '') ? 'block' : 'none';
}
function openPanel(){ el('panel').style.display = 'block'; }

// ===== Extras =====
function addExtra(label, amount){
  var row = document.createElement('div');
  row.style.display='grid'; row.style.gridTemplateColumns='1.2fr 0.8fr'; row.style.gap='12px'; row.style.marginBottom='8px';

  var labelInput = document.createElement('input');
  labelInput.type='text'; labelInput.placeholder='Label (e.g., Gifts)'; labelInput.value=label||'';
  labelInput.className='textinput'; labelInput.style.padding='10px'; labelInput.style.borderRadius='10px';
  labelInput.style.border='1px solid rgba(255,255,255,0.22)'; labelInput.style.background='rgba(255,255,255,0.10)'; labelInput.style.color='#fff';
  labelInput.addEventListener('input', calculate);

  var amtInput = document.createElement('input');
  amtInput.type='number'; amtInput.placeholder='0.00'; amtInput.min='0'; amtInput.step='0.01'; amtInput.value=amount||'';
  amtInput.className='numinput'; amtInput.style.padding='10px'; amtInput.style.borderRadius='10px';
  amtInput.style.border='1px solid rgba(255,255,255,0.22)'; amtInput.style.background='rgba(255,255,255,0.10)'; amtInput.style.color='#fff';
  amtInput.addEventListener('input', calculate);

  row.appendChild(labelInput); row.appendChild(amtInput);
  extrasEl.appendChild(row);
}
function gatherExtras(){
  var list=[], rows = extrasEl.children;
  for(var i=0;i<rows.length;i++){
    var inputs = rows[i].querySelectorAll('input');
    var label = inputs[0].value || 'Extra';
    var amt   = parseFloat(inputs[1].value || 0);
    list.push([label, isNaN(amt) ? 0 : amt]);
  }
  return list;
}

// ===== Subscriptions =====
function addCustomSub(){
  var val = el('subSelect').value;
  if(!val) return;
  var parts = val.split('|');
  var label = parts[0] || 'Subscription';
  var amt   = parseFloat(parts[1] || '0');
  if(isNaN(amt)) amt = 0;

  var row = document.createElement('div');
  row.style.display='grid'; row.style.gridTemplateColumns='1.2fr 0.8fr'; row.style.gap='12px'; row.style.marginBottom='8px';
  row.innerHTML = ''
    + '<input type="text" value="'+label+'" class="textinput" style="padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.22);background:rgba(255,255,255,0.10);color:#fff;">'
    + '<input type="number" value="'+amt.toFixed(2)+'" step="0.01" min="0" class="numinput" style="padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.22);background:rgba(255,255,255,0.10);color:#fff;">';

  subsCustomEl.appendChild(row);
  var inputs = row.querySelectorAll('input');
  for(var i=0;i<inputs.length;i++){ inputs[i].addEventListener('input', calculate); }
  calculate();
}
function gatherSubs(){
  var list = [];
  if (el('subNetflix').checked) list.push(['Netflix', parseFloat(el('subNetflixAmt').value||0) || 0]);
  if (el('subDisney').checked)  list.push(['Disney+', parseFloat(el('subDisneyAmt').value||0) || 0]);
  if (el('subPrime').checked)   list.push(['Amazon Prime', parseFloat(el('subPrimeAmt').value||0) || 0]);
  if (el('subSpotify').checked) list.push(['Spotify', parseFloat(el('subSpotifyAmt').value||0) || 0]);

  var rows = subsCustomEl.children;
  for(var i=0;i<rows.length;i++){
    var inputs = rows[i].querySelectorAll('input');
    var label = inputs[0].value || 'Subscription';
    var amt   = parseFloat(inputs[1].value || 0);
    list.push([label, isNaN(amt) ? 0 : amt]);
  }
  return list;
}

// ===== Calculate =====
function calculate(){
  // Core shared bills
  var coreBills = [
    ['Rent', num('rent')],
    ['Council Tax', num('council')],
    ['Electricity', num('electricity')],
    ['Gas', num('gas')],
    ['Water', num('water')],
    ['Wi-Fi', num('wifi')],
    ['Phone Bill', num('phone')]
  ];
  var subs   = gatherSubs();
  var extras = gatherExtras();

  // Couple shared
  var coupleHousehold = [
    ['Household Supplies', num('hhSuppliesAmt')],
    ['Contents Insurance', num('hhInsuranceAmt')],
    ['Groceries', num('groceries')],
    ['Transport', num('transport')]
  ];

  var coreTotal   = sumPairs(coreBills);
  var subsTotal   = sumPairs(subs);
  var houseTotal  = sumPairs(coupleHousehold);
  var extrasTotal = sumPairs(extras);
  var sharedMonthly = coreTotal + subsTotal + houseTotal + extrasTotal;

  // Per-person
  var ccYou     = num('ccYou');
  var ccPartner = num('ccPartner');
  var youIncome     = num('salaryYou');
  var partnerIncome = num('salaryPartner');
  var combinedIncome = youIncome + partnerIncome;

  // Split
  var yourShare = 0, partnerShare = 0, splitLabel = 'Not applied';
  if (el('partnerToggle').checked){
    if (el('splitPercent').checked){
      var youPct = parseFloat(el('youPct').value || 0); if (isNaN(youPct)) youPct = 0;
      yourShare    = sharedMonthly * (youPct/100);
      partnerShare = sharedMonthly - yourShare;
      splitLabel   = 'Percentage (' + youPct + '% / ' + (100-youPct).toFixed(0) + '%)';
    } else {
      yourShare = partnerShare = sharedMonthly / 2;
      splitLabel = 'Equal (50% / 50%)';
    }
  }

  // Savings
  var yourTotalOut    = yourShare + ccYou;
  var partnerTotalOut = partnerShare + ccPartner;
  var yourSavings     = youIncome - yourTotalOut;
  var partnerSavings  = partnerIncome - partnerTotalOut;
  var monthlyTotal    = sharedMonthly + ccYou + ccPartner;
  var yearlyTotal     = monthlyTotal * 12;
  var combinedSavings = combinedIncome - monthlyTotal;

  // Inline totals
  el('inlineMonthly').textContent = toGBP(monthlyTotal);
  el('inlineYearly').textContent  = toGBP(yearlyTotal);
  el('inlineIncome').textContent  = toGBP(combinedIncome);
  el('inlineSavings').textContent = toGBP(combinedSavings);

  // Panel totals
  el('monthlyTotal').textContent   = toGBP(monthlyTotal);
  el('yearlyTotal').textContent    = toGBP(yearlyTotal);
  el('combinedIncome').textContent = toGBP(combinedIncome);
  el('combinedSavings').textContent= toGBP(combinedSavings);
  var m = el('monthInput').value || '';
  el('monthLabel').textContent = m ? ('• ' + m) : '';

  if (el('partnerToggle').checked){
    el('partnerBreak').style.display='block';
    el('inlineSplitSavings').style.display='block';
    el('yourShare').textContent = toGBP(yourShare);
    el('partnerShare').textContent = toGBP(partnerShare);
    el('panelYourSavings').textContent = toGBP(yourSavings);
    el('panelPartnerSavings').textContent = toGBP(partnerSavings);
    el('inlineYourSavings').textContent = toGBP(yourSavings);
    el('inlinePartnerSavings').textContent = toGBP(partnerSavings);
    el('splitDesc').textContent = splitLabel;
  } else {
    el('partnerBreak').style.display='none';
    el('inlineSplitSavings').style.display='none';
  }

  // Chart
  var chartItems = [
    ['Core Bills', coreTotal],
    ['Subscriptions', subsTotal],
    ['Couple Household', houseTotal],
    ['Your CC', ccYou],
    ['Partner CC', ccPartner],
    ['Extras', extrasTotal]
  ];
  renderPie(chartItems);
}

// ===== Render pie chart (no external libs) =====
function renderPie(items){
  if(!ctx){ return; }
  var total = 0; for(var i=0;i<items.length;i++){ total += Number(items[i][1]||0); }

  ctx.clearRect(0,0,pieCanvas.width,pieCanvas.height);
  // background circle
  ctx.beginPath(); ctx.arc(170,170,160,0,Math.PI*2); ctx.fillStyle='rgba(255,255,255,0.06)'; ctx.fill();

  pieLegend.innerHTML = '';
  if (total <= 0){
    ctx.fillStyle = '#cbd5e1'; ctx.font = '14px system-ui';
    ctx.fillText('No data to display', 110, 175);
    pieLegend.innerHTML = '<div style="color:#cbd5e1">Add amounts to see the chart.</div>';
    return;
  }

  var colors = ['#60a5fa','#34d399','#fbbf24','#ef4444','#a78bfa','#22d3ee','#fb7185','#7dd3fc','#f59e0b','#10b981','#eab308','#54c2f7'];
  var start = -Math.PI/2;
  for(var i=0;i<items.length;i++){
    var label = items[i][0], val = Number(items[i][1]||0);
    if (val <= 0) continue;
    var angle = (val/total) * Math.PI*2;
    var end = start + angle;

    ctx.beginPath(); ctx.moveTo(170,170); ctx.arc(170,170,160,start,end); ctx.closePath();
    ctx.fillStyle = colors[i % colors.length]; ctx.fill();

    var sw = '<span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:'+colors[i % colors.length]+';margin-right:8px;"></span>';
    pieLegend.insertAdjacentHTML('beforeend', '<div style="margin:4px 0;">'+sw+label+': <strong>'+toGBP(val)+'</strong></div>');

    start = end;
  }
}

// ===== Reset & Export =====
function resetAll(){
  var ids = ['rent','council','electricity','gas','water','wifi','phone','groceries','transport','hhSuppliesAmt','hhInsuranceAmt','ccYou','ccPartner','salaryYou','salaryPartner'];
  for(var i=0;i<ids.length;i++){ el(ids[i]).value=''; }
  ['subNetflix','subDisney','subPrime','subSpotify'].forEach(function(id){ el(id).checked=false; });
  ['subNetflixAmt','subDisneyAmt','subPrimeAmt','subSpotifyAmt'].forEach(function(id){ el(id).value='0'; });
  el('monthInput').value='';
  subsCustomEl.innerHTML='';
  extrasEl.innerHTML=''; addExtra('', ''); addExtra('', ''); addExtra('', '');
  el('partnerToggle').checked=false; el('splitEqual').checked=true; el('splitPercent').checked=false; showPercent(false);
  el('youPct').value='50'; updatePercent();
  calculate();
}

function exportCSV(){
  var rows = [];
  function push(k,v){ rows.push([k,v]); }

  push('Month', el('monthInput').value || 'Unspecified');
  [['Rent','rent'],['Council Tax','council'],['Electricity','electricity'],['Gas','gas'],['Water','water'],['Wi-Fi','wifi'],['Phone Bill','phone']]
    .forEach(function(pair){ push(pair[0], (num(pair[1])).toFixed(2)); });

  if(el('subNetflix').checked) push('Netflix', (parseFloat(el('subNetflixAmt').value||0)||0).toFixed(2));
  if(el('subDisney').checked)  push('Disney+', (parseFloat(el('subDisneyAmt').value||0)||0).toFixed(2));
  if(el('subPrime').checked)   push('Amazon Prime', (parseFloat(el('subPrimeAmt').value||0)||0).toFixed(2));
  if(el('subSpotify').checked) push('Spotify', (parseFloat(el('subSpotifyAmt').value||0)||0).toFixed(2));
  var rowsCustom = subsCustomEl.children;
  for(var i=0;i<rowsCustom.length;i++){
    var inputs = rowsCustom[i].querySelectorAll('input');
    push(inputs[0].value || 'Subscription', (parseFloat(inputs[1].value||0)||0).toFixed(2));
  }

  [['Household Supplies','hhSuppliesAmt'],['Contents Insurance','hhInsuranceAmt'],['Groceries','groceries'],['Transport','transport']]
    .forEach(function(pair){ push(pair[0], (num(pair[1])).toFixed(2)); });

  var extrasRows = extrasEl.children;
  for(i=0;i<extrasRows.length;i++){
    var inputs = extrasRows[i].querySelectorAll('input');
    push(inputs[0].value || 'Extra', (parseFloat(inputs[1].value||0)||0).toFixed(2));
  }

  push('Your Salary', (num('salaryYou')).toFixed(2));
  push('Partner Salary', (num('salaryPartner')).toFixed(2));
  push('Your Credit Card', (parseFloat(el('ccYou').value||0)||0).toFixed(2));
  push('Partner Credit Card', (parseFloat(el('ccPartner').value||0)||0).toFixed(2));

  // Totals
  var coreT = sumPairs([['Rent',num('rent')],['Council Tax',num('council')],['Electricity',num('electricity')],['Gas',num('gas')],['Water',num('water')],['Wi-Fi',num('wifi')],['Phone Bill',num('phone')]]);
  var subsT = 0;
  if(el('subNetflix').checked) subsT += parseFloat(el('subNetflixAmt').value||0)||0;
  if(el('subDisney').checked)  subsT += parseFloat(el('subDisneyAmt').value||0)||0;
  if(el('subPrime').checked)   subsT += parseFloat(el('subPrimeAmt').value||0)||0;
  if(el('subSpotify').checked) subsT += parseFloat(el('subSpotifyAmt').value||0)||0;
  for(i=0;i<rowsCustom.length;i++){ subsT += parseFloat(rowsCustom[i].querySelectorAll('input')[1].value||0)||0; }

  var houseT = num('hhSuppliesAmt') + num('hhInsuranceAmt') + num('groceries') + num('transport');
  var extrasT = 0; for(i=0;i<extrasRows.length;i++){ extrasT += parseFloat(extrasRows[i].querySelectorAll('input')[1].value||0)||0; }

  var sharedMonthly = coreT + subsT + houseT + extrasT;
  var ccYou = parseFloat(el('ccYou').value||0)||0, ccPartner = parseFloat(el('ccPartner').value||0)||0;
  var monthlyTotal = sharedMonthly + ccYou + ccPartner;
  var yearlyTotal  = monthlyTotal * 12;
  var combinedInc  = num('salaryYou') + num('salaryPartner');
  var combinedSav  = combinedInc - monthlyTotal;

  push('Monthly Total', monthlyTotal.toFixed(2));
  push('Yearly Total', yearlyTotal.toFixed(2));
  push('Combined Salary', combinedInc.toFixed(2));
  push('Estimated Monthly Savings (Combined)', combinedSav.toFixed(2));

  if(el('partnerToggle').checked){
    var yourShare, partnerShare, desc;
    if(el('splitPercent').checked){
      var youPct = parseFloat(el('youPct').value||0)||0;
      yourShare = sharedMonthly * (youPct/100);
      partnerShare = sharedMonthly - yourShare;
      desc = 'Percentage ('+youPct+'% / '+(100-youPct).toFixed(0)+'%)';
    } else {
      yourShare = partnerShare = sharedMonthly/2; desc = 'Equal (50% / 50%)';
    }
    var yourSav = num('salaryYou') - (yourShare + (parseFloat(el('ccYou').value||0)||0));
    var prtSav  = num('salaryPartner') - (partnerShare + (parseFloat(el('ccPartner').value||0)||0));
    push('Split Type', desc);
    push('Your Share (Shared)', yourShare.toFixed(2));
    push('Partner Share (Shared)', partnerShare.toFixed(2));
    push('Your Savings', yourSav.toFixed(2));
    push('Partner Savings', prtSav.toFixed(2));
  }

  var csv = 'data:text/csv;charset=utf-8,' + 'Category,Amount (£)\n' + rows.map(function(r){ return r.join(','); }).join('\n');
  var a = document.createElement('a'); a.href = encodeURI(csv);
  a.download = 'budgeting_monthly_' + (el('monthInput').value||'unspecified').replace(/-/g,'_') + '.csv';
  document.body.appendChild(a); a.click(); a.remove();
}

// ===== Initialise =====
function init(){
  extrasEl = el('extras');
  subsCustomEl = el('subsCustom');
  pieCanvas = el('pieCanvas');
  pieLegend = el('pieLegend');
  ctx = pieCanvas.getContext('2d');

  // Seed extras
  addExtra('', ''); addExtra('', ''); addExtra('', '');

  // Wire all events
  wireEvents();

  // Defaults
  showPercent(false);
  el('youPct').value = '50';
  updatePercent();

  // First render
  calculate();
}

document.addEventListener('DOMContentLoaded', init);
