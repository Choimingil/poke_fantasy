import type { Character } from '../types';
import { maxHp } from './derivedStats';

export type Weather = 'clear' | 'rain' | 'snow' | 'heatwave';

const WEATHERS: Weather[] = ['clear', 'rain', 'snow', 'heatwave'];

export const WEATHER_LABEL: Record<Weather, string> = {
  clear: '맑음',
  rain: '비',
  snow: '눈',
  heatwave: '폭염',
};

// 날씨의 이동 영향은 방어구 무게가 아니라 타일 진입 비용으로 처리한다(눈=평지·숲 진입 +1, grid.ts). 비는 시야만 감소.

/** 폭염 저항 확률(정신력): 마법공격력이 높을수록 체력 감소를 막을 확률이 커진다(최대 70%). */
function heatResistChance(c: Character): number {
  return Math.min(0.7, c.baseStats.magicAttack / 40);
}

/**
 * 폭염 시 턴 시작에 최대 체력 1/16의 피해. 단, 정신력(마법공격력 기반) 확률로 막을 수 있다.
 * 실제로 피해를 입혔다면 그 값을, 아니면 0을 반환한다.
 */
export function weatherTurnStartDamage(c: Character, weather: Weather, rng: () => number): number {
  if (weather !== 'heatwave') return 0;
  if (rng() < heatResistChance(c)) return 0;
  const damage = Math.max(1, Math.round(maxHp(c) / 16));
  c.currentHp = Math.max(0, c.currentHp - damage);
  return damage;
}

export function pickRandomWeather(rng: () => number): Weather {
  return WEATHERS[Math.floor(rng() * WEATHERS.length)] ?? 'clear';
}
