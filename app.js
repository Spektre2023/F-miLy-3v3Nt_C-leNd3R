/* =====================================================================
   FAMILY CALENDAR — app logic (no build step, plain JavaScript)
   ===================================================================== */

const cfg = window.FAMILYCAL_CONFIG || {};
const $ = (id) => document.getElementById(id);

/* ---------- reference data ---------- */
const CATEGORIES = [
  { name:'United Swimming',       color:'#0a84ff', icon:'sport',    who:['Lincoln','Evelyn'] },
  { name:'Ballet',                color:'#ff6fa5', icon:'arts',     who:['Evelyn'] },
  { name:'Genie Music – Piano',   color:'#5e5ce6', icon:'music',    who:['Lincoln'] },
  { name:'Genie Music – Violin',  color:'#bf5af2', icon:'music',    who:['Evelyn'] },
  { name:'Hye Yun – Piano',       color:'#30b0c7', icon:'music',    who:['Evelyn'] },
  { name:'Art Class',             color:'#ff9f0a', icon:'arts',     who:['Lincoln','Evelyn'] },
  { name:'Soccer Training',       color:'#34c759', icon:'sport',    who:['Lincoln'] },
  { name:'Soccer Match',          color:'#248a3d', icon:'sport',    who:['Lincoln'] },
  { name:'CBFI Training',         color:'#00c7be', icon:'sport',    who:['Lincoln'] },
  { name:'Sunday Mass',           color:'#c99a2e', icon:'faith',    who:['Family'] },
  { name:'Edu Kingdom',           color:'#ac8e68', icon:'edu',      who:['Lincoln'] },
  { name:'Music Competition',     color:'#ff3b30', icon:'music',    who:['Lincoln','Evelyn'] },
  { name:'Music Concert',         color:'#ff6482', icon:'music',    who:['Lincoln','Evelyn'] },
  { name:'ICAS Test',             color:'#d4a017', icon:'edu',      who:['Lincoln','Evelyn'] },
  { name:'Edu Kingdom Term Test', color:'#a2845e', icon:'edu',      who:['Lincoln'] },
  { name:'Dentist',               color:'#64d2ff', icon:'health',   who:['Family'] },
  { name:'Eye Specialist',        color:'#5ac8fa', icon:'health',   who:['Lincoln'] },
  { name:'Haircut',               color:'#98989d', icon:'grooming', who:[] },
  { name:'Other',                 color:'#8e8e93', icon:'event',    who:[] },
];
const WHO_OPTIONS = ['Lincoln','Evelyn','Family','Sunny','Ester'];
const SWATCHES = ['#e0689a','#f48fb1','#ff8a9a','#f6a35c','#e6c84f','#9bcf8f','#7fc8c2','#b06ad1'];
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function iconPath(type){
  switch(type){
    case 'sport':    return '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M3.5 12h17"/>';
    case 'music':    return '<path d="M9 17V5l10-2v12"/><circle cx="6.5" cy="17.5" r="2.6"/><circle cx="16.5" cy="15.5" r="2.6"/>';
    case 'arts':     return '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-1 1.5-2-.4-1.3.5-2 1.8-2H18a3 3 0 0 0 3-3c0-5-4-8-9-8z"/><circle cx="8" cy="11" r="1"/><circle cx="12" cy="8" r="1"/>';
    case 'faith':    return '<path d="M12 3v18M7.5 8h9"/>';
    case 'edu':      return '<path d="M3 9l9-4 9 4-9 4-9-4z"/><path d="M7 11v5c0 1 2.2 2 5 2s5-1 5-2v-5"/>';
    case 'health':   return '<path d="M3 12h4l2 5 4-13 2.5 8H21"/>';
    case 'grooming': return '<circle cx="6" cy="6" r="2.6"/><circle cx="6" cy="18" r="2.6"/><path d="M20 4 8.2 15.8M20 20 8.2 8.2"/>';
    default:         return '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3.5v4M16 3.5v4"/>';
  }
}
function iconSVG(type, color){
  return '<svg class="ev-cat-ic" viewBox="0 0 24 24" fill="none" stroke="'+(color||'currentColor')+
         '" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+iconPath(type)+'</svg>';
}
function catByName(n){ return CATEGORIES.find(c=>c.name===n) || CATEGORIES[CATEGORIES.length-1]; }

/* ---------- date helpers ---------- */
const pad = (n)=>String(n).padStart(2,'0');
const fmtDate = (d)=> d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
function parseDate(s){ const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); }
function sameDay(a,b){ return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); }
function toMin(t){ if(!t) return null; const [h,m]=t.split(':').map(Number); return h*60+m; }
function fmtTime(t){ if(!t) return ''; let [h,m]=t.split(':').map(Number); const ap=h>=12?'pm':'am'; const hh=((h+11)%12)+1; return hh+(m?':'+pad(m):'')+ap; }
function fmtRange(ev){
  if(ev.is_all_day || !ev.start_time) return 'All day';
  if(ev.end_time && ev.end_time!==ev.start_time){
    // share the am/pm when both sides match, e.g. 9:00–10:30am
    const a=fmtTime(ev.start_time), b=fmtTime(ev.end_time);
    const apA=a.slice(-2), apB=b.slice(-2);
    return apA===apB ? a.slice(0,-2)+'–'+b : a+'–'+b;
  }
  return fmtTime(ev.start_time);
}
function nextDateForWeekday(wd){ const d=new Date(); const diff=(wd-d.getDay()+7)%7; d.setDate(d.getDate()+diff); return fmtDate(d); }

