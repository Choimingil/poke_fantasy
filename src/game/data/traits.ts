import type { WeaponKind } from '../types';

/** 고유 특성 범주(기획안 §43.16). */
export type TraitCategory = 'attack' | 'defense' | 'mobility' | 'support' | 'command' | 'growth' | 'utility';

export const TRAIT_CATEGORY_LABEL: Record<TraitCategory, string> = {
  attack: '공격', defense: '방어', mobility: '기동', support: '지원', command: '지휘', growth: '성장', utility: '범용',
};

export interface Trait {
  id: string;
  name: string;
  category: TraitCategory;
  /** 효과 한 줄 설명(§43.14). */
  effect: string;
}

/**
 * 66개 고유 특성(기획안 §43). 등급 구분 없이 동일 수준으로 설계.
 * 이 중 일부는 전투 엔진에 효과가 배선되어 있고(`WIRED_TRAIT_IDS`, traitEffects.ts), 나머지는
 * 표시·빌드 정체성용으로 등장하며 효과 배선은 후속 단계에서 추가한다.
 */
const TRAITS: Trait[] = [
  // ── 공격형 ──
  { id: 'vanguard', name: '선봉장', category: 'attack', effect: '전투 중 첫 직접 공격 위력 +15%(재행동 제외).' },
  { id: 'chaser', name: '추격자', category: 'attack', effect: '체력 30% 이하 적에게 주는 직접 공격 피해 +15%.' },
  { id: 'gale', name: '질풍', category: 'attack', effect: '일반 이동 3칸 이상 후 공격 시 명중률 +10.' },
  { id: 'composure', name: '침착함', category: 'attack', effect: '이번 턴 이동하지 않았다면 직접 공격 명중률 +10.' },
  { id: 'flank', name: '측면 공격', category: 'attack', effect: '대상 인접에 다른 아군이 있으면 직접 공격 위력 +10%.' },
  { id: 'isolate', name: '고립 사냥', category: 'attack', effect: '대상 2칸 이내에 다른 적이 없으면 직접 공격 위력 +15%.' },
  { id: 'vengeance', name: '복수심', category: 'attack', effect: '아군이 쓰러진 뒤 첫 직접 공격 위력 +20%(전투당 1회).' },
  { id: 'analyze', name: '약점 분석', category: 'attack', effect: '상성상 유리한 속성으로 공격 시 명중률 +10.' },
  { id: 'pressure', name: '압박', category: 'attack', effect: '체력 최대인 적을 공격하면 방어력 10% 무시.' },
  { id: 'onslaught', name: '맹공', category: 'attack', effect: '한 라운드에 처음 쓰는 횟수 제한 기술 위력 +10%.' },
  // ── 방어형 ──
  { id: 'toughness', name: '강인한 체질', category: 'defense', effect: '최대 체력 +10%.' },
  { id: 'heavyArmor', name: '중장 숙련', category: 'defense', effect: '중갑·판금의 이동 감소를 0.2 완화한다.' },
  { id: 'shieldMastery', name: '방패 숙련', category: 'defense', effect: '방패로 얻는 방어력 +15%.' },
  { id: 'endure', name: '버티기', category: 'defense', effect: '최대 체력 30% 이상 피해를 받으면 15% 감소(라운드당 1회).' },
  { id: 'indomitable', name: '불굴의 정신', category: 'defense', effect: '전투 중 처음 받는 상태이상 지속시간 -1턴.' },
  { id: 'vigilance', name: '경계', category: 'defense', effect: '자신 턴 시작 전 처음 받는 직접 공격 피해 -10%.' },
  { id: 'rearguard', name: '후방 수비', category: 'defense', effect: '주변 1칸에 체력 50% 이하 아군이 있으면 받는 피해 -10%.' },
  { id: 'crisisResponse', name: '위기 대응', category: 'defense', effect: '체력 40% 이하가 처음 되면 2턴간 방어력 +15%(전투당 1회).' },
  { id: 'fireResist', name: '불길 내성', category: 'defense', effect: '불 타일 피해가 최대체력 1/4 → 1/6로 감소.' },
  { id: 'emergencyDefense', name: '응급 방어', category: 'defense', effect: '체력 20% 이하에서 직접 공격 피해 -30%(전투당 1회).' },
  // ── 기동·지형형 ──
  { id: 'swimming', name: '수영 숙련', category: 'mobility', effect: '물 진입 비용 -1(최소 1, 적응력과 미중첩).' },
  { id: 'snowAdapt', name: '설원 적응', category: 'mobility', effect: '눈으로 늘어난 평지·숲 이동 비용 무시.' },
  { id: 'mountaineer', name: '산악병', category: 'mobility', effect: '전투당 처음 언덕 진입 시 공격 제한 무시.' },
  { id: 'forester', name: '숲지기', category: 'mobility', effect: '숲의 적 발견 거리 1 → 2칸.' },
  { id: 'nightSight', name: '야간 시야', category: 'mobility', effect: '밤 시야 감소 1 완화.' },
  { id: 'lightStep', name: '경량 보행', category: 'mobility', effect: '장비 총무게가 적재량 절반 이하면 이동력 +1(최대 5).' },
  { id: 'pathfinder', name: '길잡이', category: 'mobility', effect: '인접 아군의 물·눈 진입 추가 비용 -1(미중첩).' },
  { id: 'retreat', name: '퇴로 확보', category: 'mobility', effect: '직접 공격 후 반대 방향 빈칸으로 1칸 이동(라운드당 1회).' },
  { id: 'nimbleLanding', name: '민첩한 착지', category: 'mobility', effect: '밀쳐내기·강제 이동 시 충돌 추가 피해 무효.' },
  { id: 'scout', name: '정찰병', category: 'mobility', effect: '전투 시작 시 시야 +2(첫 턴 종료 시 사라짐).' },
  // ── 지원형 ──
  { id: 'medic', name: '구호병', category: 'support', effect: '회복 기술 회복량 +15%.' },
  { id: 'purifier', name: '정화술사', category: 'support', effect: '정화 사용 시 대상 1턴 정신 저항 +10%.' },
  { id: 'encourage', name: '격려', category: 'support', effect: '아군에게 보조 기술 사용 시 대상 다음 직접 공격 명중률 +5.' },
  { id: 'corpsman', name: '의무병', category: 'support', effect: '인접 아군 회복 시 회복량 추가 +10%.' },
  { id: 'focusedSupport', name: '집중 지원', category: 'support', effect: '단일 대상 보조 기술 지속시간 +1턴(최대 4턴).' },
  { id: 'covering', name: '원호', category: 'support', effect: '주변 2칸 아군이 원거리 공격 받을 때 회피율 +5.' },
  { id: 'tacticalHeal', name: '전술 치료', category: 'support', effect: '체력 30% 이하 아군 회복 시 회복량 +20%.' },
  { id: 'stabilize', name: '안정화', category: 'support', effect: '아군 회복 시 출혈 또는 맹독 하나 제거.' },
  { id: 'regroup', name: '재정비', category: 'support', effect: '장비 교체한 아군에게 보조 시 다음 턴 이동력 +1(전투당 1회).' },
  { id: 'signaler', name: '신호수', category: 'support', effect: '적에게 보조·약화 적중 시 2턴 표식(아군 명중률 +5).' },
  // ── 지휘·협동형 ──
  { id: 'captain', name: '용병대장', category: 'command', effect: '주변 2칸 아군 명중률 +5(자신 제외·미중첩).' },
  { id: 'bond', name: '결속', category: 'command', effect: '주변 1칸에 아군이 있으면 자신·해당 아군 직접 공격 피해 -5%.' },
  { id: 'pincerCommand', name: '협공 지휘', category: 'command', effect: '주변 2칸 아군의 추가 공격 피해 +10%.' },
  { id: 'holdLine', name: '전열 유지', category: 'command', effect: '인접 아군의 밀쳐내기 거리 -1(1칸은 무효).' },
  { id: 'coverSwap', name: '교대 엄호', category: 'command', effect: '인접 아군이 장비 교체로 턴 종료 시 다음 턴까지 피해 -10%.' },
  { id: 'tacticalShare', name: '전술 공유', category: 'command', effect: '천리안·투시·급류·등반 하나를 인접 아군 1명에게도 적용.' },
  { id: 'formation', name: '진형 강화', category: 'command', effect: '직교 인접에 아군 2명 이상이면 자신·해당 아군 방어력 +5%.' },
  { id: 'anchor', name: '구심점', category: 'command', effect: '주변 2칸에서 턴 시작한 아군의 첫 상태이상 정신 저항 +10%.' },
  { id: 'morale', name: '사기 진작', category: 'command', effect: '적 처치 시 주변 2칸 아군 1명 다음 공격 위력 +10%(라운드당 1회).' },
  { id: 'calmCommand', name: '침착한 지휘', category: 'command', effect: '주변 2칸 아군의 명중률 감소 효과 최대 10까지만 적용.' },
  // ── 성장·운영형 ──
  { id: 'trainingFreak', name: '훈련광', category: 'growth', effect: '무기 숙련 경험치 +15%(달인 시 명중률 +5).' },
  { id: 'weaponLover', name: '무기 애호가', category: 'growth', effect: '예비 무기 1개 무게 50%만 적용(교체 후 첫 공격 명중 +5).' },
  { id: 'porter', name: '짐꾼', category: 'growth', effect: '적재량 +2kg.' },
  { id: 'thrifty', name: '절약가', category: 'growth', effect: '장비 강화 비용 -15%(2회↑ 기술 첫 사용 10% 미소모).' },
  { id: 'veteran', name: '노련한 용병', category: 'growth', effect: '현재 숙련도 피해 난수 하한 +5%.' },
  { id: 'repairer', name: '수리공', category: 'growth', effect: '장착한 강화 장비의 강화 효과 +10%.' },
  { id: 'quartermaster', name: '보급 담당', category: 'growth', effect: '전투 종료 시 장착 기술 하나 사용 횟수 +1(1회 기술 제외).' },
  { id: 'merchant', name: '상인 기질', category: 'growth', effect: '출전 전투 장비 판매가 +5%(첫 공격 명중 +5·미중첩).' },
  // ── 범용형 ──
  { id: 'balance', name: '균형 감각', category: 'utility', effect: '가장 낮은 기본 능력치 +5로 판정(장비 요구치 제외).' },
  { id: 'fastLearner', name: '빠른 학습', category: 'utility', effect: '전직 직후 3전투 동안 새 무기 기술 명중 +10(이후 숙련 경험치 +5%).' },
  { id: 'preparation', name: '준비성', category: 'utility', effect: '전투 시작 2턴간 방어력·정신 저항 각 +5%.' },
  { id: 'concentration', name: '집중력', category: 'utility', effect: '라운드당 처음 쓰는 기술은 적 명중 감소 5 무시.' },
  { id: 'secondWind', name: '기사회생', category: 'utility', effect: '체력 30% 이하가 된 뒤 턴 시작 시 최대체력 10% 회복(전투당 1회).' },
  { id: 'persistence', name: '끈기', category: 'utility', effect: '강화 효과 해제 시 20% 확률로 1턴 연장.' },
  { id: 'prudence', name: '신중함', category: 'utility', effect: '이번 턴 2칸 이하 이동했다면 다음 피격 회피율 +5.' },
  { id: 'agility', name: '기민함', category: 'utility', effect: '적 공격으로 체력 50% 이하가 되면 멀어지는 방향 1칸 이동(전투당 1회).' },
];

