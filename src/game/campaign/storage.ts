import type { Campaign } from './types';
import { CAMPAIGN_VERSION } from './types';

const STORAGE_KEY = 'poke_fantasy_campaign';

/** 저장된 캠페인을 불러온다(없거나 버전 불일치·파손 시 null). */
export function loadCampaign(): Campaign | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Campaign;
    if (!data || data.version !== CAMPAIGN_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveCampaign(campaign: Campaign): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(campaign));
  } catch {
    // 저장 실패는 무시(용량 초과 등) — 진행은 계속 가능.
  }
}

export function clearCampaign(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}