/* ---------- state ---------- */
let sb = null;
let session = null;
let EVENTS = [];
const state = {
  month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  selected: new Date(),
  editing: null,        // event object or null (new)
  pendingFiles: [],     // File[] queued for upload on save
  removeAttachIds: [],  // attachment ids to delete on save
  miniMap: null,
  subscribed: false,
};

/* =====================================================================
   BOOT
   ===================================================================== */
function configured(){
  return cfg.SUPABASE_URL && !String(cfg.SUPABASE_URL).includes('PASTE')
      && cfg.SUPABASE_ANON_KEY && !String(cfg.SUPABASE_ANON_KEY).includes('PASTE');
}

// in-memory store used only when "Keep me signed in" is OFF
function memStorage(){ let m={}; return { getItem:k=>(k in m?m[k]:null), setItem:(k,v)=>{m[k]=v}, removeItem:k=>{delete m[k]} }; }
function makeClient(remember){
  return window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'familycal-auth',
      storage: remember ? window.localStorage : memStorage(),
    }
  });
}
function rememberPref(){ try{ return localStorage.getItem('familycal-remember') !== 'no'; }catch(_){ return true; } }

(function detectDevice(){
  const ua = navigator.userAgent;
  if(/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints>1)) document.body.classList.add('is-ipad');
  else if(/iPhone|iPod/.test(ua)) document.body.classList.add('is-iphone');
})();

window.addEventListener('DOMContentLoaded', init);

async function init(){
  if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }

  if(!configured()){ $('setupScreen').classList.remove('hidden'); return; }

  sb = makeClient(rememberPref());
  $('loginTitle').textContent = cfg.FAMILY_NAME ? cfg.FAMILY_NAME : 'Family Calendar';

  wireStaticUI();
  attachAuth();
}
function attachAuth(){
  // fires once on subscribe (INITIAL_SESSION) and on every sign-in / sign-out
  sb.auth.onAuthStateChange((_e, s)=>{ session = s; if(s){ enterApp(); } else { showLogin(); } });
}

/* =====================================================================
   AUTH
   ===================================================================== */
function showLogin(){
  $('app').classList.add('hidden');
  $('loginScreen').classList.remove('hidden');
  const cb = $('rememberMe'); if(cb) cb.checked = rememberPref();
}
async function doLogin(){
  const email = $('email').value.trim();
  const password = $('password').value;
  const remember = $('rememberMe') ? $('rememberMe').checked : true;
  try{ localStorage.setItem('familycal-remember', remember ? 'yes' : 'no'); }catch(_){}
  sb = makeClient(remember);                 // rebuild so the session lands in the right storage
  state.subscribed = false;
  attachAuth();
  const err = $('loginError');
  err.classList.add('hidden');
  $('loginBtn').textContent = 'Signing in…';
  const { error } = await sb.auth.signInWithPassword({ email, password });
  $('loginBtn').textContent = 'Sign in';
  if(error){ err.textContent = error.message || 'Could not sign in.'; err.classList.remove('hidden'); }
}
async function enterApp(){
  $('loginScreen').classList.add('hidden');
  $('setupScreen').classList.add('hidden');
  $('app').classList.remove('hidden');
  $('acctUser').textContent = 'Signed in as ' + (session?.user?.email || '');
  buildWeekdayRow();
  await reload();
  subscribeRealtime();
}

/* =====================================================================
   DATA
   ===================================================================== */
async function reload(){
  const { data, error } = await sb.from('events').select('*');
  if(error){ toast('Could not load events'); return; }
  EVENTS = data || [];
  renderCalendar();
  renderDay(state.selected);
}
function subscribeRealtime(){
  if(state.subscribed) return;
  state.subscribed = true;
  sb.channel('familycal')
    .on('postgres_changes', { event:'*', schema:'public', table:'events' }, reload)
    .on('postgres_changes', { event:'*', schema:'public', table:'attachments' }, ()=>{})
    .subscribe();
}
function eventsOnDate(date){
  return EVENTS.filter(ev=>{
    if(ev.recurrence_end && date > parseDate(ev.recurrence_end)) return false;
    switch(ev.event_type){
      case 'one_off': return ev.event_date && sameDay(parseDate(ev.event_date), date);
      case 'weekly':  return ev.weekday === date.getDay();
      case 'daily':   return true;
      case 'monthly': return ev.month_day === date.getDate();
    }
    return false;
  });
}
function sortForDay(list){
  const untimed = list.filter(e=>e.is_all_day || !e.start_time)
                      .sort((a,b)=>(a.priority_order||0)-(b.priority_order||0));
  const timed   = list.filter(e=>!e.is_all_day && e.start_time)
                      .sort((a,b)=>toMin(a.start_time)-toMin(b.start_time));
  return { untimed, timed };
}

/* =====================================================================
   CALENDAR GRID
   ===================================================================== */
