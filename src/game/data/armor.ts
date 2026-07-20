import type { ArmorKind, ArmorTemplate } from '../types';
import { enhancedValue } from './enhance';

const ARMOR_TEMPLATES: ArmorTemplate[] = [
  { id: 'armor_cloth', name: '천', kind: 'cloth' },
  { id: 'armor_leather', name: '가죽', kind: 'leather' },
  { id: 'armor_mail', name: '중갑', kind: 'mail' },
  { id: 'armor_plate', name: '판금', kind: 'plate' },
];

const ARMOR_WEIGHT_KG: Record<ArmorKind, number> = {
  cloth: 0.5,
  leather: 1,
  mail: 3,
  plate: 5,
};

const ARMOR_DEFENSE_MULT: Record<ArmorKind, number> = {
  cloth: 0.7,
  leather: 0.9,
  mail: 1.1,
  plate: 1.3,
};

/** 방어구 방어력 = 같은 레벨 무기의 기준공격력(착용 레벨 / 2, 단검 제외) × 종류별 배수 + 강화(§32). */
export function armorDefense(level: number, kind: ArmorKind, enhanceLevel = 0, repairer = false): number {
  const at = (lv: number) => (lv / 2) * ARMOR_DEFENSE_MULT[kind];
  return enhancedValue(at(level), at(level + 10), enhanceLevel, repairer);
}

export function armorWeight(kind: ArmorKind): number {
  return ARMOR_WEIGHT_KG[kind];
}

export function getArmor(templateId: string): ArmorTemplate {
  const armor = ARMOR_TEMPLATES.find((a) => a.id === templateId);
  if (!armor) throw new Error(`Unknown armor template: ${templateId}`);
  return armor;
}

export function armorTemplateForKind(kind: ArmorKind): ArmorTemplate {
  return getArmor(`armor_${kind}`);
}
