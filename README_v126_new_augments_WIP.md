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

## Clarifications needed
- 탐사: exactly when is the rightmost rear unit sacrificed, is its mana value accumulated across fights, and what constitutes the large reward?
- 약간 신비한 주사위: what die outcomes and prizes are used?
- 새로 고침의 날: one card per swap or whole hand; and when can it be used?
- 권투 교습: who receives the HP bonus (front units vs player), and is the bonus dynamic / permanent?
- Confirm if game-end empty-slot gold is calculated at the end of each league battle, and whether new weapon draws search the current deck.
