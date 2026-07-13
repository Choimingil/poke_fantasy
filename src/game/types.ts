export type Faction = 'east' | 'west';

/** 전사(근거리) / 격수(원거리) / 법사(마법) 세 타입의 순환 상성에 쓰이는 타입 */
export type CombatType = 'melee' | 'ranged' | 'magic';

type Handedness = 'oneHanded' | 'twoHanded';

type WeaponKind =
  | 'sword'
  | 'blunt'
  | 'shield'
  | 'spear'
  | 'thrown'
  | 'bow'
  | 'crossbow'
  | 'tome'
  | 'staff';

type StatKey = 'attack' | 'defense' | 'hp' | 'speed';

export type StatBlock = Record<StatKey, number>;

export type StatusEffectType = 'poison' | 'sleep' | 'paralysis' | 'bleed' | 'stun';

type SkillCategory = 'attack' | 'buff' | 'debuff' | 'heal' | 'status' | 'defense';

type SkillTarget = 'enemy' | 'ally' | 'self' | 'allEnemies' | 'allAllies';

interface SkillStatusEffect {
  effect: StatusEffectType;
  chance: number; // 0-1
}

export interface Skill {
  id: string;
  name: string;
  type: CombatType;
  category: SkillCategory;
  power: number;
  accuracy: number; // 0-100
  priority: number; // 기본 우선도, 클수록 먼저 행동
  target: SkillTarget;
  statusEffect?: SkillStatusEffect;
  healPercent?: number; // category === 'heal' 일 때 최대체력 대비 회복 비율(0-1)
  learnableBy: 'common' | string[]; // 'common' = 모든 직업 공통 스킬, 배열이면 해당 job id 전용
  hidden?: boolean; // 히든스킬 여부
  exclusiveQuest?: boolean; // 전용스킬(직업 스토리 퀘스트 완료 후 습득) 여부
}

export interface WeaponTemplate {
  id: string;
  name: string;
  type: CombatType;
  kind: WeaponKind;
  handedness: Handedness;
  culture: Faction;
  basePower: number;
  baseSpeed: number;
  requirement?: Partial<StatBlock>;
}

export interface WeaponInstance {
  templateId: string;
  enhancementLevel: number; // 0 이상, 무기 강화 단계
}

export type JobTraitId =
  | 'onFieldDamageReduction' // 장군/기사: 등장 중 상대 공격 0.75배(장군=자신 피격, 기사=아군 피격)
  | 'meleePowerBoost' // 협객: 근거리 기술 스탭 배율 1.5 -> 2
  | 'magicPowerBoost' // 주술사: 마법 기술 스탭 배율 1.5 -> 2
  | 'rangedPowerBoost' // 서양 궁수: 원거리 기술 스탭 배율 1.5 -> 2
  | 'extraSkillSlot' // 참모: 기술칸 +1
  | 'fullHpRangedPriorityUp' // 동양 궁수: 체력 가득 찰 경우 원거리 공격 우선도 +1
  | 'freeWeaponSwitch' // 닌자/레인저: 무기 변환 시 턴 소모 없음
  | 'berserkerRage' // 광전사: 피격 횟수 비례 공격력 상승(최대 2배), 교체 시 초기화
  | 'priestEntryHeal' // 프리스트: 등장 시 아군 중 최저체력 25% 회복
  | 'statusPriorityUp'; // 마녀: 변화(buff/debuff/status) 기술 우선도 +1

export interface JobDef {
  id: string;
  name: string;
  faction: Faction;
  type: CombatType;
  tier: 0 | 1 | 2 | 3;
  parentId?: string;
  skillSlots: number;
  traits: JobTraitId[];
  fixedWeaponType?: CombatType; // 특정 무기 타입으로 고정(예: 궁수 원거리 무기 고정)
  fixedHandedness?: Handedness; // 광전사 두손무기 고정
}

export interface ActiveStatus {
  effect: StatusEffectType;
  turnsRemaining: number;
}

export interface Character {
  id: string;
  name: string;
  jobId: string;
  faction: Faction;
  baseStats: StatBlock;
  currentHp: number;
  equippedWeapon: WeaponInstance;
  armorEnhancementLevel: number;
  skills: string[];
  statusEffects: ActiveStatus[];
  hitsTakenThisBattle: number; // 광전사 특성용
  weaponSwitchedThisTurn: boolean;
  isActive: boolean; // 현재 전장에 나와있는지 여부("등장 중")
  statMultipliers: { attack: number; defense: number };
  guarding: boolean; // 방어태세류 스킬 사용 시 다음 피격 1회 반감
}
