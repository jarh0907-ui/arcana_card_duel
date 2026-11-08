(function(){'use strict';
const $=id=>document.getElementById(id),info=window.ArcanaBalanceData,{cards,packs}=info;
const sides=['player','enemy'],labels={player:'🟦 덱 A',enemy:'🟥 덱 B'};
let running=false,stopped=false,lastResult=null;
const MAX_COPIES=30,MAX_CUSTOM_RUNS=10000;
const clampCopies=n=>Math.min(MAX_COPIES,Math.max(0,Math.round(Number(n)||0)));
const packTotal=(side,p)=>p.cards.reduce((sum,id)=>sum+(config[side].counts[id]||0),0);
function applyPackTotal(side,p,total){const ids=p.cards.filter(id=>!cards[id].token);const max=ids.length*MAX_COPIES;const target=Math.max(0,Math.min(max,Math.round(total)));const q=Math.floor(target/ids.length),extra=target%ids.length;for(let i=0;i<ids.length;i++)config[side].counts[ids[i]]=q+(i<extra?1:0);for(const id of p.cards.filter(id=>cards[id].token))config[side].counts[id]=0;}

const emptyConfig=()=>Object.fromEntries(sides.map(side=>[side,{enabled:Object.fromEntries(packs.map(p=>[p.id,false])),counts:Object.fromEntries(Object.keys(cards).map(id=>[id,0]))}]));
let config=emptyConfig();
try{const data=location.hash?JSON.parse(decodeURIComponent(location.hash.slice(1))):null;
 if(data?.player?.counts&&data?.enemy?.counts)for(const side of sides){
  for(const p of packs)config[side].enabled[p.id]=!!data[side].enabled?.[p.id];
  if(data[side].enabled?.chuchu)config[side].enabled.genshin=true;
  for(const id of Object.keys(cards))config[side].counts[id]=Math.max(0,Math.min(30,Number(data[side].counts?.[id])||0));
 }
 else throw Error('No saved game configuration');
}catch(e){
 const core={recruit:3,warrior:2,archer:2,guardian:2,mage:2,binder:3,shade:3,piercer:3,leech:3,binding:3,fireball:3,heal:2,storm:2};
 for(const side of sides){config[side].enabled.core=true;Object.assign(config[side].counts,core);}
 config.player.enabled['honkai-star-rail']=true;config.player.counts.kyrene=6;config.player.counts.castorice=6;config.enemy.counts.kyrene=6;config.enemy.counts.castorice=6;
 config.enemy.enabled.machine=true;config.enemy.enabled.genshin=true;config.enemy.counts.mk1=4;config.enemy.counts.shaman=4;
}
const toCounts=side=>Object.fromEntries(Object.keys(cards).filter(id=>!cards[id].token&&packs.some(p=>p.cards.includes(id)&&config[side].enabled[p.id])&&config[side].counts[id]>0).map(id=>[id,config[side].counts[id]]));
const total=side=>Object.values(toCounts(side)).reduce((a,b)=>a+b,0);
function setSidePreset(side,mode){if(running)return;const other=side==='player'?'enemy':'player';
 if(mode==='copy')config[side]={enabled:{...config[other].enabled},counts:{...config[other].counts}};
 else {for(const pack of packs){config[side].enabled[pack.id]=true;for(const id of pack.cards)config[side].counts[id]=cards[id].token?0:(mode==='triple'?3:1);}}
 renderDeck();
}
function cardTooltip(c){const lines=[c.name,`마나: ${c.cost}`];
 if(c.type==='unit'){lines.push(`공격: ${c.atk} / 체력: ${c.hp}`,`공격 방식: ${c.ranged?'원거리 · 전열/후열 사거리 구분':'근접 · 전열 전용 배치'}`);
  if(c.shield)lines.push('보호막: 받는 피해 1 감소');if(c.machine)lines.push('MK.1: 2턴 준비 → 구속 → 인형화 → 휴식');
  if(c.shaman)lines.push('주술: 즉시 +33.34%, 유지 시 턴당 +33.34%, 100% 부족화 · 츄츄족/부족화 유닛은 기본 저주 면역');
  if(c.hut)lines.push('후열 전용 · 아기 츄츄족은 오두막 입장 불가 · 작업 후 츄츄 키레네 2단계 · 다음 자기 턴에 2단계 카드에서 아기 츄츄족 생성 및 부족화 1단계 복귀 · 재입장 불필요');
  if(c.name.includes('츄츄')&&!c.hut)lines.push('특수 저주 및 부족화 면역 · 부족화 상태는 예외');
  if(c.child||c.token)lines.push('오두막 입장 불가');
  if(c.dragon)lines.push('죽음의 용: 최대체력의 33.34%씩 소모, 소모한 체력만큼 피해(최소 1), 외부 회복 시 3회 넘게 행동 가능 · 장비 불가');
  if(c.token&&!c.dragon)lines.push('토큰: 오두막 전용 생성, 덱 직접 편성 불가');
  if(c.stealth)lines.push('은신: 일반 공격 대상으로 선택 불가');if(c.pierce)lines.push('관통: 남는 피해를 상대 본체에 전달');
  if(c.absorb)lines.push('흡수: 실제 피해만큼 회복');if(c.bind)lines.push('등장 시 대상 하나를 속박');
 }else if(c.type==='item'){lines.push(`장비 효과: 공격력 +${c.bonusAtk||0}, 체력 +${c.bonusHp||0}`);
  if(c.rangedOnly)lines.push('장착 조건: 원거리 유닛만');if(c.meleeOnly)lines.push('장착 조건: 근접 유닛만');
  if(c.shield)lines.push('보호막 없는 유닛: 피해 1 감소 / 기존 보호막 보유: 최대체력 +2');
  lines.push('기여도: 장비로 추가된 실제 피해·처치, 흡수 피해 또는 막아낸 피해만 집계');
 }else{lines.push(`마법 효과: ${c.spell==='curse50'?'특수 저주 +50% (츄츄족 면역)':c.spell==='cleave'?'대상 피해 2 + 양옆 1':c.spell==='damage_unit'?'유닛에게 피해 2':c.spell==='capture'?'대상 1턴 구속':c.spell==='damage'?'단일 피해 '+c.amount:c.spell==='storm'?'광역 피해 '+c.amount:c.spell==='heal'?'회복 '+c.amount:'특수 효과'}`);}
 return lines.join('\n');
}
function renderDeck(){const host=$('deckGrid');host.replaceChildren();for(const side of sides){
 const deck=document.createElement('section');deck.className='deck';
 const head=document.createElement('h3');head.textContent=`${labels[side]} · ${total(side)}장`;deck.append(head);
 const shortcuts=document.createElement('div');shortcuts.className='side-shortcuts';
 for(const [mode,label] of [['copy','↔ 상대덱과 똑같이'],['single','전체 팩 · 각 1장'],['triple','전체 팩 · 각 3장']]){
  const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=running;
  b.addEventListener('click',()=>setSidePreset(side,mode));shortcuts.append(b);
 }deck.append(shortcuts);
 for(const p of packs){
  const box=document.createElement('div');box.className='pack';
  const label=document.createElement('label');label.className='pack-title';
  const check=document.createElement('input');check.type='checkbox';check.checked=config[side].enabled[p.id];check.disabled=running;
  check.addEventListener('change',()=>{config[side].enabled[p.id]=check.checked;renderDeck();});
  const subtotal=document.createElement('span');subtotal.className='pack-sum';subtotal.textContent=config[side].enabled[p.id]?`${packTotal(side,p)}장`:'비활성';
  label.append(check,document.createTextNode(p.name),subtotal);box.append(label);
  const bulk=document.createElement('div');bulk.className='pack-bulk';
  const totalLabel=document.createElement('label');totalLabel.textContent='팩 전체 장수';
  const countInput=document.createElement('input');countInput.type='number';countInput.min='0';countInput.max=String(p.cards.length*MAX_COPIES);countInput.step='1';countInput.value=String(packTotal(side,p));
  countInput.setAttribute('aria-label',`${labels[side]} ${p.name} 전체 장수`);
  countInput.disabled=running||!config[side].enabled[p.id];
  const apply=document.createElement('button');apply.type='button';apply.textContent='합계 적용';apply.disabled=countInput.disabled;
  const doApply=()=>{const v=Number(countInput.value);if(!Number.isInteger(v)||v<0||v>p.cards.length*MAX_COPIES){countInput.setCustomValidity(`0~${p.cards.length*MAX_COPIES}장 사이의 정수를 입력하세요.`);countInput.reportValidity();return;}
   countInput.setCustomValidity('');applyPackTotal(side,p,v);renderDeck();};
  apply.addEventListener('click',doApply);countInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();doApply();}});
  const note=document.createElement('small');note.textContent=`최대 ${p.cards.length*MAX_COPIES}장 · 고르게 배분`;
  bulk.append(totalLabel,countInput,apply,note);box.append(bulk);
  for(const id of p.cards){const row=document.createElement('label');row.className='card-row';const text=document.createElement('span');text.textContent=cards[id].name+(cards[id].token?' (생성 전용)':'');text.title=cardTooltip(cards[id]);const input=document.createElement('input');input.type='number';input.min='0';input.max=String(MAX_COPIES);input.value=String(config[side].counts[id]||0);input.disabled=running||!config[side].enabled[p.id]||!!cards[id].token;
   input.addEventListener('change',()=>{const v=Number(input.value);config[side].counts[id]=clampCopies(Number.isFinite(v)?v:0);renderDeck();});row.append(text,input);box.append(row);}
  deck.append(box);
 }
 host.append(deck);
}}
function selectedRuns(){if($('runs').value!=='custom')return Number($('runs').value);const raw=$('customRuns').value.trim(),value=Number(raw);return raw!==''&&Number.isInteger(value)&&value>=1&&value<=MAX_CUSTOM_RUNS?value:null;}
function updateRunChoice(){$('customRunsWrap').hidden=$('runs').value!=='custom';}
$('runs').addEventListener('change',updateRunChoice);updateRunChoice();
function busy(on){running=on;$('run').disabled=on;$('reset').disabled=on;$('runs').disabled=on;$('customRuns').disabled=on;$('cancel').disabled=!on;renderDeck();}
function textMetric(title,value,desc){const box=document.createElement('div');box.className='metric';const s=document.createElement('span');s.textContent=title;const big=document.createElement('strong');big.textContent=value;const foot=document.createElement('span');foot.textContent=desc;box.append(s,big,foot);return box;}
// '종합 스펙'은 승률이 아닌 규칙 기반 AI에서 기록된 기여도의 가중 합산값.
// 받은 피해는 유효 체력 이내의 피해만 집계하므로, 무한한 오버킬은 탱킹으로 인정하지 않음.
const SCORE_WEIGHTS=Object.freeze({damage:1,taken:0.5,kills:2,heals:0.75,binds:2,captures:4,conversions:6,prevented:0.5});
function composite(m){return Object.entries(SCORE_WEIGHTS).reduce((sum,[k,w])=>sum+(Number(m[k])||0)*w,0);}
function report(sum,count){$('result').style.display='block';$('statCards').replaceChildren(
 textMetric('덱 A 승률',`${(sum.A/count*100).toFixed(1)}%`,`${sum.A}승 / ${count}판`),
 textMetric('덱 B 승률',`${(sum.B/count*100).toFixed(1)}%`,`${sum.B}승 / ${count}판`),
 textMetric('무승부',`${sum.draw}`,`45라운드 제한 포함`),
 textMetric('평균 라운드',`${(sum.rounds/count).toFixed(1)}`,`전체 평균`)
 );
 const aWin=sum.A/count*100,bWin=sum.B/count*100,diff=Math.abs(aWin-bWin);
 const previous=lastResult;
 let message=`AI: A=${$('aiModelA').value==='adaptive'?'적응형 AI 2.0':'기존 AI'}, B=${$('aiModelB').value==='adaptive'?'적응형 AI 2.0':'기존 AI'}. `+(diff<10?'두 덱의 승률 차이가 10%p 미만이야. 다만 샘플 수가 적거나 선공의 영향이 있을 수 있어.':`현재 AI 기준 ${aWin>bWin?'덱 A':'덱 B'}가 ${diff.toFixed(1)}%p 앞서 있어. 한 장씩 교체하며 동일한 조건에서 재검사하면 원인 찾기에 좋아.`);
 if(previous){const old=previous.aWin;message+=` · 이전 테스트 대비 덱 A 승률 ${old.toFixed(1)}% → ${aWin.toFixed(1)}% (${aWin-old>=0?'+':''}${(aWin-old).toFixed(1)}%p)${previous.count!==count?' ※ 판수가 달라 단순 비교만 가능':''}.`; }
 $('summary').textContent=message;
 lastResult={aWin,count};
 const body=$('cardStats');body.replaceChildren();
 // 소환/시전/장착된 카드만 비교한다. 표는 사용 1회당 실제 지불한 마나를 기준으로 정렬.
 const all=Object.entries(sum.cards).filter(([id,m])=>m.played>0).sort((a,b)=>{
  const pa=cards[a[0]].cost?composite(a[1])/(a[1].played*cards[a[0]].cost):0,pb=cards[b[0]].cost?composite(b[1])/(b[1].played*cards[b[0]].cost):0;
  return pb-pa||b[1].played-a[1].played;
 });
 for(const [id,m] of all){
  const c=cards[id],tr=document.createElement('tr');
  const totalScore=composite(m),mana=m.played*c.cost,perMana=mana?totalScore/mana:0;
  const values=[c.name,c.cost?c.cost:"생성",m.played,mana?perMana.toFixed(2):"—",totalScore.toFixed(1),
    m.damage.toFixed(0),(m.taken||0).toFixed(0),m.kills,(m.heals||0).toFixed(0),
    m.binds,m.captures,m.conversions,(m.prevented||0).toFixed(0)];
  for(let i=0;i<values.length;i++){const cell=document.createElement('td');cell.textContent=String(values[i]);if(i===0){cell.title=cardTooltip(c)+`\n--- 시뮬레이션 실적 ---\n실제 가한 피해: ${m.damage.toFixed(0)} / 받은 피해: ${(m.taken||0).toFixed(0)}\n처치: ${m.kills} / 방어 피해 감소: ${(m.prevented||0).toFixed(0)}\n총 소비 마나: ${mana} / 종합 스펙: ${totalScore.toFixed(1)} / 스펙·마나: ${perMana.toFixed(2)}`;cell.className='card-tooltip-name';}if(i===3)cell.className='score-main';tr.append(cell);}
  body.append(tr);
 }
 if(!all.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=13;td.textContent='사용된 카드가 없습니다.';tr.append(td);body.append(tr);}
 $('result').scrollIntoView({behavior:'smooth',block:'start'});
}
function addStats(dest,items){for(const [id,m] of Object.entries(items)){const dst=dest[id]||(dest[id]={played:0,damage:0,taken:0,heroDamage:0,kills:0,binds:0,captures:0,conversions:0,heals:0,gear:0,gearPower:0,prevented:0,misses:0,casts:0});for(const [key,val] of Object.entries(m))dst[key]=(dst[key]||0)+val;}}
$('run').addEventListener('click',async()=>{if(running)return;
 const A=toCounts('player'),B=toCounts('enemy');if(!total('player')||!total('enemy')){$('progress').textContent='⚠ 두 덱 모두 카드가 1장 이상 필요해.';return;}
 const count=selectedRuns();if(!count){$('progress').textContent=`⚠ 상세 설정은 1~${MAX_CUSTOM_RUNS.toLocaleString('ko-KR')}판 사이의 정수를 입력해.`;$('customRuns').focus();return;}
 stopped=false;busy(true);$('result').style.display='none';$('simProgress').max=count;$('simProgress').value=0;
 const out={A:0,B:0,draw:0,rounds:0,cards:{}};
 try{let sliceStart=performance.now();for(let i=0;i<count;i++){
  if(stopped)break;
  // Seed paired trials; alternate first player to reduce seating bias.
  const firstA=i%2===0,seed=(((i>>1)+1)*0x9E3779B1)>>>0;
  const one=window.ArcanaFastBalance.simulateOne(cards,A,B,firstA,seed,45,{aiA:$('aiModelA').value,aiB:$('aiModelB').value});
  out[one.winner]++;out.rounds+=one.round;addStats(out.cards,one.stats);
  // Give the browser control every ~20ms, keeping input and cancellation responsive on slow PCs.
  if(performance.now()-sliceStart>=20||i===count-1){$('progress').textContent=`계산 중 ${(i+1).toLocaleString('ko-KR')}/${count.toLocaleString('ko-KR')}판`;$('simProgress').value=i+1;await new Promise(r=>setTimeout(r,0));sliceStart=performance.now();}
 }
 const ran=out.A+out.B+out.draw;if(ran){report(out,ran);$('progress').textContent=`✅ ${ran.toLocaleString('ko-KR')}판 완료${stopped?' (중단됨)':''}`;}
 else $('progress').textContent='실행이 중단되어 기록할 결과가 없어.';
 }catch(err){$('progress').textContent=`시뮬레이션 오류: ${err.message}`;console.error(err);}finally{busy(false);}
});
$('cancel').addEventListener('click',()=>{stopped=true;$('progress').textContent='중단 요청 중…';});
$('reset').addEventListener('click',()=>{location.hash='';location.reload();});
renderDeck();
})();
