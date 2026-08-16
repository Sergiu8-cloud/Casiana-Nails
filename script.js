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
  {src:'images/gallery-2.jpg', tag:'Manichiură cu gel', cap:'Matte pastel'},
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
const WORKING_DAYS = [1,2,3,4,5]; // Luni(1) – Vineri(5); 0=Duminică, 6=Sâmbătă

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
  if(n===2) renderCalendar();
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

async function renderSlots(){
  const wrap = document.getElementById('slotGrid');
  wrap.innerHTML='';
  if(!state.date || !state.service){ wrap.innerHTML='<div class="no-slots">Alege mai întâi o dată din calendar.</div>'; return; }

  const dateISO = dateToISO(state.date);
  wrap.innerHTML = '<div class="no-slots">Se încarcă orele...</div>';

  let bookings;
  try{
    if(!(dateISO in bookingsCache)){
      const res = await fetch('/api/slots?data=' + dateISO);
      if(!res.ok) throw new Error('status ' + res.status);
      const data = await res.json();
      bookingsCache[dateISO] = data.bookings || [];
    }
    bookings = bookingsCache[dateISO];
  } catch(err){
    console.error('Eroare la încărcarea orelor ocupate:', err);
    wrap.innerHTML = '<div class="no-slots">Nu am putut încărca orele disponibile. Reîncearcă sau contactează-ne telefonic.</div>';
    return;
  }

  wrap.innerHTML = '';
  const lastStartMinutes = (state.service.lastHour || LAST_APPOINTMENT_HOUR)*60;
  const startMinutes = OPEN_HOUR*60;
  const newDuration = state.service.duration;

  let any=false;
  for(let m=startMinutes; m<=lastStartMinutes; m+=SLOT_STEP){
    const hh = String(Math.floor(m/60)).padStart(2,'0');
    const mm = String(m%60).padStart(2,'0');
    const label = `${hh}:${mm}`;
    const newEnd = m + newDuration;
    // ocupat dacă se suprapune cu orice programare existentă (indiferent de serviciu — un singur meșter)
    const taken = bookings.some(b=>{
      const bStart = timeToMinutesLocal(b.ora);
      const bEnd = bStart + Number(b.durata);
      return m < bEnd && newEnd > bStart;
    });
    const el = document.createElement('div');
    el.className = 'slot' + (taken?' taken':'');
    el.textContent = label;
    if(!taken){
      any=true;
      el.addEventListener('click', ()=>{
        document.querySelectorAll('.slot').forEach(s=>s.classList.remove('sel'));
        el.classList.add('sel');
        state.time = label;
        document.getElementById('toStep3').disabled = false;
      });
      if(state.time===label) el.classList.add('sel');
    }
    wrap.appendChild(el);
  }
  if(!any){ wrap.innerHTML='<div class="no-slots">Nu mai sunt ore libere în această zi — alege altă dată.</div>'; }
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

renderCalendar();