/* ---------------- DATA ---------------- */
const SERVICES = [
  {id:'clasica', name:'Manichiură clasică', price:100, priceLabel:'100 RON', duration:80, note:''},
  {id:'semi', name:'Manichiură semipermanentă', price:170, priceLabel:'170 RON', duration:110, note:''},
  {id:'gel', name:'Manichiură cu gel / întreținere', price:190, priceLabel:'190 RON', duration:130, note:'mărime 1/2 – 3/4'},
  {id:'slim', name:'Manichiură Slim', price:220, priceLabel:'220 RON', duration:140, note:''},
  {id:'pedi', name:'Pedichiură semipermanentă', price:170, priceLabel:'170 RON', duration:110, note:''},
  {id:'pachet', name:'Pachet Pedichiură + Manichiură', price:270, priceLabel:'de la 340 RON', duration:250, note:'în funcție de tipul manichiurii', lastHour:15},
];

const GALLERY = [
  {src:'images/gallery-1.jpg', tag:'Manichiură clasică', cap:'Nude clasic'},
  {src:'images/gallery-2.jpg', tag:'Manichiură cu gel', cap:'gel'},
  {src:'images/gallery-3.jpg', tag:'Manichiură semipermanentă', cap:'French modern'},
  {src:'images/gallery-4.jpg', tag:'Manichiură Slim', cap:'Alb perlat'},
  {src:'images/gallery-5.jpg', tag:'Manichiură semipermanentă', cap:'Ombré cu cristale'},
  {src:'images/gallery-6.jpg', tag:'Manichiură cu gel', cap:'Roz glossy cu cristale'},
  {src:'images/gallery-7.jpg', tag:'Manichiură Slim', cap:'Nude mat, unghii migdalate'},
  {src:'images/gallery-8.jpg', tag:'Manichiură semipermanentă', cap:'Ombré alb sclipici'},
  {src:'images/gallery-9.jpg', tag:'Manichiură clasică', cap:'Alb cu model personalizat'},
  {src:'images/gallery-10.jpg', tag:'Manichiură cu gel', cap:'Verde glossy'},
  {src:'images/gallery-11.jpg', tag:'Pedichiură semipermanentă', cap:'Taupe glossy'},
  {src:'images/gallery-12.jpg', tag:'Manichiură Slim', cap:'Ombré roz'},
];

const OPEN_HOUR = 10;          // 10:00 — prima programare
const LAST_APPOINTMENT_HOUR = 17; // 17:00 — ultima programare (indiferent de durata serviciului)
const SLOT_STEP = 30;          // minute
const WORKING_DAYS = [2,3,4,5,6]; // Marți(2) – Sâmbătă(6); 0=Duminică, 1=Luni — închis