function buildWeekdayRow(){
  const r = $('weekdayRow'); r.innerHTML='';
  DOW.forEach(d=>{ const s=document.createElement('span'); s.textContent=d; r.appendChild(s); });
}
function renderCalendar(){
  const first = state.month;
  $('monthLabel').textContent = MONTHS[first.getMonth()] + ' ' + first.getFullYear();
  const grid = $('monthGrid'); grid.innerHTML='';
  const startOffset = first.getDay();                  // 0=Sun
  const start = new Date(first); start.setDate(1 - startOffset);
  const today = new Date();

  for(let i=0;i<42;i++){
    const d = new Date(start); d.setDate(start.getDate()+i);
    const cell = document.createElement('div');
    cell.className = 'day';
    const inMonth = d.getMonth()===first.getMonth();
    if(!inMonth) cell.classList.add('dim');
    if(sameDay(d,today)) cell.classList.add('today');
    if(sameDay(d,state.selected)) cell.classList.add('selected');

    const num = document.createElement('div'); num.className='day-num'; num.textContent=d.getDate();
    cell.appendChild(num);

    const dayList = sortForDay(eventsOnDate(d));
    const ordered = [...dayList.timed, ...dayList.untimed];
    const clashIds = clashSet(dayList.timed);
    const max = document.body.classList.contains('is-iphone') ? 2 : 3;
    ordered.slice(0,max).forEach(ev=>{
      const chip=document.createElement('div');
      chip.className='chip'+(clashIds.has(ev.id)?' flag-clash':'');
      chip.style.background = ev.color || catByName(ev.category).color;
      const tt = (!ev.is_all_day && ev.start_time) ? '<span class="dot-time">'+fmtTime(ev.start_time)+'</span> ' : '';
      chip.innerHTML = tt + escapeHtml(shortTitle(ev));
      cell.appendChild(chip);
    });
    if(ordered.length>max){ const m=document.createElement('div'); m.className='more'; m.textContent='+'+(ordered.length-max)+' more'; cell.appendChild(m); }

    if(inMonth || true){ cell.addEventListener('click', ()=> selectDay(d)); }
    grid.appendChild(cell);
  }
}
function shortTitle(ev){ return ev.title || ev.category || 'Event'; }

function selectDay(d){
  state.selected = new Date(d);
  if(d.getMonth()!==state.month.getMonth() || d.getFullYear()!==state.month.getFullYear()){
    state.month = new Date(d.getFullYear(), d.getMonth(), 1);
  }
  renderCalendar();
  renderDay(d);
  if(document.body.classList.contains('is-iphone')) $('dayPane').classList.add('open');
}

/* =====================================================================
   DAY PANEL
   ===================================================================== */
function renderDay(date){
  const list = sortForDay(eventsOnDate(date));
  const all = [...list.untimed, ...list.timed];
  $('dayPaneDate').textContent = DOW[date.getDay()]+', '+date.getDate()+' '+MONTHS[date.getMonth()];
  $('dayPaneSub').textContent = all.length ? (all.length+(all.length===1?' event':' events')) : 'Nothing on yet';

  // clash banner
  const clashes = findClashes(list.timed);
  const banner = $('clashBanner');
  if(clashes.length){
    const [a,b] = clashes[0];
    const helper = a.helper || b.helper;
    let msg = '<b>Clash:</b> '+escapeHtml(shortTitle(a))+' ('+fmtTime(a.start_time)+') and '+
              escapeHtml(shortTitle(b))+' ('+fmtTime(b.start_time)+') are close together';
    if(a.location_name||b.location_name) msg += ' in different places';
    msg += '. ' + (helper ? (escapeHtml(helper)+' is already helping with one — assign the other?')
                          : 'Assign Sam or Meeah to one of them?');
    banner.innerHTML = msg; banner.classList.remove('hidden');
  } else banner.classList.add('hidden');

  const wrap = $('dayEvents'); wrap.innerHTML='';
  const clashIds = clashSet(list.timed);

  if(!all.length){
    const e=document.createElement('div'); e.className='empty';
    e.textContent='Tap “Add to this day” to put something here.'; wrap.appendChild(e); return;
  }

  // untimed first (draggable / priority order), then timed (fixed by time)
  list.untimed.forEach(ev=> wrap.appendChild(evRow(ev, true, clashIds)));
  list.timed.forEach(ev=> wrap.appendChild(evRow(ev, false, clashIds)));
  enableReorder(wrap);
}
function evRow(ev, draggable, clashIds){
  const row=document.createElement('div');
  row.className='ev'+(clashIds.has(ev.id)?' has-clash':'');
  row.dataset.id=ev.id;
  const color = ev.color || catByName(ev.category).color;
  const cat = catByName(ev.category);

  const bar=document.createElement('div'); bar.className='ev-bar'; bar.style.background=color; row.appendChild(bar);

  const main=document.createElement('div'); main.className='ev-main';
  const title=document.createElement('div'); title.className='ev-title';
  title.innerHTML = iconSVG(cat.icon, color) + '<span>'+escapeHtml(shortTitle(ev))+'</span>'
                  + (clashIds.has(ev.id)?' <span class="badge" style="background:rgba(255,59,48,.14);color:#d12">clash</span>':'');
  main.appendChild(title);

  const meta=document.createElement('div'); meta.className='ev-meta';
  if(!ev.is_all_day && ev.start_time){ const t=document.createElement('span'); t.className='ev-time'; t.textContent=fmtRange(ev); meta.appendChild(t); }
  else { const t=document.createElement('span'); t.textContent='All day'; meta.appendChild(t); }
  if(ev.location_name){ const l=document.createElement('span'); l.textContent='· '+ev.location_name; meta.appendChild(l); }
  (ev.who||[]).forEach(w=>{ const b=document.createElement('span'); b.className='badge who'; b.textContent=w; meta.appendChild(b); });
  if(ev.helper){ const h=document.createElement('span'); h.className='badge help'; h.textContent=ev.helper+' · '+(ev.helper_role||'help'); meta.appendChild(h); }
  main.appendChild(meta);
  row.appendChild(main);

  if(draggable){ const handle=document.createElement('div'); handle.className='handle'; handle.textContent='≡';
    handle.addEventListener('pointerdown', (e)=>startDrag(e,row)); row.appendChild(handle); }

  main.addEventListener('click', ()=> openEditor(ev));
  return row;
}

