/* Arcana Card Duel — Adaptive Tactical AI 2.0
   All observations are public battle actions. This file never reads opposing hand/deck.
   No network, trained models or storage. Data resets with every game. */
(function(){
'use strict';
const CONFIG={personality:'adaptive',difficulty:'hard',enabled:true};
const PROFILES={balanced:{off:1,def:1,psych:.5},aggressive:{off:1.4,def:.7,psych:.3},defensive:{off:.75,def:1.45,psych:.35},trickster:{off:.95,def:.95,psych:1.25},adaptive:{off:1,def:1,psych:1}};
let ownerGame=null;
function memory(){if(ownerGame!==game){ownerGame=game;game.ai2={observed:{player:{attack:0,hero:0,focus:0,spells:0,heal:0,summon:0,protect:0},enemy:{attack:0,hero:0,focus:0,spells:0,heal:0,summon:0,protect:0}},traces:[],turn:0,seen:new Set()};}return game.ai2;}
function record(owner,key){if(!CONFIG.enabled||!game||game.winner)return;const m=memory().observed[owner];if(m&&key in m)m[key]++;}
function history(owner){const o=memory().observed[otherSide(owner)],n=o.attack+o.hero;
 return {hero:(o.hero+2)/(n+5),spell:(o.spells+2)/(o.spells+o.summon+5),focus:(o.focus+2)/(o.attack+5),protect:(o.protect+2)/(o.spells+5),samples:Math.min(1,(n+o.spells+o.summon)/12)};}
function profile(owner){const base=PROFILES[CONFIG.personality]||PROFILES.adaptive,obs=history(owner);if(CONFIG.personality!=='adaptive')return {...base,obs};
 return {off:1+obs.samples*(obs.hero-.5)*.24,def:1+obs.samples*(obs.focus-.5)*.24,psych:obs.samples,obs};}
function value(u){if(!u)return 0;const c=CARD_DB[u.card]||{},stats=c.cost||0;
 let n=1.4+stats*.34+Math.max(0,u.atk||0)*.35+Math.max(0,u.hp||0)*.17;
 if(u.card==='kyrene'||u.card==='castorice')n+=4.8;if(c.dragon)n+=3;if(u.awakened)n+=5;
 if(u.kyreneBlessing)n+=1.9;if(u.curse)n+=Math.min(2.8,(u.curse.progress||0)/40);
 if(c.machine||c.shaman)n+=2.7;if(c.hut)n+=2;
 return n;
}
function damageEstimate(u,raw){return Math.max(0,(raw||0)-unitShield(u));}
function trace(owner,phase,chosen,alternatives){const m=memory();const info={owner,turn:game.turn,phase,chosen,...(alternatives?{alternatives}:{}),profile:history(owner)};m.traces.unshift(info);m.traces.length=Math.min(m.traces.length,80);}
function tie(id){const n=String(id||'').split('').reduce((p,ch)=>p*31+ch.charCodeAt(0),7);return (n%1000)/1000000;}
function scoreSummon(owner,pick,spot,ownCards){const c=pick.c,en=game[otherSide(owner)],me=game[owner],p=profile(owner);
 const cost=c.cost||0,anyAllies=ownCards.length,frontFriends=ownCards.filter(t=>t.row==='front').length,frontEnemy=allTargets(en).filter(t=>t.row==='front');
 const immediate=Math.max(0,c.atk||0)*.8+Math.max(0,c.hp||0)*.25+(c.shield?1.5:0),reserve=Math.min(3,Math.max(0,me.bonusMana||0)),spellInHand=me.hand.some(e=>resolvedHandCard(owner,e)?.type==='spell');
 let score=immediate+p.off*(c.atk||0)*.6+p.def*(c.hp||0)*.17 +cost*.13;
 if(pick.id==='kyrene')score+=anyAllies>=2?7:5;
 if(pick.id==='castorice')score+=5;
 if(c.dragon)score+=3+((me.front.filter(Boolean).length+me.back.filter(Boolean).length)>3?1:0);
 if(c.machine)score+=frontEnemy.length?3:0;
 if(c.shaman)score+=allTargets(en).some(t=>!immuneToBasicCurse(t.u)&&!immuneToSpecialCurse(t.u))?3:-4;
 if(c.hut){const f=ownCards.some(t=>CARD_DB[t.u.card]?.chuchu),m=ownCards.some(t=>t.u.tribal&&!t.u.tribalStage2);score+=(f&&m?3:-2);}
 if(c.ranged&&spot.row==='front')score+=allTargets(en).some(t=>t.row==='back')?1:0;
 if(spot.row==='back'&&c.ranged)score+=frontFriends>0?1.5:.2;
 if(!c.ranged&&frontFriends>=5)score-=3;
 if(spellInHand&&reserve<2&&me.mana-cost<2&&game.turn>2)score-=1.3;
 // Lane pressure: summons are evaluated in their actual column, not only by overall board strength.
 const laneFront=en.front[spot.index],laneBack=en.back[spot.index];
 if(spot.row==='front'){
  const laneEnemy=laneFront||laneBack;
  if(laneEnemy)score+=Math.min(laneEnemy.hp,Math.max(0,(c.atk||0)-unitShield(laneEnemy)))*.62+(laneEnemy.hp<=Math.max(0,(c.atk||0)-unitShield(laneEnemy))?2.3:0);
  else score+=(c.atk||0)*.36;
 }else if(c.ranged){score+=laneFront?Math.min(laneFront.hp,Math.max(0,(c.atk||0)-unitShield(laneFront)))*.7:-.75;}
 if(anyAllies>=8)score-=1.4;
 if(CONFIG.difficulty==='expert'){
  const danger=allTargets(en).reduce((n,t)=>n+Math.max(0,t.u.atk||0),0);
  if(spot.row==='front'&&danger>6&&c.hp<4)score-=1.2;
  if(spot.row==='back'&&c.ranged&&danger>6)score+=1.3;
  if(c.dragon&&allTargets(e).some(t=>t.u.card==='castorice'&&t.u.hp<3))score-=2;
 }
 return score+tie(pick.id+spot.row+spot.index);
}
function scoreTarget(owner,from,tar,hpShadows,otherPlans){const attacker=from.u,kind=planKind(attacker),c=CARD_DB[attacker.card],p=profile(owner),obs=p.obs;
 if(tar.row==='hero'){
  if(kind!=='attack')return -Infinity;
  const amt=Math.min(Math.max(0,attacker.atk),Math.max(0,game[otherSide(owner)].hp));
  return amt*(game[otherSide(owner)].hp<=amt?90:1.4)*p.off - (obs.focus*.7*obs.samples);
 }
 const victim=tar.u,vhp=hpShadows.get(victim.id)??victim.hp;
 if(vhp<=0)return -Infinity;
 const base=value(victim),actual=damageEstimate(victim,c.dragon?Math.max(1,dragonAttackCost(attacker)):attacker.atk),hits=c.dragon&&attacker.dragonAwakened?3:1;
 if(kind==='machine')return base*1.4+(victim.card==='kyrene'||victim.card==='castorice'?3:0)-Math.max(0,otherPlans-1)*.3;
 if(kind==='curse')return base*.68+((victim.curse?.progress||0)/100)*5+(victim.card==='kyrene'||victim.card==='castorice'?2:0)-Math.max(0,otherPlans-1)*.3;
 let dmg=Math.min(vhp,actual*hits),score=dmg*.9*p.off;
 if(actual*hits>=vhp){score+=base*1.1+2.2;if(victim.kyreneBlessing)score+=2.8;if(victim.card==='castorice'&&allTargets(game[otherSide(owner)]).some(t=>CARD_DB[t.u.card]?.dragon))score+=4.5;}
 if(attacker.card==='castorice'&&attacker.awakened){for(const n of [tar.index-1,tar.index+1]){const u=game[otherSide(owner)][tar.row]?.[n];if(u&&((hpShadows.get(u.id)??u.hp)>0)){score+=Math.min(u.hp,damageEstimate(u,attacker.atk))*.85;if(damageEstimate(u,attacker.atk)>0)score+=.8;}}}
 if(c.dragon&&attacker.dragonAwakened){score+=Math.min(vhp,actual*2)*.5;for(const n of [tar.index-1,tar.index+1])if(game[otherSide(owner)][tar.row]?.[n])score+=.4;}
 if(victim.awakened)score+=1.7;
 if(CONFIG.difficulty==='expert'){
  const allies=allTargets(game[otherSide(owner)]);
  if(victim.card==='kyrene'&&allies.some(t=>t.u.kyreneBlessing))score+=4;
  if(victim.card==='castorice'&&allies.some(t=>CARD_DB[t.u.card]?.dragon))score+=4;
  if(victim.curse?.progress>=66&&kind==='attack'&&kind!=='curse')score-=1.3;
 }
 // Observed behavior influences borderline actions, not legality or guaranteed wins.
 if(p.psych)score+=p.psych*.7*(victim.card==='kyrene'||victim.card==='castorice'?obs.protect:obs.focus);
 score-=Math.max(0,otherPlans-1)*.35;
 return score+tie(victim.id);
}
function estimatePlanDamage(u,t){if(!t?.u)return 0;const c=CARD_DB[u.card];const raw=c.dragon?Math.max(1,dragonAttackCost(u))*(u.dragonAwakened?3:1):u.atk;
 return damageEstimate(t.u,raw);
}
function targetLabel(t){return t.row==='hero'?'적 본체':`${CARD_DB[t.u.card]?.name||'유닛'} (${t.row==='front'?'전':'후'}${t.index+1})`;}
async function improvedSummon(epoch,owner='enemy'){
 const e=game[owner],enemy=game[otherSide(owner)];let guard=0;
 while(guard++<16&&sessionOk(epoch)&&!game.winner){
  const slots=['front','back'].flatMap(row=>e[row].map((u,index)=>u?null:{row,index}).filter(Boolean));if(!slots.length)break;
  const choices=[];
  for(let i=0;i<e.hand.length;i++){const entry=e.hand[i],base=cardId(entry),c=resolvedHandCard(owner,entry);
   if(!c||c.type!=='unit'||c.cost>e.mana||(c.dragon&&!canSummonDeathDragon(owner)))continue;
   for(const spot of slots){if(!canPlaceUnit(c,spot.row))continue;
    choices.push({entry,base,c,index:i,spot,score:scoreSummon(owner,{id:base,c},spot,allTargets(e))});}}
  if(!choices.length)break;
  choices.sort((a,b)=>b.score-a.score||a.index-b.index||a.spot.index-b.spot.index);
  const best=choices[0];
  // Sacrifice low-value later summons to reserve spell mana when strategically worthwhile.
  if(best.score<1.5&&e.mana<3)break;
  const {spot}=best;
  const u=best.c.dragon?summonDeathDragon(owner,best.entry,spot.row,spot.index):summon(e,best.entry,spot.row,spot.index,owner);
  if(!u)break;removeFromHand(e,best.index);render();summonEffect(owner,spot.row,spot.index);
  trace(owner,'소환',`${best.c.name} → ${spot.row==='front'?'전열':'후열'} ${spot.index+1} (${best.score.toFixed(1)}점)`,choices.slice(1,4).map(x=>`${x.c.name} ${x.score.toFixed(1)}점`));
  await pause(170);if(!sessionOk(epoch))return;
  if(best.c.bind){const legal=legalBindTargets(u,enemy).sort((a,b)=>value(b.u)-value(a.u));if(legal.length){const t=legal[0];await captureFx(otherSide(owner),t.row,t.index,owner,spot.row,spot.index,epoch,'봉인!');if(!sessionOk(epoch))return;if(enemy[t.row][t.index]?.id===t.u.id){u.bound=t.u;enemy[t.row][t.index]=null;log(`AI 봉인의 사제: ${CARD_DB[t.u.card].name} 속박`,'enemy-log');}}}
  render();
 }
}
function improvedPlans(owner='enemy'){
 const own=game[owner],enemy=game[otherSide(owner)],shadow=new Map(allTargets(enemy).map(t=>[t.u.id,t.u.hp]));
 game.plans[owner]=[];const planSources=allTargets(own).filter(t=>canPlanAction(t.u)).sort((a,b)=>(a.row==='front'?a.index:6+a.index)-(b.row==='front'?b.index:6+b.index));
 const reserved=new Set();
 for(const from of planSources){if(reserved.has(from.u.id))continue;
  const kind=planKind(from.u);
  if(kind==='hut'){
   const opts=hutPairOptions(owner,from.u),pairs=[];
   for(const ch of opts.chuchus)for(const mate of opts.mates)if(hutValidPair(ch.u,mate.u)&&!reserved.has(ch.u.id)&&!reserved.has(mate.u.id)){
    const v=(mate.u.hutPrepared?4:0)-hutDuration(ch.u)*1.2+Math.min(ch.u.hp,7)*.1;
    pairs.push({ch,mate,score:v});}
   pairs.sort((a,b)=>b.score-a.score);if(pairs.length){const p=pairs[0];if(markHutPlan(owner,from,p.ch,p.mate)){reserved.add(p.ch.u.id);reserved.add(p.mate.u.id);trace(owner,'작업',`오두막: ${displayUnitName(p.ch.u)} + ${displayUnitName(p.mate.u)}`);}}continue;
  }
  const possible=legalPlanTargets(from.u,enemy).filter(t=>kind!=='attack'||(shadow.get(t.u.id)??t.u.hp)>0);
  if(kind==='attack'&&legalHeroAttack(from.u,enemy))possible.push({row:'hero',index:0,u:null});
  const valid=possible.map(t=>({...t,score:scoreTarget(owner,from,t,shadow,game.plans[owner].filter(p=>p.targetId===t.u?.id).length)})).filter(t=>Number.isFinite(t.score)).sort((a,b)=>b.score-a.score);
  if(!valid.length)continue;
  const best=valid[0];if(markPlan(owner,from,best)){
   if(kind==='attack'){
    if(best.u){const dmg=estimatePlanDamage(from.u,best),hp=shadow.get(best.u.id)??best.u.hp;shadow.set(best.u.id,Math.max(0,hp-dmg));
     if(from.u.card==='castorice'&&from.u.awakened)for(const n of [best.index-1,best.index+1]){const u=enemy[best.row]?.[n];if(u)shadow.set(u.id,Math.max(0,(shadow.get(u.id)??u.hp)-damageEstimate(u,from.u.atk)));}
    }
   }
   trace(owner,kind==='attack'?'공격 예약':kind==='machine'?'구속 예약':'저주 예약',`${displayUnitName(from.u)} → ${targetLabel(best)} (${best.score.toFixed(1)}점)`,valid.slice(1,3).map(t=>`${targetLabel(t)} ${t.score.toFixed(1)}점`));
   playCharacterVoice(from.u.card,voiceEventForUnit(from.u,'select'));
  }
 }
}
function spellCandidates(owner){const own=game[owner],enemy=game[otherSide(owner)],act=[];
 function add(entry,i,c,targetSide,row,index,score,why){if(!Number.isFinite(score))return;act.push({entry,i,c,targetSide,row,index,score,why});}
 for(let i=0;i<own.hand.length;i++){
  const entry=own.hand[i],c=resolvedHandCard(owner,entry);if(!c||c.type!=='spell'||c.cost>spellBudget(own))continue;
  if(c.spell==='kyrene_reunion'&&!kyreneSpellUsable(owner)||c.spell==='castorice_shadow'&&!castoriceSpellUsable(owner))continue;
  const foes=allTargets(enemy),friends=allTargets(own);
  if(c.spell==='heal'){
   for(const t of friends){const missing=(t.u.card==='castorice'&&t.u.awakened?t.u.maxHp*2:t.u.maxHp)-t.u.hp;
    if(missing>0)add(entry,i,c,owner,t.row,t.index,Math.min(3,missing)*1.6+(t.u.card==='castorice'?3:0)+Math.min(4,value(t.u)/3),'회복·각성 지원');}
   if(own.hp<own.maxHp)add(entry,i,c,owner,'hero',0,Math.min(3,own.maxHp-own.hp)*(own.hp<=7?3:1.2),'본체 생존');
  }else if(c.spell==='storm'){
   const score=foes.reduce((s,t)=>s+Math.min(t.u.hp,damageEstimate(t.u,c.amount))*.9+(damageEstimate(t.u,c.amount)>=t.u.hp?value(t.u)*.65:0),0);
   if(score>0)add(entry,i,c,otherSide(owner),'hero',0,score-1,'다수 적 동시 타격');
  }else if(c.spell==='kyrene_reunion'){
   for(const t of friends)if(!t.u.kyreneBlessing){const deficit=countKyreneBlessedAlliesAlive(owner)<4;
    add(entry,i,c,owner,t.row,t.index,4.5+value(t.u)*.28+(deficit?4:0)+(c.awakenedSpell?1:0),'재회 버프·각성 지원');}
   for(const t of foes){let sc=2+Math.min(t.u.hp,1)+(unitShield(t.u)?2:0);if(c.awakenedSpell)sc+=enemy[t.row].filter(Boolean).length*1.3;add(entry,i,c,otherSide(owner),t.row,t.index,sc,'보호막 해제·피해');}
  }else if(c.spell==='capture'||c.spell==='curse50'){
   for(const t of foes){if(c.spell==='capture'&&(t.u.spellBound||immuneToBind(t.u)))continue;
    if(c.spell==='curse50'&&(immuneToSpecialCurse(t.u)||immuneToBasicCurse(t.u)))continue;
    const sc=value(t.u)*(c.spell==='capture'?.7:.48)+(c.spell==='curse50'?(t.u.curse?.progress||0)/18:0);
    add(entry,i,c,otherSide(owner),t.row,t.index,sc,'행동 봉쇄·진영 전환');}
  }else if(['damage','damage_unit','cleave','castorice_shadow'].includes(c.spell)){
   for(const t of foes){const base=damageEstimate(t.u,c.amount),effect=Math.min(t.u.hp,base)+(base>=t.u.hp?value(t.u)*.78:0);
    let score=effect;if(c.spell==='cleave'){for(const n of [t.index-1,t.index+1]){const u=enemy[t.row]?.[n];if(u)score+=Math.min(u.hp,damageEstimate(u,c.splash||1));}}
    if(c.spell==='castorice_shadow'&&c.awakenedSpell)score+=enemy[t.row].filter(Boolean).length*1.4;
    add(entry,i,c,otherSide(owner),t.row,t.index,score,'실제 피해·처치');}
   if(c.spell==='damage'&&enemy.hp<=c.amount)add(entry,i,c,otherSide(owner),'hero',0,1000,'이번 턴 확정 승리');
  }
 }
 return act.sort((a,b)=>b.score-a.score||a.i-b.i);
}
async function improvedSpells(epoch,owner='enemy'){
 const own=game[owner];let guard=0;
 while(guard++<12&&sessionOk(epoch)&&!game.winner){const actions=spellCandidates(owner),best=actions[0];if(!best||best.score<1.8)break;
  const ok=await playSpell(cardId(best.entry),best.targetSide,best.row,best.index,best.c,owner,true);if(!sessionOk(epoch))return;
  if(!ok)break;
  const ix=own.hand.indexOf(best.entry);if(ix>=0)removeFromHand(own,ix);
  trace(owner,'마법',`${best.c.name} → ${best.targetSide===owner?'아군': '적'} ${best.row==='hero'?'본체':best.row==='front'?'전열':'후열'} ${best.index+1} (${best.score.toFixed(1)}점) · ${best.why}`,actions.slice(1,3).map(x=>`${x.c.name} ${x.score.toFixed(1)}점`));
  render();if(checkWin())return;
 }
}
// Record only actions that have been publicly committed. Opposing private zones are never inspected.
const originalResolve=resolvePlans;
resolvePlans=async function(owner,epoch){
 // Only finalized queues count as observations (clicks later canceled are ignored).
 if(owner==='player'||simulating){
  for(const p of game.plans[owner]){
   if(p.kind!=='attack'&&p.kind!=='curse'&&p.kind!=='machine')continue;
   record(owner,p.toRow==='hero'?'hero':'attack');
   if(p.targetId){const u=locateUnit(p.targetId)?.u;if(u?.card==='kyrene'||u?.card==='castorice')record(owner,'focus');}
  }
 }
 return await originalResolve(owner,epoch);
};
const oldSummon=summon;
summon=function(side,entry,row,index,by){const result=oldSummon(side,entry,row,index,by);if(result&&(by==='player'||simulating))record(by,'summon');return result;};
const oldSpell=playSpell;
playSpell=async function(id,targetSide,row,index,cardOverride,owner='player',aiControlled=false){const result=await oldSpell(id,targetSide,row,index,cardOverride,owner,aiControlled);if(result&&(owner==='player'||simulating)){record(owner,'spells');const c=cardOverride||CARD_DB[id];if(c?.spell==='heal')record(owner,'heal');if(c?.spell==='kyrene_reunion'&&targetSide===owner)record(owner,'protect');}return result;};
// Replace old greedy strategy; retain the game engine for all actual effects.
aiSummon=improvedSummon;
aiPickPlans=improvedPlans;
aiSpells=improvedSpells;
// User-visible after-the-turn diagnostics. Hide current opponent deliberations.
const panel=document.createElement('section');panel.className='panel';panel.innerHTML='<h2>🧠 AI 2.0 판단 분석</h2><div style="font-size:12px;color:#b9b6cc;margin-bottom:8px">개발자 진단 · 상대 AI의 선택은 그 턴 종료 후 공개</div><label style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px;margin-bottom:6px">성격 <select id="ai2Style" style="max-width:160px;background:#211b39;color:white;padding:5px;border:1px solid #7569a8;border-radius:6px"><option value="adaptive">적응형</option><option value="balanced">계산형</option><option value="aggressive">공격형</option><option value="defensive">수비형</option><option value="trickster">교란형</option></select> 난이도 <select id="ai2Difficulty" style="max-width:140px;background:#211b39;color:white;padding:5px;border:1px solid #7569a8;border-radius:6px"><option value="hard">어려움</option><option value="expert">전문가</option></select></label><div id="ai2Summary" style="font-size:12px;line-height:1.55;max-height:220px;overflow:auto">이번 게임의 AI 판단 결과를 표시합니다.</div>';
const side=document.querySelector('.side');if(side)side.insertBefore(panel,side.firstChild);
panel.querySelector('#ai2Style').addEventListener('change',e=>CONFIG.personality=e.target.value);
panel.querySelector('#ai2Difficulty').addEventListener('change',e=>CONFIG.difficulty=e.target.value);
function showPanel(){const e=panel.querySelector('#ai2Summary');if(!e||!game)return;
 const m=memory(),h=history('enemy');
 if(game.active==='enemy'&&!simulating){e.textContent='상대 AI가 행동을 판단하는 중입니다. 턴이 끝나면 공개합니다.';return;}
 const t=m.traces.filter(t=>t.owner==='enemy').slice(0,6);
 e.replaceChildren();
 const desc=document.createElement('div');desc.textContent=`관찰: 본체 공격 성향 ${(h.hero*100).toFixed(0)}% · 챔피언 집중 ${(h.focus*100).toFixed(0)}% · 학습 신뢰 ${(h.samples*100).toFixed(0)}%`;
 e.append(desc);
 for(const item of t){const line=document.createElement('div');line.style.borderTop='1px solid #ffffff20';line.style.padding='4px 0';line.textContent=`${item.turn}턴 ${item.phase}: ${item.chosen}`;if(item.alternatives?.length)line.title='다른 후보: '+item.alternatives.join(', ');e.append(line);}
}
const oldRender=render;render=function(){oldRender();showPanel();};
const oldNewGame=newGame;newGame=function(){ownerGame=null;oldNewGame();showPanel();};
window.ArcanaAI2={config:CONFIG,history,scoreTarget,scoreSummon,getDiagnostics:()=>memory().traces,version:'2.0'};
showPanel();
})();
