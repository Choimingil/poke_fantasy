import type { ActiveStatus, BattleMap, Character, StatusEffectType } from '../types';
import { maxHp } from './derivedStats';

export interface StatusApplyOptions {
  turnsRemaining: number;
  magnitude?: number;
  sourceId?: string;
  element?: import('../types').Element;
  /** true면 이미 걸려있어도 갱신하지 않음(중복 적용 불가 버프) */
  noStack?: boolean;
}

export function applyStatus(character: Character, type: StatusEffectType, options: StatusApplyOptions): boolean {
  const existing = character.statusEffects.find((s) => s.type === type);
  if (existing) {
    if (options.noStack) return false;
    existing.turnsRemaining = options.turnsRemaining;
    existing.magnitude = options.magnitude;
    existing.sourceId = options.sourceId;
    existing.element = options.element;
    return true;
  }
  const status: ActiveStatus = {
    type,
    turnsRemaining: options.turnsRemaining,
    magnitude: options.magnitude,
    sourceId: options.sourceId,
    element: options.element,
  };
  character.statusEffects.push(status);
  return true;
}

export function getStatus(character: Character, type: StatusEffectType): ActiveStatus | undefined {
  return character.statusEffects.find((s) => s.type === type);
}

export interface StatusTickResult {
  dotDamage: number;
  expired: StatusEffectType[];
}

/** 턴 시작 시 상태이상 지속시간을 감소시키고 만료된 상태를 제거한다. 도트 데미지원은 타일 화염뿐이므로 여기선 만료 처리만 담당. */
export function tickStatusAtTurnStart(character: Character): StatusTickResult {
  const expired: StatusEffectType[] = [];
  character.statusEffects = character.statusEffects
    .map((s) => ({ ...s, turnsRemaining: s.turnsRemaining - 1 }))
    .filter((s) => {
      if (s.turnsRemaining <= 0) {
        expired.push(s.type);
        return false;
      }
      return true;
    });
  // 약화(지팡이) 속성 변경도 시간이 지나면 해제된다.
  if (character.elementOverrideTurns !== undefined) {
    character.elementOverrideTurns -= 1;
    if (character.elementOverrideTurns <= 0) {
      character.elementOverride = undefined;
      character.elementOverrideTurns = undefined;
    }
  }
  return { dotDamage: 0, expired };
}

/** 출혈(검 부가효과) 상태의 캐릭터는 매 턴 최대체력 1/8을 잃는다. tickStatusAtTurnStart로 지속시간이 깎이기 전에 호출해야 정확히 2턴 동안 적용된다. */
export function applyBleedDamage(character: Character): number {
  if (!character.statusEffects.some((s) => s.type === 'bleeding')) return 0;
  const damage = Math.max(1, Math.round(maxHp(character) / 8));
  character.currentHp = Math.max(0, character.currentHp - damage);
  return damage;
}

/** 맹독(투척 기술)도 출혈과 동일하게 매 턴 최대체력 1/8을 잃는다. 출혈과 별개로 중복 적용된다. */
export function applyPoisonDamage(character: Character): number {
  if (!character.statusEffects.some((s) => s.type === 'poisoned')) return 0;
  const damage = Math.max(1, Math.round(maxHp(character) / 8));
  character.currentHp = Math.max(0, character.currentHp - damage);
  return damage;
}

/** 봉쇄(창 봉쇄) 상태이면 이번 턴 이동할 수 없다. */
export function isImmobilized(character: Character): boolean {
  return character.statusEffects.some((s) => s.type === 'immobilized');
}

/** 기절(둔기 부가효과) 상태이면 이번 턴에 30% 확률로 행동이 불가능한지 판정한다. */
export function rollStunned(character: Character, rng: () => number): boolean {
  if (!character.statusEffects.some((s) => s.type === 'stunned')) return false;
  return rng() < 0.3;
}

/** 화염 타일 위에 있는 캐릭터는 매 턴 최대체력 1/4을 잃는다 */
export function applyTileBurnDamage(character: Character, map: BattleMap): number {
  const tile = map.tiles[character.position.y][character.position.x];
  if (!tile.status || tile.status.type !== 'burning') return 0;
  const damage = Math.max(1, Math.round(maxHp(character) / 4));
  character.currentHp = Math.max(0, character.currentHp - damage);
  return damage;
}

/** 타일 상태(화염) 지속시간을 감소시키고, 만료된 화염 타일이 숲이었다면 평지로 되돌린다 */
export function tickMapStatus(map: BattleMap): void {
  for (const row of map.tiles) {
    for (const tile of row) {
      if (!tile.status) continue;
      tile.status.turnsRemaining -= 1;
      if (tile.status.turnsRemaining <= 0) {
        tile.status = undefined;
        if (tile.terrain === 'forest') tile.terrain = 'plain';
      }
    }
  }
}
