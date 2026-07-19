import type { BattleMap, Character, GridPos } from '../types';
import { getWeapon } from '../data/weapons';
import { hasTier5Passive } from '../data/promotions';
import { manhattan } from './grid';
import type { TimeOfDay } from './daytime';
import type { Weather } from './weather';

/** 숲 타일에 있는 캐릭터를 발견할 수 있는 최소 근접 반경(투시 없이도 이 거리 이내면 보임) */
export const FOREST_CONCEALMENT_RADIUS = 1;
/** 불타는 타일이 주변을 밝히는 반경(시야와 무관하게 이 안의 캐릭터/타일은 확인 가능) */
const FIRE_REVEAL_RADIUS = 1;

export interface SightConditions {
  time?: TimeOfDay;
  weather?: Weather;
}

/** 시간대·날씨에 따른 시야 보정치. 밤 -2, 비/눈 -1. */
function envSightModifier(cond?: SightConditions): number {
  let mod = 0;
  if (cond?.time === 'night') mod -= 2;
  if (cond?.weather === 'rain' || cond?.weather === 'snow') mod -= 1;
  return mod;
}

/** pos가 불타는 타일 반경 내에 있는가(불 타일 포함 주변 1칸) */
function nearBurningTile(map: BattleMap, pos: GridPos): boolean {
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      if (map.tiles[y][x].status?.type === 'burning' && manhattan({ x, y }, pos) <= FIRE_REVEAL_RADIUS) return true;
    }
  }
  return false;
}

export function effectiveSight(c: Character, map: BattleMap, cond?: SightConditions): number {
  let base = c.sight + (c.statusEffects.some((s) => s.type === 'farSight') ? 1 : 0);
  if (map.tiles[c.position.y][c.position.x].terrain === 'hill') base += 1; // 언덕 위 시야 +1
  const inst = c.inventory.find((w) => w.instanceId === c.equippedWeaponId);
  if (inst && getWeapon(inst.templateId).kind === 'bow' && hasTier5Passive(c, 'bow', 'hawkeye')) base += 1; // 매의눈
  return Math.max(1, base + envSightModifier(cond)); // 시야는 최소 1
}

export function isVisibleTo(viewer: Character, target: Character, map: BattleMap, cond?: SightConditions): boolean {
  // 은신 중인 대상은 보이지 않는다
  if (target.statusEffects.some((s) => s.type === 'hidden')) return false;
  // 불타는 타일 주변은 시야와 무관하게 확인 가능
  if (nearBurningTile(map, target.position)) return true;
  const dist = manhattan(viewer.position, target.position);
  if (dist > effectiveSight(viewer, map, cond)) return false;
  const onForest = map.tiles[target.position.y][target.position.x].terrain === 'forest';
  if (onForest) {
    const canSeeIntoForest = viewer.statusEffects.some((s) => s.type === 'forestVision');
    if (!canSeeIntoForest && dist > FOREST_CONCEALMENT_RADIUS) return false;
  }
  return true;
}

/** target이 team(관측 진영)의 살아있는 유닛 중 하나라도에게 보이는가 */
export function isVisibleToTeam(target: Character, team: Character[], map: BattleMap, cond?: SightConditions): boolean {
  return team.some((viewer) => viewer.currentHp > 0 && isVisibleTo(viewer, target, map, cond));
}

/** 관측 진영이 해당 타일을 밝히고 있는가(시야 반경 내). 숲 타일은 실루엣이 항상 보이므로 별도 처리. */
export function isTileRevealed(pos: GridPos, team: Character[], map: BattleMap, cond?: SightConditions): boolean {
  if (nearBurningTile(map, pos)) return true;
  return team.some(
    (viewer) => viewer.currentHp > 0 && manhattan(viewer.position, pos) <= effectiveSight(viewer, map, cond),
  );
}
