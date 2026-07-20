import type { Character, Element, GridPos, Skill, StatusEffectType } from '../../types';
import { getWeapon, effectiveWeaponPower } from '../../data/weapons';
import { armorDefense, getArmor } from '../../data/armor';
import { hasTier5Passive } from '../../data/promotions';
import { manhattan } from '../grid';
import { calculateDamage } from '../damage';
import { applyStatus, type StatusApplyOptions } from '../status';
import { mentalResistChance, evasionChance, maxHp } from '../derivedStats';
import { rollWeaponProc } from '../weaponEffects';
import type { SkillContext } from './context';

export function aliveUnitsInRadius(units: Character[], origin: GridPos, radius: number): Character[] {
  return units.filter((u) => u.currentHp > 0 && manhattan(u.position, origin) <= radius);
}

function attackerElementFor(attacker: Character, skill: Skill): Element {
  const enchant = attacker.statusEffects.find((s) => s.type === 'elementEnchant');
  if (enchant?.element) return enchant.element;
  if (skill.element === 'weaponElement') {
    const instance = attacker.inventory.find((w) => w.instanceId === attacker.equippedWeaponId);
    return instance?.element ?? 'none';
  }
  if (skill.element) return skill.element;
  return 'none';
}

function statSourceFor(attacker: Character, skill: Skill): 'attack' | 'magic' | 'combined' {
  if (attacker.statusEffects.some((s) => s.type === 'elementEnchant')) return 'combined';
  return skill.damageType === 'magic' ? 'magic' : 'attack';
}

