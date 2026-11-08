/* Arcana Card Duel v1.2.2 — auto-play league rounds and 180-second match deadline. */
(()=>{
'use strict';
const $L=id=>document.getElementById(id);
const safe=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json=o=>JSON.parse(JSON.stringify(o));
const START_GOLD=0,START_HP=100;
// Seven-distinct-cards-in-one-pack synergy is computed from live board units.
const SILVER_PACK_BY_ID=Object.fromEntries(PACK_DEFS.flatMap(p=>p.cards.map(id=>[id,p.id])));
// TEMPORARY shop economy, not a permanent card-balance rule.
const SHOP={remove:6,plusAtk:12,plusHp:10,buffAtk:28,buffHp:22};
const MAX_DECK=65;
const MATCH_LIMIT_MS=180000; // exactly three real-time minutes for a played match.
const AI_VIRTUAL_TURN_CAP=24; // numerical-only AI match: 24 turns * 7.5s = 180s simulated.
const AUTO_RESULT_DELAY_MS=4500; // results remain visible; spectating pauses auto-advance.

const originalNewGame=newGame,originalShowResult=showResult,originalSummon=summon,originalDragon=summonDeathDragon;
let league=null,previousDeckConfig=null,activePlayerMatch=null,replayTimer=null,replay=null,leagueKey='arcana_league_v120';
let sidebarCollapsed=false,matchClock=null,matchTimer=null,autoTimer=null;
function clearAuto(){if(autoTimer!==null)clearTimeout(autoTimer);autoTimer=null;}
function clearClock(){if(matchTimer!==null)clearInterval(matchTimer);matchTimer=null;matchClock=null;}
function fmtClock(ms){const sec=Math.ceil(Math.max(0,ms)/1000);return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;}
function updateClock(){
 if(!matchClock||!league||!activePlayerMatch)return;
 const remaining=Math.max(0,matchClock.deadline-Date.now());
 const el=$L('leagueMatchClock');if(el){el.textContent=`⏳ ${fmtClock(remaining)}`;el.classList.toggle('lg-timer-urgent',remaining<=30000);}
 if(remaining<=0)expireMyMatch();
}
function startClock(){
 clearClock();
 const start=Date.now();matchClock={start,deadline:start+MATCH_LIMIT_MS};
 const bar=$L('leagueGameBar');const text=bar.textContent;
 bar.innerHTML=`<span>${safe(text)}</span><strong id="leagueMatchClock" role="timer" aria-label="리그 전투 남은 시간">⏳ 03:00</strong>`;
 matchTimer=setInterval(updateClock,250);updateClock();
}
function strength(side){
 const field=[...(side?.front||[]),...(side?.back||[])].filter(Boolean);
 return field.reduce((score,u)=>score+Math.max(0,u.hp||0)*2+Math.max(0,u.atk||0)+(u.awakened?3:0),0);
}
function compareTimedSides(sideA,sideB,seed){
 // 1. Remaining hero HP, 2. surviving board strength, 3. hand+deck size, 4. fair fixed-seed tie breaker.
 if(sideA.hp!==sideB.hp)return {winner:sideA.hp>sideB.hp?'A':'B',why:'본체 체력 우세'};
 const a=strength(sideA),b=strength(sideB);if(a!==b)return {winner:a>b?'A':'B',why:'남은 필드 전력 우세'};
 const ca=(sideA.hand?.length||0)+(sideA.deck?.length||0),cb=(sideB.hand?.length||0)+(sideB.deck?.length||0);
 if(ca!==cb)return {winner:ca>cb?'A':'B',why:'남은 카드 수 우세'};
 return {winner:(seed&1)?'A':'B',why:'완전 동률 · 고정 시드 판정'};
}
function expireMyMatch(){
 if(!league||!activePlayerMatch||!game||game.winner)return;
 const match=league.currentMatches.find(m=>m.id===activePlayerMatch.matchId);if(!match||match.result)return;
 const seed=(((league.stage*101+league.round*29+match.a*19+match.b*71)*2654435761)>>>0);
 const result=compareTimedSides(game.player,game.enemy,seed);
 activePlayerMatch.timeoutReason=result.why;
 game.winner=result.winner==='A'?'player':'enemy';game.active='finished';game.selected=null;
 // Invalidate any pending animations and AI actions so they cannot mutate the resolved match.
 resetEffects();clearClock();
 log(`⏳ 3분 종료 · ${result.why}로 ${game.winner==='player'?'플레이어':'AI'} 승리 확정`,'good-log');
 render();showResult();
}
function scheduleAuto(delay=AUTO_RESULT_DELAY_MS){
 clearAuto();
 if(!league||league.finished||league.autoAdvance===false||replay||activePlayerMatch)return;
 if(!['result','shop-done','ready'].includes(league.phase))return;
 autoTimer=setTimeout(()=>{
  autoTimer=null;
  if(!league||league.autoAdvance===false||league.finished||replay||activePlayerMatch)return;
  if(league.phase==='result'||league.phase==='shop-done'){stagedNext();return;}
  if(league.phase==='ready')autoStartRound();
 },Math.max(0,delay));
}
function autoStartRound(){
 if(!league||league.finished||league.autoAdvance===false||replay||activePlayerMatch||league.phase!=='ready')return;
 if(roundType()==='shop')startShop();else startCombatRound();
}
function setAutoAdvance(value){
 if(!league)return;league.autoAdvance=!!value;clearAuto();
 if(league.autoAdvance)scheduleAuto(league.phase==='ready'?150:1500);
 leagueSave();renderLeague();
}

function sidebarMessage(t){const node=$L('leagueSidebarNotice');if(node)node.textContent=t||'';}
function sidebarMatchFor(id){
 // Prefer a finished AI-vs-AI match in the current round; then the newest available replay.
 const current=(league?.currentMatches||[]).find(m=>!m.bye&&(m.a===id||m.b===id)&&Array.isArray(m.trace)&&m.trace.length);
 if(current)return current;
 for(const h of [...(league?.history||[])].reverse())for(const m of [...(h.matches||[])].reverse())if(!m.bye&&(m.a===id||m.b===id)&&Array.isArray(m.trace)&&m.trace.length)return m;
 return null;
}
function renderSidebar(){
 const panel=$L('leagueSidebar'),body=document.body;
 if(!panel)return;
 panel.hidden=!league;
 body.classList.toggle('league-active',!!league);
 body.classList.toggle('league-live',!!league&&!!activePlayerMatch);
 body.classList.toggle('league-sidebar-collapsed',!!league&&sidebarCollapsed);
 if(!league)return;
 const toggle=$L('leagueSidebarToggle');
 toggle.textContent=sidebarCollapsed?'❯':'❮';toggle.setAttribute('aria-expanded',String(!sidebarCollapsed));toggle.title=sidebarCollapsed?'체력 바 펼치기':'체력 바 접기';
 $L('leagueSidebarLabel').textContent=`${stageRound()} · AI 관전 선택 · 내 경기 3분 시계는 관전 중에도 진행`;
 const selectedId=replay?((league.currentMatches||[]).find(m=>m.id===replay.id)||league.history.flatMap(h=>h.matches||[]).find(m=>m.id===replay.id))?.a:null;
 $L('leagueSidebarPlayers').innerHTML=ranking().map((p,i)=>{
  const view=sidebarMatchFor(p.id),current=activePlayerMatch&&league.currentMatches.some(m=>m.id===activePlayerMatch.matchId&&(m.a===p.id||m.b===p.id));
  const hint=p.id===0?(activePlayerMatch?'내 전투':'내 참가자'):current?'현재 내 상대':view?'👁 클릭하여 관전':'관전 기록 없음';
  const aug=window.ArcanaSilver.BY_ID[p.augments?.[0]];const label=`${i+1}위 ${p.name}, 글로벌 체력 ${p.hp} / ${p.maxGlobalHp||100}, 실버 ${aug?.name||'없음'}, ${p.out?'탈락':hint}`;
  return `<button type="button" class="lg-side-player ${p.id===0?'lg-side-mine':''} ${p.out?'lg-side-out':''} ${selectedId===p.id?'lg-side-current':''}" data-side-player="${p.id}" aria-label="${safe(label)}" title="${safe(hint)}"><span class="lg-side-top"><span class="lg-side-rank">${i+1}위</span><span class="lg-side-name">${safe(p.name)}</span><span class="lg-side-hp" style="color:${p.hp<=0?'#ff9f9f':'inherit'}">${p.hp<=0?'탈락 ':''}♥${p.hp}</span></span><span class="lg-side-track"><span class="lg-side-fill" style="width:${Math.max(0,Math.min(100,p.hp/(p.maxGlobalHp||100)*100))}%"></span></span><span class="lg-side-meta"><span>${safe(aug?'⬜ '+aug.name:p.style)}</span><span>${hint}</span></span></button>`;
 }).join('');
}
function sidebarWatchPlayer(id){
 if(!league)return;
 const p=league.players.find(x=>x.id===id);if(!p)return;
 if(id===0&&activePlayerMatch){stopReplay();setPanel(false);renderSidebar();return;}
 const m=sidebarMatchFor(id);
 if(m){sidebarMessage('');replayOpen(m.id);return;}
 if(id===0&&league.phase==='battle'&&!activePlayerMatch){const mine=league.currentMatches.find(x=>!x.bye&&(x.a===0||x.b===0)&&!x.result);if(mine){playMyMatch();return;}}
 sidebarMessage(`${p.name}: 관전할 전투 기록이 아직 없습니다.`);
}

const names=['나','AI 아스트라','AI 로젠','AI 테라','AI 노바','AI 제로','AI 루미아','AI 에코'];
const styles=['나의 덱','공격형','수비형','저주형','챔피언형','기계형','원거리형','적응형'];
const makeDeck=ids=>Object.fromEntries(ids.filter(id=>CARD_DB[id]&&!CARD_DB[id].token&&!CARD_DB[id].dragon).reduce((m,id)=>(m.set(id,(m.get(id)||0)+1),m),new Map()));
function sampleDeck(kind){
 const common=['recruit','recruit','warrior','warrior','archer','archer','guardian','guardian','fireball','heal','piercer','shade','binding','leech','stoneshield','woodshield'];
 const variants=[
  [],['warrior','warrior','piercer','piercer','chuchu_fighter','chuchu_fighter','chuchu_brawler','fire_arrow','axe_swing','club'],
  ['guardian','guardian','woodshield','stoneshield','wooden_shield_hilichurl','stone_shield_brute','heal','heal','recruit','leech'],
  ['shaman','shaman','curse_staff','curse_staff','chuchu_archer','chuchu_brawler','fire_arrow','chuchu_geochief','binding','heal'],
  ['castorice','castorice','castorice','kyrene','kyrene','heal','heal','guardian','woodshield','crossbow'],
  ['mk1','mk1','mk1','guardian','guardian','shaman','fire_arrow','heal','stoneshield','binding'],
  ['archer','archer','chuchu_archer','chuchu_archer','crossbow','crossbow','shaman','mage','mage','fireball'],
  ['kyrene','kyrene','castorice','castorice','shaman','mk1','woodshield','fire_arrow','heal','chuchu_fighter']
 ];return makeDeck([...common,...variants[kind]]);
}
function playerDeck(){let base=getDeckCounts('player');if(Object.keys(base).length===0)base={recruit:5,warrior:4,archer:4,guardian:3,fireball:3,heal:2};return {...base};}
function stageRound(){return `${league.stage}-${league.round}`;}
function totalDeck(p){return Object.values(p.deck).reduce((a,b)=>a+b,0);}
function alive(){return league.players.filter(p=>p.hp>0);}
function leagueSave(){if(!league)return;try{const snap=json(league);for(const h of snap.history||[])for(const m of h.matches||[])delete m.trace;localStorage.setItem(leagueKey,JSON.stringify(snap));}catch(e){} }
function setPanel(visible){$L('leagueScreen').classList.toggle('hidden',!visible);$L('leagueScreen').setAttribute('aria-hidden',String(!visible));renderSidebar();}
function leagueStart(){stopReplay();if(activePlayerMatch)return;previousDeckConfig=json(activeDeckConfig);league={stage:1,round:1,phase:'augment',autoAdvance:true,players:names.map((name,id)=>({id,name,style:styles[id],hp:START_HP,gold:START_GOLD,streak:0,wins:0,losses:0,byes:0,deck:id===0?playerDeck():sampleDeck(id),upgrades:{},buffs:{atk:0,hp:0},opponents:[],out:null,augments:[],silver:{},maxGlobalHp:100})),history:[],currentMatches:[],shopOffers:[],lastIncome:[],message:'실버 증강 선택',finished:false,order:0};for(const p of league.players.slice(1)){
 const suited={1:['glass','twins','imperfect','tears','root'],2:['buckle','root','tower','healing_orb','giant'],3:['tears','meet','luck','extra_hand','short_invest'],4:['root','healing_orb','imperfect','extra_hand','buckle'],5:['tower','smash','tears','buckle','short_invest'],6:['glass','twins','imperfect','root','extra_hand'],7:['fast_streak','giant','luck','late','short_invest']};
 const pool=suited[p.id]||window.ArcanaSilver.DATA.map(x=>x.id);
 window.ArcanaSilver.applySelection(p,pool[Math.floor(Math.random()*pool.length)]);
 }setPanel(true);leagueSave();renderLeague();}
function leaveLeague(){if(activePlayerMatch)return;if(window.ArcanaSilver)window.ArcanaSilver.onBattleEnd();window.__silverPendingMapping=null;stopReplay();clearAuto();clearClock();if(!confirm('8인 리그를 종료하고 1대1 모드로 돌아갈까요? 진행 기록은 저장됩니다.'))return;league=null;if(previousDeckConfig){activeDeckConfig=json(previousDeckConfig);devDraft=json(previousDeckConfig);}setPanel(false);$L('leagueGameBar').hidden=true;originalNewGame();renderDevPanel();}
function resumeLeague(){try{const value=localStorage.getItem(leagueKey);if(!value)return false;const loaded=JSON.parse(value);if(!Array.isArray(loaded.players)||loaded.players.length!==8)return false;previousDeckConfig=json(activeDeckConfig);league=loaded;league.autoAdvance=league.autoAdvance!==false;league.currentMatches=[];if(league.phase==='battle')league.phase='ready';setPanel(true);renderLeague();scheduleAuto(200);return true;}catch{return false;}}
function newLeagueMenu(){if(activePlayerMatch)return;if(league){setPanel(true);renderLeague();return;}setPanel(true);$L('leagueBody').innerHTML=`<div class="lg-card lg-intro"><h2>🏆 8인 생존 리그</h2><p>플레이어 1명과 전략이 다른 AI 7명이 참가합니다. 매 스테이지 7라운드: ⚔ ⚔ ⚔ 🛒 ⚔ ⚔ 🛒</p><p>글로벌 HP 100 · 패배 피해 = 스테이지×3 + 승자의 남은 전투 HP÷2(버림). 골드로 덱을 강화하며 최후의 한 명이 우승합니다.</p><p class="lg-muted">실버 증강 31종을 테스트할 수 있습니다. 골드/프리즘은 아직 없습니다. 상점 가격과 강화 효과는 임시값입니다.</p><div class="lg-actions"><button class="lg-primary" data-lg="start">새 리그 시작</button><button data-lg="resume">저장된 리그 이어하기</button><button data-lg="close">1대1로 돌아가기</button></div></div>`;}
function roundType(){return league.round===4||league.round===7?'shop':'combat';}
function stagedNext(){clearAuto();if(league.round===7){league.stage++;league.round=1;}else league.round++;league.phase='ready';league.currentMatches=[];league.lastIncome=[];league.shopOffers=[];for(const p of alive())window.ArcanaSilver.onStage(p,league.stage,league.round);leagueSave();renderLeague();scheduleAuto(170);}
function giveIncome(p,combat,result){if(p.hp<=0)return null;const before=p.gold,interest=window.ArcanaSilver.beforeIncome(p,Math.min(5,Math.floor(before/10)));let bonus=0,win=0;
 if(combat){if(result==='win'){p.wins++;p.streak=p.streak>0?p.streak+(window.ArcanaSilver.has(p,'fast_streak')?2:1):(window.ArcanaSilver.has(p,'fast_streak')?2:1);win=1;bonus=p.streak>=6?3:p.streak>=4?2:p.streak>=2?1:0;}
 else if(result==='loss'){p.losses++;p.streak=p.streak<0?p.streak-(window.ArcanaSilver.has(p,'fast_streak')?2:1):-(window.ArcanaSilver.has(p,'fast_streak')?2:1);const n=-p.streak;bonus=n>=5?3:n>=3?2:n>=2?1:0;}
 else if(result==='draw'){p.streak=0;}}
 const total=5+interest+win+bonus;p.gold+=total;return {id:p.id,before,base:5,interest,win,streak:bonus,total,after:p.gold};}
// Death placement: elimination round first, then lower final HP, then earlier battle-time tick.
function ranking(){return [...league.players].sort((a,b)=>{if(!a.out&&!b.out)return b.hp-a.hp||b.wins-a.wins||a.id-b.id;if(!a.out)return-1;if(!b.out)return 1;return b.out.roundIndex-a.out.roundIndex||b.hp-a.hp||b.out.tick-a.out.tick||b.out.serial-a.out.serial;});}
function pairRound(){const list=alive();const seen=new Set(),pairs=[],ordered=[...list].sort((a,b)=>(a.byes-b.byes)||((b.hp-a.hp)*.01)||a.id-b.id);let bye=null;
 if(ordered.length%2){bye=[...ordered].sort((a,b)=>a.byes-b.byes||a.opponents.length-b.opponents.length||a.id-b.id)[0];seen.add(bye.id);bye.byes++;}
 const pool=ordered.filter(p=>!seen.has(p.id));
 while(pool.length>1){const p=pool.shift();let ix=pool.findIndex(q=>!p.opponents.includes(q.id));if(ix<0)ix=0;const q=pool.splice(ix,1)[0];pairs.push({id:`${league.stage}-${league.round}-${pairs.length}`,a:p.id,b:q.id,bye:false,result:null,trace:null});p.opponents.push(q.id);q.opponents.push(p.id);}
 if(bye)pairs.push({id:`${league.stage}-${league.round}-bye`,a:bye.id,b:null,bye:true,result:{winner:'bye',hpA:20,hpB:0,round:0},trace:[]});return pairs;}
const buildNumericCards=()=>Object.fromEntries(Object.entries(CARD_DB).map(([id,c])=>[id,{...c}]));
function doNumeric(m){const pa=league.players[m.a],pb=league.players[m.b];const seed=(((league.stage*1000+league.round*100+m.a*19+m.b*71)*2654435761)>>>0);
 const res=window.ArcanaFastBalance.simulateOne(buildNumericCards(),pa.deck,pb.deck,(league.stage+league.round+m.a)%2===0,seed,AI_VIRTUAL_TURN_CAP,{aiA:'adaptive',aiB:'adaptive',record:true,upgradesA:pa.upgrades,upgradesB:pb.upgrades,buffsA:pa.buffs,buffsB:pb.buffs,augmentsA:pa.augments||[],augmentsB:pb.augments||[],silverA:pa.silver||{},silverB:pb.silver||{},leagueStage:league.stage,rootColumnA:window.ArcanaSilver.rootColumn(pa,league.stage,league.round),rootColumnB:window.ArcanaSilver.rootColumn(pb,league.stage,league.round),packById:SILVER_PACK_BY_ID});
 let winner=res.winner,reason='본체 HP 0';
 if(winner==='draw'){
  const last=res.trace?.at(-1);const a=last?.A||{hp:res.hpA},b=last?.B||{hp:res.hpB};
  const decision=compareTimedSides(a,b,seed);winner=decision.winner;
  reason=`AI 제한 시간 환산 종료 · ${decision.why}`;
 }
 // End of each numeric match: each empty slot independently rolls a 33% chance for 1 gold.
 const finalFrame=res.trace?.at(-1),fieldA=finalFrame?.A,fieldB=finalFrame?.B;
 if(fieldA)grantEmptyFieldGold(pa,fieldA);
 if(fieldB)grantEmptyFieldGold(pb,fieldB);
 m.result={winner,hpA:res.hpA,hpB:res.hpB,round:res.round,rawWinner:res.winner,timedOut:res.winner==='draw',reason,defeatTick:(res.trace?.findIndex(s=>s.A.hp<=0||s.B.hp<=0)??-1)>=0?res.trace.findIndex(s=>s.A.hp<=0||s.B.hp<=0):res.round*10};m.trace=res.trace||[];if(window.ArcanaSilver.has(pa,'sitout'))pa.silver.skip=0;if(window.ArcanaSilver.has(pb,'sitout'))pb.silver.skip=0;
}
function grantEmptyFieldGold(p,side){
 if(!window.ArcanaSilver.has(p,'use_every_slot'))return 0;
 const cells=[...(side.front||[]),...(side.back||[])];let gained=0;
 for(const cell of cells)if(!cell&&Math.random()<.33)gained++;
 p.gold+=gained;return gained;
}
function battleResolve(m){if(m.bye)return;const pa=league.players[m.a],pb=league.players[m.b],r=m.result;
 const winner=r.winner==='A'?pa:pb,loser=r.winner==='A'?pb:pa;
 const remaining=Math.max(0,r.winner==='A'?r.hpA:r.hpB),damage=league.stage*3+Math.floor(Math.min(20,remaining)/2);
 if(window.ArcanaSilver.has(winner,'kingslayer')){
  const paid=loser.hp>winner.hp?6:1;winner.gold+=paid;m.result.kingSlayerGold=paid;
 }
 loser.hp-=damage;m.result.damage=damage;m.result.winnerId=winner.id;m.result.loserId=loser.id;
 if(loser.hp<=0&&!loser.out){loser.out={roundIndex:(league.stage-1)*7+league.round,stage:league.stage,round:league.round,tick:r.defeatTick??(r.round*10+(r.winner==='A'?1:2)),serial:league.order++};}
}
function startCombatRound(){clearAuto();league.phase='battle';league.currentMatches=pairRound();for(const m of league.currentMatches)if(!m.bye&&m.a!==0&&m.b!==0){doNumeric(m);battleResolve(m);}league.message='대진 확정 · 내 경기가 자동으로 시작됩니다. 전투 제한 시간 03:00.';
 if(!league.currentMatches.some(m=>!m.bye&&(m.a===0||m.b===0)))finishRound();else{renderLeague();playMyMatch();}}
function configureDeckFor(a,b){const enabled=Object.fromEntries(PACK_DEFS.map(p=>[p.id,true]));const make=p=>({enabled:{...enabled},counts:Object.fromEntries(Object.keys(CARD_DB).map(id=>[id,p.deck[id]||0]))});activeDeckConfig={player:make(a),enemy:make(b)};}
function playMyMatch(){const m=league.currentMatches.find(x=>!x.bye&&(x.a===0||x.b===0));if(!m||m.result)return;const enemy=league.players[m.a===0?m.b:m.a];activePlayerMatch={matchId:m.id};configureDeckFor(league.players[0],enemy);setPanel(false);hideOverlay();$L('leagueGameBar').hidden=false;$L('leagueGameBar').textContent=`🏆 ${stageRound()} · ${league.players[0].name} ♥${league.players[0].hp} vs ${enemy.name} ♥${enemy.hp} · 보유 ${league.players[0].gold}G`;window.__silverPendingMapping={player:league.players[0],enemy,stage:league.stage,round:league.round};originalNewGame();startClock();if(window.ArcanaSilver.has(league.players[0],'root')){$L('leagueGameBar').insertAdjacentHTML('beforeend',`<span style="margin-left:8px">🌱 뿌리 박기 · 전열 ${window.ArcanaSilver.rootColumn(league.players[0],league.stage,league.round)+1}번 칸</span>`);}if(window.ArcanaSilver.has(league.players[0],'refresh_day')&&window.ArcanaSilver.refreshRemaining('player')>0){$L('leagueGameBar').insertAdjacentHTML('beforeend',`<button type="button" id="silverRefreshBtn" class="silver-transform-action">🔄 손패 새로 고침 (${window.ArcanaSilver.refreshRemaining('player')}/3)</button>`);}
 if(window.ArcanaSilver.has(league.players[0],'transform')&&!league.players[0].silver?.transformUsed){$L('leagueGameBar').insertAdjacentHTML('beforeend','<button type="button" id="silverTransformBtn" class="silver-transform-action">🤖 훈련봇 변환 · 1회</button>');}renderSidebar();}
function bonusApplied(u,p){if(!u||!p||u.__leagueBonus)return u;const c=CARD_DB[u.card];if(!c||c.type!=='unit')return u;const up=p.upgrades?.[u.card]||{};const atk=(up.atk||0)+(p.buffs?.atk||0),hp=(up.hp||0)+(p.buffs?.hp||0);u.__leagueBonus=true;u.atk+=atk;u.hp+=hp;u.maxHp+=hp;return u;}
summon=function(side,entry,row,index,by='player'){const u=originalSummon(side,entry,row,index,by);if(u&&league&&activePlayerMatch){const p=by==='player'?league.players[0]:league.players[league.currentMatches.find(x=>x.id===activePlayerMatch.matchId)?.a===0?league.currentMatches.find(x=>x.id===activePlayerMatch.matchId)?.b:league.currentMatches.find(x=>x.id===activePlayerMatch.matchId)?.a];bonusApplied(u,p);window.ArcanaSilver.onSummon(side,row,index,u);window.ArcanaSilver.refresh(by);}return u;};
summonDeathDragon=function(owner,entry,row,index){const u=originalDragon(owner,entry,row,index);if(u&&league&&activePlayerMatch){const m=league.currentMatches.find(x=>x.id===activePlayerMatch.matchId);bonusApplied(u,league.players[owner==='player'?0:m.a===0?m.b:m.a]);window.ArcanaSilver.onSummon(game[owner],row,index,u);}return u;};
showResult=function(){if(!league||!activePlayerMatch){originalShowResult();return;}
 const m=league.currentMatches.find(x=>x.id===activePlayerMatch.matchId);if(!m||m.result)return;
 // A is always the human side when this match is played via the existing 1v1 board.
 clearClock();
 // Capture the last board state before clearing augment context.
 const mine=league.players[0],enemyPlayer=league.players[m.a===0?m.b:m.a];
 grantEmptyFieldGold(mine,game.player);grantEmptyFieldGold(enemyPlayer,game.enemy);
 window.ArcanaSilver.onBattleEnd();window.__silverPendingMapping=null;const playerIsA=m.a===0,who=game.winner;
 const seed=(((league.stage*101+league.round*29+m.a*19+m.b*71)*2654435761)>>>0);
 const drawn=who==='draw'?compareTimedSides(game.player,game.enemy,seed):null;
 let winner=who==='player'?'A':who==='enemy'?'B':drawn.winner;
 if(!playerIsA)winner=winner==='A'?'B':'A';
 m.result={winner,hpA:playerIsA?game.player.hp:game.enemy.hp,hpB:playerIsA?game.enemy.hp:game.player.hp,round:game.turn,rawWinner:who,timedOut:!!activePlayerMatch.timeoutReason,reason:activePlayerMatch.timeoutReason?`3분 종료 · ${activePlayerMatch.timeoutReason}`:drawn?`동시 종료 · ${drawn.why}`:'본체 HP 0',defeatTick:game.turn*10+(game.active==='player'?1:2)};
 battleResolve(m);activePlayerMatch=null;$L('leagueGameBar').hidden=true;finishRound();setPanel(true);renderLeague();
};
newGame=function(){if(activePlayerMatch){sidebarMessage('리그 경기는 재시작할 수 없습니다. 3분 제한 시간이 계속 적용됩니다.');return;}if(league){setPanel(true);renderLeague();return;}originalNewGame();};
function finishRound(){if(!league||league.phase!=='battle')return;if(league.currentMatches.some(m=>!m.result))return;
 const outcomes=Object.fromEntries(league.currentMatches.filter(x=>!x.bye).flatMap(m=>[[m.result.winnerId,'win'],[m.result.loserId,'loss']]));
 league.lastIncome=alive().map(p=>giveIncome(p,true,outcomes[p.id]||null)).filter(Boolean);
 // A participant knocked out this round receives their base gold before elimination in league bookkeeping,
 // but cannot purchase after being eliminated. This never influences placement.
 for(const m of league.currentMatches.filter(x=>!x.bye))for(const id of [m.a,m.b]){const p=league.players[id];if(p.out?.roundIndex===(league.stage-1)*7+league.round&&!league.lastIncome.some(x=>x.id===id)){
  const before=p.gold,interest=window.ArcanaSilver.beforeIncome(p,Math.min(5,Math.floor(before/10)));p.losses++;p.streak=p.streak<0?p.streak-(window.ArcanaSilver.has(p,'fast_streak')?2:1):-(window.ArcanaSilver.has(p,'fast_streak')?2:1);const n=-p.streak,streak=n>=5?3:n>=3?2:n>=2?1:0;p.gold+=5+interest+streak;league.lastIncome.push({id,before,base:5,interest,win:0,streak,total:5+interest+streak,after:p.gold});}}
 league.history.push({stage:league.stage,round:league.round,type:'combat',matches:league.currentMatches.map(m=>({...m})),income:league.lastIncome.map(x=>({...x}))});for(const old of league.history.slice(0,-8))for(const m of old.matches||[])delete m.trace;
 league.phase=alive().length<=1?'finished':'result';league.finished=league.phase==='finished';league.message=league.finished?'🏆 마지막 생존자가 결정됐습니다!':'라운드 종료. AI 경기를 관전하거나 다음 라운드로 진행하세요.';leagueSave();renderLeague();scheduleAuto();}
function nextRound(){if(league.phase==='result'||league.phase==='shop-done')stagedNext();else if(league.phase==='ready'){if(roundType()==='shop')startShop();else startCombatRound();}}
function startShop(){league.phase='shop';league.lastIncome=alive().map(p=>giveIncome(p,false,null));league.shopOffers=Object.keys(CARD_DB).filter(id=>CARD_DB[id].type!=='unit'||!CARD_DB[id].token).filter(id=>!CARD_DB[id].dragon&&!CARD_DB[id].token).sort(()=>Math.random()-.5).slice(0,8);
 for(const p of alive())if(p.id!==0)aiShopping(p);
 league.message='상점 라운드입니다. 구매·제거·강화·버프 획득 가능. 가격/효과는 임시값입니다.';leagueSave();renderLeague();if(league.players[0].hp<=0)endShop();}
function buyPrice(id){const c=CARD_DB[id];return Math.max(5,(c.cost+1)*3);}
function spend(p,cost){if(p.gold<cost)return false;p.gold-=cost;return true;}
function aiShopping(p){const units=Object.entries(p.deck).filter(([id,n])=>n&&CARD_DB[id]?.type==='unit');
 if(p.gold>=60&&units.length){const id=units.sort((a,b)=>CARD_DB[b[0]].cost-CARD_DB[a[0]].cost)[0][0];if(spend(p,SHOP.plusAtk)){p.upgrades[id]??={atk:0,hp:0};p.upgrades[id].atk++;}}
 if(p.gold>=75&&totalDeck(p)<MAX_DECK){const options=league.shopOffers.filter(id=>CARD_DB[id]?.type==='unit');const id=options.sort((a,b)=>CARD_DB[b].cost-CARD_DB[a].cost)[0];if(id&&spend(p,buyPrice(id)))p.deck[id]=(p.deck[id]||0)+1;}}
function applyShopAction(action,id){if(!league||league.phase!=='shop')return;const p=league.players[0];if(p.hp<=0)return;const c=CARD_DB[id];let cost,ok=false,desc='';
 if(action==='buy'&&c&&!c.token&&!c.dragon&&totalDeck(p)<MAX_DECK&&(p.deck[id]||0)<30){cost=buyPrice(id);if(spend(p,cost)){p.deck[id]=(p.deck[id]||0)+1;ok=true;desc=`${c.name} 구매 (-${cost}G)`;}}
 if(action==='remove'&&c&&(p.deck[id]||0)>0&&totalDeck(p)>12){cost=SHOP.remove;if(spend(p,cost)){p.deck[id]--;if(!p.deck[id])delete p.deck[id];ok=true;desc=`${c.name} 제거 (-${cost}G)`;}}
 if(['atk','hp'].includes(action)&&c&&c.type==='unit'&&!c.token&&(p.deck[id]||0)>0){cost=action==='atk'?SHOP.plusAtk:SHOP.plusHp;if(spend(p,cost)){p.upgrades[id]??={atk:0,hp:0};p.upgrades[id][action]+=action==='hp'?2:1;ok=true;desc=`${c.name} ${action==='atk'?'공격력 +1':'최대체력 +2'} 강화 (-${cost}G)`;}}
 if(action==='buff-atk'||action==='buff-hp'){cost=action==='buff-atk'?SHOP.buffAtk:SHOP.buffHp;if(spend(p,cost)){p.buffs[action==='buff-atk'?'atk':'hp']++;ok=true;desc=`모든 유닛 ${action==='buff-atk'?'공격력':'체력'} +1 버프 (-${cost}G)`;}}
 league.message=ok?`✅ ${desc}`:'골드 부족 또는 구매 조건 불충족';leagueSave();renderLeague();}
function endShop(){if(!league||league.phase!=='shop')return;league.history.push({stage:league.stage,round:league.round,type:'shop',matches:[],income:league.lastIncome.map(x=>({...x}))});league.phase=alive().length<=1?'finished':'shop-done';leagueSave();renderLeague();scheduleAuto(400);}
function replayOpen(matchId){if(!league)return;clearAuto();let m=(league.currentMatches||[]).find(x=>x.id===matchId);if(!m)m=league.history.flatMap(x=>x.matches||[]).find(x=>x.id===matchId);if(!m||!m.trace?.length)return;const fromGame=!!activePlayerMatch&&$L('leagueScreen').classList.contains('hidden');stopReplay();replay={id:matchId,trace:m.trace,index:0,fromGame};league.phaseBeforeSpectate=league.phase;renderLeague();}
function stopReplay(){if(replayTimer){clearInterval(replayTimer);replayTimer=null;}replay=null;}
function replayClose(){const resumeGame=!!replay?.fromGame&&!!activePlayerMatch;stopReplay();if(resumeGame){setPanel(false);renderSidebar();}else{renderLeague();scheduleAuto(2000);}}
function replayStep(delta){if(!replay)return;replay.index=Math.max(0,Math.min(replay.trace.length-1,replay.index+delta));renderReplay();}
function replayPlay(speed=1){if(!replay)return;if(replayTimer){clearInterval(replayTimer);replayTimer=null;return;}replayTimer=setInterval(()=>{if(!replay||replay.index>=replay.trace.length-1){clearInterval(replayTimer);replayTimer=null;return;}replay.index++;renderReplay();},Math.max(150,700/speed));}
function fmtUnit(u){if(!u)return '<div class="lg-empty">·</div>';const c=CARD_DB[u.card],art=c?.art;return `<div class="lg-unit" title="${safe(c?.name||u.card)}"><div class="lg-unit-image">${art?`<img loading="lazy" decoding="async" src="${safe(art)}" alt="">`:(c?.icon||'🃏')}</div><div class="lg-unit-name">${safe(c?.name||u.card)}</div><div class="lg-unit-stat">⚔${u.atk} ♥${u.hp}</div></div>`;}
function renderReplay(){if(!replay)return;const node=$L('leagueReplayContent');if(!node)return;const s=replay.trace[replay.index];
 const boardSide=(data,side)=>`<div class="lg-replay-side"><div class="lg-replay-hero">${side} · ❤️ ${Math.max(0,data.hp)} / 20 · ✦ ${data.mana} 마나</div><div class="lg-replay-slots">${data.back.map(fmtUnit).join('')}</div><div class="lg-replay-slots">${data.front.map(fmtUnit).join('')}</div></div>`;
 node.innerHTML=`<div class="lg-replay-top"><strong>${s.turn}턴 · ${safe(s.actor)} ${safe(s.stage)}</strong><span>${replay.index+1} / ${replay.trace.length}</span></div><p class="lg-muted">${safe(s.event||'전장 상태 변경')}</p>${boardSide(s.B,'B') }<div class="lg-replay-mid">⚔️ 6라인 전장</div>${boardSide(s.A,'A')}<div class="lg-replay-controls"><button data-lg="replay-prev">◀ 이전</button><button data-lg="replay-play">${replayTimer?'Ⅱ 정지':'▶ 재생'}</button><button data-lg="replay-next">다음 ▶</button><button data-lg="replay-speed" data-speed="4">⏩ 4배속</button></div><input aria-label="관전 시점" id="leagueTraceSlider" type="range" min="0" max="${replay.trace.length-1}" value="${replay.index}" style="width:100%"><p class="lg-muted">AI 전투를 다시 계산하지 않고, 저장된 턴·단계별 전장 상태를 재생합니다.</p>`;
}
function renderLeague(){if(!league)return;setPanel(true);renderSidebar();$L('leagueTitle').textContent=`🏆 8인 리그 · ${stageRound()} · ${roundType()==='shop'?'상점':'전투'}`;
 if(league.phase==='augment'){$L('leagueBody').innerHTML=window.ArcanaSilver.choiceMarkup();return;}
 if(replay){$L('leagueBody').innerHTML='<div class="lg-card"><div class="lg-actions"><button data-lg="replay-close">← 리그로 돌아가기</button></div><div id="leagueReplayContent"></div></div>';renderReplay();return;}
 const participants=ranking().map((p,i)=>`<div class="lg-score-row ${p.id===0?'lg-mine':''} ${p.out?'lg-out':''}"><b>${i+1}위</b><span>${safe(p.name)}</span><small>${safe(p.style)} · ⬜ ${safe(window.ArcanaSilver.BY_ID[p.augments?.[0]]?.name||'없음')}</small><strong>${p.out?'탈락':`♥ ${p.hp}`}</strong><span>🪙 ${p.gold}G</span><small>${p.streak>0?p.streak+'연승':p.streak<0?-p.streak+'연패':'—'}</small></div>`).join('');
 const matches=(league.phase==='battle'?league.currentMatches:league.history.at(-1)?.matches||[]).map(m=>{
 const a=league.players[m.a],b=m.b==null?null:league.players[m.b];const winner=m.result?.winnerId;return `<div class="lg-match"><span>${safe(a.name)}</span><b>${b?'VS':'부전승'}</b><span>${safe(b?.name||'—')}</span><span class="lg-muted">${m.result?(m.bye?'피해 없음':`${winner===m.a?a.name:b.name} 승 · ${m.result.damage||0}피해${m.result.timedOut?' · ⏳ 시간 판정':''}`):'전투 대기'}</span>${m.trace?.length?`<button data-lg="watch" data-id="${safe(m.id)}">👁 관전</button>`:''}${m.a===0||m.b===0?' <span class="lg-mark">내 경기</span>':''}</div>`;}).join('');
 let actions='';const me=league.players[0];
 if(league.phase==='ready')actions=league.autoAdvance===false?`<button class="lg-primary" data-lg="next">${roundType()==='shop'?'🛒 상점 열기':'⚔ 라운드 시작'}</button>`:'<span>⏳ 이번 라운드 자동 준비 중…</span>';
 else if(league.phase==='battle')actions=league.currentMatches.some(m=>!m.bye&&(m.a===0||m.b===0)&&!m.result)?'<span>⚔ 내 경기 자동 진행 중 · 3분 제한</span>':'<span>AI 경기 계산 중</span>';
 else if(league.phase==='result'||league.phase==='shop-done')actions='<button class="lg-primary" data-lg="next">다음 라운드 즉시 →</button>'; 
 else if(league.phase==='shop')actions='<button class="lg-primary" data-lg="shop-done">🛒 구매 마치고 다음 라운드</button>';
 else if(league.phase==='finished')actions=`<strong>🏆 우승: ${safe(alive()[0]?.name||ranking()[0].name)}!</strong> <button data-lg="restart">새 리그</button>`;
 if(['ready','result','shop-done'].includes(league.phase))actions+=` <button data-lg="auto-toggle">${league.autoAdvance===false?'▶ 자동 진행 켜기':'Ⅱ 자동 진행 일시정지'}</button>`;
 const shopHtml=league.phase==='shop'?renderShop():'';
 const archive=league.history.slice(-7).reverse().filter(h=>h.matches?.some(m=>m.trace?.length));
 const replayArchive=archive.length?`<div class="lg-card"><h3>👁 지난 AI 경기 관전</h3>${archive.map(h=>`<div class="lg-match"><strong>${h.stage}-${h.round}</strong>${h.matches.filter(m=>m.trace?.length).map(m=>`<button data-lg="watch" data-id="${safe(m.id)}">${safe(league.players[m.a].name)} vs ${safe(league.players[m.b].name)}</button>`).join('')}</div>`).join('')}</div>`:'';
 const combatHtml=(league.phase==='battle'||league.phase==='result'||league.phase==='finished')?`<div class="lg-card"><h3>⚔ 대진과 관전</h3>${matches||'<p>전투 기록이 없습니다.</p>'}<p class="lg-muted">AI 경기는 화면 렌더링 없이 계산하고, 선택한 경기만 기록으로 관전할 수 있어요.</p></div>`:'';
 $L('leagueBody').innerHTML=`<div class="lg-card"><div class="lg-actions lg-progress">${Array.from({length:7},(_,i)=>`<span class="lg-dot ${i+1===league.round?'lg-now':''}">${i+1}R ${[4,7].includes(i+1)?'🛒':'⚔'}</span>`).join('')}</div><p>${safe(league.message||'')}</p><div class="lg-actions">${actions}<button data-lg="return">1대1 모드로</button></div></div><div class="lg-card"><h3>🏆 순위 및 글로벌 HP</h3><p>왼쪽 체력 바에서 8명 전원의 글로벌 HP를 확인하고, 선수를 클릭해 AI 경기를 관전하세요.</p></div>${combatHtml}${replayArchive}${shopHtml}${league.lastIncome.length?`<div class="lg-card"><h3>💰 이번 라운드 골드 정산</h3>${league.lastIncome.map(x=>`<p>${safe(league.players[x.id].name)}: ${x.before} + 기본5 + 이자${x.interest} + 승리${x.win} + 연승·연패${x.streak} = <b>${x.after}G</b></p>`).join('')}</div>`:''}<div class="lg-card"><h3>📖 확정 규칙</h3><p>스테이지당 ⚔ ⚔ ⚔ 🛒 ⚔ ⚔ 🛒 · 기본 골드 매 라운드 +5 · 10G당 이자 +1 (최대 +5) · 승리 +1 · 연승 2/4/6회 +1/+2/+3 · 연패 2/3/5회 +1/+2/+3</p><p>동일 라운드 탈락은 음수 글로벌 HP가 낮을수록 아래, 같으면 기록상의 전투 종료 시점이 빠른 참가자가 아래. 이후 라운드 탈락자는 무조건 더 높은 순위입니다.</p><p class="lg-muted">상점 수치 임시 · 실버 증강 20종 테스트 중 · 경기 간 덱·골드·글로벌 HP 유지, 개별 전투는 초기화.</p></div>`;
}
function renderShop(){const p=league.players[0],cards=Object.entries(p.deck).filter(([id,n])=>n>0&&CARD_DB[id]).sort((a,b)=>a[0].localeCompare(b[0]));
 const offers=league.shopOffers.map(id=>{const c=CARD_DB[id];return `<div class="lg-shop-card"><b>${safe(c.name)}</b><small>${c.type==='unit'?`⚔${c.atk} ♥${c.hp}`:c.type==='spell'?'스펠':'장비'} · 마나 ${c.cost}</small><button data-lg="shop" data-action="buy" data-id="${id}" ${p.gold<buyPrice(id)||totalDeck(p)>=MAX_DECK?'disabled':''}>구매 ${buyPrice(id)}G</button></div>`;}).join('');
 const cardOptions=cards.map(([id,n])=>`<option value="${safe(id)}">${safe(CARD_DB[id].name)} ×${n}${p.upgrades[id]?` (공+${p.upgrades[id].atk||0}/체+${p.upgrades[id].hp||0})`:''}</option>`).join('');
 return `<div class="lg-card"><h3>🛒 8인 리그 상점 · 내 골드 ${p.gold}G</h3><p class="lg-muted">상점 가격과 강화·버프 수치는 테스트용 임시 설정입니다. 구매·제거·강화·버프는 다음 전투부터 지속 적용됩니다.</p><h4>새로운 카드 구매 (최대 ${MAX_DECK}장)</h4><div class="lg-offers">${offers}</div><h4>덱 관리 · 제거 / 강화</h4><div class="lg-shop-actions"><select id="lgManageCard">${cardOptions}</select><button data-lg="shop-selected" data-action="remove" ${totalDeck(p)<=12?'disabled':''}>카드 1장 제거 ${SHOP.remove}G</button><button data-lg="shop-selected" data-action="atk">공격 +1 ${SHOP.plusAtk}G</button><button data-lg="shop-selected" data-action="hp">체력 +2 ${SHOP.plusHp}G</button></div><h4>영구 팀 버프</h4><div class="lg-shop-actions"><button data-lg="shop" data-action="buff-atk">전 유닛 공격 +1 · ${SHOP.buffAtk}G</button><button data-lg="shop" data-action="buff-hp">전 유닛 체력 +1 · ${SHOP.buffHp}G</button></div><p>내 덱 ${totalDeck(p)}장 · 지속 버프 공격 +${p.buffs.atk} / 체력 +${p.buffs.hp}</p></div>`;
}
const leagueTimerCSS=document.createElement('style');leagueTimerCSS.textContent=`
.lg-ingame-bar{display:flex;justify-content:space-between;gap:14px;align-items:center;flex-wrap:wrap}
.lg-ingame-bar #leagueMatchClock{color:#ffefac;font-variant-numeric:tabular-nums;font-size:18px;white-space:nowrap;border-radius:8px;background:#181f38;border:1px solid #e8c27c;padding:3px 12px}
.lg-ingame-bar #leagueMatchClock.lg-timer-urgent{color:#ff9393;border-color:#f76d78;animation:lgPulse 1s ease-in-out infinite}
@keyframes lgPulse{50%{opacity:.5}}
`;document.head.appendChild(leagueTimerCSS);
document.addEventListener('click',e=>{
 if(e.target.closest('#silverRefreshBtn')){const active=window.ArcanaSilver.toggleRefreshMode('player');e.target.closest('#silverRefreshBtn').textContent=`🔄 ${active?'교체할 손패 선택 (취소하려면 다시 클릭)':'손패 새로 고침'} (${window.ArcanaSilver.refreshRemaining('player')}/3)`;}
 if(e.target.closest('#silverTransformBtn')){const ok=window.ArcanaSilver.transform('player');if(ok){e.target.closest('#silverTransformBtn')?.remove();if(typeof render==='function')render();}else{const msg=$L('leagueSidebarNotice');if(msg)msg.textContent='변환할 아군 유닛을 먼저 소환하세요.';}}});
$L('leagueSidebarToggle').addEventListener('click',()=>{sidebarCollapsed=!sidebarCollapsed;renderSidebar();});
$L('leagueSidebarPlayers').addEventListener('click',e=>{const b=e.target.closest('button[data-side-player]');if(b)sidebarWatchPlayer(Number(b.dataset.sidePlayer));});
$L('leagueOpen').addEventListener('click',newLeagueMenu);
$L('leagueBody').addEventListener('click',e=>{const silver=e.target.closest('button[data-silver-pick]');if(silver&&league?.phase==='augment'){const p=league.players[0];if(window.ArcanaSilver.applySelection(p,silver.dataset.silverPick)){league.phase='ready';league.message='⬜ '+window.ArcanaSilver.BY_ID[silver.dataset.silverPick].name+' 선택 완료';leagueSave();renderLeague();scheduleAuto(200);}return;}const b=e.target.closest('button[data-lg]');if(!b)return;const act=b.dataset.lg;
 if(act==='start'||act==='restart'){leagueStart();return;}if(act==='resume'){if(!resumeLeague())alert('저장된 리그가 없습니다. 새로 시작해주세요.');return;}
 if(act==='close'){setPanel(false);return;}if(act==='return'){leaveLeague();return;}
 if(act==='next'){clearAuto();nextRound();return;}if(act==='fight'){playMyMatch();return;}if(act==='auto-toggle'){setAutoAdvance(league.autoAdvance===false);return;}if(act==='shop-done'){endShop();return;}
 if(act==='shop')applyShopAction(b.dataset.action,b.dataset.id);if(act==='shop-selected')applyShopAction(b.dataset.action,$L('lgManageCard')?.value);
 if(act==='watch')replayOpen(b.dataset.id);if(act==='replay-close')replayClose();if(act==='replay-next')replayStep(1);if(act==='replay-prev')replayStep(-1);if(act==='replay-play')replayPlay(1);if(act==='replay-speed')replayPlay(Number(b.dataset.speed)||4);
});
$L('leagueBody').addEventListener('input',e=>{if(e.target.id==='leagueTraceSlider'&&replay){replay.index=+e.target.value;renderReplay();}});
// testing and optional third-party use; official 1v1 remains the original game.
window.ArcanaLeague={start:leagueStart,open:newLeagueMenu,getState:()=>league,advance:nextRound,shop:applyShopAction,ranking,simulateMatch:doNumeric,forceFinish:finishRound,remainingMs:()=>matchClock?Math.max(0,matchClock.deadline-Date.now()):null,setAutoAdvance};
})();
