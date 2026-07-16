import type { Character, Element, GridPos, StatusEffectType } from '../../types';
import { getWeapon } from '../../data/weapons';
import { chebyshev } from '../grid';
import { calculateDamage } from '../damage';
import { applyStatus, type StatusApplyOptions } from '../status';
import type { SkillContext } from './context';

export function aliveUnitsInRadius(units: Character[], origin: GridPos, radius: number): Character[] {
  return units.filter((u) => u.currentHp > 0 && chebyshev(u.position, origin) <= radius);
}

/** 마법부여가 활성화되어 있으면 그 속성이 우선, 아니면 스킬의 element 필드(weaponElement/고정 속성)를 해석 */
function resolveAttackerElement(ctx: SkillContext): Element {
  const enchant = ctx.actor.statusEffects.find((s) => s.type === 'elementEnchant');
  if (enchant?.element) return enchant.element;
  if (ctx.skill.element === 'weaponElement') {
    const instance = ctx.actor.inventory.find((w) => w.instanceId === ctx.actor.equippedWeaponId);
    return instance?.element ?? 'none';
  }
  if (ctx.skill.element) return ctx.skill.element;
  return 'none';
}

function resolveStatSource(ctx: SkillContext): 'attack' | 'magic' | 'combined' {
  if (ctx.actor.statusEffects.some((s) => s.type === 'elementEnchant')) return 'combined';
  return ctx.skill.damageType === 'magic' ? 'magic' : 'attack';
}

function shieldDefenseBonus(ctx: SkillContext, defender: Character): number {
  if (!defender.equippedShieldId || ctx.negatedShields.has(defender.equippedShieldId)) return 0;
  const instance = defender.inventory.find((w) => w.instanceId === defender.equippedShieldId);
  if (!instance) return 0;
  return getWeapon(instance.templateId).defenseBonus ?? 0;
}

/** 단일 대상에게 데미지를 적용하고 로그를 남기며, 처치 시 onKill을 호출한다. 실제로 가한 데미지를 반환. */
export function dealDamageTo(ctx: SkillContext, defender: Character, powerOverride?: number): number {
  const skill = powerOverride !== undefined ? { ...ctx.skill, power: powerOverride } : ctx.skill;
  const result = calculateDamage({
    attacker: ctx.actor,
    defender,
    skill,
    weapon: ctx.weapon,
    attackerElement: resolveAttackerElement(ctx),
    defenderElement: defender.elementOverride ?? 'none',
    statSource: resolveStatSource(ctx),
    defenderExtraDefense: shieldDefenseBonus(ctx, defender),
    rng: ctx.rng,
  });
  defender.currentHp = Math.max(0, defender.currentHp - result.damage);
  ctx.log.push(`${defender.name}에게 ${result.damage}의 데미지${result.crit ? ' (급소)' : ''}.`);
  if (defender.currentHp <= 0) {
    ctx.log.push(`${defender.name}가 쓰러졌다.`);
    ctx.onKill(ctx.actor.id, defender.id);
  }
  return result.damage;
}

export function applyStatusTo(character: Character, type: StatusEffectType, options: StatusApplyOptions, log: string[], label: string): void {
  const applied = applyStatus(character, type, options);
  if (applied) log.push(`${character.name}는 ${label} 상태가 되었다.`);
}
