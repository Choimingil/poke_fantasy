import type { ArmorKind, Character, Element, GridPos, ProcEffect, SpriteGender, StatBlock } from '../types';
import { getUsableSkillIds, initSkillUses, MAX_LOADOUT } from '../data/promotions';
import { getWeapon } from '../data/weapons';
import { armorTemplateForKind } from '../data/armor';
import type { Side } from './battle';

const DEFAULT_STARTING_LEVEL = 10;
const DEFAULT_ITEM_LEVEL = 10;

interface ExtraWeaponSpec {
  templateId: string;
  level?: number;
}

interface ExtraArmorSpec {
  kind: ArmorKind;
  level?: number;
}

export interface CreateCharacterOptions {
  id: string;
  name: string;
  spriteJob?: string;
  gender?: SpriteGender;
  level?: number;
  baseStats: StatBlock;
  sight: number;
  starterWeaponTemplateId: string;
  starterWeaponLevel?: number;
  starterWeaponElement?: Element;
  /** 마법서/투척무기 전용: 이 인스턴스가 지닐 부가효과(출혈/기절/관통/집중/급소) 선택 */
  starterWeaponProcEffect?: ProcEffect;
  starterShieldTemplateId?: string;
  starterShieldLevel?: number;
  starterArmorKind?: ArmorKind;
  starterArmorLevel?: number;
  /** 인벤토리 장비 교체 UI를 시험해볼 수 있도록 추가로 소지한(미장착) 무기 */
  extraWeaponTemplateIds?: ExtraWeaponSpec[];
  /** 추가로 소지한(미장착) 방어구 */
  extraArmorTemplateIds?: ExtraArmorSpec[];
  /** 무기별 전직 티어(0~6). 지정하지 않으면 전부 0. */
  weaponMastery?: Character['weaponMastery'];
  /** 기본 로드아웃(사용 가능한 스킬로 필터됨). 미지정 시 사용 가능한 스킬 앞 4개. */
  skillLoadout?: string[];
}

export function createCharacter(opts: CreateCharacterOptions): Character {
  const weaponInstance = {
    instanceId: `${opts.id}-weapon`,
    templateId: opts.starterWeaponTemplateId,
    level: opts.starterWeaponLevel ?? DEFAULT_ITEM_LEVEL,
    element: opts.starterWeaponElement,
    procEffect: opts.starterWeaponProcEffect,
  };
  const inventory = [weaponInstance];
  let equippedShieldId: string | undefined;
  if (opts.starterShieldTemplateId) {
    const shieldInstance = {
      instanceId: `${opts.id}-shield`,
      templateId: opts.starterShieldTemplateId,
      level: opts.starterShieldLevel ?? DEFAULT_ITEM_LEVEL,
      element: undefined,
      procEffect: undefined,
    };
    inventory.push(shieldInstance);
    equippedShieldId = shieldInstance.instanceId;
  }
  for (const [i, extra] of (opts.extraWeaponTemplateIds ?? []).entries()) {
    inventory.push({ instanceId: `${opts.id}-extra${i}`, templateId: extra.templateId, level: extra.level ?? DEFAULT_ITEM_LEVEL, element: undefined, procEffect: undefined });
  }

  const armor = [];
  let equippedArmorId: string | undefined;
  if (opts.starterArmorKind) {
    const armorInstance = {
      instanceId: `${opts.id}-armor`,
      templateId: armorTemplateForKind(opts.starterArmorKind).id,
      level: opts.starterArmorLevel ?? DEFAULT_ITEM_LEVEL,
    };
    armor.push(armorInstance);
    equippedArmorId = armorInstance.instanceId;
  }
  for (const [i, extra] of (opts.extraArmorTemplateIds ?? []).entries()) {
    armor.push({ instanceId: `${opts.id}-extraArmor${i}`, templateId: armorTemplateForKind(extra.kind).id, level: extra.level ?? DEFAULT_ITEM_LEVEL });
  }

  const character: Character = {
    id: opts.id,
    name: opts.name,
    spriteJob: opts.spriteJob ?? 'east_duelist',
    gender: opts.gender ?? 'male',
    level: opts.level ?? DEFAULT_STARTING_LEVEL,
    xp: 0,
    unspentPromotions: 0,
    unspentStatPoints: 0,
    weaponMastery: { ...(opts.weaponMastery ?? {}) },
    baseStats: { ...opts.baseStats },
    sight: opts.sight,
    currentHp: opts.baseStats.hp,
    position: { x: 0, y: 0 },
    inventory,
    equippedWeaponId: weaponInstance.instanceId,
    equippedShieldId,
    armor,
    equippedArmorId,
    statusEffects: [],
    skillUses: {},
    bonusActionPending: false,
    skillLoadout: [],
  };
  // 기본 로드아웃: 지정되면 그것(사용 가능한 스킬로 필터), 아니면 사용 가능한 스킬의 앞 4개.
  const usable = getUsableSkillIds(character, getWeapon(weaponInstance.templateId).kind);
  character.skillLoadout = (opts.skillLoadout ? opts.skillLoadout.filter((id) => usable.includes(id)) : usable).slice(0, MAX_LOADOUT);
  return character;
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
