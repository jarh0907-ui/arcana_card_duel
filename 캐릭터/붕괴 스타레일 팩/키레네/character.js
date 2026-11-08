// 키레네 일러스트 + 대사. 문자열 경로는 game index.html을 기준으로 함.
(function (lib) {
  const base = './캐릭터/붕괴 스타레일 팩/키레네/';
  lib.registerCharacter({
    id: 'kyrene',
    name: '키레네',
    packId: 'honkai-star-rail',
    art: {
      normal: base + 'images/normal.webp',
      restrained: base + 'images/mk1_restrained.webp',
      puppet: base + 'images/puppet.webp',
      tribal: base + 'images/tribal.webp',
      tribalStage2: base + 'images/tribal2.webp',
      awakened: base + 'images/kyrene_awakened.webp',
      heartBuff: base + 'images/kyrene_heart_buff.webp',
      spellNormal: base + 'images/kyrene_spell_normal.webp',
      spellAwakened: base + 'images/kyrene_spell_awakened.webp'
    },
    weapon: {bow: base + 'images/bow.webp', arrow: base + 'images/arrow.webp',
      awakenedBow: base + 'images/kyrene_awaken_bow.webp', awakenedArrow: base + 'images/kyrene_awaken_arrow.webp'},
    voice: {}
  });
})(window.ArcanaCharacterLibrary);
