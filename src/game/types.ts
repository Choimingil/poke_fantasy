export type Element = 'fire' | 'water' | 'wood' | 'steel' | 'earth' | 'none';

export type WeaponKind =
  | 'sword'
  | 'blunt'
  | 'bow'
  | 'staff'
  | 'tome'
  | 'shield'
  | 'spear'
  | 'crossbow'
  | 'dagger'
  | 'thrown';

type Handedness = 'oneHanded' | 'twoHanded';

export type StatKey = 'hp' | 'attack' | 'magicAttack' | 'speed' | 'endurance';
export type StatBlock = Record<StatKey, number>;

export type TerrainType = 'plain' | 'forest' | 'hill' | 'water' | 'rock';

interface TileStatus {
  type: 'burning';
  turnsRemaining: number;
}

interface Tile {
  terrain: TerrainType;
  status?: TileStatus;
}

export interface BattleMap {
  width: number;
  height: number;
  tiles: Tile[][]; // tiles[y][x]
}

export interface GridPos {
  x: number;
  y: number;
}

/** 피격 대상 위에 띄우는 전투 표시(데미지 숫자 / 빗나감 / 회복). */
export interface CombatFloatEvent {
  targetId: string;
  kind: 'damage' | 'miss' | 'heal';
  amount?: number;
  crit?: boolean;
}

export type StatusEffectType =
  | 'guarding' // 보호: redirects attacks on nearby allies to self
  | 'guardWide' // 광역보호: 경호 반경 2·라운드당 2회로 강화
  | 'taunted' // 도발: AI must target sourceId
  | 'elementEnchant' // 마법부여: attacks carry `element`, stat source becomes combined
  | 'riverSurge' // 급류: +1 move while standing on water
  | 'climbing' // 등반: hill tiles become enterable
  | 'farSight' // 천리안: +1 sight
  | 'forestVision' // 투시: can see into forest beyond concealment radius
  | 'focused' // 집중 (활 부가효과: 회피 무시)
  | 'legHit' // 다리 타격: move penalty
  | 'immobilized' // 봉쇄: 이동 불가
  | 'hidden' // 은신: 투명(공격·범위피격 시 해제)
  | 'shadowClone' // 분신: 직접공격 후 0.3배 추가타
  | 'quickSwap' // 빠른교체: 무기 교체가 턴을 소모하지 않음
  | 'bleeding' // 출혈(검 부가효과): 매 턴 최대체력 1/8 피해
  | 'poisoned' // 맹독(투척 기술): 출혈과 동일 지속피해, 출혈과 중복
  | 'stunned'; // 기절(둔기 부가효과): 매 턴 30% 확률로 행동 불가

export interface ActiveStatus {
  type: StatusEffectType;
  turnsRemaining: number;
  magnitude?: number; // e.g. -0.5 move, 1.2 speed mult, 0.3 crit chance, 1 tile radius
  sourceId?: string; // taunter id / guard origin
  element?: Element; // elementEnchant
}

type DamageType = 'physical' | 'magic' | 'none';
type SkillCategory = 'attack' | 'buff' | 'debuff' | 'heal' | 'utility' | 'guard';
type TargetMode = 'enemy' | 'ally' | 'self' | 'tile' | 'selfRadius' | 'anyInSight' | 'allyAdjacentTile';

