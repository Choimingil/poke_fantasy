import { ROSTER } from './roster';

/** 보조장비(off-hand): 없음 / 방패 / 단검(이도류). */
export type Offhand = 'none' | 'shield' | 'dagger';

/** 마법서·투척 무기가 발동할 부가효과 선택지. */
export type TomeEffect = 'bleed' | 'stun' | 'pierce' | 'focus' | 'crit';
export const TOME_EFFECTS: TomeEffect[] = ['bleed', 'stun', 'pierce', 'focus', 'crit'];
export const TOME_EFFECT_LABEL: Record<TomeEffect, string> = {
  bleed: '출혈',
  stun: '기절',
  pierce: '관통',
  focus: '집중',
  crit: '급소',
};

export interface EquipConfig {
  /** jobId -> 보조장비. */
  offhand: Record<string, Offhand>;
  /** jobId -> 마법서/투척 발동 효과. */
  tomeEffect: Record<string, TomeEffect>;
}

const STORAGE_KEY = 'poke_fantasy_equipment_v1';

function defaults(): EquipConfig {
  const offhand: Record<string, Offhand> = {};
  const tomeEffect: Record<string, TomeEffect> = {};
  for (const c of ROSTER) {
    offhand[c.jobId] = 'none';
    tomeEffect[c.jobId] = 'bleed';
  }
  return { offhand, tomeEffect };
}

export function loadEquipConfig(): EquipConfig {
  const d = defaults();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return d;
    const saved = JSON.parse(raw) as Partial<EquipConfig>;
    return { offhand: { ...d.offhand, ...saved.offhand }, tomeEffect: { ...d.tomeEffect, ...saved.tomeEffect } };
  } catch {
    return d;
  }
}

export function saveEquipConfig(cfg: EquipConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    /* localStorage 미지원 환경은 무시 */
  }
}
