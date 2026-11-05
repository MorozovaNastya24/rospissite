'use strict';
// Browser-local preferences and learning progress. No visitor data is sent.
const memoryStore={};
function readLocal(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return memoryStore[key]??fallback}}
function saveLocal(key,value){memoryStore[key]=value;try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
const validIds=new Set(traditions.map(d=>d.id));
function idList(key){const v=readLocal(key,[]);return Array.isArray(v)?v.filter(x=>validIds.has(x)):[]}
let favorites=new Set(idList('rospisi-favorites')), learned=new Set(idList('rospisi-learned'));
let toastTimer;function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3400)}
function themeLabel(){const dark=document.documentElement.dataset.theme==='dark';$('.theme-label').textContent=dark?'Светлая тема':'Тёмная тема';$('.theme-icon').textContent=dark?'☀':'☾';$('.theme-toggle').setAttribute('aria-label',dark?'Включить светлую тему':'Включить тёмную тему');$('.theme-toggle').title=dark?'Светлая тема':'Тёмная тема';document.querySelector('meta[name="theme-color"]').content=dark?'#1b1c1b':'#f5f1e9'}
themeLabel();$('.theme-toggle').addEventListener('click',()=>{const change=()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=t;try{localStorage.setItem('rospisi-theme',t)}catch{}themeLabel()};if(document.startViewTransition&&!reduce)document.startViewTransition(change);else change()});
let quiet=readLocal('rospisi-quiet',false)===true;document.documentElement.classList.toggle('quiet-motion',quiet);
const motionButton=document.createElement('button');motionButton.className='motion-toggle';motionButton.textContent=quiet?'Анимации: выключены':'Анимации: включены';motionButton.setAttribute('aria-pressed',String(!quiet));$('.footer-bottom').append(motionButton);motionButton.addEventListener('click',()=>{quiet=!quiet;document.documentElement.classList.toggle('quiet-motion',quiet);saveLocal('rospisi-quiet',quiet);motionButton.textContent=quiet?'Анимации: выключены':'Анимации: включены';motionButton.setAttribute('aria-pressed',String(!quiet))});
function syncFavorites(){ $$('[data-favorite]').forEach(b=>{const d=traditions.find(x=>x.id===b.dataset.favorite),active=favorites.has(d.id);b.classList.toggle('saved',active);b.setAttribute('aria-pressed',active);b.setAttribute('aria-label',(active?'Убрать из избранного: ':'Сохранить: ')+d.name);b.innerHTML=b.classList.contains('article-save')?(active?'♥ В избранном':'♡ Сохранить роспись'):`<span aria-hidden="true">${active?'♥':'♡'}</span>`});if($('#saved-count'))$('#saved-count').textContent=favorites.size;}
document.addEventListener('click',event=>{const b=event.target.closest('[data-favorite]');if(!b)return;const id=b.dataset.favorite;favorites.has(id)?favorites.delete(id):favorites.add(id);const saved=saveLocal('rospisi-favorites',[...favorites]);syncFavorites();if(onlySaved && $('#collection-search'))filterCollection();toast((favorites.has(id)?'Добавлено в избранное':'Убрано из избранного')+(saved?'':' · только до закрытия страницы'))});syncFavorites();
let category='Все',onlySaved=false;
const normalize=s=>s.toLocaleLowerCase('ru').replaceAll('ё','е').trim();
// Catalogue cards are created from the same records as the comparison table.
const cardCache = new Map();
function makeCard(d) {
  const card = document.createElement('article');
  card.className = 'collection-entry';
  card.dataset.id = d.id;
  card.innerHTML = `
    <a class="collection-card" href="articles/${d.id}.html">
      <div class="card-art">${art(d)}<span class="card-num">${d.num} / 12</span>
        ${d.isNew ? '<span class="new-badge">НОВОЕ</span>' : ''}
        ${learned.has(d.id) ? '<span class="read-badge">✓ Изучено</span>' : ''}
        <span class="card-arrow">↗</span></div>
      <div class="card-meta"><span>${d.category}</span>${swatches(d)}</div>
      <header><h3>${d.name}</h3><p>${d.sub}</p></header>
    </a>
    <button class="favorite-button" data-favorite="${d.id}" aria-label="Сохранить: ${d.name}">♡</button>
    <div class="card-summary">
      <p class="small"><time datetime="2026-11-05">Обновлено 5 ноября 2026</time></p>
      <p class="article-text short" id="excerpt-${d.id}">${d.intro}</p>
      <button class="read-more-btn" aria-controls="excerpt-${d.id}" aria-expanded="false">Читать далее</button>
    </div>
    <footer class="article-actions">
      <button class="pill-button like-btn" data-like="${d.id}">♥ Лайк (<span class="like-count">0</span>)</button>
      <button class="tag-btn" data-tag="${d.category}">#${d.category.replaceAll(' ', '_')}</button>
    </footer>`;
  return card;
}
function renderArticles(records) {
  const cards = records.map(d => {
    if (!cardCache.has(d.id)) cardCache.set(d.id, makeCard(d));
    return cardCache.get(d.id);
  });
  $('#postsContainer').replaceChildren(...cards);
  syncFavorites();
  syncLikes();
}
function syncLikes() {
  $$('[data-like]').forEach(button => {
    const likes = Number(readLocal('atlas-likes-' + button.dataset.like, 0)) || 0;
    button.querySelector('.like-count').textContent = likes;
    button.classList.toggle('liked', likes > 0);
  });
}
document.addEventListener('click', event => {
  const like = event.target.closest('[data-like]');
  if (like) {
    const key = 'atlas-likes-' + like.dataset.like;
    saveLocal(key, (Number(readLocal(key, 0)) || 0) + 1);
    syncLikes();
  }
  const more = event.target.closest('.read-more-btn');
  if (more) {
    const excerpt = document.getElementById(more.getAttribute('aria-controls'));
    const collapsed = excerpt.classList.toggle('short');
    more.setAttribute('aria-expanded', String(!collapsed));
    more.textContent = collapsed ? 'Читать далее' : 'Свернуть';
  }
  const tag = event.target.closest('[data-tag]');
  if (tag) {
    const field = $('#collection-search');
    field.value = tag.textContent;
    field.focus();
    filterCollection();
  }
});
syncLikes();
function filterCollection() {
  const words = normalize($('#collection-search').value).replace(/[#_]/g, ' ').split(/\s+/).filter(Boolean);
  const records = traditions.filter(d => {
    const content = normalize([d.name, d.sub, d.category, d.intro, d.history, ...d.facts, ...d.motifs, ...d.steps].join(' '));
    return (category === 'Все' || d.category === category)
      && (!onlySaved || favorites.has(d.id))
      && words.every(word => content.includes(word));
  });
  renderArticles(records);
  $('#collection-count').textContent = `Показано ${records.length} из ${traditions.length}`;
  $('#filter-status').textContent = `Показано традиций: ${records.length}`;
  $('.empty-state').hidden = records.length !== 0;
}
if($('#collection-search')){
 $('#reading-count').textContent=`Изучено ${learned.size} из 12`;
 filterCollection();
 $('#collection-search').addEventListener('input',filterCollection);
 $$('[data-filter]').forEach(b=>b.addEventListener('click',()=>{category=b.dataset.filter;$$('[data-filter]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',x===b)});filterCollection()}));
 $('#saved-filter').addEventListener('click',()=>{onlySaved=!onlySaved;$('#saved-filter').setAttribute('aria-pressed',onlySaved);filterCollection()});
 $('#reset-search').addEventListener('click',()=>{$('#collection-search').value='';onlySaved=false;category='Все';$('#saved-filter').setAttribute('aria-pressed','false');$$('[data-filter]').forEach(b=>{b.classList.toggle('active',b.dataset.filter==='Все');b.setAttribute('aria-pressed',b.dataset.filter==='Все')});filterCollection();$('#collection-search').focus()});
 $('#random-tradition').addEventListener('click',()=>{const visible=$$('.collection-entry:not([hidden])');if(!visible.length){toast('Сначала сбросьте фильтры — коллекция пуста');return}location.href=`articles/${visible[Math.floor(Math.random()*visible.length)].dataset.id}.html`});
}
// Subtle physical response on precise pointers; no tilt on touch or reduced motion.
if(matchMedia('(hover: hover) and (pointer: fine)').matches&&!reduce){$$('.collection-entry').forEach(card=>{const visual=card.querySelector('.card-art');card.addEventListener('pointermove',e=>{if(quiet)return;const r=visual.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;visual.style.setProperty('--tilt-x',`${-y*4}deg`);visual.style.setProperty('--tilt-y',`${x*4}deg`);visual.style.setProperty('--shine-x',`${(x+.5)*100}%`)});card.addEventListener('pointerleave',()=>{visual.style.setProperty('--tilt-x','0deg');visual.style.setProperty('--tilt-y','0deg')})})}
const articleId=$('main[data-article]')?.dataset.article;
if(articleId){
 const key='rospisi-feedback-'+articleId;
 function syncVote(){const value=readLocal(key,null);$$('[data-vote]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.vote===value));if(value)$('#feedback-status').textContent=value==='yes'?'Спасибо! Вы отметили статью как полезную. Выбор можно изменить.':'Вы отметили, что статья была не совсем полезной. Выбор можно изменить.';}
 syncVote();$$('[data-vote]').forEach(b=>b.addEventListener('click',()=>{const saved=saveLocal(key,b.dataset.vote);syncVote();$('#feedback-status').textContent+=(saved?' Отметка сохранена в этом браузере.':' Отметка сохранена только до закрытия страницы.');b.classList.remove('pop');void b.offsetWidth;b.classList.add('pop')}));
 function syncLearned(){const yes=learned.has(articleId);$('#mark-read').innerHTML=yes?'Изучено <span>✓</span>':'Отметить как изученную <span>✓</span>';$('#mark-read').setAttribute('aria-pressed',yes)}syncLearned();$('#mark-read').addEventListener('click',()=>{learned.has(articleId)?learned.delete(articleId):learned.add(articleId);saveLocal('rospisi-learned',[...learned]);syncLearned();toast(learned.has(articleId)?`Изучено ${learned.size} из 12 традиций`:'Отметка об изучении снята')});
 $('#copy-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href.split('#')[0]);toast('Ссылка скопирована')}catch{toast('Не удалось скопировать автоматически. Скопируйте адрес из строки браузера.')}});
 let readingFrame=false;function readingProgress(){if(readingFrame)return;readingFrame=true;requestAnimationFrame(()=>{const body=$('.article-body'),rect=body.getBoundingClientRect(),pct=Math.round(Math.min(100,Math.max(0,(innerHeight*.5-rect.top)/rect.height*100)));$('#reading-percent').textContent=pct+'%';$('.reading-ring').style.setProperty('--read',pct+'%');const sections=$$('.article-body section');let current=sections[0]?.id;sections.forEach(s=>{if(s.getBoundingClientRect().top<innerHeight*.45)current=s.id});$$('.article-nav a').forEach(a=>{a.classList.toggle('active',a.getAttribute('href')==='#'+current);if(a.getAttribute('href')==='#'+current)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')});readingFrame=false})}addEventListener('scroll',readingProgress,{passive:true});readingProgress();
}
// Question bank: 12 / 24 / 36, balanced across traditions, and targeted revision.
const quizPanel=$('#quiz'),questionMap=new Map(questionBank.map(q=>[q.key,q]));
let session=null;const quizKey='rospisi-quiz-v2';
function savedSession(){const s=readLocal(quizKey,null);if(!s||!Array.isArray(s.ids)||!s.ids.length||!s.ids.every(id=>questionMap.has(id))||!Array.isArray(s.answers)||s.answers.length!==s.ids.length||!s.answers.every(a=>a===null||Number.isInteger(a)&&a>=0&&a<=3)||!Number.isInteger(s.at)||s.at<0||s.at>=s.ids.length)return null;return s}
function mistakeIds(){const value=readLocal('rospisi-mistakes-v2',[]);return Array.isArray(value)?[...new Set(value.filter(k=>questionMap.has(k)))]:[]}
function shuffle(array){const a=[...array];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function persistQuiz(){return saveLocal(quizKey,session)}
function showQuizMenu(){const saved=savedSession(),mistakes=mistakeIds();quizPanel.classList.remove('quiz-running');quizPanel.innerHTML=`<p class="eyebrow">ВЫБЕРИТЕ СВОЙ ТЕМП</p><h3>Любопытство —<br>лучший проводник.</h3><p>Вопросы охватывают все 12 традиций. Порядок меняется при каждом новом прохождении.</p><div class="quiz-modes"><button class="mode-card" data-mode="12"><strong>12</strong><span>Знакомство<small>По вопросу о каждой росписи</small></span><b>↗</b></button><button class="mode-card" data-mode="24"><strong>24</strong><span>Погружение<small>Материалы, мотивы и история</small></span><b>↗</b></button><button class="mode-card" data-mode="36"><strong>36</strong><span>Большой маршрут<small>Все вопросы атласа</small></span><b>↗</b></button></div>${saved?`<button class="button resume-quiz" id="resume-quiz">Продолжить: ${saved.answers.filter(a=>a!==null).length} из ${saved.ids.length} <span>→</span></button>`:''}${mistakes.length?`<button class="pill-button" id="practice-mistakes">Повторить ошибки · ${mistakes.length}</button>`:''}<p class="quiz-local-note">Прогресс и ошибки сохраняются в этом браузере. Без таймера.</p>`;$$('[data-mode]').forEach(b=>b.addEventListener('click',()=>{const per=+b.dataset.mode/12;const ids=shuffle(traditions.flatMap(d=>shuffle(questionBank.filter(q=>q.id===d.id)).slice(0,per))).map(q=>q.key);startSession(ids,b.dataset.mode)}));$('#resume-quiz')?.addEventListener('click',()=>{session=saved;renderQuestion()});$('#practice-mistakes')?.addEventListener('click',()=>startSession(shuffle(mistakes),'mistakes'));}
function startSession(ids,mode){session={ids,answers:ids.map(()=>null),at:0,mode};persistQuiz();renderQuestion()}
function renderQuestion(){const n=session.ids.length,q=questionMap.get(session.ids[session.at]),done=session.answers.filter(a=>a!==null).length;quizPanel.classList.add('quiz-running');quizPanel.innerHTML=`<div class="question-top"><span>ВОПРОС ${session.at+1} / ${n}</span><button class="quiz-exit text-button" id="quiz-pause">Сохранить и выйти ↗</button></div><div class="quiz-track"><span style="width:${done/n*100}%"></span></div><p class="question-topic">${traditions.find(d=>d.id===q.id).category} <span>Выбрано ${done} из ${n}</span></p><h3 class="question-title" id="question-title" tabindex="-1">${q.q}</h3><fieldset class="answers" aria-labelledby="question-title">${q.a.map((a,i)=>`<label class="answer"><input type="radio" name="answer" value="${i}" ${session.answers[session.at]===i?'checked':''}><span class="answer-letter" aria-hidden="true">${'АБВГ'[i]}</span><span>${a}</span></label>`).join('')}</fieldset><div class="quiz-buttons"><button class="text-button" id="quiz-prev" ${session.at===0?'disabled':''}>← Назад</button><button class="button" id="quiz-next" ${session.answers[session.at]===null?'disabled':''}>${session.at===n-1?'К результатам':'Дальше'} <span>→</span></button></div><div class="question-dots" role="group" aria-label="Перейти к вопросу">${session.ids.map((id,i)=>`<button data-question="${i}" class="${i===session.at?'current':''} ${session.answers[i]!==null?'answered':''}" ${i===session.at?'aria-current="step"':''} aria-label="Вопрос ${i+1}${session.answers[i]!==null?', ответ выбран':''}">${i+1}</button>`).join('')}</div>`;
 $$('input[name=answer]').forEach(el=>el.addEventListener('change',()=>{session.answers[session.at]=+el.value;persistQuiz();$('#quiz-next').disabled=false;const count=session.answers.filter(a=>a!==null).length;$('.question-topic span').textContent=`Выбрано ${count} из ${n}`;$('.quiz-track span').style.width=count/n*100+'%';const dot=$(`[data-question="${session.at}"]`);dot.classList.add('answered');dot.setAttribute('aria-label',`Вопрос ${session.at+1}, ответ выбран`)}));
 $('#quiz-prev').addEventListener('click',()=>{session.at--;persistQuiz();renderQuestion()});$('#quiz-next').addEventListener('click',()=>{if(session.answers[session.at]===null)return;if(session.at<n-1){session.at++;persistQuiz();renderQuestion()}else{const missed=session.answers.indexOf(null);if(missed!==-1){session.at=missed;persistQuiz();renderQuestion();toast('Остался вопрос без ответа — вернулись к нему')}else showQuizResult()}});$$('[data-question]').forEach(b=>b.addEventListener('click',()=>{session.at=+b.dataset.question;persistQuiz();renderQuestion()}));$('#quiz-pause').addEventListener('click',()=>{const saved=persistQuiz();showQuizMenu();toast(saved?'Прогресс сохранён — можно вернуться позже':'Прогресс останется только до закрытия страницы')});$('#question-title').focus({preventScroll:true});
}
function showQuizResult(){const results=session.ids.map((id,i)=>({q:questionMap.get(id),answer:session.answers[i],ok:session.answers[i]===questionMap.get(id).correct})),score=results.filter(r=>r.ok).length,total=results.length;const errors=new Set(mistakeIds());results.forEach(r=>r.ok?errors.delete(r.q.key):errors.add(r.q.key));saveLocal('rospisi-mistakes-v2',[...errors]);const mode=session.mode;const bestKey='rospisi-best-v2-'+mode;const old=readLocal(bestKey,0),best=Math.max(typeof old==='number'?old:0,score);if(mode!=='mistakes')saveLocal(bestKey,best);saveLocal(quizKey,null);quizPanel.innerHTML=`<p class="eyebrow">${mode==='mistakes'?'РАБОТА НАД ОШИБКАМИ':'МАРШРУТ ПРОЙДЕН'}</p><h3 id="result-title" tabindex="-1">${score===total?'Вы чувствуете узор!':score/total>=.65?'Хороший взгляд на детали':'Каждый узор — открытие'}</h3><div class="result-orbit" style="--result:${score/total*100}%"><div><strong>${score}</strong><span>из ${total}</span></div></div><p>${score===total?'Все ответы верны. Сохраните любопытство — в каждой традиции ещё столько деталей.':'Ниже — объяснения и ссылки на статьи. Ошибки можно повторить отдельным коротким тестом.'}</p>${mode!=='mistakes'?`<p class="small">Лучший результат в режиме ${total} вопросов: ${best} / ${total}</p>`:''}<div class="result-actions"><button class="button" id="quiz-menu">Выбрать новый маршрут <span>↗</span></button>${errors.size?`<button class="pill-button" id="review-mistakes">Повторить ошибки · ${errors.size}</button>`:''}</div><details class="review"><summary>Разбор ответов · ${total}</summary>${results.map((r,i)=>`<div class="review-item"><strong><span class="${r.ok?'correct-label':'wrong-label'}">${r.ok?'✓ Верно':'✕ Ошибка'}</span> · Вопрос ${i+1}</strong><p>${r.q.q}</p><p>Ваш ответ: ${r.q.a[r.answer]}</p>${!r.ok?`<p><b>Правильный ответ: ${r.q.a[r.q.correct]}</b></p>`:''}<p>${r.q.why}</p><a href="articles/${r.q.id}.html">Повторить материал ↗</a></div>`).join('')}</details>`;$('#quiz-menu').addEventListener('click',showQuizMenu);$('#review-mistakes')?.addEventListener('click',()=>startSession(shuffle([...errors]),'mistakes'));$('#result-title').focus({preventScroll:true});if(score===total&&!reduce&&!quiet){const sparkle=document.createElement('div');sparkle.className='success-sparkles';sparkle.setAttribute('aria-hidden','true');sparkle.innerHTML=Array.from({length:16},(_,i)=>`<i style="--angle:${i*22.5}deg;--delay:${i%4*.06}s">✦</i>`).join('');$('.result-orbit').append(sparkle);setTimeout(()=>sparkle.remove(),1800)}}
if(quizPanel)showQuizMenu();
