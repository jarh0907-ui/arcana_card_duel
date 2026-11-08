// 아르카나 카드 듀얼 - character pack registry (file:// compatible)
(function (g) {
  'use strict';
  const packs = Object.create(null);
  const characters = Object.create(null);
  const items = Object.create(null);
  const spells = Object.create(null);
  g.ArcanaCharacterLibrary = {
    packs, characters, items, spells,
    registerPack(pack) {
      if (!pack || !pack.id || !pack.name) throw new Error('팩 id/name이 필요합니다.');
      packs[pack.id] = {...pack};
    },
    registerCharacter(character) {
      if (!character || !character.id || !packs[character.packId]) {
        throw new Error('캐릭터 등록 전 팩 등록이 필요합니다.');
      }
      characters[character.id] = {...character};
    },
    registerItem(item) {
      if (!item || !item.id || !packs[item.packId]) throw new Error('아이템 등록 전 팩 등록이 필요합니다.');
      items[item.id] = {...item};
    },
    registerSpell(spell) {
      if (!spell || !spell.id || !packs[spell.packId]) throw new Error('스펠 등록 전 팩 등록이 필요합니다.');
      spells[spell.id] = {...spell};
    },
    getSpell(id) { return spells[id] || null; },
    getItem(id) { return items[id] || null; },
    getCharacter(id) { return characters[id] || null; }
  };
})(window);
