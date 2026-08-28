const LOG_KEY='repright_workout_log_v1';
const PLAN_KEY='repright_plan_v1';
const STREAK_KEY='repright_best_streak_v1';
const SESSION_KEY='repright_session_v1';
const DAY_MS=86400000;
const CATEGORY_DAY_WORD={Chest:'chest',Shoulders:'shoulder',Arms:'arm',Back:'back',Core:'core',Legs:'leg','Full Body':'full-body'};
function escapeHtml(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
// Formats fractional workout credit for display: 1.5 -> "1.5", 2 -> "2" (no trailing .0).
function fmtNum(n){const r=Math.round(n*10)/10;return Number.isInteger(r)?String(r):r.toFixed(1)}
function loadLog(){let raw=[];try{raw=JSON.parse(localStorage.getItem(LOG_KEY))||[]}catch(e){raw=[]}
  const cutoff=Date.now()-7*DAY_MS;
  const pruned=raw.filter(e=>e&&typeof e==='object'&&typeof e.date==='string'&&typeof e.pct==='number'&&new Date(e.date+'T00:00:00').getTime()>=cutoff-DAY_MS);
  if(pruned.length!==raw.length){try{localStorage.setItem(LOG_KEY,JSON.stringify(pruned))}catch(e){}}
  return pruned}
// Sets today's completion fraction (0–1) in the 7-day log — e.g. 1 of 2
// exercises done today stores 0.5, so the week reflects partial credit
// instead of an all-or-nothing day.
function setTodayCompletion(pct){pct=Math.max(0,Math.min(1,pct));const log=loadLog();const key=todayKey();const idx=log.findIndex(e=>e.date===key);
  if(idx===-1){if(pct>0)log.push({date:key,pct})}else{log[idx].pct=pct}
  try{localStorage.setItem(LOG_KEY,JSON.stringify(log))}catch(e){}}
function currentPlanValidIds(){return state.plan.filter(id=>byId(id))}
// Keeps the weekly log in sync with today's checklist as a percentage —
// 1 of 2 exercises checked off counts as 50% of today's workout, not 0% or 100%.
function syncTodayLogWithSession(){const validIds=currentPlanValidIds();const session=loadSession();const doneInPlan=session.done.filter(id=>validIds.includes(id));const pct=validIds.length?doneInPlan.length/validIds.length:0;setTodayCompletion(pct)}
function todayKey(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
// Tracks which exercises in TODAY's plan have been checked off, so a
// workout's progress can be shown as done/total instead of an instant 100%.
// Resets automatically each day.
function loadSession(){let s=null;try{s=JSON.parse(localStorage.getItem(SESSION_KEY))}catch(e){s=null}if(!s||s.date!==todayKey())s={date:todayKey(),done:[]};return s}
function saveSession(s){try{localStorage.setItem(SESSION_KEY,JSON.stringify(s))}catch(e){}}
function toggleSessionExercise(id){const s=loadSession();const idx=s.done.indexOf(id);if(idx>=0)s.done.splice(idx,1);else s.done.push(id);saveSession(s);syncTodayLogWithSession();return s}
function loadPlan(){try{const p=JSON.parse(localStorage.getItem(PLAN_KEY));if(Array.isArray(p))return p.filter(id=>byIdRaw(id))}catch(e){}return []}
function byIdRaw(id){return RAW_EXERCISES.find(x=>x.id===id)}
function savePlanToStorage(plan){try{localStorage.setItem(PLAN_KEY,JSON.stringify(plan))}catch(e){}}
function weekStats(){const log=loadLog();const now=new Date();const days=[];for(let i=6;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);d.setHours(0,0,0,0);days.push(d)}
  const dayKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const counts=days.map(d=>{const entry=log.find(e=>e.date===dayKey(d));return entry?entry.pct:0});
  const total=counts.reduce((a,b)=>a+b,0);
  let streak=0;for(let i=counts.length-1;i>=0;i--){if(counts[i]>0)streak++;else break}
  const labels=days.map(d=>['S','M','T','W','T','F','S'][d.getDay()]);
  const chartVals=counts.map(c=>c<=0?6:Math.round(c*88)+12);
  const best=bestStreak(streak);
  return {counts,total,streak,best,labels,chartVals,minutes:Math.round(total*45)}}
function bestStreak(current){let best=0;try{best=parseInt(localStorage.getItem(STREAK_KEY),10)||0}catch(e){best=0}
  if(current>best){best=current;try{localStorage.setItem(STREAK_KEY,String(best))}catch(e){}}
  return best}
function dailySeed(){const d=new Date();return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate()}
function seededRandom(seed){let s=seed%2147483647;if(s<=0)s+=2147483646;return function(){s=s*16807%2147483647;return (s-1)/2147483646}}
function dailyPicks(n){const seed=dailySeed();const rnd=seededRandom(seed);const pool=EXERCISES.slice();for(let i=pool.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}return pool.slice(0,n)}
function toast(msg){let el=$('#toast');if(!el){el=document.createElement('div');el.id='toast';el.className='toast';el.setAttribute('role','status');el.setAttribute('aria-live','polite');document.body.appendChild(el)}
  el.textContent=msg;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),3200)}
