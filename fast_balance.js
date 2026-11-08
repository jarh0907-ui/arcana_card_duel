/* Arcana v0.9.8 — numeric-only AI duel simulator. No image, sound, animation or game-DOM updates in the engine. */
(function(root){
'use strict';
function simulateOne(cards, deckA, deckB, firstA, seed, cap=45, options={}){
  let nextId=1, round=1;
  let state=seed>>>0;
  function rnd(){state=(state+0x6D2B79F5)|0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}
  function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  const card=(id)=>cards[id];
  function towerStats(stage){return [[4,1],[6,1],[8,2],[12,2],[12,3],[16,3],[20,4]][Math.max(0,Math.min(6,(Number(stage)||1)-1))];}
  const trace=options.record?[]:null;
  let traceEvent='';
  function snapshot(stage,actor=''){
    if(!trace)return;
    const summarize=(s)=>({hp:s.hp,mana:s.mana,bonusMana:s.bonusMana,hand:s.hand.map(e=>typeof e==='string'?e:e.card),
      front:s.front.map(u=>u?{card:u.card,atk:u.atk,hp:u.hp,maxHp:u.maxHp,awakened:!!u.awakened,tribal:!!u.tribal,puppet:!!u.puppet,bound:!!u.bound}:null),
      back:s.back.map(u=>u?{card:u.card,atk:u.atk,hp:u.hp,maxHp:u.maxHp,awakened:!!u.awakened,tribal:!!u.tribal,puppet:!!u.puppet,bound:!!u.bound}:null)});
    trace.push({turn:round,stage,actor,A:summarize(sA),B:summarize(sB),event:traceEvent});traceEvent='';
  }
  function note(s,msg){if(trace)traceEvent+=(traceEvent?' · ':'')+s.label+': '+msg;}

  const stats={};
  function metric(id){return stats[id]||(stats[id]={played:0,damage:0,taken:0,heroDamage:0,kills:0,binds:0,captures:0,conversions:0,heals:0,gear:0,gearPower:0,prevented:0,misses:0,casts:0});}
  const priority=['mk1','shaman','chuchu_hut','castorice','kyrene','chuchu_geochief','stone_shield_brute','chuchu_fighter','wooden_shield_hilichurl','chuchu_archer','chuchu_brawler','young_chuchu_cyr','club','crossbow','woodshield','stoneshield','curse_staff','fire_arrow','axe_swing','recruit','binder','shade','piercer','leech','binding','fireball','heal','storm'];
  function newSide(counts,label){
    const deck=shuffle(Object.entries(counts).flatMap(([id,n])=>Array(n).fill(id)));
    const s={label,deck,hand:[],front:Array(6).fill(null),back:Array(6).fill(null),hp:20,maxHp:20,mana:3,maxMana:3,bonusMana:0,fatigue:0,upgrades:options[label==='A'?'upgradesA':'upgradesB']||{},buffs:options[label==='A'?'buffsA':'buffsB']||{},augments:options[label==='A'?'augmentsA':'augmentsB']||[],silverSkip:options[label==='A'?'silverA':'silverB']?.skip||0,silverSpent:0,silverFirstSummon:false,silverTransformUsed:false,silverRootColumn:options[label==='A'?'rootColumnA':'rootColumnB']??(2+(seed%2)),championProgress:{castorice:{healed:0,dragonDamage:0,awakened:false}}};
    for(const id of priority){if(s.hand.length>=4)break;const at=s.deck.indexOf(id);if(at>=0)s.hand.push(s.deck.splice(at,1)[0]);}
    const total=Object.values(counts).reduce((a,b)=>a+b,0);
    while(s.hand.length<Math.min(4,total)&&s.deck.length)s.hand.push(s.deck.pop());
    if(s.augments.includes('extra_hand'))while(s.hand.length<6&&s.deck.length)s.hand.push(s.deck.pop());
    if(s.augments.includes('luck')&&s.hand.length){const e=s.hand[0];s.hand[0]=typeof e==='string'?{card:e,silverDiscount:3}:{...e,silverDiscount:3};}
    if(s.augments.includes('tower')){const [hp]=towerStats(options.leagueStage);s.hand.unshift({card:'silver_training_bot',silverBotOrigin:'tower',hp,maxHp:hp});}
    if(s.augments.includes('bomb'))s.hp=Math.max(0,s.hp-2);
    return s;
  }
  const sA=newSide(deckA,'A'),sB=newSide(deckB,'B');
  sA.aiMode=options.aiA==='classic'?'classic':'adaptive';sB.aiMode=options.aiB==='classic'?'classic':'adaptive';
  const sides=firstA?[sA,sB]:[sB,sA];
  function other(s){return s===sA?sB:sA;}
  const hasAug=(s,id)=>s.augments?.includes(id);
  let linking=false;
  // Exactly one HP pool shared by the back-left and front-right units.
  function bondPair(s){const a=s.back[0],b=s.front[5];return a&&b?[a,b]:null;}
  function unlinkBond(s){const p=s?.silverBondPool;if(!p)return;const ratio=Math.max(0,p.hp)/(p.max||1);for(const m of p.members){m.u.silverBond=null;m.u.maxHp=m.ownMax;m.u.hp=Math.min(m.ownMax,Math.max(0,Math.ceil(m.ownMax*ratio)));}s.silverBondPool=null;}
  function bondRefresh(s){if(!hasAug(s,'bond'))return;const arr=bondPair(s),p=s.silverBondPool;
   if(p&&(!arr||arr[0]!==p.members[0].u||arr[1]!==p.members[1].u))unlinkBond(s);
   if(!arr)return;
   let pool=s.silverBondPool;
   if(!pool){const max=arr[0].maxHp+arr[1].maxHp,hp=arr[0].hp+arr[1].hp;pool={max,hp,members:arr.map(u=>({u,ownMax:u.maxHp}))};s.silverBondPool=pool;for(const u of arr){u.silverBond=pool;u.maxHp=max;u.hp=hp;}return;}
   const oldmax=pool.max;let dmax=0,dhp=0;for(const m of pool.members){dmax+=m.u.maxHp-oldmax;dhp+=m.u.hp-pool.hp;m.ownMax+=m.u.maxHp-oldmax;}
   pool.max=Math.max(1,pool.max+dmax);pool.hp=Math.max(0,Math.min(pool.max,pool.hp+dhp));
   for(const {u} of pool.members){u.hp=pool.hp;u.maxHp=pool.max;}
   if(pool.hp<=0){const targets=pool.members.map(m=>all(s).find(t=>t.u===m.u)).filter(Boolean);s.silverBondPool=null;for(const t of targets){t.u.silverBond=null;destroy(s,t.row,t.index);}}
  }
  function bondDead(s,u){const pool=u?.silverBond;if(!pool)return;const targets=pool.members.map(m=>all(s).find(t=>t.u===m.u)).filter(Boolean);s.silverBondPool=null;pool.hp=0;for(const t of targets){t.u.silverBond=null;destroy(s,t.row,t.index);}}

  function silverMana(s,n){if(n<=0||!hasAug(s,'tears'))return;s.silverSpent+=n;while(s.silverSpent>=8){s.silverSpent-=8;s.mana++;note(s,'흐르는 눈물: 추가 마나 +1');}}
  function silverRefresh(s){if(!s)return;bondRefresh(s);
   for(const {row,index,u} of all(s)){
    if(hasAug(s,'root')){const on=row==='front'&&index===s.silverRootColumn;if(on&&!u.silverRootActive){u.silverRootActive=true;u.atk+=2;u.hp+=2;u.maxHp+=2;u.silverAbsorb=true;}else if(!on&&u.silverRootActive){u.silverRootActive=false;u.atk-=2;u.maxHp=Math.max(1,u.maxHp-2);u.hp=Math.min(u.hp,u.maxHp);u.silverAbsorb=false;}}
    if(hasAug(s,'glass')){const on=row==='back';if(on&&!u.silverGlassLost){u.silverGlassLost=true;const loss=Math.max(1,Math.ceil(u.maxHp*.3));u.maxHp=Math.max(1,u.maxHp-loss);u.hp=Math.max(1,u.hp-loss);}if(on&&!u.silverGlassActive){u.silverGlassBonus=u.atk*.15;u.atk+=u.silverGlassBonus;u.silverGlassActive=true;}else if(!on&&u.silverGlassActive){u.atk-=u.silverGlassBonus||0;u.silverGlassActive=false;u.silverGlassBonus=0;}}
   }
   if(hasAug(s,'twins')){const counts={};for(const u of units(s))counts[u.card]=(counts[u.card]||0)+1;for(const u of units(s)){const bonus=counts[u.card]>=2?1:0;if((u.silverTwin||0)!==bonus){u.atk+=bonus-(u.silverTwin||0);u.silverTwin=bonus;}}}
   bondRefresh(s);
   if(hasAug(s,'imperfect')&&round>=13&&!s.silverTranscend){s.silverTranscend=true;for(const u of units(s))if(!u.silverTranscend){u.atk*=1.5;u.silverTranscend=true;}note(s,'불완전한 초월: 공격력 ×1.5');}
  }
  function silverSummon(s,u,row,index){if(!u)return;
   if(hasAug(s,'buckle')&&u.maxHp>=9){u.maxHp+=3;u.hp+=3;}
   if(s.silverTranscend&&hasAug(s,'imperfect')){u.atk*=1.5;u.silverTranscend=true;}
   if(hasAug(other(s),'meet')&&!s.silverFirstSummon){s.silverFirstSummon=true;damage(s,row,index,2);note(s,'만나자마자: 첫 유닛 -2 HP');}
   if(hasAug(other(s),'smash')&&(card(u.card)?.hut||card(u.card)?.building))u.hp=Math.max(1,u.hp-1);
   if(u.card==='silver_training_bot'){u.atk=0;if(u.silverBotOrigin==='tower'||hasAug(s,'tower')&&u.silverBotOrigin!=='transform'){const [hp,reflect]=towerStats(options.leagueStage);u.silverBotOrigin='tower';u.silverReflect=reflect;u.maxHp=u.hp=hp;}else{u.silverBotOrigin='transform';u.silverReflect=0;}}
   silverRefresh(s);
  }
  function silverTryTransform(s){if(!hasAug(s,'transform')||s.silverTransformUsed)return;const fields=all(s);if(fields.length<2)return;
   const counted=new Set(),hp=fields.reduce((n,t)=>{const pool=t.u.silverBond;if(pool){if(counted.has(pool))return n;counted.add(pool);}return n+Math.max(0,t.u.hp);},0),first=fields[0];for(const t of fields)s[t.row][t.index]=null;
   s.silverBondPool=null;const bot={id:nextId++,card:'silver_training_bot',silverBotOrigin:'transform',atk:0,hp,maxHp:hp,ready:true,silverReflect:0};s[first.row][first.index]=bot;s.silverTransformUsed=true;note(s,'훈련봇 변환: 합산 현재 HP '+hp);}
  function silverAfterKill(victim,sourceSide,sourceUnit){if(sourceSide&&sourceUnit&&sourceUnit.hp>0&&hasAug(sourceSide,'healing_orb'))heal(sourceUnit,2);}

  function all(s){const o=[];for(const row of ['front','back'])for(let index=0;index<s[row].length;index++)if(s[row][index])o.push({row,index,u:s[row][index]});return o;}
  function units(s){return all(s).map(t=>t.u);}
  function canPlaceUnit(c,row){if(!c||(c.token&&!c.dragon))return false;if(c.rearOnly)return row==='back';return row==='front'||!!c.ranged;}
  function open(s,id=null,preferBack=false){const rows=preferBack?['back','front']:['front','back'];for(const row of rows){if(id&&!canPlaceUnit(card(id),row))continue;for(let index=0;index<s[row].length;index++)if(!s[row][index])return{row,index};}return null;}
  function locate(id){for(const s of [sA,sB])for(const t of all(s))if(t.u.id===id)return{s,...t};return null;}
  function casterOf(s){return all(s).find(t=>t.u.card==='castorice'&&t.u.hp>0&&!t.u.puppet&&!t.u.tribal)?.u||null;}
  function hasDeathDragon(s){return all(s).some(t=>t.u.hp>0&&!!card(t.u.card)?.dragon);}

  function transformDragon(d,caster){if(d.dragonAwakened)return;d.dragonAwakened=true;d.hp=d.maxHp=Math.max(1,Math.floor(caster.hp*1.5));d.originalHp=d.maxHp;d.dragonAttacks=0;d.atk=Math.floor(d.maxHp/3);}
  function checkCastoriceAwakening(s){const rec=s.championProgress.castorice;if(rec.healed<5&&rec.dragonDamage<12&&!rec.awakened)return;const caster=casterOf(s);if(!caster||caster.awakened)return;const preAwakenHeal=Math.min(3,Math.max(0,caster.maxHp-caster.hp));caster.hp+=preAwakenHeal;caster.awakened=true;caster.curse=null;caster.spellBound=false;caster.bindTurns=0;caster.atk+=1;caster.maxHp+=2;rec.awakened=true;rec.healed=0;rec.dragonDamage=0;for(const d of units(s))if(card(d.card).dragon&&d.casterId===caster.id)transformDragon(d,caster);}
  function castHeal(s,u,amount){if(!u||u.card!=='castorice'||u.awakened||amount<=0)return;s.championProgress.castorice.healed+=amount;checkCastoriceAwakening(s);}
  function castDragonDamage(s,amount){s.championProgress.castorice.dragonDamage+=amount;checkCastoriceAwakening(s);}
  function purgeDragon(s,casterId){for(const t of all(s))if(card(t.u.card).dragon&&t.u.casterId===casterId)s[t.row][t.index]=null;}
  function summonDragon(s,entry,row,index){const caster=casterOf(s);if(!caster||hasDeathDragon(s)||s[row][index])return null;const aw=!!caster.awakened,id=aw?'castorice_spell_awakened':'castorice_spell_normal',hp=Math.max(1,Math.floor(caster.hp*(aw?1.5:1)));const u={id:nextId++,card:id,sourceCard:id,casterId:caster.id,dragonAwakened:aw,dragonAttacks:0,atk:Math.floor(hp/3),hp,originalHp:hp,maxHp:hp,ready:true};s[row][index]=u;const spent=Math.max(0,4-(entry&&typeof entry==='object'?entry.silverDiscount||0:0));s.mana-=spent;silverMana(s,spent);silverSummon(s,u,row,index);metric(id).played++;note(s,'죽음의 용 소환');return u;}

  function isStealth(u){return !!card(u.card).stealth;}
  function isChuchu(u){const c=card(u.card);return !!c?.chuchu&&!c.hut&&!c.token&&!c.child&&u.card!=='young_chuchu_cyr'&&!u.spellBound;}
  function immuneToTribalCurse(u){const c=u&&card(u.card);return !!c&&c.name.includes('츄츄')&&!u.tribal&&!u.tribalStage2;}
  function immuneToDebuff(u){return !!u&&!!card(u.card)?.dragon;}
  function immuneToBasicCurse(u){return !!u&&(immuneToDebuff(u)||immuneToTribalCurse(u)||!!card(u.card)?.chuchu||!!u.tribal||!!u.tribalStage2);}
  function isTribalKyrene(u){return !!u&&u.tribal&&!u.tribalStage2&&!u.spellBound&&!card(u.card).token&&!card(u.card).hut;}
  function canTarget(a,b){return !!b&&(!isStealth(b)||isStealth(a));}
  function attacksAgainst(u,targetSide){const origin=locate(u.id);if(!origin||u.tribalStage2)return[];if(origin.row==='back'&&!card(u.card).ranged)return[];const arr=all(targetSide).filter(t=>t.index===origin.index&&canTarget(u,t.u));const front=arr.filter(t=>t.row==='front');if(origin.row==='back')return front;if(card(u.card).ranged)return arr;return front.length?front:arr.filter(t=>t.row==='back');}
  function freeBind(u,targetSide){const origin=locate(u.id);if(!origin)return[];const arr=all(targetSide).filter(t=>!t.u.bound&&!t.u.awakened&&!immuneToDebuff(t.u)&&canTarget(u,t.u));if(origin.row==='back')return card(u.card).ranged?arr.filter(t=>t.row==='front'):[];return card(u.card).ranged?arr:(arr.some(t=>t.row==='front')?arr.filter(t=>t.row==='front'):arr);}
  function tribalTargets(targetSide){return all(targetSide).filter(t=>!t.u.bound&&canTarget({card:'shaman'},t.u));}
  function legalHeroAttack(u,targetSide){const o=locate(u.id);return !!o&&o.row==='front'&&!targetSide.front[o.index]&&!targetSide.back[o.index];}
  function restore(host){if(!host?.bound)return;const victim=host.bound,origin=host.boundOrigin;
    host.bound=null;host.boundOrigin=null;const home=origin?.side||sA;
    const spot=(origin&&(origin.row==='front'||card(victim.card).ranged||card(victim.card).rearOnly)&&home[origin.row][origin.index]===null)?origin:open(home,victim.card,origin?.row==='back');
    if(spot){home[spot.row][spot.index]=victim;victim.ready=false;}
    else if(home.hand.length<9)home.hand.push({...victim});else home.deck.push({...victim});
  }
  function destroy(s,row,index){const u=s[row][index];if(!u)return;if(u.card==='castorice')purgeDragon(s,u.id);if(u.bound&&card(u.card).machine)restore(u);if(card(u.card).hut&&u.hutTask){const t=u.hutTask;u.hutTask=null;placeReturned(s,t.chuchu,false);placeReturned(s,t.kyrene,true);}s[row][index]=null;}
  function shieldAmount(u){return (card(u.card).shield||0)+((u.equipment||[]).includes('stoneshield')&&!card(u.card).shield?1:0);}
  function effectiveDamage(u,value){return Math.max(0,Math.max(0,value)-shieldAmount(u));}
  function creditDefense(u,raw,dealt){
    const shieldItem=(u.equipment||[]).includes('stoneshield')&&!card(u.card).shield;
    if(shieldItem){const prevented=Math.min(1,Math.max(0,raw));metric('stoneshield').prevented+=prevented;}
    let remain=dealt;
    for(const id of u.equipment||[]){const bonus=u.itemHpLeft?.[id]||0;if(!bonus)continue;const used=Math.min(remain,bonus);u.itemHpLeft[id]-=used;metric(id).taken+=used;remain-=used;}
    return remain;
  }
  function creditAttack(attacker,target){
    const equips=(attacker.equipment||[]).filter(id=>card(id).bonusAtk>0);let previous=Math.min(target.prevHp,effectiveDamage(target.ref,card(attacker.card).atk));let cumul=card(attacker.card).atk,credited=0,killer=null;
    for(const id of equips){cumul+=card(id).bonusAtk||0;const now=Math.min(target.prevHp,effectiveDamage(target.ref,cumul));const extra=Math.max(0,now-previous);if(extra){metric(id).damage+=extra;credited+=extra;if(target.wasKilled&&previous<target.prevHp&&now>=target.prevHp)killer=id;}previous=now;}
    if(target.wasKilled&&killer){metric(killer).kills++;return {credited,creditedKill:true};}
    return {credited,creditedKill:false};
  }
  function damage(s,row,index,value,sourceId){
    const u=s[row][index];if(!u)return 0;const actual=effectiveDamage(u,value),dealt=Math.min(Math.max(0,u.hp),actual);
    u.hp-=actual;metric(u.card).taken+=creditDefense(u,value,dealt);
    if(sourceId){metric(sourceId).damage+=dealt;if(u.hp<=0)metric(sourceId).kills++;}
    if(u.silverBond){if(u.hp<=0)bondDead(s,u);else bondRefresh(s);}else if(u.hp<=0)destroy(s,row,index);
    if(sourceId&&typeof sourceId==='string'&&other(s).silverActor&&other(s).silverActor.hp>0){
      const src=other(s).silverActor;if(dealt>0&&src.silverAbsorb&&!card(src.card).absorb)heal(src,dealt);
      if(u.hp<=0)silverAfterKill(u,other(s),src);
      if(dealt>0&&Number(u.silverReflect)>0&&!linking){const spot=locate(src.id);if(spot){linking=true;try{damage(spot.s,spot.row,spot.index,Number(u.silverReflect),null);}finally{linking=false;}}}
    }
    silverRefresh(s);return dealt;
  }
  function heal(u,amount){const s=locate(u.id)?.s,cap=u.card==='castorice'&&u.awakened?u.maxHp*2:u.maxHp;
    const n=Math.max(0,Math.min(Math.max(0,amount),cap-u.hp));u.hp+=n;
    if(s&&u.silverBond)bondRefresh(s);
    if(s)castHeal(s,u,n);return n;
  }
  function draw(s){if(s.deck.length){const id=s.deck.pop();if(s.hand.length<9)s.hand.push(id);}else{s.fatigue++;s.hp-=s.fatigue;}}
  function drawTurnCards(s){draw(s);draw(s);}
  function summon(s,entry,row,index){const id=typeof entry==='string'?entry:entry.card;const c=card(id);const restore=typeof entry==='string'?{}:entry;if(!canPlaceUnit(c,row))return null;const bonus=s.upgrades?.[id]||{},buff=s.buffs||{};const extraAtk=(bonus.atk||0)+(buff.atk||0),extraHp=(bonus.hp||0)+(buff.hp||0);const u={...restore,id:nextId++,card:id,atk:(restore.atk??c.atk)+extraAtk,hp:(restore.hp??c.hp)+extraHp,maxHp:(restore.maxHp??c.hp)+extraHp,ready:true,bound:null,itemHpLeft:{...(restore.itemHpLeft||{})}};if(id==='castorice'&&s.championProgress.castorice.awakened){u.awakened=true;u.atk++;u.hp+=2;u.maxHp+=2;}if(c.machine){u.machineState='preparing';u.machineTurn=1;u.restTurnsRemaining=0;u.ready=false;}s[row][index]=u;const realCost=Math.max(0,c.cost-(restore.silverDiscount||0));s.mana-=realCost;silverMana(s,realCost);silverSummon(s,u,row,index);metric(id).played++;note(s,`${c.name} 소환 ${row==='front'?'전':'후'}열 ${index+1}`);return u;}
  function canEquip(u,id){const c=card(id);return !!u&&!card(u.card).silverBot&&!card(u.card).dragon&&(!c.rangedOnly||!!card(u.card).ranged)&&(!c.meleeOnly||!card(u.card).ranged)&&!(u.equipment||[]).includes(id)&&(u.equipment||[]).length<2;}
  function equip(s,u,id,discount=0){const c=card(id),bonusHp=id==='stoneshield'&&shieldAmount(u)>0?2:(c.bonusHp||0);u.equipment??=[];u.itemHpLeft??={};u.equipment.push(id);u.atk+=c.bonusAtk||0;u.hp+=bonusHp;u.maxHp+=bonusHp;u.itemHpLeft[id]=bonusHp;const spent=Math.max(0,c.cost-discount);s.mana-=spent;silverMana(s,spent);metric(id).gear++;metric(id).played++;}
  function doSummon(s){let guard=0;while(guard++<17){const possible=s.hand.map((entry,index)=>{const id=typeof entry==='string'?entry:entry.card;const proxy=id==='castorice'&&!!casterOf(s);return{entry,index,id:proxy?(casterOf(s).awakened?'castorice_spell_awakened':'castorice_spell_normal'):id,c:{...card(proxy?(casterOf(s).awakened?'castorice_spell_awakened':'castorice_spell_normal'):id),cost:Math.max(0,(card(proxy?(casterOf(s).awakened?'castorice_spell_awakened':'castorice_spell_normal'):id)?.cost||0)-(entry&&typeof entry==='object'?entry.silverDiscount||0:0))}}}).filter(x=>x.c?.type==='unit'&&(!x.c.token||x.c.dragon)&&x.c.cost<=s.mana&&(!x.c.dragon||!hasDeathDragon(s)));if(!possible.length)break;const present=units(s).map(u=>u.card);possible.sort((a,b)=>{const score=x=>s.aiMode==='classic'?(x.id==='mk1'&&!present.includes('mk1')?25:0)+(x.id==='shaman'&&!present.includes('shaman')?24:0)+(x.id==='chuchu_hut'&&!present.includes('chuchu_hut')?23:0)+x.c.cost:ai2SummonValue(s,x);return score(b)-score(a);});const pick=possible.find(x=>open(s,x.id,!!x.c.rearOnly));if(!pick)break;const pref=pick.c.rearOnly?'back':pick.c.ranged?'back':'front';const spot=open(s,pick.id,pref==='back');if(!spot)break;const u=pick.c.dragon?summonDragon(s,pick.entry,spot.row,spot.index):summon(s,pick.entry,spot.row,spot.index);if(!u)break;s.hand.splice(pick.index,1);if(pick.c.bind){const legal=freeBind(u,other(s)).sort((a,b)=>b.u.atk-a.u.atk);if(legal.length){const t=legal[0];u.bound=t.u;other(s)[t.row][t.index]=null;metric(pick.id).captures++;}}}
  }
  function doEquip(s){for(let guard=0;guard<9;guard++){const items=s.hand.map((entry,index)=>({id:typeof entry==='string'?entry:entry.card,index,discount:entry&&typeof entry==='object'?entry.silverDiscount||0:0})).filter(x=>card(x.id)?.type==='item'&&Math.max(0,card(x.id).cost-x.discount)<=s.mana);let done=false;for(const item of items){const c=card(item.id),eligible=all(s).filter(t=>canEquip(t.u,item.id));eligible.sort((a,b)=>c.bonusHp?b.u.maxHp-a.u.maxHp:b.u.atk-a.u.atk);const t=eligible[0];if(!t)continue;equip(s,t.u,item.id,item.discount);s.hand.splice(item.index,1);done=true;break;}if(!done)break;}}
  function hutTurns(chuchu){const c=card(chuchu.card);const tier=c.tier||'normal';const cost=Math.max(0,c.cost||0);const denom=tier==='champion'?1:tier==='elite'?2:3;return Math.max(1,Math.floor(cost/denom));}
  function pickHutPair(s,hut){const chuchus=all(s).filter(t=>t.u.id!==hut.id&&isChuchu(t.u));const kyrenes=all(s).filter(t=>t.u.id!==hut.id&&isTribalKyrene(t.u)&&round>(t.u.hutCooldownUntil||0));if(!chuchus.length||!kyrenes.length)return null;chuchus.sort((a,b)=>((card(b.u.card).tier==='champion')-(card(a.u.card).tier==='champion'))||((card(b.u.card).tier==='elite')-(card(a.u.card).tier==='elite'))||b.u.atk-a.u.atk||b.u.hp-a.u.hp);kyrenes.sort((a,b)=>Number(!!b.u.hutPrepared)-Number(!!a.u.hutPrepared)||b.u.hp-a.u.hp);for(const ky of kyrenes)for(const ch of chuchus){if(!ky.u.tribalStage2)return {chuchu:ch,kyrene:ky};}return null;}
  function canPlan(s,u){if(!u||u.spellBound||u.tribalStage2||card(u.card)?.silverBot)return false;const c=card(u.card);if(c.dragon)return !!u.ready&&u.hp>0&&!!locate(u.casterId)&&casterOf(locate(u.casterId).s)?.id===u.casterId; if(c.machine)return !u.bound&&u.machineState==='capture-ready'&&u.ready;if(c.hut)return !!u.ready&&!u.hutTask&&!!pickHutPair(s,u);if(c.shaman)return !!u.ready;return !!u.ready&&!['working','resting','preparing','puppet-ready'].includes(u.machineState);}
  function ai2UnitValue(u){const c=card(u.card);return 1.5+(c.cost||0)*.45+(u.atk||0)*.35+(u.hp||0)*.19+(u.awakened?5:0)+(['castorice','kyrene'].includes(u.card)?4.7:0)+(u.kyreneBlessing?2:0)+(c.machine||c.shaman?2.5:0);}
  function ai2SummonValue(s,pick){const c=pick.c,allies=all(s),foes=all(other(s));let v=(c.atk||0)*1.35+(c.hp||0)*.44+(c.cost||0)*.13;
   if(pick.id==='castorice'||pick.id==='kyrene')v+=5;if(c.dragon)v+=3;
   if(c.machine)v+=foes.length?3:0;if(c.shaman)v+=foes.some(t=>!immuneToBasicCurse(t.u)&&!t.u.awakened&&!immuneToDebuff(t.u))?3:-4;
   if(c.hut)v+=allies.some(t=>t.u.tribal)&&allies.some(t=>card(t.u.card).chuchu)?3:-2;
   if(c.ranged)v+=allies.some(t=>t.row==='front')?1:0;
   return v;
  }
  function ai2Plan(s){const enemy=other(s),plans=[],shadow=new Map(all(enemy).map(t=>[t.u.id,t.u.hp]));
   for(const from of all(s)){
    if(!canPlan(s,from.u))continue;
    const u=from.u,c=card(u.card),kind=c.machine?'machine':c.hut?'hut':c.shaman?'curse':'attack';
    if(kind==='hut'){const pair=pickHutPair(s,u);if(pair)plans.push({id:u.id,kind,row:from.row,index:from.index,chuchuId:pair.chuchu.u.id,kyreneId:pair.kyrene.u.id});continue;}
    let targets=kind==='attack'?attacksAgainst(u,enemy):freeBind(u,enemy).filter(t=>kind!=='curse'||(!immuneToBasicCurse(t.u)&&!t.u.awakened&&!immuneToDebuff(t.u)));
    targets=targets.filter(t=>(shadow.get(t.u.id)??t.u.hp)>0);
    if(kind==='attack'&&legalHeroAttack(u,enemy))targets.push({row:'hero',index:0,u:null});
    if(!targets.length)continue;
    const score=t=>{
     if(t.row==='hero')return enemy.hp<=u.atk?10000:u.atk*1.4;
     const hp=shadow.get(t.u.id)??t.u.hp,atk=c.dragon?Math.max(1,Math.floor((u.originalHp||u.maxHp)*.3334))*(u.dragonAwakened?3:1):u.atk;
     const effect=Math.max(0,atk-shieldAmount(t.u));
     if(kind==='machine')return ai2UnitValue(t.u)*1.5;
     if(kind==='curse')return ai2UnitValue(t.u)*.65+(t.u.curse?.progress||0)/18;
     let points=Math.min(hp,effect)+ (effect>=hp?ai2UnitValue(t.u)*1.1+2:0);
     if(u.card==='castorice'&&u.awakened)for(const d of [-1,1]){const side=enemy[t.row][t.index+d];if(side)points+=Math.min(side.hp,Math.max(0,u.atk-shieldAmount(side)))*.8;}
     return points;
    };
    targets.sort((a,b)=>score(b)-score(a)||a.index-b.index);
    const target=targets[0];plans.push({id:u.id,kind,row:from.row,index:from.index,toRow:target.row,toIndex:target.index,targetId:target.u?.id??null});
    if(kind==='attack'&&target.u){const cost=c.dragon?Math.max(1,Math.floor((u.originalHp||u.maxHp)*.3334))*(u.dragonAwakened?3:1):u.atk;
     const prior=shadow.get(target.u.id)??target.u.hp;
     shadow.set(target.u.id,Math.max(0,prior-Math.max(0,cost-shieldAmount(target.u))));
     if(u.card==='castorice'&&u.awakened)for(const d of [-1,1]){const side=enemy[target.row][target.index+d];if(side)shadow.set(side.id,Math.max(0,(shadow.get(side.id)??side.hp)-Math.max(0,u.atk-shieldAmount(side))));}
    }
   }
   return plans;
  }
  // Fast, deterministic AI swap approximation; no visual/card mutations are created.
  function swapLegalNumeric(s,a,b){const u=s[a.row][a.index],v=s[b.row][b.index];if(!u||!v||u.bound||v.bound||u.spellBound||v.spellBound||u.tribalStage2||v.tribalStage2||u.hutTask||v.hutTask||u.machineState==='working'||v.machineState==='working'||u.machineState==='puppet-ready'||v.machineState==='puppet-ready')return false;return (b.row==='front'||card(u.card).ranged||card(u.card).rearOnly&&b.row==='back')&&(!card(u.card).rearOnly||b.row==='back')&&(a.row==='front'||card(v.card).ranged||card(v.card).rearOnly&&a.row==='back')&&(!card(v.card).rearOnly||a.row==='back');}
  function swapNumeric(s,a,b){[s[a.row][a.index],s[b.row][b.index]]=[s[b.row][b.index],s[a.row][a.index]];}
  function valueNumeric(u){const c=card(u.card);return 1+(c.cost||0)*.4+u.hp*.3+u.atk*.5+(u.awakened?4:0)+(u.card==='castorice'||u.card==='kyrene'?4:0);}
  function offenseNumeric(s){const e=other(s);let score=0;for(const {u} of all(s)){if(!canPlan(s,u)||card(u.card).machine||card(u.card).hut||card(u.card).shaman)continue;const tar=attacksAgainst(u,e);if(!tar.length){if(legalHeroAttack(u,e))score+=Math.min(e.hp,u.atk)*1.4;continue;}let best=0;for(const t of tar){const raw=card(u.card).dragon?Math.max(1,Math.floor((u.originalHp||u.maxHp)*.3334)):u.atk;const dmg=Math.max(0,raw-shieldAmount(t.u)),v=Math.min(t.u.hp,dmg)+(dmg>=t.u.hp?valueNumeric(t.u)*.75:0);best=Math.max(best,v);}score+=best;}return score;}
  function defenseNumeric(s,plans){const e=other(s);let loss=0;for(const p of plans){if(p.kind!=='attack'||p.toRow==='hero')continue;const v=s[p.toRow]?.[p.toIndex],src=locate(p.id)?.u;if(!v||!src)continue;const hit=card(src.card).dragon?Math.max(1,Math.floor((src.originalHp||src.maxHp)*.3334))*(src.dragonAwakened?3:1):src.atk;const dealt=Math.max(0,hit-shieldAmount(v));loss+=Math.min(v.hp,dealt)*(1+valueNumeric(v)*.06)+(dealt>=v.hp?valueNumeric(v)*1.6:0);}return loss;}
  function exchangeOne(s,mode,incomingPlans=[]){const rows=all(s),base=mode==='attack'?offenseNumeric(s):defenseNumeric(s,incomingPlans);let chosen=null,gain=0;for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){const a=rows[i],b=rows[j];if(!swapLegalNumeric(s,a,b))continue;swapNumeric(s,a,b);const val=mode==='attack'?offenseNumeric(s):defenseNumeric(s,incomingPlans);swapNumeric(s,a,b);const delta=mode==='attack'?val-base:base-val;if(delta>gain+.01){gain=delta;chosen=[a,b];}}
   if(chosen&&gain>(mode==='attack'?1.5:1.2)){swapNumeric(s,chosen[0],chosen[1]);note(s,`${mode==='attack'?'공격':'수비'} 위치 교환`);}}
  function plan(s){if(s.aiMode==='adaptive')return ai2Plan(s);const plans=[];for(const from of all(s)){if(!canPlan(s,from.u))continue;const c=card(from.u.card);const kind=c.machine?'machine':c.hut?'hut':c.shaman?'curse':'attack';if(kind==='hut'){const pair=pickHutPair(s,from.u);if(pair)plans.push({id:from.u.id,kind,row:from.row,index:from.index,chuchuId:pair.chuchu.u.id,kyreneId:pair.kyrene.u.id});continue;}let tar;if(kind==='attack'){const targets=attacksAgainst(from.u,other(s));tar=targets.sort((a,b)=>a.u.hp-b.u.hp||b.u.atk-a.u.atk)[0]||(legalHeroAttack(from.u,other(s))?{row:'hero',index:0,u:null}:null);}else tar=freeBind(from.u,other(s)).filter(t=>kind!=='curse'||(!immuneToBasicCurse(t.u)&&!t.u.awakened)).sort((a,b)=>Number(b.u.card==='kyrene')-Number(a.u.card==='kyrene')||((b.u.curse?.progress||0)-(a.u.curse?.progress||0))||b.u.atk-a.u.atk)[0];if(tar)plans.push({id:from.u.id,kind,row:from.row,index:from.index,toRow:tar.row,toIndex:tar.index,targetId:tar.u?.id??null});}return plans;}
  function spendSpell(s,cost){const normal=Math.min(s.mana,cost);s.mana-=normal;s.bonusMana-=cost-normal;silverMana(s,cost);}
  function doSpells(s){for(let guard=0;guard<12;guard++){const choices=s.hand.map((entry,index)=>({id:typeof entry==='string'?entry:entry.card,index,c:{...card(typeof entry==='string'?entry:entry.card),cost:Math.max(0,(card(typeof entry==='string'?entry:entry.card)?.cost||0)-(entry&&typeof entry==='object'?entry.silverDiscount||0:0))}})).filter(x=>x.c?.type==='spell'&&x.c.cost<=s.mana+s.bonusMana);let casted=false;for(const {id,index,c} of choices){const enemy=other(s);if(c.spell==='capture'){const t=all(enemy).filter(t=>!t.u.spellBound&&!t.u.awakened&&!immuneToDebuff(t.u)).sort((a,b)=>b.u.atk-a.u.atk)[0];if(!t)continue;t.u.spellBound=true;t.u.bindTurns=1;metric(id).binds++;}
      else if(c.spell==='heal'){const t=all(s).filter(t=>t.u.hp<=t.u.maxHp-2).sort((a,b)=>(b.u.maxHp-b.u.hp)-(a.u.maxHp-a.u.hp))[0];if(!t&&s.hp>14)continue;metric(id).heals+=t?heal(t.u,c.amount):Math.min(c.amount,s.maxHp-s.hp);if(!t)s.hp=Math.min(s.maxHp,s.hp+c.amount);}
      else if(c.spell==='storm'){if(all(enemy).length<2)continue;for(const t of [...all(enemy)])if(enemy[t.row][t.index]===t.u)damage(enemy,t.row,t.index,c.amount,id);}
      else if(c.spell==='damage'){const t=all(enemy).sort((a,b)=>a.u.hp-b.u.hp||b.u.atk-a.u.atk)[0];if(!t&&enemy.hp>9)continue;if(t)damage(enemy,t.row,t.index,c.amount,id);else{const n=Math.min(enemy.hp,c.amount);enemy.hp-=c.amount;metric(id).damage+=n;metric(id).heroDamage+=n;}}
      else if(c.spell==='damage_unit'){const t=all(enemy).sort((a,b)=>a.u.hp-b.u.hp||b.u.atk-a.u.atk)[0];if(!t)continue;damage(enemy,t.row,t.index,c.amount,id);}
      else if(c.spell==='cleave'){const t=all(enemy).sort((a,b)=>a.u.hp-b.u.hp||b.u.atk-a.u.atk)[0];if(!t)continue;damage(enemy,t.row,t.index,c.amount,id);for(const delta of [-1,1]){const idx=t.index+delta;if(idx>=0&&idx<enemy[t.row].length&&enemy[t.row][idx])damage(enemy,t.row,idx,c.splash||1,id);}}
      else if(c.spell==='curse50'){const t=all(enemy).filter(t=>!immuneToTribalCurse(t.u)&&!t.u.awakened&&!immuneToDebuff(t.u)).sort((a,b)=>Number(b.u.card==='kyrene')-Number(a.u.card==='kyrene')||((b.u.curse?.progress||0)-(a.u.curse?.progress||0))||b.u.hp-a.u.hp)[0];if(!t)continue;const prior=t.u.curse,next=Math.min(100,(prior?.progress||0)+50),validSource=prior?.side===s&&prior?.sourceId&&!!locate(prior.sourceId);t.u.curse={progress:next,sourceId:validSource?prior.sourceId:null,side:s,lastHitRound:round,staticSpell:!validSource};metric(id).binds++;if(next===100&&!immuneToTribalCurse(t.u)){enemy[t.row][t.index]=null;transfer(t.u,s,'tribal');metric(id).conversions++;}}
      else continue;spendSpell(s,c.cost);s.hand.splice(index,1);metric(id).played++;metric(id).casts++;casted=true;break;}if(!casted||sA.hp<=0||sB.hp<=0)break;}}
  function transfer(victim,owner,status){if(immuneToDebuff(victim))return;victim.ready=false;victim.curse=null;victim.spellBound=false;victim.bindTurns=0;victim.puppet=status==='puppet';victim.tribal=status==='tribal';victim.tribalStage2=false;if(victim.card==='castorice')purgeDragon(other(owner),victim.id);const spot=open(owner,victim.card);if(spot)owner[spot.row][spot.index]=victim;else owner.deck.unshift({...victim});}
  function placeReturned(owner,unit,preferBack=false,fromReserve=false){const rows=preferBack?['back','front']:['front','back'];for(const row of rows){if(!card(unit.card).token&&!canPlaceUnit(card(unit.card),row))continue;const ix=owner[row].findIndex(x=>!x);if(ix>=0){unit.ready=false;owner[row][ix]=unit;return true;}}if(!fromReserve){owner.hutReserve??=[];owner.hutReserve.push({unit,preferBack});}return false;}
  function progressHuts(owner){
    // Stage-2 reverts on the next owner turn without a second hut entry.
    // Spawn the baby from this stage-2 unit before it becomes stage-1 again.
    if(owner.hutReserve?.length)owner.hutReserve=owner.hutReserve.filter(x=>!placeReturned(owner,x.unit,x.preferBack,true));
    for(const u of [...units(owner)])if(u.tribalStage2&&u.stage2TurnsRemaining){
      if(--u.stage2TurnsRemaining>0)continue;
      u.tribalStage2=false;u.tribal=true;u.stage2RevertRound=0;u.hutPrepared=false;
      u.hutCooldownUntil=round+1;u.ready=false;
      if(u.hutBabySpec){
        const baby=u.hutBabySpec;u.hutBabySpec=null;
        const child={id:nextId++,card:'young_chuchu_cyr',atk:baby.atk,hp:baby.hp,maxHp:baby.hp,ready:false};
        placeReturned(owner,child,false);
        metric('young_chuchu_cyr').played++;metric('chuchu_hut').conversions++;
        u.hp-=2;
        if(u.hp<=0){const pos=locate(u.id);if(pos)owner[pos.row][pos.index]=null;}
      }
    }
    for(const slot of all(owner)){
      const hut=slot.u;if(!card(hut.card).hut||!hut.hutTask)continue;
      const task=hut.hutTask;if(--task.turns>0)continue;
      hut.hutTask=null;
      const ch=task.chuchu,ky=task.kyrene;
      const hp=Math.max(1,Math.floor((ch.hp+ky.hp)/2));
      const atk=Math.max(0,Math.floor((card(ch.card).atk+ky.atk)/2));
      ky.tribal=true;ky.tribalStage2=true;ky.hutPrepared=true;
      ky.stage2TurnsRemaining=1;ky.stage2RevertRound=0;
      ky.hutBabySpec={hp,atk};ky.hutCooldownUntil=round+1;ky.ready=false;
      placeReturned(owner,ch,false);placeReturned(owner,ky,true);
      metric('chuchu_hut').captures++;
    }
  }
  function resolve(s,plans){note(s,`${plans.length}개 공격·능력 예약 해소`);const puppet=all(s).filter(t=>t.u.machineState==='puppet-ready'&&t.u.bound).map(t=>({id:t.u.id,row:t.row,index:t.index,kind:'puppet'}));const ordered=[...plans,...puppet].sort((a,b)=>(a.row==='front'?a.index:6+a.index)-(b.row==='front'?b.index:6+b.index));for(const p of ordered){if(sA.hp<=0||sB.hp<=0)break;const located=locate(p.id);if(!located||located.s!==s)continue;const att=located.u;s.silverActor=att;if(p.kind==='puppet'){if(att.spellBound||att.machineState!=='puppet-ready'||!att.bound)continue;const v=att.bound;att.bound=null;att.boundOrigin=null;att.machineState='resting';att.restTurnsRemaining=1;att.ready=false;transfer(v,s,'puppet');metric(att.card).conversions++;continue;}if(p.kind==='hut'){const c=card(att.card);if(!c.hut||att.spellBound||att.hutTask||!att.ready)continue;const ch=locate(p.chuchuId),ky=locate(p.kyreneId);if(!ch||!ky||ch.s!==s||ky.s!==s||!isChuchu(ch.u)||!isTribalKyrene(ky.u)||round<=(ky.u.hutCooldownUntil||0)){att.ready=false;metric(att.card).misses++;continue;}s[ch.row][ch.index]=null;s[ky.row][ky.index]=null;att.ready=false;att.hutTask={mode:'stage2',turns:hutTurns(ch.u),chuchu:{...ch.u},kyrene:{...ky.u}};metric(att.card).captures++;continue;}if(!canPlan(s,att)&&p.kind!=='attack')continue;const enemy=other(s),dest=p.toRow==='hero'?null:enemy[p.toRow][p.toIndex];if(p.kind!=='machine'&&p.kind!=='curse'&&p.kind!=='attack')continue;if(p.toRow!=='hero'&&(!dest||(p.kind==='attack'?!attacksAgainst(att,enemy).some(t=>t.row===p.toRow&&t.index===p.toIndex):dest.id!==p.targetId))){if(p.kind==='attack'||p.kind==='curse')att.ready=false;metric(att.card).misses++;continue;}if(p.kind==='machine'){if(att.machineState!=='capture-ready'||!dest||immuneToDebuff(dest)||!canTarget(att,dest))continue;enemy[p.toRow][p.toIndex]=null;att.bound=dest;att.boundOrigin={side:enemy,row:p.toRow,index:p.toIndex};att.machineState='working';att.ready=false;metric(att.card).captures++;}
      else if(p.kind==='curse'){if(!att.ready||!dest||immuneToDebuff(dest)||immuneToBasicCurse(dest)||dest.awakened||!canTarget(att,dest))continue;const next=Math.min(100,(dest.curse?.progress||0)+33.34);dest.curse={progress:next,sourceId:att.id,side:s,lastHitRound:round};att.ready=false;metric(att.card).binds++;if(next===100){enemy[p.toRow][p.toIndex]=null;transfer(dest,s,'tribal');metric(att.card).conversions++;}}
      else if(card(att.card).dragon){
        if(!att.ready||att.hp<=0)continue;att.ready=false;
        const c=card(att.card),cost=Math.max(1,Math.floor((att.dragonAttacks+1)*(att.originalHp||att.maxHp)*0.3334+1e-8)-Math.floor(att.dragonAttacks*(att.originalHp||att.maxHp)*0.3334+1e-8)),paid=Math.min(att.hp,cost),hitValue=Math.max(1,paid),hits=att.dragonAwakened?3:1;
        let total=0;
        for(let hit=0;hit<hits;hit++){
          if(p.toRow==='hero'){const n=Math.min(hitValue,Math.max(0,enemy.hp));enemy.hp-=hitValue;total+=n;metric(att.sourceCard||att.card).heroDamage+=n;}
          else if(enemy[p.toRow][p.toIndex]?.id===dest?.id)total+=damage(enemy,p.toRow,p.toIndex,hitValue,att.sourceCard||att.card);
          if(att.dragonAwakened&&hit===2&&p.toRow!=='hero')for(const delta of [-1,1]){const j=p.toIndex+delta;if(j>=0&&j<enemy[p.toRow].length&&enemy[p.toRow][j])total+=damage(enemy,p.toRow,j,1,att.sourceCard||att.card);}
        }
        if(p.toRow==='hero')metric(att.sourceCard||att.card).damage+=total;
        castDragonDamage(s,total);att.dragonAttacks++;att.hp-=paid;
        if(att.hp<=0){const pos=locate(att.id);if(pos)pos.s[pos.row][pos.index]=null;}
      }
      else if(att.card==='castorice'){
        if(!att.ready)continue;att.ready=false;
        const awakened=!!att.awakened,cost=att.hp<=1?0:1;
        const attack=att.atk;
        att.hp-=cost;let hits=0,total=0;
        if(p.toRow==='hero'){const n=Math.min(attack,Math.max(0,enemy.hp));enemy.hp-=attack;total+=n;hits=n>0?1:0;metric('castorice').heroDamage+=n;}
        else for(const ix of (awakened?[p.toIndex-1,p.toIndex,p.toIndex+1]:[p.toIndex])){if(ix<0||ix>=enemy[p.toRow].length||!enemy[p.toRow][ix])continue;const n=damage(enemy,p.toRow,ix,attack,'castorice');total+=n;if(n>=1)hits++;}
        if(p.toRow==='hero')metric('castorice').damage+=total;
        const restored=att.hp>0?heal(att,awakened?hits:Math.min(1,hits)):0;metric('castorice').heals+=restored;
        if(att.hp<=0){purgeDragon(s,att.id);s[p.row][p.index]=null;}
      }
      else{if(!att.ready)continue;att.ready=false;const atk=att.atk,c=card(att.card);if(p.toRow==='hero'){const beforeHero=Math.max(0,enemy.hp),n=Math.min(beforeHero,atk);enemy.hp-=atk;metric(att.card).damage+=n;metric(att.card).heroDamage+=n;let prev=Math.min(beforeHero,card(att.card).atk),cum=card(att.card).atk;for(const id of att.equipment||[]){const inc=card(id).bonusAtk||0;if(!inc)continue;cum+=inc;const next=Math.min(beforeHero,cum),extra=Math.max(0,next-prev);metric(id).damage+=extra;metric(att.card).damage-=extra;prev=next;}if(c.absorb||att.silverAbsorb)metric(att.card).heals+=heal(att,n);}else{const before=dest.hp;const overflow=c.pierce?Math.max(0,effectiveDamage(dest,atk)-before):0;const dealt=damage(enemy,p.toRow,p.toIndex,atk,att.card);const impact=creditAttack(att,{ref:dest,prevHp:before,wasKilled:before<=effectiveDamage(dest,atk)});metric(att.card).damage-=impact.credited;if(impact.creditedKill)metric(att.card).kills--;if(c.absorb)metric(att.card).heals+=heal(att,dealt);if(overflow){const n=Math.min(Math.max(0,enemy.hp),overflow);enemy.hp-=overflow;metric(att.card).damage+=n;metric(att.card).heroDamage+=n;}}}}
  }
  function progressCurses(){for(const owner of [sA,sB])for(const {row,index,u} of [...all(owner)]){if(immuneToDebuff(u)){u.curse=null;u.spellBound=false;u.bindTurns=0;}if(!u.curse||owner[row][index]!==u)continue;const curse=u.curse;if(immuneToDebuff(u)||immuneToTribalCurse(u)||u.awakened||(immuneToBasicCurse(u)&&!curse.staticSpell)){u.curse=null;continue;}if(curse.staticSpell||curse.lastHitRound===round)continue;const source=curse.sourceId?locate(curse.sourceId):null,active=!!source&&source.s===curse.side;curse.progress=Math.max(0,Math.min(100,curse.progress+(active?33.34:-5)));if(curse.progress===100){owner[row][index]=null;transfer(u,curse.side,'tribal');if(source)metric(source.u.card).conversions++;}else if(curse.progress===0&&!active)u.curse=null;}}
  function advance(s){for(const u of units(s))if(card(u.card).machine){if(u.machineState==='preparing'){u.machineTurn=(u.machineTurn||1)+1;if(u.machineTurn>=3)u.machineState='capture-ready';}else if(u.machineState==='working'&&u.bound)u.machineState='puppet-ready';else if(u.machineState==='resting'){if(u.restTurnsRemaining>0)u.restTurnsRemaining--;else{u.machineState='preparing';u.machineTurn=1;}}}}
  function expire(s){for(const u of units(s))if(u.spellBound){u.bindTurns=Math.max(0,(u.bindTurns??1)-1);if(!u.bindTurns)u.spellBound=false;}}
  snapshot('경기 시작');
  for(round=1;round<=cap;round++){
    for(let i=0;i<2;i++){
      const s=sides[i];
      if(!(round===1&&i===0)){
        s.maxMana=Math.min(10,round+2);s.mana=s.maxMana;advance(s);progressHuts(s);for(const u of units(s))u.ready=u.machineState!=='working'&&u.machineState!=='resting'&&!u.tribalStage2;if(round>1)drawTurnCards(s);
      }
      if(sA.hp<=0||sB.hp<=0)break;
      silverRefresh(s);
      if(s.silverSkip>0){s.silverSkip--;note(s,'자리 비움: 행동하지 않는 턴');snapshot('자리 비움',s.label);expire(s);s.bonusMana=Math.min(3,s.bonusMana+s.mana);s.mana=0;continue;}
      doSummon(s);doEquip(s);silverTryTransform(s);snapshot('소환',s.label);
      if(s.aiMode==='adaptive')exchangeOne(s,'attack');silverRefresh(s);
      const plans=plan(s);note(s,`${plans.length}건 예약`);snapshot('공격 지정',s.label);doSpells(s);snapshot('마법',s.label);
      if(sA.hp>0&&sB.hp>0){exchangeOne(other(s),'defense',plans);snapshot('수비',other(s).label);resolve(s,plans);snapshot('공격 해소',s.label);}
      expire(s);s.bonusMana=Math.min(3,s.bonusMana+s.mana);s.mana=0;
      if(sA.hp<=0||sB.hp<=0)break;
    }
    if(sA.hp<=0||sB.hp<=0)break;
    progressCurses();if(sA.hp<=0||sB.hp<=0)break;
  }
  const winner=sA.hp<=0&&sB.hp<=0?'draw':sB.hp<=0?'A':sA.hp<=0?'B':'draw';
  snapshot('종료');return {winner,round:Math.min(cap,round),stats,hpA:sA.hp,hpB:sB.hp,...(trace?{trace}: {})};
}
root.ArcanaFastBalance={simulateOne};
})(window);
