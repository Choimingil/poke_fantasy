import type { BattleMap, Character } from '../types';
import type { UnitAction } from './battle';
import { getSkill } from '../data/skills';
import { getWeapon } from '../data/weapons';
import { getUsableSkillIds } from '../data/promotions';
import { chebyshev, computeReachableTiles, effectiveMove } from './grid';
import { isVisibleTo } from './vision';

/** 간단한 그리드 AI: 도발 대상 우선 → 가장 가까운 보이는 적 추적 → 사거리 내면 공격 스킬 사용 */
export function pickAiAction(unit: Character, ownTeam: Character[], enemyTeam: Character[], map: BattleMap): UnitAction {
  const allUnits = [...ownTeam, ...enemyTeam];

  const tauntStatus = unit.statusEffects.find((s) => s.type === 'taunted');
  let target = tauntStatus?.sourceId ? enemyTeam.find((u) => u.id === tauntStatus.sourceId && u.currentHp > 0) : undefined;
  if (!target) {
    const visibleEnemies = enemyTeam.filter((u) => u.currentHp > 0 && isVisibleTo(unit, u, map));
    target = [...visibleEnemies].sort((a, b) => chebyshev(unit.position, a.position) - chebyshev(unit.position, b.position))[0];
  }
  if (!target) return {};

  const budget = effectiveMove(unit, map);
  const reachable = [unit.position, ...computeReachableTiles(map, unit, allUnits, budget)];
  const bestTile = reachable.reduce((best, pos) =>
    chebyshev(pos, target!.position) < chebyshev(best, target!.position) ? pos : best);

  const weaponInstance = unit.inventory.find((w) => w.instanceId === unit.equippedWeaponId)!;
  const weapon = getWeapon(weaponInstance.templateId);
  const usableIds = getUsableSkillIds(unit, weapon.kind).filter((id) => {
    const skill = getSkill(id);
    return skill.maxUses === undefined || (unit.skillUses[id] ?? 0) > 0;
  });

  const attackSkills = usableIds
    .map((id) => getSkill(id))
    .filter((s) => s.category === 'attack' && (s.targetMode === 'enemy' || s.targetMode === 'anyInSight'));

  const action: UnitAction = {};
  if (bestTile.x !== unit.position.x || bestTile.y !== unit.position.y) action.moveTo = bestTile;

  for (const skill of attackSkills) {
    const ignoresRange = skill.ignoresRange || skill.targetMode === 'anyInSight';
    const range = skill.range === 'weapon' ? weapon.range : (skill.range ?? weapon.range);
    const inRange = ignoresRange ? isVisibleTo(unit, target, map) : chebyshev(bestTile, target.position) <= range;
    if (inRange) {
      action.skillId = skill.id;
      action.targetId = target.id;
      break;
    }
  }

  return action;
}
