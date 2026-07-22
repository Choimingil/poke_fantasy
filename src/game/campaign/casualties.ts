import type { Character } from '../types';
import type { Campaign, FallenRecord } from './types';

/** 주인공 id. 주인공은 전사하지 않는다(§42). */
const HERO_ID = 'hero';

/** 부상 치료 비용(§42): 레벨에 비례. */
export function treatmentCost(level: number): number {
  return 20 + level * 8;
}

export interface CasualtyResult {
  roster: Character[];
  deployedIds: string[];
  graveyard: FallenRecord[];
  newlyInjured: string[]; // 이번 전투로 부상당한 id
  recovered: string[]; // 생존으로 부상에서 회복한 id
  fallen: FallenRecord[]; // 이번 전투로 전사한 동료
}

/**
 * 전투 결과에 따른 사상자 처리(§42).
 * - 출전 중 전투 불능(HP 0): 성한 상태면 부상, 이미 부상이면 전사(묘지) — 단 주인공은 전사하지 않음.
 * - 출전해 살아남은 부상자: 부상에서 회복.
 * - 출전하지 않은 부상자: 부상 유지.
 */
export function applyCasualties(campaign: Campaign, downedAllyIds: string[], round: number): CasualtyResult {
  const downed = new Set(downedAllyIds);
  const deployed = new Set(campaign.deployedIds);
  const graveyard = [...(campaign.graveyard ?? [])];
  const newlyInjured: string[] = [];
  const recovered: string[] = [];
  const fallen: FallenRecord[] = [];
  const removed = new Set<string>();

  const roster = campaign.roster.map((c) => {
    if (downed.has(c.id)) {
      // 전투 불능: 이미 부상 상태였다면 전사(주인공 제외).
      if (c.injured && c.id !== HERO_ID) {
        const record: FallenRecord = { id: c.id, name: c.name, level: c.level, round };
        fallen.push(record);
        graveyard.push(record);
        removed.add(c.id);
        return c;
      }
      if (!c.injured) newlyInjured.push(c.id);
      return { ...c, injured: true };
    }
    // 출전해 살아남은 부상자는 회복한다.
    if (c.injured && deployed.has(c.id)) {
      recovered.push(c.id);
      return { ...c, injured: false };
    }
    return c;
  }).filter((c) => !removed.has(c.id));

  const deployedIds = campaign.deployedIds.filter((id) => !removed.has(id));
  return { roster, deployedIds, graveyard, newlyInjured, recovered, fallen };
}