function weaponCtxOf(attacker: Character): { kind: ReturnType<typeof getWeapon>['kind']; range: number; power: number } {
  const instance = attacker.inventory.find((w) => w.instanceId === attacker.equippedWeaponId)!;
  const weapon = getWeapon(instance.templateId);
  return { kind: weapon.kind, range: weapon.range, power: effectiveWeaponPower(instance.level, weapon.kind, !!attacker.equippedShieldId) };
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

/** 보스가 저항하는 강력한 상태이상(기절·봉쇄). */
const BOSS_RESISTED: StatusEffectType[] = ['stunned', 'immobilized'];

/** 상대에게 디버프/부가효과를 걸 때 반드시 이 함수를 거친다(정신력 저항 + 보스 강력CC 저항). */
export function applyDebuffTo(ctx: SkillContext, target: Character, type: StatusEffectType, options: StatusApplyOptions, label: string): void {
  if (target.isBoss && BOSS_RESISTED.includes(type)) {
    ctx.log.push(`보스에게는 ${label} 효과가 통하지 않는다.`);
    return;
  }
  if (resistedByMentalStrength(target, ctx.rng, ctx.log, label)) return;
  applyStatusTo(target, type, options, ctx.log, label);
}

export function applyStatusTo(character: Character, type: StatusEffectType, options: StatusApplyOptions, log: string[], label: string): void {
  const applied = applyStatus(character, type, options);
  if (applied) log.push(`${character.name}는 ${label} 상태가 되었다.`);
}

export interface DealOptions {
  powerOverride?: number; // 위력 % 강제
  fixedDamagePercent?: number; // 치명사격: 최대체력 비율 고정피해
  ignoreDefenseRatio?: number; // 철갑사격: 방어력 일부 무시
  finalPowerMult?: number; // 쇄상: 최종 위력 배수
  suppressProc?: boolean; // 부가효과·급소 모두 생략(2번째 대상·협공 등)
  suppressCrit?: boolean; // 급소만 생략(분신 추가타)
  triggersReactions?: boolean; // 협공/분신 발동 여부(직접 단일 공격만 true)
}

/** 은신 상태의 공격자는 공격을 실행하면 은신이 해제된다. */
function breakHiddenOnAttack(attacker: Character, log: string[]): void {
  if (attacker.statusEffects.some((s) => s.type === 'hidden')) {
    attacker.statusEffects = attacker.statusEffects.filter((s) => s.type !== 'hidden');
    log.push(`${attacker.name}의 은신이 해제되었다.`);
  }
}

/** 임의의 공격자가 대상에게 피해를 준다. 실제로 가한 데미지를 반환(회피 시 0). */
function applyAttack(ctx: SkillContext, attacker: Character, defender: Character, skill: Skill, opts: DealOptions): number {
  const wc = weaponCtxOf(attacker);
  const fixedPct = opts.fixedDamagePercent ?? skill.fixedDamagePercent;
  const noMove = (attacker.movedStepsThisTurn ?? 0) === 0;
  const procChanceMult = wc.kind === 'crossbow' && noMove && hasTier5Passive(attacker, 'crossbow', 'steadyAim') ? 2 : 1;
  const proc = opts.suppressProc ? null : rollWeaponProc(attacker, wc.kind, ctx.rng, procChanceMult);

  // 활의 '집중'은 회피율을 무시한다. 그 외에는 정상적으로 회피 판정을 먼저 거친다.
  if (proc !== 'focus') {
    if (ctx.rng() < evasionChance(defender)) {
      ctx.log.push(`${defender.name}가 공격을 회피했다!`);
      ctx.combatEvents.push({ targetId: defender.id, kind: 'miss' });
      return 0;
    }
  }

  if (fixedPct !== undefined) {
    // 보스는 고정 피해가 절반으로 감소한다.
    const effPct = defender.isBoss ? fixedPct / 2 : fixedPct;
    const dmg = Math.max(1, Math.floor(maxHp(defender) * (effPct / 100)));
    defender.currentHp = Math.max(0, defender.currentHp - dmg);
    ctx.log.push(`${defender.name}에게 ${dmg}의 고정 피해.`);
    ctx.combatEvents.push({ targetId: defender.id, kind: 'damage', amount: dmg });
    if (defender.currentHp <= 0) {
      ctx.log.push(`${defender.name}가 쓰러졌다.`);
      ctx.onKill(attacker.id, defender.id);
    }
    return dmg;
  }

  const effSkill = opts.powerOverride !== undefined ? { ...skill, power: opts.powerOverride } : skill;
  const crit = proc === 'crit' && !opts.suppressCrit;
  const result = calculateDamage({
    attacker,
    defender,
    skill: effSkill,
    weapon: getWeapon(attacker.inventory.find((w) => w.instanceId === attacker.equippedWeaponId)!.templateId),
    weaponPower: wc.power,
    attackerElement: attackerElementFor(attacker, effSkill),
    defenderElement: defender.elementOverride ?? 'none',
    statSource: statSourceFor(attacker, effSkill),
    defenderDefense: shieldDefenseBonus(ctx, defender) + armorDefenseBonus(defender),
    ignoreDefense: proc === 'pierce',
    ignoreDefenseRatio: opts.ignoreDefenseRatio ?? skill.ignoreDefenseRatio,
    weaponCrit: crit,
    movedAtLeast2: (attacker.movedStepsThisTurn ?? 0) >= 2,
    finalPowerMult: opts.finalPowerMult,
    rng: ctx.rng,
  });
  defender.currentHp = Math.max(0, defender.currentHp - result.damage);
  ctx.log.push(`${defender.name}에게 ${result.damage}의 데미지${result.crit ? ' (급소)' : ''}${proc === 'pierce' ? ' (관통)' : ''}.`);
  ctx.combatEvents.push({ targetId: defender.id, kind: 'damage', amount: result.damage, crit: result.crit });
  if (defender.currentHp <= 0) {
    ctx.log.push(`${defender.name}가 쓰러졌다.`);
    ctx.onKill(attacker.id, defender.id);
    return result.damage;
  }

  if (proc === 'bleed') applyDebuffTo(ctx, defender, 'bleeding', { turnsRemaining: 2 }, '출혈');
  else if (proc === 'stun') applyDebuffTo(ctx, defender, 'stunned', { turnsRemaining: 2 }, '기절');

  return result.damage;
}

/** 협공(투척 패시브)·분신(투척 기술) 추가타. 원래 시전자의 직접 단일 공격에서만 호출된다. */
function processReactions(ctx: SkillContext, defender: Character): void {
  if (defender.currentHp <= 0) return;
  // 분신: 시전자가 직접공격 후 0.3배 추가타 1회(급소 없음, 추가 반응 미발동)
  if (ctx.actor.statusEffects.some((s) => s.type === 'shadowClone')) {
    ctx.log.push(`${ctx.actor.name}의 분신이 추가타를 날린다.`);
    applyAttack(ctx, ctx.actor, defender, ctx.skill, { powerOverride: ctx.skill.power * 0.3, suppressCrit: true, triggersReactions: false });
    if (defender.currentHp <= 0) return;
  }
  // 협공: 사거리 내 아군(투척+협공 패시브)이 대상을 0.5배로 추가공격(라운드당 1회)
  for (const ally of ctx.actorTeam) {
    if (ally.id === ctx.actor.id || ally.currentHp <= 0) continue;
    const wc = weaponCtxOf(ally);
    if (wc.kind !== 'thrown' || !hasTier5Passive(ally, 'thrown', 'pincer')) continue;
    if (manhattan(ally.position, defender.position) > wc.range) continue;
    if (!ctx.consumeReaction(ally.id)) continue;
    ctx.log.push(`${ally.name}의 협공!`);
    applyAttack(ctx, ally, defender, { ...ctx.skill, power: 50, weaponKind: 'thrown', element: undefined }, { powerOverride: 50, triggersReactions: false });
    if (defender.currentHp <= 0) return;
  }
}

/** 반격(창 패시브) 등에 쓰는 기본 공격 정의(위력 100%, 물리). */
const BASIC_ATTACK: Skill = { id: '__basic', name: '기본 공격', weaponKind: 'common', category: 'attack', damageType: 'physical', power: 100, accuracy: 100, targetMode: 'enemy' };

/**
 * 반격(창 T5): 창 사거리 내 적의 직접공격에 피해를 입으면 공격자에게 기본 공격 0.5배로 반격(라운드당 1회).
 * 범위 공격/사거리 밖/경호로 다른 아군이 대신 피격한 경우엔 호출되지 않는다(직접 단일 공격에서만 호출).
 * 반격은 전용기술·협공·분신 등 추가 공격을 발동시키지 않는다(triggersReactions=false).
 */
function processCounter(ctx: SkillContext, defender: Character, damageTaken: number): void {
  if (damageTaken <= 0 || defender.currentHp <= 0) return;
  const dwc = weaponCtxOf(defender);
  if (dwc.kind !== 'spear' || !hasTier5Passive(defender, 'spear', 'counter')) return;
  const attacker = ctx.actor;
  if (attacker.currentHp <= 0) return;
  if (manhattan(defender.position, attacker.position) > dwc.range) return;
  if (!ctx.consumeReaction(defender.id)) return;
  ctx.log.push(`${defender.name}의 반격!`);
  applyAttack(ctx, defender, attacker, BASIC_ATTACK, { powerOverride: 50, triggersReactions: false });
}

/** 시전자가 대상에게 데미지를 적용한다(부가효과·회피·반응 포함). 실제 데미지 반환(회피 시 0). */
export function dealDamageTo(ctx: SkillContext, defender: Character, opts: DealOptions = {}): number {
  breakHiddenOnAttack(ctx.actor, ctx.log);
  const dmg = applyAttack(ctx, ctx.actor, defender, ctx.skill, opts);
  if (opts.triggersReactions) {
    processReactions(ctx, defender);
    processCounter(ctx, defender, dmg);
  }
  return dmg;
}

// ---- 위치/지형 유틸 ----

function isOccupied(ctx: SkillContext, pos: GridPos): boolean {
  return [...ctx.actorTeam, ...ctx.enemyTeam].some((u) => u.currentHp > 0 && u.position.x === pos.x && u.position.y === pos.y);
}

/** 유닛이 설 수 있는 빈 타일인가(경계 안, 바위 아님, 점유 안 됨) */
export function isFreeTile(ctx: SkillContext, pos: GridPos): boolean {
  if (pos.x < 0 || pos.y < 0 || pos.x >= ctx.map.width || pos.y >= ctx.map.height) return false;
  if (ctx.map.tiles[pos.y][pos.x].terrain === 'rock') return false;
  return !isOccupied(ctx, pos);
}

function stepDir(from: GridPos, to: GridPos): GridPos {
  return { x: Math.sign(to.x - from.x), y: Math.sign(to.y - from.y) };
}

/** 공격 방향으로 대상을 1칸 밀어낸다. 밀려날 수 없으면 false. */
export function knockbackTarget(ctx: SkillContext, target: Character): boolean {
  const dir = stepDir(ctx.actor.position, target.position);
  if (dir.x === 0 && dir.y === 0) return false;
  const dest = { x: target.position.x + dir.x, y: target.position.y + dir.y };
  if (!isFreeTile(ctx, dest)) return false;
  target.position = dest;
  return true;
}

/** 시전자가 대상을 관통해 그 1칸 뒤(공격 방향 연장선)로 이동한다. 대상은 제자리. 이동했으면 true. */
export function dashThroughTarget(ctx: SkillContext, target: Character): boolean {
  const dir = stepDir(ctx.actor.position, target.position);
  if (dir.x === 0 && dir.y === 0) return false;
  const dest = { x: target.position.x + dir.x, y: target.position.y + dir.y };
  if (!isFreeTile(ctx, dest)) return false;
  ctx.actor.position = dest;
  return true;
}

/** 대상 1칸 뒤(공격 방향 연장선)에 있는 살아있는 적을 반환한다(꿰뚫기·관통사격). */
export function enemyBehind(ctx: SkillContext, target: Character): Character | undefined {
  const dir = stepDir(ctx.actor.position, target.position);
  if (dir.x === 0 && dir.y === 0) return undefined;
  const behind = { x: target.position.x + dir.x, y: target.position.y + dir.y };
  return ctx.enemyTeam.find((u) => u.currentHp > 0 && u.position.x === behind.x && u.position.y === behind.y);
}
