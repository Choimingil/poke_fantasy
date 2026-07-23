import type { StoryRoundDef } from './types';

/**
 * 《재가 된 깃발》 제1막(라운드 1~4) 스크립트.
 * 컷씬 대사는 시나리오 기획서를 압축·발췌한 것으로, 후속 막에서 5~20 라운드를 이어 추가한다.
 */

const HERO = { hero: true } as const;
const DOHYUN = { speaker: '도윤', portraitJob: 'east_general', portraitGender: 'male' as const };
const YEONBI = { speaker: '연비', portraitJob: 'east_duelist', portraitGender: 'male' as const };
const GUARD = { speaker: '마을 경비대장', portraitJob: 'east_general', portraitGender: 'male' as const };
const PLATOON = { speaker: '연화국 소대장', portraitJob: 'east_ninja', portraitGender: 'male' as const };
const HERALD = { speaker: '전령', portraitJob: 'east_archer', portraitGender: 'male' as const };
const CRIER = { speaker: '연화국 선전관', portraitJob: 'east_strategist', portraitGender: 'male' as const };

const STORY_ROUNDS: StoryRoundDef[] = [
  {
    round: 1,
    act: 1,
    title: '이름 없는 하루',
    recLevelMin: 1,
    recLevelMax: 2,
    mapId: 'r1_training',
    deployMax: 2,
    primary: 'annihilate',
    enemies: [
      { kind: 'blunt', role: 'elite', spriteJob: 'east_general', gender: 'male', name: '훈련 교관' },
      { kind: 'spear', spriteJob: 'east_ninja', gender: 'male', name: '모의 병사' },
      { kind: 'sword', spriteJob: 'east_duelist', gender: 'male', name: '모의 병사' },
    ],
    joinBefore: ['dohyun'],
    objectiveText: '훈련 상대 제압',
    optionalText: ['아군 전투불능 없이 승리', '기술 1회 사용'],
    preScene: {
      lines: [
        { narration: true, text: '마을 훈련장. 전쟁의 소문이 변방까지 닿았다.' },
        { ...DOHYUN, text: '전쟁이 난다는 소문이 진짜일까?' },
        { ...HERO, text: '국경은 여기서 멀어. 우리가 걱정할 일은 아니겠지.' },
        { ...GUARD, text: '무기를 든 이상 다루는 법은 알아야 한다. 오늘은 물러나는 법부터 배운다.' },
        { ...DOHYUN, text: '쓰러뜨리는 법이 아니라 도망치는 법부터요?' },
        { ...GUARD, text: '살아남지 못한 사람은 누구도 지킬 수 없으니까.' },
      ],
    },
    postScene: {
      lines: [
        { ...GUARD, text: '힘이 부족한 건 부끄러운 게 아니다. 부족한 줄 모르고 칼을 휘두르는 게 부끄러운 거지.' },
        { narration: true, text: '멀리서 검은 연기가 피어오른다.' },
        { ...HERALD, text: '서쪽 관문이 무너졌다! 벨라시온군이 국경을 넘었다!' },
        { narration: true, text: '도윤이 임시로 함께한다.' },
      ],
    },
  },
  {
    round: 2,
    act: 1,
    title: '검은 깃발',
    recLevelMin: 1,
    recLevelMax: 3,
    mapId: 'r2_village',
    deployMax: 2,
    primary: 'surviveTurns',
    turnLimit: 8,
    enemies: [
      { kind: 'sword', role: 'commander', spriteJob: 'west_knight', gender: 'male', name: '정찰대장' },
      { kind: 'bow', spriteJob: 'west_archer', gender: 'male', name: '벨라시온 정찰병' },
      { kind: 'bow', spriteJob: 'west_archer', gender: 'male', name: '벨라시온 정찰병' },
      { kind: 'spear', spriteJob: 'west_berserker', gender: 'male', name: '벨라시온 보병' },
      { kind: 'spear', spriteJob: 'west_berserker', gender: 'male', name: '벨라시온 보병' },
    ],
    joinBefore: ['dohyun'],
    eventsAfter: [{ companionId: 'dohyun', type: 'official' }],
    objectiveText: '8턴 동안 생존',
    optionalText: ['주민 전원 구출', '정찰대장 격파'],
    preScene: {
      lines: [
        { narration: true, text: '불타는 변방 마을. 연화국 병사들이 창고 곡식에 기름을 붓고 있다.' },
        { ...HERO, text: '지금 뭘 하는 겁니까?' },
        { ...PLATOON, text: '적에게 보급품을 넘길 수 없다. 대피가 끝나는 즉시 태운다.' },
        { ...DOHYUN, text: '아직 마을에 사람이 남아 있어요!' },
        { ...PLATOON, text: '대피 완료 보고를 받았다.' },
        { narration: true, text: '서쪽에서 벨라시온 정찰대가 나타나고, 혼란 속에 창고에 불이 붙는다.' },
      ],
    },
    postScene: {
      lines: [
        { ...YEONBI, text: '생존자를 데리고 성으로 이동한다. 이곳은 포기한다.' },
        { ...HERO, text: '누가 마을을 불태운 겁니까?' },
        { ...PLATOON, text: '벨라시온 놈들이다. 달리 누가 있겠나.' },
        { narration: true, text: '주인공은 불이 시작된 창고 옆에서 연화국 기름통 조각을 발견한다. 하지만 지금은 확인할 여유가 없다.' },
        { narration: true, text: '도윤이 정식으로 합류했다.' },
      ],
    },
  },
  {
    round: 3,
    act: 1,
    title: '살아남은 자의 자격',
    recLevelMin: 3,
    recLevelMax: 5,
    mapId: 'r3_keep',
    deployMax: 4,
    primary: 'killCommander',
    enemies: [
      { kind: 'sword', role: 'commander', spriteJob: 'east_duelist', gender: 'male', name: '연비', levelOffset: 1 },
      { kind: 'blunt', spriteJob: 'east_general', gender: 'male', name: '훈련 교관' },
      { kind: 'spear', spriteJob: 'east_ninja', gender: 'male', name: '훈련 교관' },
      { kind: 'bow', spriteJob: 'east_archer', gender: 'male', name: '훈련 교관' },
    ],
    joinBefore: ['dohyun'],
    objectiveText: '연비 제압(지휘관 격파)',
    optionalText: ['6턴 이내 승리', '고지대 원거리 공격 성공'],
    preScene: {
      lines: [
        { narration: true, text: '임시 피난 성채. 정규군은 더 이상 피난민을 지킬 여력이 없다.' },
        { ...YEONBI, text: '싸울 수 있는 사람은 병사가 되어야 한다.' },
        { ...DOHYUN, text: '우리를 버리겠다는 말입니까?' },
        { ...HERO, text: '싸우겠습니다.' },
        { ...YEONBI, text: '복수하려는 사람은 필요 없다. 명령을 따르면서도 사람을 볼 수 있는 병사가 필요하다.' },
      ],
    },
    postScene: {
      lines: [
        { ...YEONBI, text: '강하지는 않다. 하지만 위험한 사람을 먼저 보는 눈은 있군.' },
        { ...DOHYUN, text: '그게 칭찬입니까?' },
        { ...YEONBI, text: '전쟁에서는 최고의 칭찬이다.' },
        { narration: true, text: '연비가 임시로 동행한다.' },
      ],
    },
  },
  {
    round: 4,
    act: 1,
    title: '첫 번째 승리',
    recLevelMin: 5,
    recLevelMax: 7,
    mapId: 'r4_canyon',
    deployMax: 4,
    primary: 'killCommander',
    enemies: [
      { kind: 'sword', role: 'commander', spriteJob: 'west_knight', gender: 'male', name: '보급대 지휘관', levelOffset: 1 },
      { kind: 'spear', spriteJob: 'west_berserker', gender: 'male', name: '보급 호위병' },
      { kind: 'spear', spriteJob: 'west_berserker', gender: 'male', name: '보급 호위병' },
      { kind: 'bow', spriteJob: 'west_archer', gender: 'male', name: '원거리병' },
      { kind: 'bow', spriteJob: 'west_archer', gender: 'male', name: '원거리병' },
    ],
    joinBefore: ['dohyun', 'yeonbi'],
    eventsAfter: [{ companionId: 'yeonbi', type: 'official' }],
    objectiveText: '적 지휘관 격파(보급 차단)',
    optionalText: ['항복한 적 공격 금지', '적 치료병 생존'],
    preScene: {
      lines: [
        { narration: true, text: '벨라시온 보급대가 협곡을 통과한다. 연비가 주인공에게 분대를 맡긴다.' },
        { ...YEONBI, text: '처음으로 네 판단에 사람들의 목숨이 달렸다. 많이 죽이는 게 목표가 아니다. 보급 수레를 멈춰라.' },
        { ...HERO, text: '해보겠습니다.' },
      ],
    },
    postScene: {
      lines: [
        { ...CRIER, text: '변방의 생존자가 적의 보급대를 무너뜨렸다! 새로운 영웅의 탄생이다!' },
        { ...HERO, text: '우리가 한 일은 수레를 멈춘 것뿐입니다.' },
        { ...CRIER, text: '백성에게는 복잡한 사실보다 믿을 이야기가 필요하다.' },
        { narration: true, text: '적 병사의 편지: "이번 전투가 끝나면 집으로 돌아가겠다. 동쪽 사람도 우리와 같은 얼굴을 하고 있다는 말을 믿고 싶다."' },
        { narration: true, text: '연비가 정식으로 합류했다.' },
      ],
    },
  },
];

/** 라운드 번호로 스토리 정의를 찾는다(1막 범위를 벗어나면 undefined). */
export function storyRoundDef(round: number): StoryRoundDef | undefined {
  return STORY_ROUNDS.find((r) => r.round === round);
}
