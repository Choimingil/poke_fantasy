import type { BattleMap, Character, CombatFloatEvent, GridPos, Skill, WeaponTemplate } from '../../types';

export interface SkillContext {
  map: BattleMap;
  actorTeam: Character[];
  enemyTeam: Character[];
  actor: Character;
  skill: Skill;
  weapon: WeaponTemplate;
  /** 장착 무기 인스턴스의 착용 레벨로 계산한 공격력 (단검은 3/4 적용됨) */
  weaponPower: number;
  /** 단일 대상 스킬의 목표 캐릭터(있는 경우) */
  targetId?: string;
  /** 타일/범위 스킬이 겨냥한 좌표. 단일 대상 스킬은 그 대상의 현재 좌표. */
  targetPos: GridPos;
  /** 무력화된 방패 instanceId → 남은 라운드 수(돌진: 3턴). */
  negatedShields: Map<string, number>;
  log: string[];
  /** 피격 대상 위에 띄울 전투 표시(데미지/빗나감/회복)를 누적한다. */
  combatEvents: CombatFloatEvent[];
  rng: () => number;
  /** 처치 발생 시 배틀 엔진에 통지 — XP/레벨업 지급은 엔진이 담당 */
  onKill: (killerId: string, victimId: string) => void;
  /** 재행동(tome_recast) 발동 시 배틀 엔진에 통지 — 라운드 보너스 큐 편입은 엔진이 담당 */
  onBonusAction: (unitId: string) => void;
  /** 라운드당 1회 반응(협공) 예산을 소모한다. 사용 가능했으면 true. */
  consumeReaction: (unitId: string) => boolean;
  /** 공격 후 추가 이동('move', 반경) 또는 추가 행동('action')을 엔진에 요청 */
  requestFollowup?: (unitId: string, opts: { kind: 'move' | 'action'; radius?: number }) => void;
}

export type SkillHandler = (ctx: SkillContext) => void;
