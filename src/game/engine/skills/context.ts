import type { BattleMap, Character, GridPos, Skill, WeaponTemplate } from '../../types';

export interface SkillContext {
  map: BattleMap;
  actorTeam: Character[];
  enemyTeam: Character[];
  actor: Character;
  skill: Skill;
  weapon: WeaponTemplate;
  /** 단일 대상 스킬의 목표 캐릭터(있는 경우) */
  targetId?: string;
  /** 타일/범위 스킬이 겨냥한 좌표. 단일 대상 스킬은 그 대상의 현재 좌표. */
  targetPos: GridPos;
  negatedShields: Set<string>;
  log: string[];
  rng: () => number;
  /** 처치 발생 시 배틀 엔진에 통지 — XP/레벨업 지급은 엔진이 담당 */
  onKill: (killerId: string, victimId: string) => void;
  /** 재행동(tome_recast) 발동 시 배틀 엔진에 통지 — 라운드 보너스 큐 편입은 엔진이 담당 */
  onBonusAction: (unitId: string) => void;
}

export type SkillHandler = (ctx: SkillContext) => void;
