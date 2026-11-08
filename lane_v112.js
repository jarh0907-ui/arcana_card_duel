/* Arcana Card Duel v1.1.2 — Six lanes, one offensive swap, one defensive swap.
   The engine remains authoritative for damage, status, turns, and mana.
   Only units in occupied slots can be exchanged; never clone/respawn a unit. */
(function(){
'use strict';
PHASE_LABELS.defense='④ 수비 재배치';
let swapMode=false;
let defenseResume=null;
const swaps=()=>{if(!game.laneSwaps)game.laneSwaps={player:{attack:-1,defense:-1},enemy:{attack:-1,defense:-1}};return game.laneSwaps;};
function used(who,kind){return swaps()[who][kind]===game.turn;}
function isDefense(who){return game.phase==='defense'&&game.defenseOwner===who&&!simulating;}
function canSwapNow(who,kind){return game&&!game.winner&&!used(who,kind)&&(kind==='attack'?game.active===who&&game.phase==='target':game.active===otherSide(who)&&game.phase==='defense'&&game.defenseOwner===who);}
function movable(u){if(!u)return false;const c=CARD_DB[u.card];return !u.bound&&!u.spellBound&&!u.tribalStage2&&!u.hutTask&&!u.hutBabySpec&&!['working','puppet-ready'].includes(u.machineState)&&!!c;}
function slotAllowed(u,row){const c=CARD_DB[u.card];return !!c&&(c.rearOnly?row==='back':row==='front'||!!c.ranged);}
function swapLegal(who,a,b){if(!a||!b||a.row===b.row&&a.index===b.index)return false;const one=game[who][a.row]?.[a.index],two=game[who][b.row]?.[b.index];return !!one&&!!two&&movable(one)&&movable(two)&&slotAllowed(one,b.row)&&slotAllowed(two,a.row);}
function swapCardPositions(who,a,b,role,withFx=true){if(!canSwapNow(who,role)||!swapLegal(who,a,b))return false;
 const side=game[who],one=side[a.row][a.index],two=side[b.row][b.index];
 const beforeA=combatEl(who,a.row,a.index),beforeB=combatEl(who,b.row,b.index);
 const ptA=beforeA?.getBoundingClientRect(),ptB=beforeB?.getBoundingClientRect();
 [side[a.row][a.index],side[b.row][b.index]]=[two,one];
 // Planned attacks follow their attacking unit, while TARGET CELLS remain fixed.
 for(const p of game.plans[who]||[]){if(p.attackerId===one.id){p.fromRow=b.row;p.fromIndex=b.index;}else if(p.attackerId===two.id){p.fromRow=a.row;p.fromIndex=a.index;}}
 if(game.selected?.kind==='attacker'){if(game.selected.unitId===one.id){game.selected.row=b.row;game.selected.index=b.index;}else if(game.selected.unitId===two.id){game.selected.row=a.row;game.selected.index=a.index;}}
 swaps()[who][role]=game.turn;game.selected=null;swapMode=false;
 // Repositioning is a public action and can inform AI's opponent model.
 if(game.ai2){const seen=game.ai2.observed?.[who];if(seen&&role==='defense')seen.protect=(seen.protect||0)+1;
  const entries=game.ai2.traces||[];entries.unshift({owner:who,turn:game.turn,phase:role==='defense'?'수비 재배치':'공격 재배치',chosen:`${displayUnitName(one)} ↔ ${displayUnitName(two)} (${a.index+1}↔${b.index+1}라인)`,alternatives:[]});entries.length=Math.min(entries.length,80);}

 log(`↔ ${who==='player'?'아군':'상대'} ${role==='attack'?'공격':'수비'} 재배치: ${displayUnitName(one)} ↔ ${displayUnitName(two)} (라인 ${a.index+1} ↔ ${b.index+1})`,who==='player'?'good-log':'enemy-log');
 render();
 if(withFx&&!liteFx()&&ptA&&ptB){
  const endB=combatEl(who,b.row,b.index)?.querySelector('.unit'),endA=combatEl(who,a.row,a.index)?.querySelector('.unit');
  const opts={duration:310*motionScale(),easing:'cubic-bezier(.25,.8,.2,1)'};
  if(endB)endB.animate([{transform:`translate(${ptA.left-ptB.left}px,${ptA.top-ptB.top}px)`,opacity:.78},{transform:'translate(0,0)',opacity:1}],opts);
  if(endA)endA.animate([{transform:`translate(${ptB.left-ptA.left}px,${ptB.top-ptA.top}px)`,opacity:.78},{transform:'translate(0,0)',opacity:1}],opts);
 }
 return true;
}
// All normal attacks are lane-restricted; class-specific area attacks still splash.
legalAttackTargets=function(attacker,defendingSide){
 const origin=locateUnit(attacker?.id);if(!origin||!attacker||attacker.tribalStage2)return[];
 const card=CARD_DB[attacker.card],lane=origin.index;
 if(origin.row==='back'&&!card.ranged)return [];
 const candidates=allTargets(defendingSide).filter(t=>t.index===lane&&canTargetByUnit(attacker,t.u));
 const front=candidates.filter(t=>t.row==='front');
 if(origin.row==='back')return front;
 if(card.ranged)return candidates;
 return front.length?front:candidates.filter(t=>t.row==='back');
};
legalHeroAttack=function(attacker,defendingSide){const origin=locateUnit(attacker?.id);return !!origin&&origin.row==='front'&&!defendingSide.front[origin.index]&&!defendingSide.back[origin.index];};
// Resolve attack using current occupant of the reserved CELL, not old target's id.
window.laneResolveTargetAllowed=function(attacker,plan,destOwner){if(!attacker||!game[destOwner][plan.toRow]?.[plan.toIndex])return false;
 return legalAttackTargets(attacker.u,game[destOwner]).some(t=>t.row===plan.toRow&&t.index===plan.toIndex);
};
function laneTargets(who,mode){const side=game[who];return allTargets(side).filter(t=>movable(t.u));}
function possibleSwap(who,role){const entries=laneTargets(who,role),res=[];for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++)if(swapLegal(who,entries[i],entries[j]))res.push([entries[i],entries[j]]);return res;}
function unitValue(u){const c=CARD_DB[u.card]||{};return 1+(c.cost||0)*.4+u.hp*.32+u.atk*.55+(u.awakened?5:0)+(['kyrene','castorice'].includes(u.card)?5:0)+(u.kyreneBlessing?2:0);}
function attackFormationScore(who){let score=0;const foe=game[otherSide(who)];for(const t of allTargets(game[who])){if(!canPlanAction(t.u)||planKind(t.u)!=='attack')continue;const targets=legalAttackTargets(t.u,foe);if(!targets.length){if(legalHeroAttack(t.u,foe))score+=Math.min(foe.hp,t.u.atk)*1.45;continue;}
 let best=0;for(const x of targets){const dmg=Math.max(0,Math.min(x.u.hp,effectiveUnitDamage(x.u,t.u.atk)));let points=dmg*1.05+(dmg>=x.u.hp?unitValue(x.u)*.8:0);
 if(t.u.card==='castorice'&&t.u.awakened)for(const d of [-1,1]){const v=foe[x.row][x.index+d];if(v)points+=Math.min(v.hp,effectiveUnitDamage(v,t.u.atk))*.7;}
 best=Math.max(best,points);}
 score+=best;}
 return score;
}
function defenseLoss(defending,attacking){let score=0;const enemy=game[attacking],side=game[defending];
 for(const p of game.plans[attacking]||[]){if(p.kind!=='attack'||p.toRow==='hero')continue;const source=locateUnit(p.attackerId)?.u,dst=side[p.toRow]?.[p.toIndex];if(!source||!dst||source.hp<=0)continue;
 const cost=CARD_DB[source.card]?.dragon?dragonAttackCost(source)*(source.dragonAwakened?3:1):source.atk;
 const inflicted=effectiveUnitDamage(dst,cost),actual=Math.min(dst.hp,inflicted);
 score+=actual*(.7+unitValue(dst)*.08)+(actual>=dst.hp?unitValue(dst)*1.9:0);
 if(source.card==='castorice'&&source.awakened||CARD_DB[source.card]?.dragon&&source.dragonAwakened){for(const d of [-1,1]){const neighbor=side[p.toRow][p.toIndex+d];if(!neighbor)continue;const v=source.card==='castorice'?effectiveUnitDamage(neighbor,source.atk):effectiveUnitDamage(neighbor,1);score+=Math.min(neighbor.hp,v)*.7+(v>=neighbor.hp?unitValue(neighbor):0);}}
 }
 return score;
}
function bestSwap(who,kind,enemy){if(!canSwapNow(who,kind))return null;
 let baseline=kind==='attack'?attackFormationScore(who):defenseLoss(who,enemy),best=null,adv=0;
 for(const [a,b] of possibleSwap(who,kind)){const side=game[who];[side[a.row][a.index],side[b.row][b.index]]=[side[b.row][b.index],side[a.row][a.index]];
 const next=kind==='attack'?attackFormationScore(who):defenseLoss(who,enemy);
 [side[a.row][a.index],side[b.row][b.index]]=[side[b.row][b.index],side[a.row][a.index]];
 const gain=kind==='attack'?next-baseline:baseline-next;
 if(gain>adv+.01){adv=gain;best={a:{row:a.row,index:a.index},b:{row:b.row,index:b.index},gain};}}
 return best;
}
window.laneAutoAttackSwap=function(who){if(!game||used(who,'attack'))return false;const chosen=bestSwap(who,'attack',otherSide(who));return chosen?.gain>1.5?swapCardPositions(who,chosen.a,chosen.b,'attack',false):false;};
window.laneAutoDefense=async function(who,against,epoch){if(!game||game.winner||!sessionOk(epoch)||used(who,'defense'))return;
 // Evaluate as if the defender currently had a response phase. This does not consume a card action.
 const prevPhase=game.phase,prevOwner=game.defenseOwner;game.phase='defense';game.defenseOwner=who;
 const chosen=bestSwap(who,'defense',against);
 if(chosen?.gain>1.2)swapCardPositions(who,chosen.a,chosen.b,'defense',false);
 game.phase=prevPhase;game.defenseOwner=prevOwner;render();
};
window.lanePlayerDefense=async function(epoch){if(simulating||!game||game.winner||!sessionOk(epoch))return;
 if(!(game.plans.enemy||[]).some(p=>p.kind==='attack'))return;
 game.defenseOwner='player';game.phase='defense';game.selected=null;swapMode=true;uiLocked=false;
 render();phaseBanner('🛡 수비 단계! 카드 두 장 교환 또는 방어 완료');
 await new Promise(resolve=>{defenseResume=resolve;});
 if(!sessionOk(epoch))return;
 game.defenseOwner=null;game.phase='resolve';swapMode=false;uiLocked=true;game.selected=null;render();
};
function finishDefense(){if(!game||!isDefense('player')||!defenseResume)return;const callback=defenseResume;defenseResume=null;swapMode=false;callback();}
const originalNewGame=newGame;newGame=function(){if(defenseResume){const wake=defenseResume;defenseResume=null;wake();}swapMode=false;originalNewGame();};
const oldClick=onFieldClick;
onFieldClick=function(who,row,index){if(!game||game.winner)return;if(devKillMode||devCastoriceMode)return oldClick(who,row,index);
 const role=isDefense('player')?'defense':game.active==='player'&&game.phase==='target'?'attack':null;
 if(role&&swapMode&&!simulating){if(who!=='player')return;const u=game.player[row]?.[index];if(!u)return;
  if(!game.selected||game.selected.kind!=='lane-swap'){if(!movable(u))return;game.selected={kind:'lane-swap',row,index};render();return;}
  const first={row:game.selected.row,index:game.selected.index};if(first.row===row&&first.index===index){game.selected=null;render();return;}
  if(!swapCardPositions('player',first,{row,index},role)){log('위치 교환 불가: 서로 다른 카드 2장과 전·후열 배치 규칙을 확인하세요.');render();}return;}
 return oldClick(who,row,index);
};
const oldSelectable=canSelectTarget;
canSelectTarget=function(who,row,index){if(!game||row==='hero')return oldSelectable(who,row,index);
 if(swapMode&&!simulating&&who==='player'&&(isDefense('player')||game.phase==='target'&&game.active==='player')&&!used('player',isDefense('player')?'defense':'attack')){
  const u=game.player[row][index];if(!u)return false;
  if(game.selected?.kind==='lane-swap')return swapLegal('player',{row:game.selected.row,index:game.selected.index},{row,index});
  return movable(u);
 }
 return oldSelectable(who,row,index);
};
const control=document.querySelector('.controls-top');const swapButton=document.createElement('button');swapButton.id='laneSwapButton';swapButton.type='button';swapButton.className='primary-btn';swapButton.textContent='↔ 위치 교환';control?.append(swapButton);
swapButton.addEventListener('click',()=>{if(!game||game.winner||uiLocked||simulating)return;
 const role=isDefense('player')?'defense':game.active==='player'&&game.phase==='target'?'attack':null;if(!role||used('player',role))return;
 swapMode=!swapMode;game.selected=null;render();});
$('endTurnButton').addEventListener('click',()=>{if(isDefense('player'))finishDefense();});
const style=document.createElement('style');style.textContent=`
 #laneSwapButton{font-size:12px;padding:9px 12px;white-space:nowrap;background:linear-gradient(135deg,#4a678f,#6d4b8d);border:1px solid #a8b9ef}
 #laneSwapButton.active{box-shadow:0 0 0 2px #e3bdff,inset 0 0 12px #9ed9ff88}
 #laneSwapButton:disabled{opacity:.48}
 .slot.lane-swap-first,.unit-slot.lane-swap-first{outline:3px solid #ffcc9a!important;outline-offset:2px}
 .slot.lane-swap-candidate,.unit-slot.lane-swap-candidate{box-shadow:0 0 0 2px #a3ebd7!important}
 .lane-predicted{outline:2px solid #ecb7a1!important;outline-offset:-2px}
 `;document.head.append(style);
$('restartButton').addEventListener('click',()=>{if(defenseResume){const done=defenseResume;defenseResume=null;done();}});
const oldRender=render;
render=function(){oldRender();if(!game)return;
 const role=isDefense('player')?'defense':game.active==='player'&&game.phase==='target'?'attack':null;
 const steps=[['summon','소환'],['target','공격 지정'],['spell','스펠'],['defense','수비 재배치'],['resolve','공격 해소']];
 const phaseIndex=steps.findIndex(x=>x[0]===game.phase);
 $('phaseStepper').innerHTML=steps.map(([name,label],i)=>`<span class="phase-step ${i===phaseIndex?'current':''} ${i<phaseIndex?'completed':''}">${i+1} ${label}</span>`).join('');
 swapButton.hidden=!role;swapButton.disabled=!role||used('player',role)||uiLocked||simulating;
 swapButton.textContent=role&&used('player',role)?'↔ 교환 사용함':swapMode?'↔ 교환 중 · 카드 2장 선택':'↔ 위치 교환 (1회)';swapButton.classList.toggle('active',swapMode);
 const first=game.selected?.kind==='lane-swap'?game.selected:null;
 for(const row of ['front','back'])for(let i=0;i<6;i++){const el=$(`player${row[0].toUpperCase()}${row.slice(1)}`)?.children[i];if(!el)continue;
  el.classList.toggle('lane-swap-first',!!first&&first.row===row&&first.index===i);
  el.classList.toggle('lane-swap-candidate',!!swapMode&&canSelectTarget('player',row,i));}
 if(role==='defense'){
  $('endTurnButton').disabled=false;$('endTurnButton').textContent='🛡 방어 완료 → 공격 해소';
  $('prompt').textContent=used('player','defense')?'수비 위치 교환을 완료했습니다. 방어 완료를 누르세요.':first?'교환할 두 번째 유닛을 선택하세요.':'수비 단계: 상대가 예약한 공격 칸을 확인하고 내 유닛 두 장을 한 번 맞바꾸거나 방어 완료를 누르세요.';
  $('actionTip').textContent=$('prompt').textContent;
 }else if(role==='attack'&&swapMode){$('prompt').textContent=first?'맞바꿀 두 번째 유닛을 선택하세요.':'위치를 맞바꿀 첫 번째 아군 유닛을 선택하세요.';}
 // Signal the attacked CELL, not a particular defender identity.
 if(role==='defense')for(const p of game.plans.enemy){if(p.kind!=='attack'||p.toRow==='hero')continue;const el=$(`player${p.toRow[0].toUpperCase()}${p.toRow.slice(1)}`)?.children[p.toIndex];el?.classList.add('lane-predicted');}
};
render();
window.ArcanaLaneRules={version:'1.1.2',canSwap:swapLegal,swap:(who,a,b,role)=>swapCardPositions(who,a,b,role),attackTargets:legalAttackTargets,finishDefense,autoDefense:laneAutoDefense};
})();