const state={page:'dashboard',query:'',cat:'All',loc:'All',plan:loadPlan()};
const $=s=>document.querySelector(s); const byId=id=>EXERCISES.find(x=>x.id===id);
function card(e){return `<article class="exercise-card" data-id="${e.id}" tabindex="0" role="button" aria-label="Open ${e.name}"><div class="motion"><span class="motion-badge">MOTION</span><span class="loc-badge">${LOCATION_ICONS[e.loc]||''} ${e.locLabel}</span><img loading="lazy" src="${e.images[0]}" alt="${e.name} starting position"><img loading="lazy" src="${e.images[1]}" alt="${e.name} ending position"></div><div class="card-body"><div class="cat">${e.cat}</div><h3>${e.name}</h3><div class="meta">${e.equipment}</div><span class="pill">${e.level}</span></div></article>`}
function planFocusCategory(){const counts={};state.plan.forEach(id=>{const e=byId(id);if(e)counts[e.cat]=(counts[e.cat]||0)+1});const top=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];return top?top[0]:'Full Body'}
function estimatedMinutes(n){return Math.min(90,Math.max(15,n*8))}
function dashboard(){const picks=dailyPicks(4);const w=weekStats();const hrs=Math.floor(w.minutes/60),mins=w.minutes%60;const hasPlan=state.plan.length>0;const n=state.plan.length;const dayWord=CATEGORY_DAY_WORD[planFocusCategory()]||'full-body';const mins2=estimatedMinutes(n);
  const validIds=state.plan.filter(id=>byId(id));const session=loadSession();const doneToday=session.done.filter(id=>validIds.includes(id)).length;
  const planStat=doneToday>0?`<div class="stat"><div class="eyebrow">TODAY'S PROGRESS</div><b>${doneToday}/${n}</b><small>exercises complete</small></div>`:`<div class="stat"><div class="eyebrow">WORKOUT PLAN</div><b>${n} exercise${n===1?'':'s'}</b><small>${n?'saved · ready to go':'add exercises to begin'}</small></div>`;
  return `<section class="hero"><div class="hero-card"><div class="eyebrow">${hasPlan?`TODAY'S FOCUS · ${mins2} MIN`:'GET STARTED'}</div><h2>${hasPlan?`Build a stronger ${dayWord} day.`:'Build your first workout.'}</h2><p>${hasPlan?`${n} focused movement${n===1?'':'s'}, clear form cues and a simple progression target.`:'Add exercises to your workout plan to start a session.'}</p><button class="primary" id="heroStart" ${hasPlan?'':'disabled'}>${hasPlan?'Start today\u2019s workout →':'Add exercises first'}</button></div><div class="stat-grid"><div class="stat"><div class="eyebrow">THIS WEEK</div><b>${fmtNum(w.total)}/6</b><small>workouts complete</small></div><div class="stat"><div class="eyebrow">CURRENT STREAK</div><b>${w.streak} day${w.streak===1?'':'s'}</b><small>last 7 days</small></div><div class="stat"><div class="eyebrow">TRAINING TIME</div><b>${hrs}h ${mins}m</b><small>this week</small></div>${planStat}</div></section><div class="section-head"><div><h2>Recommended today</h2><p>Start with movement quality, then add intensity.</p></div><button class="secondary" data-goto="library">View library</button></div><div class="grid">${picks.map(card).join('')}</div>`}
// Users type names with all kinds of spacing ("push up", "push-up", "pushup") —
// strip separators from both sides before comparing so they all match.
function squash(s){return String(s||'').toLowerCase().replace(/[-_\s]+/g,'')}
function library(){
  let cats=['All',...new Set(EXERCISES.map(e=>e.cat))];
  let locs=['All',...LOCATION_ORDER.filter(l=>EXERCISES.some(e=>e.loc===l))];
  let q=squash(state.query);
  let list=EXERCISES.filter(e=>(state.cat==='All'||e.cat===state.cat)&&(state.loc==='All'||e.loc===state.loc)&&(!q||squash(e.name).includes(q)||squash(e.equipment).includes(q)||squash(e.muscles).includes(q)));
  let locCounts=Object.fromEntries(locs.map(l=>[l, l==='All'?EXERCISES.length:EXERCISES.filter(e=>e.loc===l).length]));
  return `<div class="section-head"><div><div class="eyebrow">MOVE BETTER</div><p>${list.length} exercises with real start and end positions.</p></div></div>
  <div class="toolbar"><label class="search" for="search"><span aria-hidden="true">⌕</span><span class="sr-only">Search exercises</span><input id="search" placeholder="Search exercises, equipment..." value="${escapeHtml(state.query)}"></label></div>
  <div class="loc-tabs">${locs.map(l=>`<button class="loc-tab ${state.loc===l?'active':''}" data-loc="${l}" aria-pressed="${state.loc===l}">${l==='All'?'◈ All':`${LOCATION_ICONS[l]||''} ${LOCATION_LABELS[l]||l}`}<span class="loc-count">${locCounts[l]}</span></button>`).join('')}</div>
  <div class="toolbar">${cats.map(c=>`<button class="filter ${state.cat===c?'active':''}" data-cat="${c}" aria-pressed="${state.cat===c}">${c}</button>`).join('')}</div>
  <div class="grid">${list.map(card).join('')||'<p>No exercises match your search and filters.</p>'}</div>`
}
function builder(){const validIds=state.plan.filter(id=>byId(id));const n=validIds.length;const session=loadSession();const doneIds=session.done.filter(id=>validIds.includes(id));const doneCount=doneIds.length;const pct=n?Math.round(doneCount/n*100):0;
  const rows=validIds.map((id,i)=>{let e=byId(id);const done=doneIds.includes(id);return `<div class="exercise-row ${done?'done':''}" data-id="${id}" tabindex="0" role="button" aria-label="View details for ${e.name}"><button class="check ${done?'done':''}" data-check="${id}" aria-pressed="${done}" aria-label="${done?`Mark ${e.name} incomplete`:`Mark ${e.name} complete`}">${done?'✓':''}</button><img loading="lazy" src="${e.images[0]}" alt=""><div><b>${i+1}. ${e.name}</b><div class="small">${e.scheme}</div></div><button class="danger" data-remove="${id}" aria-label="Remove ${e.name} from plan">Remove</button></div>`}).join('');
  const estMin=estimatedMinutes(n);
  const progressBlock=n?`<div class="session-progress"><div class="small">${doneCount===n?'✓ All exercises complete — 100% logged for today!':`${doneCount} of ${n} exercises complete today · ${pct}% logged`}</div><div class="session-progress-bar"><div class="session-progress-fill" style="width:${pct}%"></div></div></div>`:'';
  return `<div class="section-head"><div><div class="eyebrow">YOUR PLAN</div><p>Create a simple, repeatable training session.</p></div><div class="small autosave-note">✓ Saved automatically on this device</div></div><div class="builder"><section class="plan-card"><h3>${n?`Your workout · ${n} exercise${n===1?'':'s'}`:'Your workout'}</h3>${progressBlock}${rows||'<p class="small">No exercises added yet. Add some from the library to build your plan.</p>'}<button class="secondary" data-goto="library" style="margin-top:15px">+ Add exercise</button></section><section class="plan-card"><div class="eyebrow">SESSION SUMMARY</div><h2>${n} exercise${n===1?'':'s'}</h2><p class="small">${n?`Estimated time: ~${estMin} min<br>Rest: 45–90 seconds depending on the move<br>Tap the circle next to each exercise as you complete it.`:'Add at least one exercise to start a workout.'}</p><button class="primary" id="builderStart" ${n?'':'disabled'}>▶ Start this workout</button></section></div>`}
function progress(){const w=weekStats();return `<div class="section-head"><div><div class="eyebrow">CONSISTENCY</div><p>A simple overview of your recent training.</p></div></div><div class="progress-layout"><div class="plan-card"><h3>Weekly training load</h3><div class="chart">${w.chartVals.map((v,i)=>`<div class="bar" style="height:${v}%"><span>${w.labels[i]}</span></div>`).join('')}</div></div><div class="plan-card"><h3>Current highlights</h3><div class="stat"><div class="eyebrow">CURRENT STREAK</div><b>${w.streak} day${w.streak===1?'':'s'}</b></div><br><div class="stat"><div class="eyebrow">BEST STREAK</div><b>${w.best} day${w.best===1?'':'s'}</b></div><br><div class="stat"><div class="eyebrow">WORKOUTS (7 DAYS)</div><b>${fmtNum(w.total)}</b></div><div class="danger-zone"><div class="small">Stored on this device only.</div><button class="danger-outline" id="clearData">Clear all local data</button></div></div></div>`}
function confirmDialog(title,message,confirmLabel,onConfirm){$('#modalRoot').innerHTML=`<div class="confirm-backdrop" id="confirmBackdrop"><div class="confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="confirmTitle"><h3 id="confirmTitle">${title}</h3><p>${message}</p><div class="confirm-actions"><button class="secondary" id="confirmCancel">Cancel</button><button class="danger-solid" id="confirmOk">${confirmLabel}</button></div></div></div>`;
  document.body.classList.add('modal-open');
  openModalKeyListener();
  $('#confirmBackdrop').onclick=e=>{if(e.target.id==='confirmBackdrop')closeModal()};
  $('#confirmCancel').onclick=closeModal;
  setTimeout(()=>{const btn=$('#confirmCancel');if(btn)btn.focus()},0);
  $('#confirmOk').onclick=()=>{closeModal();onConfirm()}}
function clearAllData(){try{localStorage.removeItem(LOG_KEY);localStorage.removeItem(PLAN_KEY);localStorage.removeItem(STREAK_KEY);localStorage.removeItem(SESSION_KEY)}catch(e){}state.plan=[];toast('All local data cleared.');go('dashboard')}
function updateSidebar(){const w=weekStats();const capped=Math.min(6,w.total);const pct=Math.round(capped/6*100);let ring=$('#progressRing');if(ring)ring.style.background=`radial-gradient(circle at center,#111b25 58%,transparent 59%),conic-gradient(var(--green) 0 ${pct}%,#24313d ${pct}%)`;let pctEl=$('#weekPct');if(pctEl)pctEl.textContent=pct+'%';let line=$('#weeklyLine');if(line)line.textContent=`${fmtNum(w.total)} of 6 workouts complete`}
function syncStartButtons(){const hasPlan=state.plan.length>0;['startWorkout','mobileStart'].forEach(id=>{let b=$('#'+id);if(b)b.disabled=!hasPlan});
  // The Builder page already has its own prominent "Start this workout" button,
  // so the persistent topbar one would just be a duplicate sitting right above it.
  const topActions=document.querySelector('.top-actions');
  if(topActions)topActions.style.display=state.page==='builder'?'none':'';}
function render(){syncTodayLogWithSession();let v=$('#view');let title={dashboard:'Good evening',library:'Exercise Library',builder:'Workout Builder',progress:'Progress'}[state.page];$('#pageTitle').textContent=title;$('#crumb').textContent=state.page==='dashboard'?'YOUR TRAINING SPACE':state.page.toUpperCase();v.innerHTML=({dashboard,library,builder,progress})[state.page]();updateSidebar();syncStartButtons();document.querySelectorAll('.exercise-card').forEach(el=>{el.onclick=()=>openDetail(el.dataset.id);el.onkeydown=e=>{if(e.key==='Enter')openDetail(el.dataset.id)}});document.querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>go(b.dataset.goto));document.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{state.cat=b.dataset.cat;render()});document.querySelectorAll('[data-loc]').forEach(b=>b.onclick=()=>{state.loc=b.dataset.loc;render()});let s=$('#search');if(s)s.oninput=e=>{state.query=e.target.value;const pos=e.target.selectionStart;render();const ns=$('#search');if(ns){ns.focus();try{ns.setSelectionRange(pos,pos)}catch(err){}}};document.querySelectorAll('.exercise-row[data-id]').forEach(el=>{el.onclick=()=>openDetail(el.dataset.id);el.onkeydown=e=>{if(e.key==='Enter')openDetail(el.dataset.id)}});document.querySelectorAll('[data-check]').forEach(b=>b.onclick=(ev)=>{ev.stopPropagation();toggleSessionExercise(b.dataset.check);updateSidebar();render()});document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=(ev)=>{ev.stopPropagation();state.plan=state.plan.filter(x=>x!==b.dataset.remove);savePlanToStorage(state.plan);render()});['heroStart','builderStart','startWorkout'].forEach(id=>{let b=$('#'+id);if(b)b.onclick=start});let clr=$('#clearData');if(clr)clr.onclick=()=>confirmDialog('Clear all local data?','This removes your saved workout plan and your 7-day activity log from this device. This can\u2019t be undone.','Clear data',clearAllData)}
function closeModal(){$('#modalRoot').innerHTML='';document.body.classList.remove('modal-open');document.removeEventListener('keydown',onModalKeydown)}
function onModalKeydown(e){if(e.key==='Escape')closeModal()}
function openModalKeyListener(){document.removeEventListener('keydown',onModalKeydown);document.addEventListener('keydown',onModalKeydown)}
function openDetail(id){let e=byId(id);if(!e)return;const inPlan=state.plan.includes(id);$('#modalRoot').innerHTML=`<aside class="detail" role="dialog" aria-modal="true" aria-labelledby="detailTitle"><div class="detail-scroll"><div class="detail-top"><div><div class="eyebrow">${LOCATION_ICONS[e.loc]||''} ${e.locLabel} · ${e.cat} · ${e.equipment}</div><h2 id="detailTitle">${e.name}</h2></div><button class="close" id="closeDetail" aria-label="Close exercise details">×</button></div><div class="demo motion-on"><img src="${e.images[0]}" alt="${e.name} start"><img src="${e.images[1]}" alt="${e.name} end"></div><div class="demo-controls"><button class="secondary" id="motionToggle" aria-pressed="true">❚❚ Pause motion</button><span class="small">1.0× Speed</span></div><div class="detail-section"><h3>About this movement</h3><p>${e.tips}</p><div class="facts"><div class="fact"><span>Difficulty</span><b>${e.level}</b></div><div class="fact"><span>Equipment</span><b>${e.equipment}</b></div><div class="fact"><span>Target muscles</span><b>${e.muscles}</b></div><div class="fact"><span>Type</span><b>${e.type}</b></div></div><p class="small" style="margin-top:14px">Suggested scheme: ${e.scheme}</p></div><div class="detail-section detail-section-last"><h3>How to perform</h3><ol>${e.steps.map(x=>`<li>${x}</li>`).join('')}</ol></div></div><div class="detail-footer"><button class="primary" id="addPlan" ${inPlan?'disabled':''}>${inPlan?'✓ Already in your workout':'+ Add to workout'}</button></div></aside>`;
  document.body.classList.add('modal-open');
  openModalKeyListener();
  setTimeout(()=>{const btn=$('#closeDetail');if(btn)btn.focus()},0);
  $('#closeDetail').onclick=closeModal;
  $('#motionToggle').onclick=function(){let d=$('.demo');d.classList.toggle('motion-on');const on=d.classList.contains('motion-on');this.textContent=on?'❚❚ Pause motion':'▶ Play motion';this.setAttribute('aria-pressed',String(on))};
  $('#addPlan').onclick=()=>{if(!state.plan.includes(id)){state.plan.push(id);savePlanToStorage(state.plan);toast(`${e.name} added to your workout.`)}closeModal();go('builder')}}
function start(){if(!state.plan.length){toast('Add exercises to your workout plan first.');go('builder');return}go('builder');toast('Check off each exercise below as you complete it.')}
function go(p){state.page=p;document.querySelectorAll('[data-page]').forEach(b=>{const on=b.dataset.page===p;b.classList.toggle('active',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});render();window.scrollTo({top:0,behavior:'smooth'})}
document.addEventListener('click',e=>{let b=e.target.closest('[data-page]');if(b)go(b.dataset.page)});let ms=$('#mobileStart');if(ms)ms.onclick=()=>start();render();
