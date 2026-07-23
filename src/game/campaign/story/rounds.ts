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
const SEOLHWA = { speaker: '설화', portraitJob: 'east_shaman', portraitGender: 'female' as const };
const BAEKRIN = { speaker: '백린', portraitJob: 'east_strategist', portraitGender: 'male' as const };
const KYLE = { speaker: '카일 로젠하임', portraitJob: 'west_knight', portraitGender: 'male' as const };
const MILITIA = { speaker: '민병대장', portraitJob: 'east_ninja', portraitGender: 'male' as const };
const OFFICER = { speaker: '생존 장교', portraitJob: 'east_general', portraitGender: 'male' as const };
const DOCTOR = { speaker: '현지 의사', portraitJob: 'west_priest', portraitGender: 'male' as const };

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
  {
    round: 5,
    act: 2,
    title: '무너진 성문',
    recLevelMin: 7,
    recLevelMax: 9,
    mapId: 'r5_castle',
    deployMax: 5,
    primary: 'killCommander',
    enemies: [
      { kind: 'sword', role: 'commander', spriteJob: 'west_knight', gender: 'male', name: '청류성 수비대장', levelOffset: 1 },
      { kind: 'spear', spriteJob: 'west_berserker', gender: 'male', name: '성문 수비병' },
      { kind: 'spear', spriteJob: 'west_berserker', gender: 'male', name: '성문 수비병' },
      { kind: 'bow', spriteJob: 'west_archer', gender: 'male', name: '성벽 궁수' },
      { kind: 'bow', spriteJob: 'west_archer', gender: 'male', name: '성벽 궁수' },
    ],
    joinBefore: ['seolhwa'],
    objectiveText: '적 지휘관 격파(성문 확보)',
    optionalText: ['설화 생존', '성당 부상자 보호', '화공 사용 금지'],
    preScene: {
      lines: [
        { narration: true, text: '벨라시온군이 점령한 청류성 탈환 작전. 성 안엔 양국 주민이 함께 남아 있다.' },
        { ...YEONBI, text: '성문을 열면 본대가 진입한다. 그 전에 민간 구역으로 적을 몰아넣지 마라.' },
        { ...SEOLHWA, text: '부상자는 성당으로 데려와. 어느 편이든 상관없어.' },
        { ...DOHYUN, text: '적군까지 치료하겠다고?' },
        { ...SEOLHWA, text: '죽어가는 동안에는 누구도 군복을 입고 있지 않아.' },
      ],
    },
    postScene: {
      lines: [
        { narration: true, text: '청류성 탈환 축하식이 열리지만, 성당에는 양쪽 시신이 섞여 있다.' },
        { ...SEOLHWA, text: '깃발이 바뀌었는데, 여기 누운 사람은 달라진 게 없네.' },
        { narration: true, text: '설화가 임시로 동행한다.' },
      ],
    },
  },
  {
    round: 6,
    act: 2,
    title: '포로의 길',
    recLevelMin: 8,
    recLevelMax: 10,
    mapId: 'r6_mountain',
    deployMax: 5,
    primary: 'killCommander',
    enemies: [
      { kind: 'blunt', role: 'commander', spriteJob: 'east_general', gender: 'male', name: '민병대장', levelOffset: 1 },
      { kind: 'spear', spriteJob: 'east_ninja', gender: 'male', name: '연화국 민병' },
      { kind: 'spear', spriteJob: 'east_ninja', gender: 'male', name: '연화국 민병' },
      { kind: 'blunt', spriteJob: 'east_general', gender: 'male', name: '연화국 민병' },
      { kind: 'bow', spriteJob: 'east_archer', gender: 'male', name: '분노한 주민' },
    ],
    joinBefore: ['seolhwa'],
    eventsAfter: [{ companionId: 'seolhwa', type: 'official' }],
    objectiveText: '민병대장 제압(포로 호송)',
    optionalText: ['민병대 전원 생존', '포로 전원 생존'],
    preScene: {
      lines: [
        { narration: true, text: '포로를 후방 수용소로 이송하는 임무. 가족을 잃은 민병대가 행렬을 막는다.' },
        { ...MILITIA, text: '저들이 우리 가족을 죽였다. 군이 못 한다면 우리가 심판한다.' },
        { ...DOHYUN, text: '비켜줄 이유가 없어. 저 말이 틀렸어?' },
        { ...YEONBI, text: '항복한 자를 죽이면 군인이 아니라 살인자가 된다.' },
      ],
    },
    postScene: {
      lines: [
        { ...DOHYUN, text: '살아 있을 수도 있다는 말로 뭘 바꾸자는 거야? 없다는 걸 확인하지 못했을 뿐이잖아.' },
        { ...SEOLHWA, text: '확실하지 않은 죽음을 복수의 이유로 삼으면, 그 사람이 살아 돌아와도 네 증오는 끝나지 않아.' },
        { narration: true, text: '설화가 정식으로 합류했다.' },
      ],
    },
  },
  {
    round: 7,
    act: 2,
    title: '피로 세운 다리',
    recLevelMin: 10,
    recLevelMax: 12,
    mapId: 'r7_bridge',
    deployMax: 6,
    primary: 'surviveTurns',
    turnLimit: 10,
    enemies: [
      { kind: 'sword', role: 'commander', spriteJob: 'west_knight', gender: 'male', name: '추격대 지휘관', levelOffset: 1 },
      { kind: 'sword', spriteJob: 'west_berserker', gender: 'male', name: '추격병' },
      { kind: 'spear', spriteJob: 'west_berserker', gender: 'male', name: '추격병' },
      { kind: 'sword', spriteJob: 'west_knight', gender: 'male', name: '기병' },
      { kind: 'bow', spriteJob: 'west_archer', gender: 'male', name: '추격 궁수' },
    ],
    joinBefore: ['baekrin'],
    objectiveText: '10턴 동안 피난 엄호(생존)',
    optionalText: ['피난민 전원 구조', '추격대 지휘관 생포'],
    preScene: {
      lines: [
        { narration: true, text: '벨라시온 본대를 막기 위해 백린이 다리 폭파를 제안한다. 다리는 피난민의 마지막 탈출로이기도 하다.' },
        { ...BAEKRIN, text: '다리를 지금 끊으면 피난민 서른 명이 고립된다. 끊지 않으면 사흘 안에 병사 삼백 명이 죽는다.' },
        { ...SEOLHWA, text: '서른 명의 이름은 알고 있어?' },
        { ...BAEKRIN, text: '이름을 알아도 숫자는 변하지 않는다.' },
      ],
    },
    postScene: {
      lines: [
        { ...BAEKRIN, text: '계산보다 빨랐군. 다음에도 가능하다고 기대하진 마라.' },
        { narration: true, text: '백린이 부대에 합류해 지원을 시작한다.' },
      ],
    },
  },
  {
    round: 8,
    act: 2,
    title: '서쪽의 사냥개',
    recLevelMin: 11,
    recLevelMax: 14,
    mapId: 'r8_hills',
    deployMax: 6,
    primary: 'killCommander',
    enemies: [
      { kind: 'sword', role: 'commander', spriteJob: 'west_knight', gender: 'male', name: '카일 로젠하임', levelOffset: 2 },
      { kind: 'sword', spriteJob: 'west_knight', gender: 'male', name: '벨라시온 기사' },
      { kind: 'sword', spriteJob: 'west_knight', gender: 'male', name: '벨라시온 기사' },
      { kind: 'bow', spriteJob: 'west_archer', gender: 'male', name: '벨라시온 궁수' },
      { kind: 'bow', spriteJob: 'west_archer', gender: 'male', name: '벨라시온 궁수' },
      { kind: 'tome', spriteJob: 'west_witch', gender: 'female', name: '벨라시온 마법병' },
    ],
    joinBefore: ['baekrin'],
    eventsAfter: [{ companionId: 'baekrin', type: 'official' }],
    objectiveText: '카일 격파(지휘관 처치)',
    optionalText: ['카일 외 지휘관 처치 금지', '10턴 이내 승리'],
    preScene: {
      lines: [
        { narration: true, text: '주인공 부대는 벨라시온의 젊은 기사단장 카일 로젠하임과 처음 대면한다.' },
        { ...KYLE, text: '연화국의 영웅이라 들었다. 서쪽에서 네 나라의 영웅들이 무엇을 했는지 아나?' },
        { ...HERO, text: '침략한 건 너희다.' },
        { ...KYLE, text: '오늘의 국경만 보고 말하는군.' },
        { ...BAEKRIN, text: '대화는 시간을 낭비한다. 지휘관을 쓰러뜨려라.' },
      ],
    },
    postScene: {
      lines: [
        { ...KYLE, text: '다음에 만날 때는 네가 무엇을 지키는지 알고 왔으면 좋겠군.' },
        { ...HERO, text: '우리 나라를 지킨다.' },
        { ...KYLE, text: '나라가 숨긴 것까지 지킬 셈인가?' },
        { narration: true, text: '카일이 퇴각한다. 백린이 정식으로 합류했다.' },
      ],
    },
  },
  {
    round: 9,
    act: 3,
    title: '폐허의 기록',
    recLevelMin: 13,
    recLevelMax: 16,
    mapId: 'r9_ruins',
    deployMax: 7,
    primary: 'killCommander',
    enemies: [
      { kind: 'dagger', role: 'commander', spriteJob: 'east_ninja', gender: 'male', name: '비밀부대장', levelOffset: 1 },
      { kind: 'dagger', spriteJob: 'east_ninja', gender: 'male', name: '연화국 비밀부대' },
      { kind: 'spear', spriteJob: 'east_general', gender: 'male', name: '연화국 비밀부대' },
      { kind: 'thrown', spriteJob: 'east_strategist', gender: 'male', name: '기록 소각병' },
      { kind: 'dagger', spriteJob: 'east_ninja', gender: 'male', name: '약탈자' },
      { kind: 'bow', spriteJob: 'east_archer', gender: 'male', name: '퇴로 차단병' },
    ],
    objectiveText: '비밀부대장 격파(기록 확보)',
    optionalText: ['기록 전부 확보', '현지 주민 전원 생존'],
    preScene: {
      lines: [
        { narration: true, text: '벨라시온의 이동 경로를 쫓다 폐허가 된 서부 사원을 발견한다. 이곳엔 과거 연화국 원정군의 명령서가 있다.' },
        { ...YEONBI, text: '이곳은 반란군의 거점이었다고 배웠다.' },
        { narration: true, text: '현지 노인: "우리는 이곳을 마을이라 불렀다."' },
        { narration: true, text: '적은 벨라시온군이 아니라 연화국 비밀부대다. 그들은 기록을 태우려 한다.' },
      ],
    },
    postScene: {
      lines: [
        { narration: true, text: '명령서: "서부 제7구역을 적대 지역으로 선포한다. 주민과 반란군의 구분은 현장 지휘관의 판단에 맡긴다."' },
        { ...YEONBI, text: '위조다.' },
        { ...BAEKRIN, text: '인장과 군문 양식은 진짜다.' },
        { ...YEONBI, text: '아버지는 사람을 구한 영웅이었다.' },
        { narration: true, text: '명령서 마지막 장 일부가 뜯겨 있다. 아버지가 전쟁 후 진상 공개를 요청했다는 흔적.' },
      ],
    },
  },
  {
    round: 10,
    act: 3,
    title: '영웅의 이름',
    recLevelMin: 15,
    recLevelMax: 18,
    mapId: 'r10_hermitage',
    deployMax: 7,
    primary: 'killCommander',
    enemies: [
      { kind: 'sword', role: 'commander', spriteJob: 'east_duelist', gender: 'male', name: '중앙군 추격 지휘관', levelOffset: 1 },
      { kind: 'spear', spriteJob: 'east_general', gender: 'male', name: '중앙군 추격대' },
      { kind: 'sword', spriteJob: 'east_duelist', gender: 'male', name: '중앙군 추격대' },
      { kind: 'blunt', spriteJob: 'east_general', gender: 'male', name: '중앙군 추격대' },
      { kind: 'bow', spriteJob: 'east_archer', gender: 'male', name: '중앙군 궁수' },
      { kind: 'dagger', spriteJob: 'east_ninja', gender: 'male', name: '중앙군 기동병' },
    ],
    objectiveText: '추격 지휘관 격파(장교 호위)',
    optionalText: ['중앙군 처치 최소화', '추격 지휘관 생포'],
    preScene: {
      lines: [
        { narration: true, text: '연화국 중앙이 기록 회수를 명한다. 연비는 아버지의 진실을 확인하려 원정군 생존자를 찾아간다.' },
        { ...OFFICER, text: '그분은 명령을 내렸다. 부하들을 살리려면 마을을 포기해야 했다.' },
        { ...YEONBI, text: '그럼 학살을 인정한 겁니까?' },
        { ...OFFICER, text: '전쟁이 끝난 뒤 그분은 모든 기록을 공개하려 했다. 그 다음 날 영웅으로 추서되었지.' },
      ],
    },
    postScene: {
      lines: [
        { ...YEONBI, text: '아버지를 무죄로 만들고 싶었다. 하지만 그 한 사람에게 모든 죄를 씌우는 것도 같은 거짓이야.' },
        { ...HERO, text: '그럼 무엇을 할 겁니까?' },
        { ...YEONBI, text: '명령한 사람, 따랐던 사람, 숨긴 사람을 전부 기록하겠다. 아버지도 그 안에 넣을 거다.' },
      ],
    },
  },
  {
    round: 11,
    act: 3,
    title: '같은 불꽃',
    recLevelMin: 17,
    recLevelMax: 20,
    mapId: 'r11_village2',
    deployMax: 7,
    primary: 'killCommander',
    enemies: [
      { kind: 'sword', role: 'commander', spriteJob: 'west_knight', gender: 'male', name: '벨라시온 지휘관', levelOffset: 1 },
      { kind: 'spear', spriteJob: 'west_berserker', gender: 'male', name: '벨라시온 수비병' },
      { kind: 'sword', spriteJob: 'west_knight', gender: 'male', name: '벨라시온 수비병' },
      { kind: 'spear', spriteJob: 'west_berserker', gender: 'male', name: '벨라시온 수비병' },
      { kind: 'tome', spriteJob: 'west_priest', gender: 'female', name: '치료 장교' },
      { kind: 'bow', spriteJob: 'west_archer', gender: 'male', name: '퇴각 엄호병' },
    ],
    objectiveText: '적 지휘관 격파(화공 없이 공략)',
    optionalText: ['화공 미사용', '민간인 구출', '적군 치료사 생존'],
    preScene: {
      lines: [
        { narration: true, text: '벨라시온군이 숲속 마을에 방어진을 친다. 백린이 화공을 제안한다. 바람은 적진 방향이다.' },
        { ...BAEKRIN, text: '불을 놓으면 한 시간 안에 전투가 끝난다.' },
        { ...SEOLHWA, text: '마을 안에 사람이 있어.' },
        { ...BAEKRIN, text: '대피하지 않은 자들이다.' },
        { ...YEONBI, text: '과거 기록에도 같은 문장이 있었다.' },
      ],
    },
    postScene: {
      lines: [
        { ...SEOLHWA, text: '내가 살린 사람이 누군가를 죽였어.' },
        { ...BAEKRIN, text: '살리는 일도 결과에서 자유롭지 않다. 다만 선한 일이라 이름 붙인 뒤 책임을 끝내지 마라.' },
        { ...HERO, text: '당신 계산에는 왜 이 사람들이 없습니까?' },
        { ...BAEKRIN, text: '전쟁 결과를 바꿀 수 없는 숫자이기 때문이다.' },
        { ...HERO, text: '결과에서 지운다고 죽지 않은 사람이 되는 건 아닙니다.' },
      ],
    },
  },
  {
    round: 12,
    act: 3,
    title: '적의 얼굴',
    recLevelMin: 19,
    recLevelMax: 22,
    mapId: 'r12_mine',
    deployMax: 7,
    primary: 'killCommander',
    enemies: [
      { kind: 'blunt', role: 'commander', spriteJob: 'west_berserker', gender: 'male', name: '용병대장', levelOffset: 1 },
      { kind: 'sword', spriteJob: 'west_berserker', gender: 'male', name: '폭주 용병' },
      { kind: 'blunt', spriteJob: 'west_berserker', gender: 'male', name: '폭주 용병' },
      { kind: 'dagger', spriteJob: 'west_ranger', gender: 'male', name: '폭주 용병' },
      { kind: 'dagger', spriteJob: 'west_ranger', gender: 'female', name: '감염된 야수' },
      { kind: 'dagger', spriteJob: 'west_ranger', gender: 'female', name: '감염된 야수' },
    ],
    joinBefore: ['kyle'],
    eventsAfter: [{ companionId: 'kyle', type: 'leave' }],
    objectiveText: '용병대장 격파(감염자 구조)',
    optionalText: ['양국 부상자 동일 인원 구조', '벨라시온 의사 생존'],
    preScene: {
      lines: [
        { narration: true, text: '전염병이 번진 폐광에서 양국 병사·주민이 고립된다. 주인공과 카일은 각자의 사람을 구하려 일시 협력한다.' },
        { ...KYLE, text: '전투가 끝날 때까지만 같은 편이다.' },
        { ...HERO, text: '사람을 구하는 데 편이 필요합니까?' },
        { ...KYLE, text: '그 말을 네 치료사에게 배웠나?' },
        { ...SEOLHWA, text: '아니. 이제는 그 말도 의심하고 있어.' },
      ],
    },
    postScene: {
      lines: [
        { ...KYLE, text: '내 부모는 연화국군에게 죽었다고 배웠다.' },
        { ...DOCTOR, text: '아니다. 네 부모는 연화국군이 물러간 뒤, 협력자라는 의심을 받아 우리 손에 죽었다.' },
        { ...KYLE, text: '그 사실을 누가 숨겼지?' },
        { ...DOCTOR, text: '하나가 되려면 명확한 적이 필요하다고 했다. 그때 그 말을 한 사람이 발테르였다.' },
        { narration: true, text: '카일은 충격을 받지만 주인공과 바로 동행하지 않고 벨라시온으로 돌아간다.' },
      ],
    },
  },
];

/** 라운드 번호로 스토리 정의를 찾는다(1막 범위를 벗어나면 undefined). */
export function storyRoundDef(round: number): StoryRoundDef | undefined {
  return STORY_ROUNDS.find((r) => r.round === round);
}