/* ---------- pointer-based reorder (works on touch + mouse) ---------- */
let drag=null;
function startDrag(e,row){
  e.preventDefault();
  const list=row.parentElement;
  drag={row,list};
  row.classList.add('dragging');
  window.addEventListener('pointermove', onDragMove);
  window.addEventListener('pointerup', onDragUp, {once:true});
}
function rowAfter(list,y){
  const els=[...list.querySelectorAll('.ev:not(.dragging)')];
  let best={off:-Infinity, el:null};
  els.forEach(el=>{ const b=el.getBoundingClientRect(); const off=y-b.top-b.height/2;
    if(off<0 && off>best.off) best={off, el}; });
  return best.el;
}
function onDragMove(e){
  if(!drag) return;
  // only reorder among untimed rows (those with a handle)
  const after=rowAfter(drag.list, e.clientY);
  const untimedRows=[...drag.list.querySelectorAll('.ev')].filter(r=>r.querySelector('.handle'));
  if(after==null || !after.querySelector('.handle')){
    // place after last untimed
    const last=untimedRows[untimedRows.length-1];
    if(last && last!==drag.row) last.after(drag.row);
  } else {
    drag.list.insertBefore(drag.row, after);
  }
}
async function onDragUp(){
  if(!drag) return;
  drag.row.classList.remove('dragging');
  window.removeEventListener('pointermove', onDragMove);
  const ids=[...drag.list.querySelectorAll('.ev')].filter(r=>r.querySelector('.handle')).map(r=>r.dataset.id);
  drag=null;
  await Promise.all(ids.map((id,i)=> sb.from('events').update({priority_order:i}).eq('id',id)));
  await reload();
}
function enableReorder(){ /* handlers attached per-row */ }

/* =====================================================================
   CLASH DETECTION (pure logic, no AI / no network)
   ===================================================================== */
function evInterval(e){ const s=toMin(e.start_time); const en=e.end_time?toMin(e.end_time):s; return [s, Math.max(en,s)]; }
function findClashes(timed){
  const out=[];
  for(let i=0;i<timed.length;i++) for(let j=i+1;j<timed.length;j++){
    const a=timed[i], b=timed[j];
    const [as,ae]=evInterval(a), [bs,be]=evInterval(b);
    const overlap = as < be && bs < ae;             // their time ranges actually overlap
    const close   = Math.abs(as-bs) <= 90;          // or they start close together (logistics)
    const diffPlace=(a.location_name||'')!==(b.location_name||'');
    const diffWho = JSON.stringify((a.who||[]).slice().sort())!==JSON.stringify((b.who||[]).slice().sort());
    if((overlap || close) && (diffPlace || diffWho)) out.push([a,b,Math.abs(as-bs)]);
  }
  return out;
}
function clashSet(timed){
  const s=new Set();
  findClashes(timed).forEach(([a,b])=>{ s.add(a.id); s.add(b.id); });
  return s;
}

/* =====================================================================
   EVENT EDITOR
   ===================================================================== */
function buildEditorControls(){
  // category dropdown change handler (options are (re)built per open)
  const sel=$('fCategory');
  sel.addEventListener('change', ()=>{
    if(sel.value==='__custom__'){
      $('customCatField').classList.remove('hidden');
      $('fCustomCat').focus();
      return;
    }
    $('customCatField').classList.add('hidden');
    const c=CATEGORIES.find(x=>x.name===sel.value);
    if(c){ if(!$('fTitle').value) $('fTitle').value=c.name; selectColor(c.color); setWho(c.who); }
  });
  // who chips
  const who=$('fWho'); who.innerHTML='';
  WHO_OPTIONS.forEach(w=>{ const b=document.createElement('button'); b.type='button'; b.className='chip-toggle'; b.textContent=w; b.dataset.w=w;
    b.addEventListener('click', ()=> b.classList.toggle('on')); who.appendChild(b); });
  // colour swatches
  const sw=$('fColors'); sw.innerHTML='';
  SWATCHES.forEach(c=>{ const s=document.createElement('div'); s.className='swatch'; s.style.background=c; s.dataset.c=c;
    s.addEventListener('click', ()=> selectColor(c)); sw.appendChild(s); });
  // repeat type segment
  $('typeSeg').querySelectorAll('.seg-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{ $('typeSeg').querySelectorAll('.seg-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active'); applyType(btn.dataset.type); });
  });
  // helper visibility
  $('fHelper').addEventListener('change', ()=>{ $('helperRoleField').style.display = $('fHelper').value ? 'block':'none'; });
  // address -> map
  $('fAddress').addEventListener('blur', refreshMiniMap);
  // files
  $('fFiles').addEventListener('change', (e)=>{ for(const f of e.target.files) state.pendingFiles.push(f); e.target.value=''; renderAttachments(); });
}
function discoveredCategories(){
  const known=new Set(CATEGORIES.map(c=>c.name));
  return [...new Set(EVENTS.map(e=>e.category).filter(c=>c && !known.has(c)))];
}
function buildCategoryOptions(current){
  const sel=$('fCategory'); sel.innerHTML='';
  const add=(name)=>{ const o=document.createElement('option'); o.value=name; o.textContent=name; sel.appendChild(o); };
  CATEGORIES.forEach(c=>add(c.name));
  const extra=discoveredCategories();
  extra.forEach(add);
  if(current && !CATEGORIES.some(c=>c.name===current) && !extra.includes(current)) add(current);
  const o=document.createElement('option'); o.value='__custom__'; o.textContent='+ Add custom…'; sel.appendChild(o);
  sel.value = current || 'Other';
}
function selectColor(c){ document.querySelectorAll('#fColors .swatch').forEach(s=>s.classList.toggle('on', s.dataset.c===c));
  if(![...document.querySelectorAll('#fColors .swatch')].some(s=>s.dataset.c===c)){ /* custom cat colour: highlight none */ }
  state._color=c; }
