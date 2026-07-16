import type { Character, Element, GridPos, StatBlock } from '../types';
import { initSkillUses } from '../data/promotions';
import { getWeapon } from '../data/weapons';
import type { Side } from './battle';

export interface CreateCharacterOptions {
  id: string;
  name: string;
  baseStats: StatBlock;
  rawMove: number;
  sight: number;
  starterWeaponTemplateId: string;
  starterWeaponElement?: Element;
  starterShieldTemplateId?: string;
  /** 인벤토리 장비 교체 UI를 시험해볼 수 있도록 추가로 소지한(미장착) 무기 */
  extraWeaponTemplateIds?: string[];
}

export function createCharacter(opts: CreateCharacterOptions): Character {
  const weaponInstance = {
    instanceId: `${opts.id}-weapon`,
    templateId: opts.starterWeaponTemplateId,
    element: opts.starterWeaponElement,
  };
  const inventory = [weaponInstance];
  let equippedShieldId: string | undefined;
  if (opts.starterShieldTemplateId) {
    const shieldInstance = { instanceId: `${opts.id}-shield`, templateId: opts.starterShieldTemplateId, element: undefined };
    inventory.push(shieldInstance);
    equippedShieldId = shieldInstance.instanceId;
  }
  for (const [i, templateId] of (opts.extraWeaponTemplateIds ?? []).entries()) {
    inventory.push({ instanceId: `${opts.id}-extra${i}`, templateId, element: undefined });
  }

  return {
    id: opts.id,
    name: opts.name,
    level: 1,
    xp: 0,
    unspentPromotions: 0,
    weaponMastery: {},
    baseStats: { ...opts.baseStats },
    rawMove: opts.rawMove,
    sight: opts.sight,
    currentHp: opts.baseStats.hp,
    position: { x: 0, y: 0 },
    inventory,
    equippedWeaponId: weaponInstance.instanceId,
    equippedShieldId,
    statusEffects: [],
    skillUses: {},
    bonusActionPending: false,
  };
}

/** 전투 시작 시 배틀-스코프 상태만 초기화한다(레벨/인벤토리/숙련도는 유지) */
export function prepareForBattle(c: Character, spawnPos: GridPos, side: Side): void {
  c.currentHp = c.baseStats.hp;
  c.position = spawnPos;
  c.side = side;
  c.statusEffects = [];
  c.elementOverride = undefined;
  c.bonusActionPending = false;
  const weaponInstance = c.inventory.find((w) => w.instanceId === c.equippedWeaponId);
  const kind = weaponInstance ? getWeapon(weaponInstance.templateId).kind : undefined;
  c.skillUses = kind ? initSkillUses(c, kind) : {};
}
