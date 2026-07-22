import type { Character, EquipGrade, EquipOption, EquipOptionKind } from '../types';

export const GRADE_LABEL: Record<EquipGrade, string> = {
  common: '일반', rare: '희귀', legendary: '전설',
};

function optionLabel(kind: EquipOptionKind, magnitude: number): string {
  switch (kind) {
    case 'maxHp': return `최대 체력 +${magnitude}`;
    case 'weightReduce': return `무게 -${magnitude}kg`;
    case 'mentalResist': return `정신 저항 +${Math.round(magnitude * 100)}%`;
    case 'evasion': return `회피 +${Math.round(magnitude * 100)}%`;
  }
}

/** 등급별 상품 가격 배수(일반 1 / 희귀 1.8 / 전설 3.2). */
export function gradePriceMult(grade: EquipGrade): number {
  return grade === 'legendary' ? 3.2 : grade === 'rare' ? 1.8 : 1;
}

/** 희귀/전설 장비의 추가 옵션 하나를 무작위 생성한다(전설은 더 강하다). */
export function rollEquipOption(level: number, rng: () => number, legendary: boolean): EquipOption {
  const scale = legendary ? 2 : 1;
  const kinds: EquipOptionKind[] = ['maxHp', 'weightReduce', 'mentalResist', 'evasion'];
  const kind = kinds[Math.floor(rng() * kinds.length)];
  let magnitude: number;
  switch (kind) {
    case 'maxHp': magnitude = Math.max(2, Math.round(level * 0.4)) * scale; break;
    case 'weightReduce': magnitude = 0.5 * scale; break;
    case 'mentalResist': magnitude = 0.05 * scale; break;
    case 'evasion': magnitude = 0.04 * scale; break;
  }
  return { kind, magnitude, label: optionLabel(kind, magnitude) };
}

interface OptionCarrier {
  instanceId: string;
  templateId: string;
  grade?: EquipGrade;
  options?: EquipOption[];
}

function equippedCarriers(c: Character): OptionCarrier[] {
  const carriers: OptionCarrier[] = [];
  const w = c.inventory.find((i) => i.instanceId === c.equippedWeaponId);
  if (w) carriers.push(w);
  if (c.equippedShieldId) {
    const s = c.inventory.find((i) => i.instanceId === c.equippedShieldId);
    if (s) carriers.push(s);
  }
  if (c.equippedArmorId) {
    const a = c.armor.find((i) => i.instanceId === c.equippedArmorId);
    if (a) carriers.push(a);
  }
  return carriers;
}

/** 장착 중인 무기·방패·방어구 옵션 중 해당 종류의 합계(maxHp/weightReduce/mentalResist). */
export function equippedOptionTotal(c: Character, kind: EquipOptionKind): number {
  let sum = 0;
  for (const carrier of equippedCarriers(c)) {
    for (const o of carrier.options ?? []) if (o.kind === kind) sum += o.magnitude;
  }
  return sum;
}

/** 파티(로스터) 내에 같은 전설 장비(templateId)가 이미 장착되어 있는가(§31 전설 파티 유일). */
export function partyHasLegendaryEquipped(roster: Character[], templateId: string, exceptCharId: string): boolean {
  return roster.some((c) => {
    if (c.id === exceptCharId) return false;
    for (const carrier of equippedCarriers(c)) {
      if (carrier.grade === 'legendary' && carrier.templateId === templateId) return true;
    }
    return false;
  });
}