export interface Skill {
  id: string;
  name: string;
  weaponKind: 'common' | WeaponKind;
  requiredTier?: 1 | 2 | 3; // 전직 티어(1=초급/2=중급/3=고급). absent => tier 0부터(또는 'common'은 항상)
  category: SkillCategory;
  damageType: DamageType;
  power: number; // percent, e.g. 100 = 100%
  hits?: number; // multi-hit skills
  accuracy: number; // 0-100
  element?: Element | 'weaponElement'; // 'weaponElement' resolves to the caster's staff element at cast time
  maxUses?: number; // absent = unlimited per battle
  range?: 'weapon' | number; // 'weapon' = equipped weapon's range
  areaRadius?: number; // Manhattan AoE radius from the target point (or self for selfRadius)
  targetMode: TargetMode;
  ignoresRange?: boolean; // 저격
  requiresTerrain?: TerrainType; // 낙석 requires the caster to stand on 'hill'
  fixedDamagePercent?: number; // 치명사격: 대상 최대체력 비율 고정피해(방어·속성·급소·위력 무시)
  followupMoveRadius?: number; // 도약사격(1)·기습(2): 공격 후 추가 이동 반경
  coneArc?: boolean; // 반월참: 대상 방향 전방 부채꼴(대상 + 인접 측면)
  knockback?: boolean; // 일섬·밀쳐내기: 공격 방향으로 대상 1칸 밀어냄
  pierceBehind?: boolean; // 꿰뚫기·관통사격: 대상 1칸 뒤 적에게 0.5배
  ignoreDefenseRatio?: number; // 철갑사격: 대상 방어력의 일부 무시(0.2)
  hillRangeBonus?: number; // 천궁: 언덕에서 사용 시 사거리 증가
}

export interface WeaponTemplate {
  id: string;
  name: string;
  kind: WeaponKind;
  range: number;
  baseSpeed: number;
  handedness: Handedness;
  defenseBonus?: number; // shield only, flat defense stat bonus while equipped
}

/** 무기 종류별 30% 확률 부가효과. 마법서/투척무기는 인스턴스마다 하나를 선택해 지닌다(그 외 종류는 kind로 고정 매핑). */
export type ProcEffect = 'bleed' | 'stun' | 'pierce' | 'focus' | 'crit';

export interface WeaponInstance {
  instanceId: string;
  templateId: string;
  level: number; // 10 단위 등급(10~100). 공격력은 이 값으로 계산한다.
  element?: Element; // staff only, chosen when the instance is created
  procEffect?: ProcEffect; // tome/thrown only, chosen when the instance is created
}

export type ArmorKind = 'cloth' | 'leather' | 'mail' | 'plate';

export interface ArmorTemplate {
  id: string;
  name: string;
  kind: ArmorKind;
}

export interface ArmorInstance {
  instanceId: string;
  templateId: string;
  level: number; // 10 단위 등급(10~100). 방어력은 이 값으로 계산한다.
}

export type SpriteGender = 'male' | 'female';

export interface Character {
  id: string;
  name: string;
  spriteJob: string; // 원화(스프라이트) 매핑용 직업 키 (assets/jobs/{spriteJob}-{gender}-...)
  gender: SpriteGender;

  level: number;
  xp: number;
  unspentPromotions: number;
  unspentStatPoints: number; // 레벨업마다 3점 지급, 체력/근력/지력/스피드/지구력에 분배
  weaponMastery: Partial<Record<WeaponKind, number>>; // 전직 티어 0-3, absent key == tier 0
  weaponProficiency?: Partial<Record<WeaponKind, number>>; // 무기 숙련 경험치(전직과 별개), absent == 0(초보)

  baseStats: StatBlock;
  sight: number;

  currentHp: number;
  position: GridPos;
  side?: 'A' | 'B'; // assigned by battle setup, not persisted on the roster
  isBoss?: boolean; // 보스: 고정피해 감소·강력 상태효과 저항

  inventory: WeaponInstance[];
  equippedWeaponId: string;
  equippedShieldId?: string;
  armor: ArmorInstance[];
  equippedArmorId?: string;

  statusEffects: ActiveStatus[];
  elementOverride?: Element; // set by 지팡이 약화
  elementOverrideTurns?: number; // 약화 남은 턴(0이 되면 elementOverride 해제)
  skillUses: Record<string, number>; // battle-scoped remaining uses, keyed by skill id
  bonusActionPending?: boolean; // 재행동: acts again at the end of the round regardless of speed
  movedStepsThisTurn?: number; // 이번 턴 일반 이동 칸 수(질주·정조준 판정용, 턴마다 리셋)
  skillLoadout: string[]; // 전투에 들고 갈 스킬(최대 4). 비어있으면 사용 가능한 스킬 앞 4개를 자동 사용.
}
