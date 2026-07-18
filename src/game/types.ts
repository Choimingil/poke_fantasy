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

export type StatusEffectType =
  | 'guarding' // 보호: redirects attacks on nearby allies to self
  | 'taunted' // 도발: AI must target sourceId
  | 'elementEnchant' // 마법부여: attacks carry `element`, stat source becomes combined
  | 'riverSurge' // 급류: +1 move while standing on water
  | 'climbing' // 등반: hill tiles become enterable
  | 'farSight' // 천리안: +1 sight
  | 'forestVision' // 투시: can see into forest beyond concealment radius
  | 'swordAwaken' // 각성: speed x1.2, no-stack
  | 'bluntUnity' // 단결: defense x1.2, no-stack
  | 'bowCrit' // 급소(스킬): chance to crit
  | 'focused' // 집중 (reserved for a later weapon phase)
  | 'legHit' // 다리 타격: move penalty
  | 'bleeding' // 출혈(검 부가효과): 매 턴 최대체력 1/8 피해
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
type TargetMode = 'enemy' | 'ally' | 'self' | 'tile' | 'selfRadius' | 'anyInSight';

export interface Skill {
  id: string;
  name: string;
  weaponKind: 'common' | WeaponKind;
  requiredTier?: 2 | 4 | 6; // absent => usable at weapon mastery tier 0 (or always, for 'common')
  category: SkillCategory;
  damageType: DamageType;
  power: number; // percent, e.g. 100 = 100%
  hits?: number; // multi-hit skills (고속연타 = 3, 연사-style)
  accuracy: number; // 0-100
  element?: Element | 'weaponElement'; // 'weaponElement' resolves to the caster's staff element at cast time
  maxUses?: number; // absent = unlimited per battle
  range?: 'weapon' | number; // 'weapon' = equipped weapon's range
  areaRadius?: number; // Chebyshev AoE radius from the target point (or self for selfRadius)
  targetMode: TargetMode;
  ignoresRange?: boolean; // 저격
  requiresTerrain?: TerrainType; // 낙석 requires the caster to stand on 'hill'
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

interface WeaponInstance {
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

interface ArmorInstance {
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
  weaponMastery: Partial<Record<WeaponKind, number>>; // 0-6, absent key == tier 0

  baseStats: StatBlock;
  sight: number;

  currentHp: number;
  position: GridPos;
  side?: 'A' | 'B'; // assigned by battle setup, not persisted on the roster

  inventory: WeaponInstance[];
  equippedWeaponId: string;
  equippedShieldId?: string;
  armor: ArmorInstance[];
  equippedArmorId?: string;

  statusEffects: ActiveStatus[];
  elementOverride?: Element; // set by 지팡이 약화; persists until overwritten again
  skillUses: Record<string, number>; // battle-scoped remaining uses, keyed by skill id
  bonusActionPending?: boolean; // 재행동: acts again at the end of the round regardless of speed
  skillLoadout: string[]; // 전투에 들고 갈 스킬(최대 4). 비어있으면 사용 가능한 스킬 앞 4개를 자동 사용.
}