function setWho(arr){ document.querySelectorAll('#fWho .chip-toggle').forEach(b=> b.classList.toggle('on', (arr||[]).includes(b.dataset.w))); }
function getWho(){ return [...document.querySelectorAll('#fWho .chip-toggle.on')].map(b=>b.dataset.w); }
function applyType(t){
  $('whenOneOff').classList.toggle('hidden', t!=='one_off');
  $('whenWeekly').classList.toggle('hidden', t!=='weekly');
  $('whenMonthly').classList.toggle('hidden', t!=='monthly');
  state._type=t;
}

function openEditor(ev, prefill){
  state.editing = ev || null;
  state.pendingFiles = []; state.removeAttachIds = [];
  const e = ev || prefill || {};
  $('editorTitle').textContent = ev ? 'Edit event' : 'New event';
  $('editorDelete').classList.toggle('hidden', !ev);

  const type = e.event_type || 'one_off';
  $('typeSeg').querySelectorAll('.seg-btn').forEach(b=>b.classList.toggle('active', b.dataset.type===type));
  applyType(type);

  $('fTitle').value = e.title || '';
  buildCategoryOptions(e.category || 'Other');
  $('customCatField').classList.add('hidden');
  $('fCustomCat').value = '';
  setWho(e.who && e.who.length ? e.who : catByName(e.category||'Other').who);
  $('fDate').value = e.event_date || fmtDate(state.selected);
  $('fWeekday').value = (e.weekday!=null ? e.weekday : state.selected.getDay());
  $('fMonthDay').value = e.month_day || state.selected.getDate();
  // time: empty start means all-day
  $('fTime').value = e.start_time ? e.start_time.slice(0,5) : '';
  $('fEnd').value  = e.end_time ? e.end_time.slice(0,5) : '';
  selectColor(e.color || catByName(e.category||'Other').color);
  $('fPlace').value = e.location_name || '';
  $('fAddress').value = e.location_address || '';
  $('fPrep').value = e.prep_items || '';
  $('fHelper').value = e.helper || '';
  $('helperRoleField').style.display = e.helper ? 'block':'none';
  $('fHelperRole').value = e.helper_role || 'pickup';
  $('fCost').value = e.cost || '';
  $('fNotes').value = e.notes || '';
  state._existingLatLng = (e.lat!=null) ? {lat:e.lat, lng:e.lng} : null;

  renderAttachments();
  refreshMiniMap();
  openSheet('editor');
}

async function renderAttachments(){
  const wrap=$('attachList'); wrap.innerHTML='';
  // pending (not yet uploaded)
  state.pendingFiles.forEach((f,idx)=>{
    const item=document.createElement('div'); item.className='attach-item';
    const url=URL.createObjectURL(f);
    item.innerHTML = (f.type.startsWith('video') ? '<video src="'+url+'" muted></video>' : '<img src="'+url+'">')
                   + '<button class="rm" data-pending="'+idx+'">✕</button>';
    wrap.appendChild(item);
  });
  // existing
  if(state.editing){
    const { data } = await sb.from('attachments').select('*').eq('event_id', state.editing.id);
    for(const a of (data||[])){
      if(state.removeAttachIds.includes(a.id)) continue;
      const { data:signed } = await sb.storage.from('attachments').createSignedUrl(a.file_path, 3600);
      const item=document.createElement('div'); item.className='attach-item';
      const u=signed?.signedUrl||'';
      item.innerHTML = (a.file_type==='video' ? '<video src="'+u+'" muted></video>' : '<img src="'+u+'">')
                     + '<button class="rm" data-id="'+a.id+'">✕</button>';
      wrap.appendChild(item);
    }
  }
  wrap.querySelectorAll('.rm').forEach(btn=> btn.addEventListener('click', ()=>{
    if(btn.dataset.pending!=null){ state.pendingFiles.splice(+btn.dataset.pending,1); }
    else if(btn.dataset.id){ state.removeAttachIds.push(btn.dataset.id); }
    renderAttachments();
  }));
}