const TRAIT_BY_ID = new Map(TRAITS.map((t) => [t.id, t]));

export function getTrait(id: string): Trait | undefined {
  return TRAIT_BY_ID.get(id);
}

function traitsByCategory(cat: TraitCategory): Trait[] {
  return TRAITS.filter((t) => t.category === cat);
}

/** 캐릭터 주 역할별 특성군 등장 가중치(기획안 §43.11). */
export type CharacterRole = 'melee' | 'defender' | 'ranged' | 'mage' | 'support' | 'flex';

const ROLE_WEIGHTS: Record<CharacterRole, Partial<Record<TraitCategory, number>>> = {
  melee: { attack: 60, mobility: 25, utility: 15 },
  defender: { defense: 60, command: 25, utility: 15 },
  ranged: { attack: 45, mobility: 30, support: 10, utility: 15 },
  mage: { attack: 40, support: 25, mobility: 15, utility: 20 },
  support: { support: 55, command: 25, utility: 20 },
  flex: { utility: 35, growth: 25, attack: 10, defense: 10, mobility: 10, support: 5, command: 5 },
};

/** 무기 종류 → 주 역할(특성 가중치 결정용). */
export function roleForWeaponKind(kind: WeaponKind): CharacterRole {
  switch (kind) {
    case 'blunt': case 'shield': return 'defender';
    case 'bow': case 'crossbow': case 'thrown': return 'ranged';
    case 'staff': case 'tome': return 'mage';
    case 'sword': case 'spear': return 'melee';
    case 'dagger': return 'flex';
    default: return 'flex';
  }
}

