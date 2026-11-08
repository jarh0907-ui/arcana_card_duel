// 카스토리스 - 붕괴 스타레일 팩 (이미지 자산은 index.html 기준 상대 경로)
(function(lib){
 'use strict';
 const base='./캐릭터/붕괴 스타레일 팩/카스토리스/images/';
 lib.registerCharacter({
  id:'castorice',name:'카스토리스',packId:'honkai-star-rail',
  art:{normal:base+'normal.webp',awakened:base+'awakened.webp',corporate:base+'corporate.webp',
       tribal:base+'tribal.webp',tribalStage2:base+'tribal2.webp',
       restrained:base+'restrained.webp',puppet:base+'puppet.webp',
       spellNormal:base+'spell_normal.webp',spellAwakened:base+'spell_awakened.webp'},
  weapon:{scythe:base+'scythe.webp',slash:base+'slash.webp'},voice:{}
 });
})(window.ArcanaCharacterLibrary);