async function refreshMiniMap(){
  const addr=$('fAddress').value.trim();
  const box=$('miniMap');
  if(!addr){ box.classList.add('hidden'); return; }
  let ll = state._existingLatLng;
  if(!ll || (state.editing && addr!==state.editing.location_address)){
    ll = await geocode(addr);
  }
  if(!ll){ box.classList.add('hidden'); return; }
  state._latlng = ll;
  box.classList.remove('hidden');
  if(!state.miniMap){
    state.miniMap = L.map(box, {attributionControl:true, zoomControl:false}).setView([ll.lat,ll.lng],15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(state.miniMap);
    state._marker = L.marker([ll.lat,ll.lng]).addTo(state.miniMap);
  } else {
    state.miniMap.setView([ll.lat,ll.lng],15);
    state._marker.setLatLng([ll.lat,ll.lng]);
  }
  setTimeout(()=> state.miniMap.invalidateSize(), 60);
}
async function geocode(addr){
  try{
    const r=await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q='+encodeURIComponent(addr));
    const j=await r.json();
    if(j && j[0]) return {lat:+j[0].lat, lng:+j[0].lon};
  }catch(_){}
  return null;
}

async function saveEvent(){
  const type = state._type || 'one_off';
  let category = $('fCategory').value;
  if(category==='__custom__'){
    category = $('fCustomCat').value.trim();
    if(!category){ toast('Type a category name'); return; }
  }
  const time = $('fTime').value || null;     // blank start time = all-day
  let endt = $('fEnd').value || null;
  if(endt && time && endt <= time) endt = null;   // ignore an end that isn't after the start
  const rec = {
    title: $('fTitle').value.trim() || category,
    category: category,
    color: state._color || catByName(category).color,
    who: getWho(),
    event_type: type,
    event_date: type==='one_off' ? $('fDate').value : null,
    weekday: type==='weekly' ? +$('fWeekday').value : null,
    month_day: type==='monthly' ? +$('fMonthDay').value : null,
    is_all_day: !time,
    start_time: time,
    end_time: time ? endt : null,
    location_name: $('fPlace').value.trim() || null,
    location_address: $('fAddress').value.trim() || null,
    lat: state._latlng ? state._latlng.lat : (state._existingLatLng?.lat ?? null),
    lng: state._latlng ? state._latlng.lng : (state._existingLatLng?.lng ?? null),
    prep_items: $('fPrep').value.trim() || null,
    helper: $('fHelper').value || null,
    helper_role: $('fHelper').value ? $('fHelperRole').value : null,
    cost: $('fCost').value.trim() || null,
    notes: $('fNotes').value.trim() || null,
  };
  if(!rec.title){ toast('Give the event a name'); return; }

  $('editorSave').textContent='Saving…';
  let eventId;
  if(state.editing){
    const { error } = await sb.from('events').update(rec).eq('id', state.editing.id);
    if(error){ toast('Save failed'); $('editorSave').textContent='Save'; return; }
    eventId = state.editing.id;
  } else {
    rec.created_by = session.user.id;
    const { data, error } = await sb.from('events').insert(rec).select().single();
    if(error){ toast('Save failed'); $('editorSave').textContent='Save'; return; }
    eventId = data.id;
  }

  // delete removed attachments
  for(const id of state.removeAttachIds){
    const { data:a } = await sb.from('attachments').select('file_path').eq('id',id).single();
    if(a) await sb.storage.from('attachments').remove([a.file_path]);
    await sb.from('attachments').delete().eq('id',id);
  }
  // upload new files
  for(const f of state.pendingFiles){
    const ext=(f.name.split('.').pop()||'bin').toLowerCase();
    const path=eventId+'/'+crypto.randomUUID()+'.'+ext;
    const { error:upErr } = await sb.storage.from('attachments').upload(path, f, {upsert:false});
    if(!upErr){ await sb.from('attachments').insert({ event_id:eventId, file_path:path,
      file_type:f.type.startsWith('video')?'video':'image', uploaded_by:session.user.id }); }
  }

  $('editorSave').textContent='Save';
  closeSheet('editor');
  toast(state.editing ? 'Updated' : 'Added');
  await reload();
}
async function deleteEvent(){
  if(!state.editing) return;
  if(!confirm('Delete this event?')) return;
  await sb.from('events').delete().eq('id', state.editing.id);
  closeSheet('editor'); toast('Deleted'); await reload();
}

/* =====================================================================
   VOICE QUICK-ADD
   ===================================================================== */
let recog=null;
function setupVoice(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ return null; }
  const r=new SR(); r.lang='en-AU'; r.interimResults=true; r.maxAlternatives=1;
  return r;
}
function startVoice(){
  recog = setupVoice();
  if(!recog){ $('voiceStatus').textContent='Voice isn’t supported on this browser — type it instead.'; return; }
  $('voiceHeard').textContent=''; $('voiceStatus').textContent='Listening…';
  $('voicePulse').classList.add('live'); $('voiceMic').textContent='Listening…';
  let finalText='';
  recog.onresult=(e)=>{ let txt='';
    for(let i=0;i<e.results.length;i++) txt+=e.results[i][0].transcript;
    $('voiceHeard').textContent='“'+txt+'”';
    if(e.results[e.results.length-1].isFinal) finalText=txt;
  };
  recog.onerror=()=>{ $('voiceStatus').textContent='Didn’t catch that — try again.'; $('voicePulse').classList.remove('live'); $('voiceMic').textContent='Start talking'; };
  recog.onend=()=>{ $('voicePulse').classList.remove('live'); $('voiceMic').textContent='Start talking';
    const text=finalText || $('voiceHeard').textContent.replace(/[“”]/g,'');
    if(text.trim()){ const parsed=parseSpeech(text); $('voiceStatus').textContent='Got it — check the details'; 
      closeSheet('voiceSheet'); openEditor(null, parsed); } };
  recog.start();
}
function parseSpeech(text){
  const raw=text;
  const t=' '+text.toLowerCase().replace(/[.,!?]/g,' ').replace(/\s+/g,' ')+' ';
  const out={ who:[], event_type:'one_off', is_all_day:true };

  // recurrence + day
  const days={sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6};
  let foundDay=null; for(const d in days){ if(t.includes(' '+d)) foundDay=days[d]; }
  if(/\bevery day\b|\bdaily\b/.test(t)) out.event_type='daily';
  else if(/\bevery month\b|\bmonthly\b/.test(t)) out.event_type='monthly';
  else if(/\bevery\b/.test(t) && foundDay!=null){ out.event_type='weekly'; out.weekday=foundDay; }
  else if(foundDay!=null){ out.event_date=nextDateForWeekday(foundDay); }
  if(/\btoday\b/.test(t)){ out.event_type='one_off'; out.event_date=fmtDate(new Date()); }
  if(/\btomorrow\b/.test(t)){ const d=new Date(); d.setDate(d.getDate()+1); out.event_type='one_off'; out.event_date=fmtDate(d); }

  // time
  let tm=t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if(!tm) tm=t.match(/\b(\d{1,2}):(\d{2})\b/);
  if(tm){ let h=+tm[1]; const m=tm[2]?+tm[2]:0; const ap=tm[3];
    if(ap==='pm'&&h<12)h+=12; if(ap==='am'&&h===12)h=0;
    out.start_time=pad(h)+':'+pad(m); out.is_all_day=false; }

  // who
  if(/\blincoln\b/.test(t)) out.who.push('Lincoln');
  if(/\bevelyn\b/.test(t)) out.who.push('Evelyn');
  if(/\bfamily\b/.test(t)) out.who.push('Family');
  if(/\bsunny\b/.test(t)) out.who.push('Sunny');
  if(/\bester\b|\besther\b/.test(t)) out.who.push('Ester');

  // helper
  if(/\bsam\b/.test(t)) out.helper='Sam';
  if(/\bmeeah\b|\bmia\b|\bmaya\b/.test(t)) out.helper='Meeah';
  if(out.helper) out.helper_role = /\bdrop/.test(t) ? 'dropoff' : (/\bpick/.test(t)?'pickup':'both');

  // category
  const rules=[
    [/\bswim|united\b/, 'United Swimming'],
    [/\bballet\b/, 'Ballet'],
    [/\bviolin\b/, 'Genie Music – Violin'],
    [/\bpiano\b/, /\bevelyn\b/.test(t)?'Hye Yun – Piano':'Genie Music – Piano'],
    [/\bart\b/, 'Art Class'],
    [/soccer (match|game)|\bmatch\b|\bgame\b/, 'Soccer Match'],
    [/\bsoccer\b|\btraining\b/, 'Soccer Training'],
    [/\bcbfi\b/, 'CBFI Training'],
    [/\bmass\b|\bchurch\b/, 'Sunday Mass'],
    [/edu kingdom|\bedu\b/, 'Edu Kingdom'],
    [/competition|\bcomp\b/, 'Music Competition'],
    [/concert/, 'Music Concert'],
    [/\bicas\b/, 'ICAS Test'],
    [/dentist/, 'Dentist'],
    [/\beye\b/, 'Eye Specialist'],
    [/haircut|\bhair\b/, 'Haircut'],
  ];
  for(const [re,name] of rules){ if(re.test(t)){ out.category=name; break; } }
  if(out.category){ const c=catByName(out.category); out.color=c.color;
    if(!out.who.length && c.who.length) out.who=[...c.who]; out.title=c.name; }

  // location: strip time, then "at <place>"
  let loc=raw; if(tm) loc=loc.replace(tm[0],' ');
  const lm=loc.match(/\bat\s+([A-Za-z][A-Za-z0-9' ]{1,40})/i);
  if(lm){ let p=lm[1].trim().replace(/\b(every|on|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|sam|meeah|pick|drop|pm|am|bring|wear|with|and|for|remember)\b.*$/i,'').trim();
    if(p.length>1) out.location_name=p.replace(/\b\w/g,ch=>ch.toUpperCase()); }

  if(!out.title) out.title = raw.trim().replace(/\b\w/g,ch=>ch.toUpperCase());
  return out;
}

/* =====================================================================
   SEARCH (find any event, especially one-offs)
   ===================================================================== */
function openSearch(){ $('searchInput').value=''; renderSearch(''); openSheet('searchSheet'); setTimeout(()=>$('searchInput').focus(),120); }
function whenLabel(ev){
  if(ev.event_type==='one_off') return ev.event_date ? niceDate(ev.event_date) : 'No date';
  if(ev.event_type==='weekly')  return 'Every '+['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][ev.weekday];
  if(ev.event_type==='daily')   return 'Every day';
  if(ev.event_type==='monthly') return 'Monthly · day '+ev.month_day;
  return '';
}
function niceDate(s){ const d=parseDate(s); return DOW[d.getDay()]+', '+d.getDate()+' '+MONTHS[d.getMonth()].slice(0,3)+' '+d.getFullYear(); }
function renderSearch(q){
  const res=$('searchResults'); res.innerHTML='';
  const term=q.trim().toLowerCase();
  if(!term){ res.innerHTML='<div class="empty">Start typing to search across every event — one-offs and repeats.</div>'; return; }
  const matches=EVENTS.filter(ev=>{
    const hay=[ev.title,ev.category,(ev.who||[]).join(' '),ev.location_name,ev.notes,ev.prep_items,ev.helper].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(term);
  });
  // one-offs first (usually what you're hunting for), then repeats
  matches.sort((a,b)=> (a.event_type==='one_off'?0:1)-(b.event_type==='one_off'?0:1));
  if(!matches.length){ res.innerHTML='<div class="empty">Nothing matches “'+escapeHtml(q)+'”.</div>'; return; }
  matches.slice(0,60).forEach(ev=>{
    const color=ev.color||catByName(ev.category).color;
    const row=document.createElement('button'); row.className='search-row';
    const time = (!ev.is_all_day && ev.start_time) ? ' · '+fmtRange(ev) : '';
    const place = ev.location_name ? ' · '+ev.location_name : '';
    row.innerHTML='<span class="sr-bar" style="background:'+color+'"></span>'+
      '<span class="sr-main"><span class="sr-title">'+escapeHtml(ev.title||ev.category||'Event')+'</span>'+
      '<span class="sr-meta">'+escapeHtml(whenLabel(ev)+time+place)+'</span></span>'+
      (ev.event_type!=='one_off'?'<span class="sr-tag">repeats</span>':'');
    row.addEventListener('click', ()=>{ closeSheet('searchSheet'); goToEvent(ev); });
    res.appendChild(row);
  });
}
function goToEvent(ev){
  let target;
  if(ev.event_type==='one_off' && ev.event_date) target=parseDate(ev.event_date);
  else if(ev.event_type==='weekly') target=parseDate(nextDateForWeekday(ev.weekday));
  else if(ev.event_type==='monthly'){ const d=new Date(); d.setDate(Math.min(ev.month_day||1,28)); target=d; }
  else target=new Date();
  state.month=new Date(target.getFullYear(),target.getMonth(),1);
  state.selected=target; renderCalendar(); renderDay(target);
  if(document.body.classList.contains('is-iphone')) $('dayPane').classList.add('open');
  openEditor(ev);
}

/* =====================================================================
   SHEETS / UI WIRING
   ===================================================================== */
function openSheet(id){
  const scrim = id==='editor'?'sheetScrim': id==='voiceSheet'?'voiceScrim': id==='searchSheet'?'searchScrim':'acctScrim';
  $(scrim).classList.remove('hidden'); $(id).classList.remove('hidden');
}
function closeSheet(id){
  const scrim = id==='editor'?'sheetScrim': id==='voiceSheet'?'voiceScrim': id==='searchSheet'?'searchScrim':'acctScrim';
  $(scrim).classList.add('hidden'); $(id).classList.add('hidden');
  if(id==='voiceSheet' && recog){ try{recog.stop();}catch(_){} }
}
function wireStaticUI(){
  buildEditorControls();

  $('loginBtn').addEventListener('click', doLogin);
  $('password').addEventListener('keydown', e=>{ if(e.key==='Enter') doLogin(); });

  $('prevMonth').addEventListener('click', ()=>{ state.month=new Date(state.month.getFullYear(),state.month.getMonth()-1,1); renderCalendar(); });
  $('nextMonth').addEventListener('click', ()=>{ state.month=new Date(state.month.getFullYear(),state.month.getMonth()+1,1); renderCalendar(); });
  $('todayBtn').addEventListener('click', ()=>{ const t=new Date(); state.month=new Date(t.getFullYear(),t.getMonth(),1); selectDay(t); });

  $('addBtn').addEventListener('click', ()=> openEditor(null));
  $('dayAddBtn').addEventListener('click', ()=> openEditor(null));
  $('editorCancel').addEventListener('click', ()=> closeSheet('editor'));
  $('sheetScrim').addEventListener('click', ()=> closeSheet('editor'));
  $('editorSave').addEventListener('click', saveEvent);
  $('editorDelete').addEventListener('click', deleteEvent);

  $('micBtn').addEventListener('click', ()=>{ $('voiceHeard').textContent=''; $('voiceStatus').textContent='Tap “Start talking” and say the event'; openSheet('voiceSheet'); });
  $('voiceMic').addEventListener('click', startVoice);
  $('voiceCancel').addEventListener('click', ()=> closeSheet('voiceSheet'));
  $('voiceScrim').addEventListener('click', ()=> closeSheet('voiceSheet'));

  $('searchBtn').addEventListener('click', openSearch);
  $('searchClose').addEventListener('click', ()=> closeSheet('searchSheet'));
  $('searchScrim').addEventListener('click', ()=> closeSheet('searchSheet'));
  $('searchInput').addEventListener('input', (e)=> renderSearch(e.target.value));

  $('acctBtn').addEventListener('click', ()=> openSheet('acctSheet'));
  $('acctClose').addEventListener('click', ()=> closeSheet('acctSheet'));
  $('acctScrim').addEventListener('click', ()=> closeSheet('acctSheet'));
  $('logoutBtn').addEventListener('click', async ()=>{ await sb.auth.signOut(); closeSheet('acctSheet'); });

  $('dayPaneClose').addEventListener('click', ()=> $('dayPane').classList.remove('open'));
}

/* ---------- tiny utilities ---------- */
let toastTimer=null;
function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.remove('hidden');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.add('hidden'),2200); }
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* expose a couple of pure functions for self-test */
window.__test = { parseSpeech, findClashes, eventsOnDate, toMin, fmtTime };
