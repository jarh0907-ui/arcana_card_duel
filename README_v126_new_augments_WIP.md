# Arcana Card Duel — Silver Augments 11 new cards (v1.2.6 WIP)

Main game remains v1.2.5 while the new patch is developed.

## Provided cards (text faithfully transcribed)
1. 다 쓸데가 있다니까 — 게임이 끝났을 때 빈 칸 한 개당 33% 확률로 1골드를 획득합니다.
2. 탐사 — 가장 오른쪽 후열칸에 있는 유닛을 잃습니다. 마나 33 만큼의 유닛을 잃으면 큰 보상을 얻습니다.
3. 길을 내라 — 근접 유닛 전용 무기 카드를 2장 뽑습니다.
4. 약간 신비한 주사위 — 주사위를 굴려 나온 결과에 따라 보상을 얻습니다.
5. 전기 충격 1 — 아군이 한 턴에 4번 공격당할 때마다 적 전체에게 데미지 1을 줍니다.
6. 예비 활 — 원거리 유닛 전용 무기 카드를 2장 뽑습니다.
7. 새로 고침의 날 — 현재 패에 있는 카드를 최대 3번 바꿀 수 있습니다.
8. 권투 교습 — 전방 1열 카드 2장당 체력이 1 증가합니다.
9. 결과 예측 — 4연승인 채로 시작합니다.
10. 국왕 시해자 — 플레이어 대상 전투 승리 후 1골드를 획득합니다. 상대의 글로벌 체력이 더 높다면 대신 6골드를 획득합니다.
11. 단결된 의지 — 같은 팩의 다른 종류 카드가 7개 이상 필드에 올라와 있을 시 공격력과 체력이 1 늘어납니다.

## Work status
- 11 provided images processed into full and thumbnail WebP resources locally; not uploaded to the GitHub branch yet.
- Local code developed for seven determined effects: use_every_slot, make_way, electric_shock_1, spare_bow, predict_result, kingslayer, united_will. Existing 20 silver augments retained.
- Local JS parse checks and 40 numeric AI battle simulations passed.
- Not yet released; browser gameplay and ambiguous rules must be resolved before merge.

## Confirmed November 8 clarifications (implemented in local test build)
- 탐사: At the beginning of each owner's combat turn, remove the unit in rear position 6 if occupied; accumulate its **base mana cost** across the league. At 33 mana, flag reward as pending; do not invent the reward.
- 새로 고침의 날: During your summon phase, activate refresh mode and click the **specific hand card you choose**. One replacement consumes exactly 1 of the 3 uses. Current draft keeps unused uses across league battles.
- 권투 교습: Only FRONT-row units gain HP, +1 current/max HP for each 2 occupied front-row cards. The bonus updates when cards enter or leave.

## Clarifications needed
- 탐사: confirm the 33-mana large reward (currently pending), and whether 'round' means each individual combat turn (current assumption) or once per league match.
- 약간 신비한 주사위: confirmed and implemented in v1.2.6, payouts [2,4,7,10,13,17] gold for rolls 1 through 6.
- 새로 고침의 날: confirm the 3 uses apply to the whole 8-player league (current assumption) rather than resetting for every fight.
- 권투 교습: implemented as dynamically recalculated bonus for front-row units.
- Confirm if game-end empty-slot gold is calculated at the end of each league battle, and whether new weapon draws search the current deck.

## Validation
- 31 entries registered. User-selected hand replacement test, front-row-only boxing HP, exploration rear-slot loss & mana accumulation passed.
- 40 AI numeric duel tests passed; browser loading was blocked by the current test environment. NOT released to main.

## v1.2.6 additional rules and verified implementation
- All eight participants begin rounds **1-1** and **1-2** without augments.
- **Before round 1-3 combat**, seven AI participants receive their augments; player must select one of 31 before the 1-3 fight begins.
- **약간 신비한 주사위** is enabled: uniformly roll 1–6 one time when selected; grant 2, 4, 7, 10, 13, 17 gold respectively. Store last roll and payout in the player's silver state; no repeated rewards.
- Both full-resolution WebP and loading-thumbnail WebP artwork of the 11 newly supplied augments are committed to this branch.
- Save key upgraded to `arcana_league_v126` to preserve legacy game save storage.
- Tests: JS parse checks, real Chromium inline-document UI tests for start / 1-1 / 1-2 / 1-3 / dice / boxing selection; first league battle boot test; one 12-round numeric AI duel for each of 31 augment types, without script errors.
- Exploration's 33-mana reward remains deliberately undefined per user instruction. Code only records progress and marks reward pending.