/** 무기 역할과 연계되는 대표 특성 범주(주인공 후보 시너지용). */
const ROLE_PRIMARY_CATEGORY: Record<CharacterRole, TraitCategory> = {
  melee: 'attack', defender: 'defense', ranged: 'mobility', mage: 'support', support: 'support', flex: 'utility',
};

/**
 * 주인공 시작 특성 후보 3개(§43.12): ①공격·방어 ②기동·지원·지휘 ③성장·범용에서 각 1개.
 * 초기 무기 역할과 연계되는 범주가 포함된 버킷은 그 범주에서 뽑아 최소 하나는 무기와 자연스럽게 이어지게 한다.
 */
export function rollHeroTraitCandidates(weaponKind: WeaponKind, rng: () => number): string[] {
  const roleCat = ROLE_PRIMARY_CATEGORY[roleForWeaponKind(weaponKind)];
  const buckets: TraitCategory[][] = [
    ['attack', 'defense'],
    ['mobility', 'support', 'command'],
    ['growth', 'utility'],
  ];
  return buckets.map((cats) => {
    const cat = cats.includes(roleCat) ? roleCat : cats[Math.floor(rng() * cats.length)];
    const pool = traitsByCategory(cat);
    return pool[Math.floor(rng() * pool.length)].id;
  });
}

/** 역할 가중치에 따라 무작위 고유 특성 하나를 선택한다(§43.11). */
export function rollTraitForRole(role: CharacterRole, rng: () => number): Trait {
  const weights = ROLE_WEIGHTS[role];
  const cats = Object.keys(weights) as TraitCategory[];
  const total = cats.reduce((s, c) => s + (weights[c] ?? 0), 0);
  let pick = rng() * total;
  let chosen: TraitCategory = cats[0];
  for (const c of cats) {
    pick -= weights[c] ?? 0;
    if (pick <= 0) { chosen = c; break; }
  }
  const pool = traitsByCategory(chosen);
  return pool[Math.floor(rng() * pool.length)];
}