/* ---------------- RENDER SERVICES ---------------- */
const svcIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>`;

function fmtDuration(min){
  const h = Math.floor(min/60), m = min%60;
  if(h && m) return `${h}h ${m}m`;
  if(h) return `${h}h`;
  return `${m}m`;
}

const svcGrid = document.getElementById('svcGrid');
SERVICES.forEach(s=>{
  const el = document.createElement('div');
  el.className='svc-card';
  el.innerHTML = `
    <div class="svc-top">
      <h3>${s.name}</h3>
      <div class="svc-price">${s.priceLabel}</div>
    </div>
    ${s.note?`<div class="svc-note">${s.note}</div>`:''}
    <div class="svc-dur">${svcIcon} ${fmtDuration(s.duration)}</div>
  `;
  svcGrid.appendChild(el);
});

/* ---------------- RENDER GALLERY ---------------- */
const galGrid = document.getElementById('galGrid');
GALLERY.forEach(g=>{
  const el = document.createElement('div');
  el.className='gal-item';
  el.innerHTML = `
    <div class="gal-photo"><img src="${g.src}" alt="${g.cap}"></div>
    <div class="gal-info">
      <span class="gal-tag">${g.tag}</span>
      <div class="gal-cap">${g.cap}</div>
    </div>
  `;
  el.querySelector('.gal-photo').addEventListener('click', ()=>openLightbox(g.src));
  galGrid.appendChild(el);
});

const lightbox = document.getElementById('lightbox');
const lbImg = document.getElementById('lbImg');
function openLightbox(src){ lbImg.src=src; lightbox.classList.add('open'); }
document.getElementById('lbClose').addEventListener('click', ()=>lightbox.classList.remove('open'));
lightbox.addEventListener('click', (e)=>{ if(e.target===lightbox) lightbox.classList.remove('open'); });

/* ---------------- NAV ---------------- */
const burger = document.getElementById('burger');
const navlinks = document.getElementById('navlinks');
burger.addEventListener('click', ()=>navlinks.classList.toggle('open'));
navlinks.querySelectorAll('a').forEach(a=>a.addEventListener('click', ()=>navlinks.classList.remove('open')));

/* ---------------- REVEAL ON SCROLL ---------------- */
const io = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('show'); io.unobserve(e.target); } });
}, {threshold:.15});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

/* ---------------- BOOKING STATE ---------------- */
let state = { service:null, date:null, time:null };
let ultimaProgramare = null; // ce s-a rezervat acum, ca să poată fi anulat dintr-un click

/* aceleași reguli ca pe server (api/_lib/contact.js) — aici doar ca să primească
   răspuns imediat, verificarea care contează rămâne cea de pe server */
function telefonValid(t){
  let c = String(t||'').replace(/\D/g,'');
  if(c.startsWith('0040')) c = c.slice(4);
  else if(c.startsWith('40') && c.length>10) c = c.slice(2);
  if(c.length===9 && c[0]!=='0') c = '0'+c;
  return /^(07[2-9]\d{7}|0[23]\d{8})$/.test(c);
}
function emailValid(e){
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e||'').trim());
}
let calCursor = new Date(); calCursor.setDate(1);
const today = new Date(); today.setHours(0,0,0,0);

/* step 1: service choice */
const svcChoiceGrid = document.getElementById('svcChoiceGrid');
SERVICES.forEach(s=>{
  const el = document.createElement('div');
  el.className='svc-choice';
  el.dataset.id = s.id;
  el.innerHTML = `
    <div class="row1"><h4>${s.name}</h4><span class="p">${s.priceLabel}</span></div>
    <div class="d">${fmtDuration(s.duration)}${s.note? ' · '+s.note:''}</div>
  `;
  el.addEventListener('click', ()=>{
    document.querySelectorAll('.svc-choice').forEach(c=>c.classList.remove('sel'));
    el.classList.add('sel');
    state.service = s;
    // alt serviciu înseamnă altă durată, deci ora aleasă înainte poate să nu mai încapă
    state.time = null;
    document.getElementById('toStep3').disabled = true;
    if(state.date) renderSlots();
    document.getElementById('toStep2').disabled = false;
  });
  svcChoiceGrid.appendChild(el);
});

/* step navigation */
const steps = ['step1','step2','step3','step4','step5'];
const pills = document.querySelectorAll('.step-pill');
function goToStep(n){
  steps.forEach((id,i)=>document.getElementById(id).classList.toggle('active', i===n-1));
  pills.forEach(p=>{
    const s = parseInt(p.dataset.step);
    p.classList.toggle('active', s===n);
    p.classList.toggle('done', s<n);
  });
  if(n===2){ warmupSlots(); renderCalendar(); }
  aduPanoulInDreptulOchilor();
}

/* Paşii au înălţimi diferite — lista de servicii e mult mai înaltă decât calendarul.
   Fără asta, după "Continuă" pagina rămâne la aceeaşi poziţie de derulare, care ajunge
   să cadă peste secţiunea de anulare, şi trebuie să urci înapoi ca să vezi calendarul. */
function aduPanoulInDreptulOchilor(){
  const panou = document.querySelector('.booking-panel');
  const antet = document.querySelector('header');
  const spatiu = (antet ? antet.offsetHeight : 0) + 16; // bara de sus e fixă, lăsăm loc sub ea
  const y = panou.getBoundingClientRect().top + window.pageYOffset - spatiu;
  window.scrollTo(0, Math.max(0, y));
}
document.getElementById('toStep2').addEventListener('click', ()=>goToStep(2));
document.getElementById('toStep3').addEventListener('click', ()=>goToStep(3));
document.getElementById('toStep4').addEventListener('click', ()=>{ renderSummary(); goToStep(4); });
document.querySelectorAll('[data-back]').forEach(b=>b.addEventListener('click', ()=>goToStep(parseInt(b.dataset.back))));

/* step 2: calendar */
const DOW = ['Lu','Ma','Mi','Jo','Vi','Sâ','Du'];
const MONTHS = ['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie'];

function renderCalendar(){
  const grid = document.getElementById('calGrid');
  grid.innerHTML='';
  document.getElementById('calMonthLabel').textContent = `${MONTHS[calCursor.getMonth()]} ${calCursor.getFullYear()}`;
  DOW.forEach(d=>{
    const el=document.createElement('div'); el.className='cal-dow'; el.textContent=d; grid.appendChild(el);
  });
  const firstDay = new Date(calCursor.getFullYear(), calCursor.getMonth(), 1);
  let startOffset = firstDay.getDay()-1; if(startOffset<0) startOffset=6;
  const daysInMonth = new Date(calCursor.getFullYear(), calCursor.getMonth()+1, 0).getDate();

  for(let i=0;i<startOffset;i++){
    const el=document.createElement('div'); el.className='cal-day empty'; grid.appendChild(el);
  }
  for(let d=1; d<=daysInMonth; d++){
    const dateObj = new Date(calCursor.getFullYear(), calCursor.getMonth(), d);
    const el=document.createElement('div'); el.className='cal-day'; el.textContent=d;
    if(dateObj.getTime()===today.getTime()) el.classList.add('today');
    const isWeekend = !WORKING_DAYS.includes(dateObj.getDay());
    if(dateObj < today || isWeekend){ el.classList.add('past'); }
    else{
      el.addEventListener('click', ()=>{
        document.querySelectorAll('.cal-day').forEach(c=>c.classList.remove('sel'));
        el.classList.add('sel');
        state.date = dateObj;
        state.time = null;
        document.getElementById('toStep3').disabled = true;
        renderSlots();
      });
      if(state.date && dateObj.getTime()===state.date.getTime()) el.classList.add('sel');
    }
    grid.appendChild(el);
  }
}
document.getElementById('calPrev').addEventListener('click', ()=>{ calCursor.setMonth(calCursor.getMonth()-1); renderCalendar(); });
document.getElementById('calNext').addEventListener('click', ()=>{ calCursor.setMonth(calCursor.getMonth()+1); renderCalendar(); });

const bookingsCache = {}; // dateISO -> [{ora, durata}]
function dateToISO(d){
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

// serverul răspunde normal în ~1s; dacă prima cerere se blochează, renunțăm repede și
// reîncercăm — cererea abandonată tot pornește funcția, așa că a doua vine imediat
const SLOT_FETCH_TIMEOUTS = [4000, 8000, 12000];
let slotRequestId = 0; // ca un răspuns întârziat să nu suprascrie ziua aleasă între timp

async function fetchBookings(dateISO, onRetry){
  let lastErr;
  for(let attempt=0; attempt<SLOT_FETCH_TIMEOUTS.length; attempt++){
    if(attempt>0 && onRetry) onRetry(attempt);
    const ctrl = new AbortController();
    const timer = setTimeout(()=>ctrl.abort(), SLOT_FETCH_TIMEOUTS[attempt]);
    try{
      const res = await fetch('/api/slots?data=' + dateISO, {cache:'no-store', signal:ctrl.signal});
      if(!res.ok) throw new Error('status ' + res.status);
      const data = await res.json();
      return data.bookings || [];
    }catch(err){
      lastErr = err;
    }finally{
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

/* Pornim din timp cererea pentru prima zi lucrătoare, imediat ce secțiunea de programare
   ajunge pe ecran: cât timp clienta alege serviciul și ziua, funcția de pe server e deja
   pornită, iar orele apar instant în loc să se încarce abia la click. */
let warmupPornit = false;
function warmupSlots(){
  if(warmupPornit) return;
  warmupPornit = true;
  const d = new Date(today);
  while(!WORKING_DAYS.includes(d.getDay())) d.setDate(d.getDate()+1);
  const iso = dateToISO(d);
  if(iso in bookingsCache) return;
  fetchBookings(iso).then(b=>{ if(!(iso in bookingsCache)) bookingsCache[iso] = b; }).catch(()=>{});
}

const warmupObserver = new IntersectionObserver((entries, obs)=>{
  if(entries.some(e=>e.isIntersecting)){ warmupSlots(); obs.disconnect(); }
}, {rootMargin:'400px'});
warmupObserver.observe(document.getElementById('programare'));

async function renderSlots(){
  const wrap = document.getElementById('slotGrid');
  wrap.innerHTML='';
  noteazaSub('');
  if(!state.date || !state.service){ wrap.innerHTML='<div class="no-slots">Alege mai întâi o dată din calendar.</div>'; return; }

  const dateISO = dateToISO(state.date);
  const reqId = ++slotRequestId;
  wrap.innerHTML = '<div class="no-slots">Se încarcă orele...</div>';

  let bookings;
  try{
    if(!(dateISO in bookingsCache)){
      bookingsCache[dateISO] = await fetchBookings(dateISO, ()=>{
        if(reqId===slotRequestId) wrap.innerHTML = '<div class="no-slots">Se încarcă orele... (mai durează câteva secunde)</div>';
      });
    }
    bookings = bookingsCache[dateISO];
  } catch(err){
    console.error('Eroare la încărcarea orelor ocupate:', err);
    if(reqId!==slotRequestId) return;
    wrap.innerHTML = '<div class="no-slots">Nu am putut încărca orele disponibile. <button type="button" class="slot-retry">Reîncearcă</button></div>';
    wrap.querySelector('.slot-retry').addEventListener('click', renderSlots);
    return;
  }
  if(reqId!==slotRequestId) return; // s-a ales altă zi cât timp se încărca

  wrap.innerHTML = '';
  noteazaSub('');

  let vreunaLibera = false;
  for(const m of orePosibile(bookings)){
    const label = formateazaOra(m);
    const incape = oraValidaLocal(bookings, m, state.service.duration, ultimulStartPentru(state.service));
    const altele = incape ? [] : SERVICES.filter(s=>oraValidaLocal(bookings, m, s.duration, ultimulStartPentru(s)));
    if(!incape && !altele.length) continue; // aici nu încape nimic — nu aglomerăm lista

    const el = document.createElement('div');
    el.className = 'slot' + (incape ? '' : ' prea-scurt');
    el.textContent = label;

    if(incape){
      vreunaLibera = true;
      el.addEventListener('click', ()=>{
        document.querySelectorAll('.slot').forEach(s=>s.classList.remove('sel'));
        el.classList.add('sel');
        state.time = label;
        document.getElementById('toStep3').disabled = false;
      });
      if(state.time===label) el.classList.add('sel');
    }else{
      el.title = 'Aici încap doar servicii mai scurte';
      el.addEventListener('click', ()=>arataCeIncape(label, altele));
    }
    wrap.appendChild(el);
  }

  if(!vreunaLibera){
    wrap.innerHTML = `<div class="no-slots">${state.service.name} (${fmtDuration(state.service.duration)}) nu mai încape în această zi.</div>`;
    cautaPrimaZiCuLoc(dateISO, reqId);
  }
}

/* ---------------- ORELE CARE SE OFERĂ ---------------- */
/* Aceleaşi reguli ca pe server (api/_lib/time.js): ora trebuie să fie în program, lucrarea
   să nu se suprapună peste altă programare, iar golul lăsat înainte şi cel lăsat după să fie
   ori zero, ori destul de mari cât să încapă altcineva. Aşa clienta poate alege ora dorită,
   dar nu poate lăsa în urmă o fereastră în care meşterul stă degeaba. */
const GOL_MINIM = Math.min(...SERVICES.map(s=>s.duration)); // cel mai scurt serviciu

function ultimulStartPentru(serviciu){
  return (serviciu.lastHour || LAST_APPOINTMENT_HOUR)*60;
}

function formateazaOra(m){
  return String(Math.floor(m/60)).padStart(2,'0') + ':' + String(m%60).padStart(2,'0');
}

function intervaleOcupate(bookings){
  return bookings
    .map(b=>({start:timeToMinutesLocal(b.ora), sfarsit:timeToMinutesLocal(b.ora)+Number(b.durata)}))
    .sort((a,b)=>a.start-b.start);
}

function oraValidaLocal(bookings, start, durata, ultimulStart){
  const sfarsit = start + Number(durata);
  if(start < OPEN_HOUR*60 || start > ultimulStart) return false;

  const ocupate = intervaleOcupate(bookings);
  if(ocupate.some(i=>start < i.sfarsit && sfarsit > i.start)) return false;

  const inainte = ocupate.filter(i=>i.sfarsit<=start).pop();
  const golInainte = start - (inainte ? inainte.sfarsit : OPEN_HOUR*60);
  if(golInainte > 0 && golInainte < GOL_MINIM) return false;

  const dupa = ocupate.find(i=>i.start>=sfarsit);
  if(dupa && dupa.start - sfarsit > 0 && dupa.start - sfarsit < GOL_MINIM) return false;

  return true;
}

// orele de pornire luate în calcul: grila din 30 în 30 plus momentul exact în care se
// termină fiecare programare, ca să se poată lipi una de alta fără pauză
function orePosibile(bookings){
  const set = new Set();
  const inLimite = m => m>=OPEN_HOUR*60 && m<=LAST_APPOINTMENT_HOUR*60;
  for(let m=OPEN_HOUR*60; m<=LAST_APPOINTMENT_HOUR*60; m+=SLOT_STEP) set.add(m);
  bookings.forEach(b=>{
    const inceput = timeToMinutesLocal(b.ora);
    if(inLimite(inceput+Number(b.durata))) set.add(inceput+Number(b.durata)); // lipit după ea
    // şi ora la care o lucrare s-ar termina exact când începe aceasta — lipit înainte de ea
    SERVICES.forEach(s=>{ if(inLimite(inceput-s.duration)) set.add(inceput-s.duration); });
  });
  return Array.from(set).sort((a,b)=>a-b);
}

function noteazaSub(html){
  document.getElementById('slotNote').innerHTML = html;
}

function arataCeIncape(label, servicii){
  const lista = servicii.map(s=>`${s.name} (${fmtDuration(s.duration)})`).join(', ');
  noteazaSub(`La ${label} mai este loc doar pentru: <b>${lista}</b>. <button type="button" class="slot-link" data-schimba>Schimbă serviciul</button>`);
  document.querySelector('[data-schimba]').addEventListener('click', ()=>goToStep(1));
}

async function cautaPrimaZiCuLoc(dinZiua, reqId){
  noteazaSub('Caut prima zi cu loc...');
  try{
    const res = await fetch(`/api/slots?data=${dinZiua}&zile=21`, {cache:'no-store'});
    if(!res.ok) throw new Error('status '+res.status);
    const zile = (await res.json()).zile || {};
    if(reqId!==slotRequestId) return;

    for(const zi of Object.keys(zile).sort()){
      if(zi<=dinZiua) continue;
      const [y,m,d] = zi.split('-').map(Number);
      const dataZi = new Date(y, m-1, d);
      if(!WORKING_DAYS.includes(dataZi.getDay())) continue;

      const libera = orePosibile(zile[zi]).find(t=>oraValidaLocal(zile[zi], t, state.service.duration, ultimulStartPentru(state.service)));
      if(libera===undefined) continue;

      const etichetaZi = dataZi.toLocaleDateString('ro-RO', {weekday:'long', day:'numeric', month:'long'});
      noteazaSub(`Prima zi cu loc: <b>${etichetaZi}</b>, de la ${formateazaOra(libera)}. <button type="button" class="slot-link" data-sari>Vezi ziua</button>`);
      document.querySelector('[data-sari]').addEventListener('click', ()=>mergiLaZiua(dataZi));
      return;
    }
    noteazaSub('Nu am găsit loc în următoarele trei săptămâni — sună-ne și găsim o soluție.');
  }catch(err){
    console.error('Eroare la căutarea primei zile libere:', err);
    noteazaSub('Alege altă zi din calendar.');
  }
}

function mergiLaZiua(dataZi){
  state.date = dataZi;
  state.time = null;
  document.getElementById('toStep3').disabled = true;
  calCursor = new Date(dataZi.getFullYear(), dataZi.getMonth(), 1);
  renderCalendar();
  renderSlots();
}

function timeToMinutesLocal(label){
  const parts = String(label).split(':');
  return Number(parts[0])*60 + Number(parts[1]);
}

/* step 4: summary */
function renderSummary(){
  const card = document.getElementById('summaryCard');
  const dateLabel = state.date ? state.date.toLocaleDateString('ro-RO', {weekday:'long', day:'numeric', month:'long'}) : '—';
  card.innerHTML = `
    <div class="row"><span>Serviciu</span><span>${state.service.name}</span></div>
    <div class="row"><span>Preț</span><span>${state.service.priceLabel}</span></div>
    <div class="row"><span>Durată</span><span>${fmtDuration(state.service.duration)}</span></div>
    <div class="row"><span>Data</span><span>${dateLabel}</span></div>
    <div class="row"><span>Ora</span><span>${state.time || '—'}</span></div>
    <div class="row"><span>Nume</span><span>${document.getElementById('fName').value || '—'}</span></div>
    <div class="row"><span>Telefon</span><span>${document.getElementById('fPhone').value || '—'}</span></div>
  `;
}

document.getElementById('confirmBtn').addEventListener('click', async ()=>{
  const name = document.getElementById('fName').value.trim();
  const phone = document.getElementById('fPhone').value.trim();
  const email = document.getElementById('fEmail').value.trim();
  const note = document.getElementById('fNote').value.trim();
  if(!name || !phone){
    goToStep(3);
    alert('Te rugăm completează numele și telefonul pentru a confirma programarea.');
    return;
  }
  // numărul trebuie să fie real: cu el te contactăm și tot cu el poți anula
  if(!telefonValid(phone)){
    goToStep(3);
    alert('Numărul de telefon nu pare corect. Scrie-l în forma 07xx xxx xxx.');
    document.getElementById('fPhone').focus();
    return;
  }
  if(email && !emailValid(email)){
    goToStep(3);
    alert('Adresa de email nu pare corectă.');
    document.getElementById('fEmail').focus();
    return;
  }

  const confirmBtn = document.getElementById('confirmBtn');
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Se trimite...';

  const dateISO = dateToISO(state.date); // YYYY-MM-DD (oră locală, nu UTC)
  const dateLabel = state.date.toLocaleDateString('ro-RO', {weekday:'long', day:'numeric', month:'long'});

  try{
    const res = await fetch('/api/book', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        nume: name,
        telefon: phone,
        email: email,
        observatii: note,
        serviciu: state.service.name,
        pret: state.service.priceLabel,
        durata: state.service.duration,
        data: dateISO,
        ora: state.time,
      })
    });
    const result = await res.json();

    if(!result.success){
      alert(result.error || 'A apărut o eroare la salvarea programării. Încearcă din nou.');
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Confirmă programarea';
      renderSlots();
      return;
    }
  } catch(err){
    console.error('Eroare la trimiterea programării:', err);
    alert('Nu am putut salva programarea — verifică conexiunea la internet și încearcă din nou.');
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Confirmă programarea';
    return;
  }

  delete bookingsCache[dateISO];
  ultimaProgramare = { data: dateISO, ora: state.time, telefon: phone };
  document.getElementById('cancelJustBooked').style.display = '';
  document.getElementById('cancelJustBookedMsg').textContent = '';
  document.getElementById('confirmText').textContent =
    `${name}, programarea ta pentru "${state.service.name}" este rezervată pe ${dateLabel} la ora ${state.time}. Vei fi contactată la ${phone} pentru confirmare.`;
  confirmBtn.disabled = false;
  confirmBtn.textContent = 'Confirmă programarea';
  goToStep(5);
});

document.getElementById('newBooking').addEventListener('click', ()=>{
  state = {service:null, date:null, time:null};
  document.querySelectorAll('.svc-choice').forEach(c=>c.classList.remove('sel'));
  document.getElementById('toStep2').disabled = true;
  document.getElementById('toStep3').disabled = true;
  document.getElementById('fName').value='';
  document.getElementById('fPhone').value='';
  document.getElementById('fEmail').value='';
  document.getElementById('fNote').value='';
  goToStep(1);
});

/* ---------------- ANULARE PROGRAMARE ---------------- */
async function trimiteAnulare(detalii){
  const res = await fetch('/api/cancel', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(detalii)
  });
  return res.json();
}

function arataMesaj(el, text, reusit){
  el.textContent = text;
  el.className = 'cancel-msg ' + (reusit ? 'ok' : 'err');
}

function dataFrumoasa(iso){
  const [y, m, d] = String(iso).split('-').map(Number);
  return `${d} ${MONTHS[m-1].toLowerCase()} ${y}`;
}

function textAnulare(data, ora){
  return `Programarea a fost anulată în data de ${dataFrumoasa(data)}, de la ora ${ora}.`;
}

/* lista de ore din formularul de anulare se completează cu orele reale ale zilei alese —
   mai uşor de apăsat pe telefon decât un ceas şi nu se poate greşi ora */
const cData = document.getElementById('cData');
const cOra = document.getElementById('cOra');

function puneOre(ore, primaLinie){
  cOra.innerHTML = '';
  const p = document.createElement('option');
  p.value = ''; p.textContent = primaLinie;
  cOra.appendChild(p);
  ore.forEach(o=>{
    const el = document.createElement('option');
    el.value = o; el.textContent = o;
    cOra.appendChild(el);
  });
  cOra.disabled = !ore.length;
}

async function incarcaOreAnulare(){
  const data = cData.value;
  if(!data){ puneOre([], 'Alege ora'); return; }
  puneOre([], 'Se încarcă...');
  try{
    const programari = await fetchBookings(data);
    const ore = programari.map(b=>b.ora).sort();
    puneOre(ore, ore.length ? 'Alege ora' : 'Nicio programare');
  }catch(err){
    console.error('Eroare la încărcarea orelor pentru anulare:', err);
    puneOre([], 'Eroare la încărcare');
  }
}
cData.addEventListener('change', incarcaOreAnulare);

document.getElementById('cancelBtn').addEventListener('click', async ()=>{
  const btn = document.getElementById('cancelBtn');
  const msg = document.getElementById('cancelMsg');
  const data = cData.value;
  const ora = cOra.value;
  const contact = document.getElementById('cContact').value.trim();

  if(!data || !ora || !contact){
    arataMesaj(msg, 'Completează data, ora și telefonul sau emailul.', false);
    return;
  }

  // acelaşi câmp acceptă ambele — decidem după prezenţa lui @
  const detalii = contact.includes('@') ? {data, ora, email:contact} : {data, ora, telefon:contact};

  btn.disabled = true; btn.textContent = 'Se anulează...';
  try{
    const r = await trimiteAnulare(detalii);
    if(r.success){
      arataMesaj(msg, textAnulare(data, ora), true);
      delete bookingsCache[data];
      document.getElementById('cContact').value = '';
      incarcaOreAnulare(); // ora anulată dispare din listă
      if(state.date && dateToISO(state.date)===data) renderSlots();
    }else{
      arataMesaj(msg, r.error || 'Nu am putut anula programarea.', false);
    }
  }catch(err){
    console.error('Eroare la anulare:', err);
    arataMesaj(msg, 'Nu am putut trimite cererea. Verifică internetul și încearcă din nou.', false);
  }
  btn.disabled = false; btn.textContent = 'Anulează programarea';
});

document.getElementById('cancelJustBooked').addEventListener('click', async ()=>{
  if(!ultimaProgramare) return;
  const btn = document.getElementById('cancelJustBooked');
  const msg = document.getElementById('cancelJustBookedMsg');

  btn.disabled = true; btn.textContent = 'Se anulează...';
  try{
    const r = await trimiteAnulare(ultimaProgramare);
    if(r.success){
      arataMesaj(msg, textAnulare(ultimaProgramare.data, ultimaProgramare.ora), true);
      delete bookingsCache[ultimaProgramare.data];
      ultimaProgramare = null;
      btn.style.display = 'none';
      return;
    }
    arataMesaj(msg, r.error || 'Nu am putut anula programarea.', false);
  }catch(err){
    console.error('Eroare la anulare:', err);
    arataMesaj(msg, 'Nu am putut trimite cererea. Încearcă din nou.', false);
  }
  btn.disabled = false; btn.textContent = 'Anulează programarea';
});

renderCalendar();