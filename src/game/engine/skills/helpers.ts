import type { Character, Element, GridPos, StatusEffectType } from '../../types';
import { getWeapon } from '../../data/weapons';
import { armorDefense, getArmor } from '../../data/armor';
import { manhattan } from '../grid';
import { calculateDamage } from '../damage';
import { applyStatus, type StatusApplyOptions } from '../status';
import { mentalResistChance, evasionChance } from '../derivedStats';
import { rollWeaponProc } from '../weaponEffects';
import type { SkillContext } from './context';

export function aliveUnitsInRadius(units: Character[], origin: GridPos, radius: number): Character[] {
  return units.filter((u) => u.currentHp > 0 && manhattan(u.position, origin) <= radius);
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

function armorDefenseBonus(defender: Character): number {
  if (!defender.equippedArmorId) return 0;
  const instance = defender.armor.find((a) => a.instanceId === defender.equippedArmorId);
  if (!instance) return 0;
  return armorDefense(instance.level, getArmor(instance.templateId).kind);
}

/** 상대의 능력치 감소·부가효과를 정신력 확률로 무시한다. 무시되면 true(적용 실패)를 반환하고 로그를 남긴다. */
function resistedByMentalStrength(target: Character, rng: () => number, log: string[], label: string): boolean {
  if (rng() < mentalResistChance(target)) {
    log.push(`${target.name}는 정신력으로 ${label} 효과를 무시했다.`);
    return true;
  }
  return false;
}

/** 상대에게 디버프/부가효과를 걸 때 반드시 이 함수를 거친다(정신력 저항 판정 포함). */
export function applyDebuffTo(ctx: SkillContext, target: Character, type: StatusEffectType, options: StatusApplyOptions, label: string): void {
  if (resistedByMentalStrength(target, ctx.rng, ctx.log, label)) return;
  applyStatusTo(target, type, options, ctx.log, label);
}

/** 단일 대상에게 데미지를 적용하고 로그를 남기며, 처치 시 onKill을 호출한다. 실제로 가한 데미지를 반환(회피 시 0). */
export function dealDamageTo(ctx: SkillContext, defender: Character, powerOverride?: number): number {
  const skill = powerOverride !== undefined ? { ...ctx.skill, power: powerOverride } : ctx.skill;
  const weaponKind = ctx.weapon.kind;
  const proc = rollWeaponProc(ctx.actor, weaponKind, ctx.rng);

  // 활의 '집중'은 회피율을 무시한다. 그 외에는 정상적으로 회피 판정을 먼저 거친다.
  if (proc !== 'focus') {
    const evasion = evasionChance(defender, ctx.actor);
    if (ctx.rng() < evasion) {
      ctx.log.push(`${defender.name}가 공격을 회피했다!`);
      return 0;
    }
  }

  const result = calculateDamage({
    attacker: ctx.actor,
    defender,
    skill,
    weapon: ctx.weapon,
    weaponPower: ctx.weaponPower,
    attackerElement: resolveAttackerElement(ctx),
    defenderElement: defender.elementOverride ?? 'none',
    statSource: resolveStatSource(ctx),
    defenderDefense: shieldDefenseBonus(ctx, defender) + armorDefenseBonus(defender),
    ignoreDefense: proc === 'pierce',
    weaponCrit: proc === 'crit',
    rng: ctx.rng,
  });
  defender.currentHp = Math.max(0, defender.currentHp - result.damage);
  ctx.log.push(`${defender.name}에게 ${result.damage}의 데미지${result.crit ? ' (급소)' : ''}${proc === 'pierce' ? ' (관통)' : ''}.`);
  if (defender.currentHp <= 0) {
    ctx.log.push(`${defender.name}가 쓰러졌다.`);
    ctx.onKill(ctx.actor.id, defender.id);
    return result.damage;
  }

  if (proc === 'bleed') applyDebuffTo(ctx, defender, 'bleeding', { turnsRemaining: 2 }, '출혈');
  else if (proc === 'stun') applyDebuffTo(ctx, defender, 'stunned', { turnsRemaining: 2 }, '기절');

  return result.damage;
}

export function applyStatusTo(character: Character, type: StatusEffectType, options: StatusApplyOptions, log: string[], label: string): void {
  const applied = applyStatus(character, type, options);
  if (applied) log.push(`${character.name}는 ${label} 상태가 되었다.`);
}
