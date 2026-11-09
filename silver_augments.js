/* Arcana Card Duel Silver Augments v1.2.6 development — 31 player-supplied cards. Only affects 8-player league. */
(function(root){
'use strict';
const DATA=[
 ['fast_streak','빠른 연승 및 연패','연승 및 연패 진행도를 2배로 얻습니다.','fast_streak.webp'],
 ['imperfect','불완전한 초월','게임 1분 30초 후 아군의 공격력이 1.5배 상승합니다.','imperfect.webp'],
 ['healing_orb','회복의 구 1','적을 처치할 시 처치한 유닛의 체력을 2 회복합니다.','healing_orb.webp'],
 ['twins','쌍둥이 수호자','같은 종류의 카드가 있는 유닛은 공격력이 1 오릅니다.','twins.webp'],
 ['glass','유리대포','후열에 있는 유닛들의 체력 30%를 잃지만 공격력이 15% 증가합니다.','glass.webp'],
 ['bomb','폭탄 받아라','게임 시작 시 플레이어 체력을 2 깎습니다.','bomb.webp'],
 ['bond','인연','왼쪽 위 끝칸 카드와 오른쪽 아래 끝칸 카드가 체력을 공유합니다.','bond.webp'],
 ['meet','만나자마자','게임 시작 후 상대가 가장 처음 내는 유닛의 체력을 2 깎습니다.','meet.webp'],
 ['smash','강타','상대의 모든 건물 카드가 필드에 나올 때 해당 건물 카드의 체력을 1 깎습니다. (최소치 1)','smash.webp'],
 ['luck','처음은 행운','게임 시작마다 첫 패에 있는 카드의 가격이 3 낮아집니다.','luck.webp'],
 ['giant','꼬마 거인','글로벌 체력이 20 증가하고 회복합니다.','giant.webp'],
 ['sitout','자리 비움','3턴간 아무것도 하지 못하지만 23골드를 획득합니다.','sitout.webp'],
 ['extra_hand','여분의 손패','처음 시작 시 손패가 6장이 됩니다.','extra_hand.webp'],
 ['root','뿌리 박기','매 리그 전투에서 전열 중앙 3·4번 중 지정된 한 칸의 유닛은 체력 +2, 공격력 +2, 흡혈 효과를 얻습니다.','root.webp'],
 ['short_invest','단기 투자','즉시 15원을 획득합니다. 대신 5턴간 이자를 획득하지 못합니다.','short_invest.webp'],
 ['tears','흐르는 눈물','마나를 총 8 사용할 때마다 추가로 마나 1을 얻습니다.','tears.webp'],
 ['buckle','추가 버클','체력이 9 이상인 유닛들은 추가로 체력이 3 증가합니다.','buckle.webp'],
 ['transform','훈련봇 변환','현재 필드에 올라와 있는 모든 유닛을 흡수하고 흡수한 체력만큼을 보유한 훈련봇을 소환합니다.','transform.webp'],
 ['late','후반 전문가','4-4라운드에 도달하면 44골드를 획득합니다.','late.webp'],
 ['tower','탑','매 전투 공격력 0의 표적 훈련봇을 1장 얻습니다. 스테이지가 높을수록 체력·반사 피해가 강화됩니다.','tower.webp'],
 ['use_every_slot','다 쓸데가 있다니까','게임이 끝났을 때 빈 칸 한 개당 33% 확률로 1골드를 획득합니다.','use_every_slot.webp'],
 ['exploration','탐사','가장 오른쪽 후열칸에 있는 유닛을 잃습니다. 마나 33 만큼의 유닛을 잃으면 큰 보상을 얻습니다.','exploration.webp'],
 ['make_way','길을 내라','근접 유닛 전용 무기 카드를 2장 뽑습니다.','make_way.webp'],
 ['mysterious_die','약간 신비한 주사위','주사위 1~6의 결과에 따라 각각 2/4/7/10/13/17골드를 즉시 얻습니다.','mysterious_die.webp'],
 ['electric_shock_1','전기 충격 1','아군이 한 턴에 4번 공격당할 때마다 적 전체에게 데미지 1을 줍니다.','electric_shock_1.webp'],
 ['spare_bow','예비 활','원거리 유닛 전용 무기 카드를 2장 뽑습니다.','spare_bow.webp'],
 ['refresh_day','새로 고침의 날','현재 패에 있는 카드를 최대 3번 바꿀 수 있습니다.','refresh_day.webp'],
 ['boxing_lessons','권투 교습','전방 1열 카드 2장당 체력이 1 증가합니다.','boxing_lessons.webp'],
 ['predict_result','결과 예측','4연승인 채로 시작합니다.','predict_result.webp'],
 ['kingslayer','국왕 시해자','플레이어 대상 전투 승리 후 1골드를 획득합니다. 상대의 글로벌 체력이 더 높다면 대신 6골드를 획득합니다.','kingslayer.webp'],
 ['united_will','단결된 의지','같은 팩의 다른 종류 카드가 7개 이상 필드에 올라와 있을 시 공격력과 체력이 1 늘어납니다.','united_will.webp']
].map(([id,name,desc,image])=>Object.freeze({id,name,desc,image:'silver_augments/'+image.replace('.webp','_thumb.webp'),original:'silver_augments/'+image,tier:'silver'}));
const DATA_BY_ID=Object.fromEntries(DATA.map(x=>[x.id,x]));
const BOT='silver_training_bot';
// The same artwork and zero-attack classification are used for tower and transformed bots.
// Stage scaling belongs to the Tower augment, not to transformed bots.
const BOT_CARD={id:BOT,name:'아카데미의 표적 훈련봇',type:'unit',cost:0,atk:0,hp:4,icon:'🤖',art:'silver_augments/training_bot_thumb.webp',description:'공격하지 않는 체력형 유닛. 탑으로 획득하면 스테이지별 반사 피해를 얻습니다.',silverBot:true};
const BOT_STAGES=[[4,1],[6,1],[8,2],[12,2],[12,3],[16,3],[20,4]];
function towerStats(stage){const [hp,reflect]=BOT_STAGES[Math.max(0,Math.min(6,(Number(stage)||1)-1))];return {hp,reflect};}
// A stable one-of-two centre choice per league battle (3rd or 4th FRONT column).
function rootColumn(player,stage,round){const id=Number(player?.id||0);const x=(((Number(stage)||1)*2654435761)^((Number(round)||1)*2246822519)^((id+1)*3266489917))>>>0;return 2+((Math.imul(x^(x>>>16),2246822519)>>>0)&1);}
const bondSlots=[{row:'back',index:0},{row:'front',index:5}];
let ctx=null,attacker=null,readyTimer=null,alreadyRefreshing=false,linking=false,shockBusy=false,refreshMode=false;
function has(s,id){return !!s?.augments?.includes(id);}
function get(side){return ctx?.[side]||null;}
function all(s){return !s?[]:['front','back'].flatMap(row=>s[row].map((u,index)=>u?{row,index,u}:null).filter(Boolean));}
function finishTimer(){refreshMode=false;if(readyTimer){clearTimeout(readyTimer);readyTimer=null;}if(root.__silverGame){for(const side of ['player','enemy'])unlinkBond(root.__silverGame[side],true);}ctx=null;attacker=null;}
const MYSTERIOUS_DIE_GOLD=[2,4,7,10,13,17];
function applySelection(p,id){if(!DATA_BY_ID[id]||p.augments?.length)return false;
 p.augments=[id];p.silver={};
 if(id==='giant'){p.maxGlobalHp=(p.maxGlobalHp||100)+20;p.hp+=20;}
 if(id==='sitout'){p.gold+=23;p.silver.skip=3;}
 if(id==='short_invest'){p.gold+=15;p.silver.noInterest=5;}
 if(id==='predict_result')p.streak=4;
 if(id==='refresh_day')p.silver.refreshRemaining=3;
 if(id==='exploration'){p.silver.exploredMana=0;p.silver.explorationReady=false;}
 if(id==='mysterious_die'){
  const result=Math.floor(Math.random()*6)+1;
  const reward=MYSTERIOUS_DIE_GOLD[result-1];
  p.silver.diceRoll=result;p.silver.diceGold=reward;
  p.gold+=reward;
 }
 return true;
}
function beforeIncome(p,baseInterest){if(has(p,'short_invest')&&p.silver?.noInterest>0){p.silver.noInterest--;return 0;}return baseInterest;}
function onStage(p,stage,round){if(stage===4&&round===4&&has(p,'late')&&!p.silver?.latePaid){p.gold+=44;p.silver??={};p.silver.latePaid=true;return 44;}return 0;}
// Draw equipment from the current deck only; never generate a card not present there.
function drawSpecialWeapons(s,flag){
 let drawn=0;
 while(drawn<2&&s.hand.length<9){
  const at=s.deck.findIndex(entry=>{const id=typeof entry==='string'?entry:entry?.card;const c=root.__silverCards?.[id];return c?.type==='item'&&!!c[flag];});
  if(at<0)break;s.hand.push(s.deck.splice(at,1)[0]);drawn++;
 }return drawn;
}
function initForVisual(mapping){finishTimer();ctx={player:mapping.player,enemy:mapping.enemy,stage:mapping.stage||1,round:mapping.round||1};for(const owner of ['player','enemy']){
 const s=root.__silverGame?.[owner],player=get(owner);if(!s||!player)continue;
 s.silverSpent=0;s.silverFirstEnemySummon=false;s.silverRootColumn=rootColumn(player,mapping.stage,mapping.round);
 if(has(player,'bomb'))s.hp=Math.max(0,s.hp-2);
 if(has(player,'extra_hand'))while(s.hand.length<6&&s.deck.length&&s.hand.length<9)s.hand.push(s.deck.pop());
 if(has(player,'luck')&&s.hand.length){const e=s.hand[0];s.hand[0]=typeof e==='string'?{card:e,silverDiscount:3}:{...e,silverDiscount:3};}
 if(has(player,'make_way'))drawSpecialWeapons(s,'meleeOnly');
 if(has(player,'spare_bow'))drawSpecialWeapons(s,'rangedOnly');
 if(has(player,'tower')){const stats=towerStats(mapping.stage||1);s.hand.unshift({card:BOT,silverBotOrigin:'tower',hp:stats.hp,maxHp:stats.hp,originalHp:stats.hp,originalAtk:0});}
 if(has(player,'sitout')&&(player.silver?.skip||0)>0){s.silverSkip=player.silver.skip;player.silver.skip=0;}
 if(has(player,'imperfect'))s.silverTranscend=false;
 }
 if(['player','enemy'].some(x=>has(get(x),'imperfect'))){const myGame=root.__silverGame;readyTimer=setTimeout(()=>{
 if(root.__silverGame!==myGame||myGame.winner)return;
 for(const owner of ['player','enemy'])if(has(get(owner),'imperfect')){root.__silverGame[owner].silverTranscend=true;refresh(owner);}
 if(typeof root.__silverRender==='function')root.__silverRender();
 },90000);}
}
function onSummon(side,row,index,u){if(!ctx||!u)return;const owner=side===root.__silverGame?.player?'player':'enemy';const p=get(owner),op=get(owner==='player'?'enemy':'player');
 if(!p)return;
 if(u.card===BOT){u.atk=0;u.originalAtk=0;if(u.silverBotOrigin==='tower'||(has(p,'tower')&&u.silverBotOrigin!=='transform')){const stats=towerStats(ctx?.stage||1);u.silverBotOrigin='tower';u.silverReflect=stats.reflect;u.hp=u.maxHp=stats.hp;u.originalHp=stats.hp;}else{u.silverBotOrigin='transform';u.silverReflect=0;}}
 if(has(p,'buckle')&&u.maxHp>=9&&!u.silverBuckle){u.silverBuckle=true;u.hp+=3;u.maxHp+=3;}

 if(has(p,'imperfect')&&root.__silverGame[owner].silverTranscend)applyTranscend(u);
 if(has(op,'meet')&&!root.__silverGame[owner].silverFirstEnemySummon){root.__silverGame[owner].silverFirstEnemySummon=true;root.__silverDamageUnit(side,row,index,2);}
 if(has(op,'smash')&&(root.__silverCards[u.card]?.hut||root.__silverCards[u.card]?.building))u.hp=Math.max(1,u.hp-1);
 refresh(owner);
}
function applyGlass(u,active){if(active&&!u.silverGlassLost){u.silverGlassLost=true;const loss=Math.max(1,Math.ceil(u.maxHp*.3));u.maxHp=Math.max(1,u.maxHp-loss);u.hp=Math.max(1,u.hp-loss);}
 if(active&&!u.silverGlassActive){const bonus=u.atk*.15;u.silverGlassBonus=bonus;u.atk+=bonus;u.silverGlassActive=true;}
 if(!active&&u.silverGlassActive){u.atk-=u.silverGlassBonus||0;u.silverGlassBonus=0;u.silverGlassActive=false;}}
function applyRoot(u,active){if(active&&!u.silverRootActive){u.silverRootActive=true;u.hp+=2;u.maxHp+=2;u.atk+=2;u.silverAbsorb=true;}
 if(!active&&u.silverRootActive){u.silverRootActive=false;u.atk-=2;u.maxHp=Math.max(1,u.maxHp-2);u.hp=Math.min(u.hp,u.maxHp);u.silverAbsorb=false;}}
function applyBoxing(u,bonus){
 const old=u.silverBoxing||0;
 if(old===bonus)return;
 const delta=bonus-old;u.silverBoxing=bonus;
 u.maxHp=Math.max(1,u.maxHp+delta);
 u.hp=Math.min(u.maxHp,Math.max(1,u.hp+Math.max(0,delta)));
}
function applyUnitedWill(u,active){
 if(active&&!u.silverUnited){u.silverUnited=true;u.atk+=1;u.hp+=1;u.maxHp+=1;}
 else if(!active&&u.silverUnited){u.silverUnited=false;u.atk-=1;u.maxHp=Math.max(1,u.maxHp-1);u.hp=Math.min(u.hp,u.maxHp);}
}
function applyTranscend(u){if(u.silverTranscend)return;u.silverTranscend=true;u.atk*=1.5;}
// The two designated units have ONE HP pool and ONE maximum-HP pool.
// Each card displays the same pool value. If repositioned, remaining HP is split
// proportionally between their original maximum HP values (temporary split policy).
function unlinkBond(s,keepCurrent=false){const pool=s?.silverBondPool;if(!pool)return;
 for(const e of pool.members){const u=e.u;if(u.silverBond!==pool)continue;u.silverBond=null;const ratio=pool.max>0?Math.max(0,pool.hp)/pool.max:0;u.maxHp=e.ownMax;u.hp=keepCurrent?Math.min(e.ownMax,Math.max(0,Math.round(e.ownMax*ratio))):Math.min(e.ownMax,Math.max(0,Math.ceil(e.ownMax*ratio)));}
 s.silverBondPool=null;
}
function bondAt(s){if(!s)return null;const a=s.back[0],b=s.front[5];return a&&b?[a,b]:null;}
function createBond(s,arr){const members=arr.map(u=>({u,ownMax:u.maxHp}));const max=members.reduce((n,m)=>n+m.ownMax,0),hp=arr.reduce((n,u)=>n+Math.max(0,u.hp),0);const pool={hp,max,members};
 s.silverBondPool=pool;for(const u of arr){u.silverBond=pool;u.hp=hp;u.maxHp=max;}return pool;}
function bondRefresh(s){if(!s)return;const arr=bondAt(s),pool=s.silverBondPool;
 if(pool&&(!arr||arr[0]!==pool.members[0].u||arr[1]!==pool.members[1].u))unlinkBond(s);
 if(!arr)return;
 let p=s.silverBondPool;if(!p){createBond(s,arr);return;}
 let dmax=0,dhp=0;
 for(const m of p.members){const u=m.u;dmax+=u.maxHp-p.max;dhp+=u.hp-p.hp;}
 if(dmax||dhp){p.max=Math.max(1,p.max+dmax);p.hp=Math.min(p.max,Math.max(0,p.hp+dhp));for(const m of p.members){const u=m.u;m.ownMax=Math.max(1,m.ownMax+(u.maxHp-p.max+dmax));}}
 for(const {u} of p.members){u.maxHp=p.max;u.hp=p.hp;}
}
function bondFatal(s,victim){const pool=victim?.silverBond;if(!pool)return;pool.hp=0;for(const m of pool.members){const u=m.u;if(u===victim)continue;const where=all(s).find(t=>t.u===u);if(where){u.hp=0;if(root.__silverForceKill)root.__silverForceKill(s,where.row,where.index);else s[where.row][where.index]=null;}}
 for(const m of pool.members)m.u.silverBond=null;s.silverBondPool=null;
}
function refresh(owner){if(!ctx||alreadyRefreshing)return;const s=root.__silverGame?.[owner],p=get(owner);if(!s||!p)return;alreadyRefreshing=true;
 try{
  bondRefresh(s);const slots=all(s);for(const {row,index,u} of slots){if(has(p,'root'))applyRoot(u,row==='front'&&index===s.silverRootColumn);if(has(p,'glass'))applyGlass(u,row==='back');}if(has(p,'twins')){const counts={};for(const {u} of slots)counts[u.card]=(counts[u.card]||0)+1;
   for(const {u} of slots){const want=counts[u.card]>=2?1:0,had=u.silverTwin||0;if(want!==had){u.atk+=want-had;u.silverTwin=want;}}}
  if(has(p,'boxing_lessons')){
   const count=slots.filter(t=>t.row==='front').length;
   const bonus=Math.floor(count/2);
   for(const {row,u} of slots)applyBoxing(u,row==='front'?bonus:0);
  }
  if(has(p,'united_will')){
   const byPack={};
   for(const {u} of slots){const pack=root.__silverPackFor?.(u.card);if(!pack)continue;(byPack[pack]??=new Set()).add(u.card);}
   for(const {u} of slots){const pack=root.__silverPackFor?.(u.card);applyUnitedWill(u,!!pack&&(byPack[pack]?.size||0)>=7);}
  }
  if(has(p,'imperfect')&&s.silverTranscend)for(const {u} of slots)applyTranscend(u);
 }finally{alreadyRefreshing=false;}
}
function visualManaSpend(owner,spent){const p=get(owner),s=root.__silverGame?.[owner];if(!p||!s||!has(p,'tears')||spent<=0)return;
 s.silverSpent=(s.silverSpent||0)+spent;while(s.silverSpent>=8){s.silverSpent-=8;s.mana+=1;}}
function setAttacker(owner,u){attacker={owner,u};}
function clearAttacker(){attacker=null;}
function afterDamage(side,row,index,unit,dealt,died){if(!ctx||!unit)return;
 const owner=side===root.__silverGame?.player?'player':'enemy';
 if(!shockBusy&&attacker&&attacker.owner!==owner&&has(get(owner),'electric_shock_1')){
  const defending=root.__silverGame?.[owner],turn=root.__silverGame?.turn;
  if(defending){if(defending.silverShockTurn!==turn){defending.silverShockTurn=turn;defending.silverShockHits=0;}
   defending.silverShockHits++;
   if(defending.silverShockHits%4===0){const foe=root.__silverGame?.[attacker.owner];
    if(foe){shockBusy=true;try{for(const t of [...all(foe)])if(foe[t.row][t.index]===t.u)root.__silverDamageUnit(foe,t.row,t.index,1);}finally{shockBusy=false;}}
   }
  }
 }
 if(unit.silverBond){if(died)bondFatal(side,unit);else bondRefresh(side);}
 if(died&&attacker&&attacker.owner!==owner&&has(get(attacker.owner),'healing_orb')&&attacker.u.hp>0)root.__silverHealUnit(attacker.u,2);
 if(dealt>0&&attacker&&attacker.owner!==owner&&attacker.u.silverAbsorb&&!root.__silverCards[attacker.u.card]?.absorb)root.__silverHealUnit(attacker.u,dealt);
 if(dealt>0&&attacker&&attacker.owner!==owner&&unit.card===BOT&&Number(unit.silverReflect)>0&&!linking){
  const a=attacker.u,where=all(root.__silverGame[attacker.owner]).find(t=>t.u===a);
  if(where){linking=true;try{root.__silverDamageUnit(root.__silverGame[attacker.owner],where.row,where.index,Number(unit.silverReflect));}finally{linking=false;}}
 }
 refresh(owner);
}
function afterHeal(u,value){if(!ctx||!u||value<=0)return;
 for(const owner of ['player','enemy']){const s=root.__silverGame?.[owner];if(s?.silverBondPool?.members.some(m=>m.u===u)){bondRefresh(s);return;}}
}
function onBattleEnd(){finishTimer();}
function context(){return ctx;}
function botHand(owner){const s=root.__silverGame?.[owner];if(s?.hand){s.hand.unshift(BOT);}}
function transform(owner){if(!ctx||!has(get(owner),'transform')||get(owner)?.silver?.transformUsed)return false;
 const s=root.__silverGame?.[owner];if(!s||root.__silverGame.active!==owner||root.__silverGame.phase!=='summon')return false;const field=all(s).filter(t=>t.u.card!==BOT),seen=new Set(),hp=field.reduce((n,t)=>{const pool=t.u.silverBond;if(pool){if(seen.has(pool))return n;seen.add(pool);}return n+Math.max(0,t.u.hp);},0),spot=field.length?{row:field[0].row,index:field[0].index}:null;
 if(!spot||hp===0)return false;
 field.forEach(t=>{s[t.row][t.index]=null;});const u={id:root.__silverNextId(),card:BOT,atk:0,hp,maxHp:hp,originalAtk:0,originalHp:hp,ready:false,silverReflect:false};
 s[spot.row][spot.index]=u;unlinkBond(s);u.silverBotOrigin='transform';get(owner).silver??={};get(owner).silver.transformUsed=true;refresh(owner);if(typeof root.__silverRender==='function')root.__silverRender();return true;
}
// Invoked on each owner's combat turn, not every render.
function visualStartOfRound(owner){
 const p=get(owner),s=root.__silverGame?.[owner];if(!s||!p)return;
 if(has(p,'exploration')&&s.back?.[s.back.length-1]){
  const ix=s.back.length-1,u=s.back[ix],cost=Math.max(0,Number(root.__silverCards?.[u.card]?.cost)||0);
  p.silver??={};p.silver.exploredMana=(p.silver.exploredMana||0)+cost;
  if(p.silver.exploredMana>=33)p.silver.explorationReady=true;
  root.__silverForceKill?.(s,'back',ix);
  root.__silverLog?.(`🧭 탐사: 후열 6번 유닛 희생 · 마나 누적 ${p.silver.exploredMana}/33${p.silver.explorationReady?' · 보상 대기':''}`);
 }
 refresh(owner);
 if(typeof root.__silverRender==='function')root.__silverRender();
}
function refreshRemaining(owner){return has(get(owner),'refresh_day')?Math.max(0,get(owner).silver?.refreshRemaining||0):0;}
function refreshModeActive(owner){return !!refreshMode&&owner==='player'&&refreshRemaining(owner)>0;}
function toggleRefreshMode(owner){
 if(owner!=='player'||!ctx||!refreshRemaining(owner))return false;
 const s=root.__silverGame?.[owner];if(!s||!s.deck?.length||root.__silverGame.active!==owner||root.__silverGame.phase!=='summon')return false;
 refreshMode=!refreshMode;
 if(root.__silverRender)root.__silverRender();return refreshMode;
}
function refreshSelectedHand(owner,index){
 if(!refreshModeActive(owner))return false;
 const g=root.__silverGame,s=g?.[owner],p=get(owner);
 if(g.active!==owner||g.phase!=='summon'||!s||!Number.isInteger(index)||index<0||index>=s.hand.length||!s.deck.length)return false;
 const old=s.hand[index],replacement=s.deck.pop();s.hand[index]=replacement;s.deck.unshift(old);
 p.silver.refreshRemaining=Math.max(0,p.silver.refreshRemaining-1);
 g.selected=null;
 root.__silverLog?.(`🔄 손패 1장 교체 · 남은 사용 ${p.silver.refreshRemaining}회`);
 if(!p.silver.refreshRemaining)refreshMode=false;
 const button=document.getElementById?.('silverRefreshBtn');
 if(button){button.textContent=`🔄 ${refreshMode?'교체할 손패 선택':'손패 새로 고침'} (${p.silver.refreshRemaining}/3)`;if(p.silver.refreshRemaining===0)button.disabled=true;}
 if(root.__silverRender)root.__silverRender();
 return true;
}
function visualSkipTurn(owner){const side=root.__silverGame?.[owner];if(!side?.silverSkip)return false;side.silverSkip--;return true;}
function getVisualPlayer(owner){return get(owner);}
function htmlCard(x){return `<button type="button" class="silver-choice" data-silver-pick="${x.id}" title="${x.name}: ${x.desc}"><img loading="lazy" decoding="async" src="${x.image}" alt="${x.name}"><strong>${x.name}</strong><span class="silver-effect">${x.desc}</span></button>`;}
function choiceMarkup(){return `<div class="lg-card silver-screen"><h2>⬜ 실버 증강 선택 · ${DATA.length}종 테스트</h2><p class="lg-muted">이번 리그에서 사용할 실버 증강을 1개 선택하세요. 제시 카드 ${DATA.length}종 중 원하는 증강을 시험할 수 있습니다. AI 7명도 각자 1개씩 선택합니다.</p><div class="silver-grid">${DATA.map(htmlCard).join('')}</div><p class="lg-muted">증강은 1-3 라운드 전투 시작 직전에 선택합니다. 골드/프리즘 증강은 아직 없습니다.</p></div>`;}
const css=document.createElement('style');css.textContent=`.silver-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(136px,1fr));gap:13px}.silver-choice{border:1px solid #b9c2e5;border-radius:12px;background:linear-gradient(160deg,#333951,#161c2a);color:#f2f2fa;padding:7px;display:flex;flex-direction:column;gap:6px;text-align:center;cursor:pointer;transition:transform .15s,border-color .15s}.silver-choice:disabled{opacity:.5;cursor:not-allowed;filter:grayscale(1)}.silver-choice:hover:not(:disabled){transform:translateY(-5px);border-color:#fff;box-shadow:0 4px 17px #c2caf044}.silver-choice img{width:100%;aspect-ratio:2/3;object-fit:contain;border-radius:7px}.silver-choice strong{font-size:12px}.silver-effect{font-size:10px;color:#d2d9ec;line-height:1.35}.silver-active{border:1px solid #ced6ee;background:#2b344f;border-radius:10px;padding:8px 12px;margin:8px 0}.silver-active img{width:43px;height:66px;object-fit:contain;vertical-align:middle;margin-right:9px}.silver-transform-action{border:1px solid #d5c4ff;border-radius:8px;background:#514078;padding:5px 11px;color:white;cursor:pointer}`;document.head.appendChild(css);
root.ArcanaSilver={DATA,BY_ID:DATA_BY_ID,BOT,BOT_CARD,towerStats,rootColumn,has,applySelection,beforeIncome,onStage,initForVisual,visualManaSpend,onSummon,refresh,setAttacker,clearAttacker,afterDamage,afterHeal,onBattleEnd,context,transform,bondRefresh,visualStartOfRound,visualSkipTurn,getVisualPlayer,choiceMarkup,refreshRemaining,refreshModeActive,toggleRefreshMode,refreshSelectedHand};
})(window);
