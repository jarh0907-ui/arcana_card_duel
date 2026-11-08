// 키레네 일러스트 + 대사. 문자열 경로는 game index.html을 기준으로 함.
(function (lib) {
  const base = './캐릭터/붕괴 스타레일 팩/키레네/';
  lib.registerCharacter({
    id: 'kyrene',
    name: '키레네',
    packId: 'honkai-star-rail',
    art: {
      normal: base + 'images/normal.png',
      restrained: base + 'images/mk1_restrained.png',
      puppet: base + 'images/puppet.png',
      tribal: base + 'images/tribal.png',
      tribalStage2: base + 'images/tribal2.webp',
      awakened: base + 'images/kyrene_awakened.png',
      heartBuff: base + 'images/kyrene_heart_buff.png',
      spellNormal: base + 'images/kyrene_spell_normal.png',
      spellAwakened: base + 'images/kyrene_spell_awakened.png'
    },
    weapon: {bow: base + 'images/bow.png', arrow: base + 'images/arrow.png',
      awakenedBow: base + 'images/kyrene_awaken_bow.png', awakenedArrow: base + 'images/kyrene_awaken_arrow.png'},
    voice: {
      meet: [base+'audio/meet1.wav',base+'audio/meet2.wav',base+'audio/meet3.wav',base+'audio/meet4.wav'],
      select: [base+'audio/select1.wav'],
      meetanimal: [base+'audio/meetanimal1.wav',base+'audio/meetanimal2.wav'],
      selectanimal: [base+'audio/selectanimal1.wav',base+'audio/selectanimal2.wav'],
      meetdol: [base+'audio/meetdol1.wav',base+'audio/meetdol2.wav'],
      selectdol: [base+'audio/selectdol1.wav',base+'audio/selectdol2.wav']
    }
  });
})(window.ArcanaCharacterLibrary);
