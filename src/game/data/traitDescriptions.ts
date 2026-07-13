import type { JobTraitId } from '../types';

export const TRAIT_DESCRIPTIONS: Record<JobTraitId, string> = {
  onFieldDamageReduction: '등장 중인 아군이 받는 데미지 0.75배',
  meleePowerBoost: '근거리 기술 자속 배율 1.5배 → 2배',
  magicPowerBoost: '마법 기술 자속 배율 1.5배 → 2배',
  rangedPowerBoost: '원거리 기술 자속 배율 1.5배 → 2배',
  extraSkillSlot: '기술칸 +1 (총 5개)',
  fullHpRangedPriorityUp: '체력이 가득 찼을 때 원거리 공격 우선도 +1',
  freeWeaponSwitch: '무기 교체 시 턴을 소모하지 않음',
  berserkerRage: '피격 횟수에 비례해 공격력 상승(최대 2배), 교체 시 초기화',
  priestEntryHeal: '전장 등장 시 아군 중 최저체력 인원의 체력 25% 회복',
  statusPriorityUp: '변화(버프/디버프) 기술 우선도 +1',
};
