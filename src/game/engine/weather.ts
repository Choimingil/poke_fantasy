import type { Character, WeaponKind } from '../types';
import { getWeapon } from '../data/weapons';

export type Weather = 'clear' | 'rain' | 'snow' | 'heatwave';

const WEATHERS: Weather[] = ['clear', 'rain', 'snow', 'heatwave'];

export const WEATHER_LABEL: Record<Weather, string> = {
  clear: '맑음',
  rain: '비',
  snow: '눈',
  heatwave: '폭염',
};

// 중장(근접) 계열은 비에, 경장(원거리·마법) 계열은 눈에 이동 페널티를 받는다.
const HEAVY_KINDS: WeaponKind[] = ['sword', 'blunt', 'spear', 'shield'];

function equippedKind(c: Character): WeaponKind | undefined {
  const inst = c.inventory.find((w) => w.instanceId === c.equippedWeaponId);
  return inst ? getWeapon(inst.templateId).kind : undefined;
}

/** 날씨에 따른 rawMove 보정치. 비=중장 -0.5, 눈=경장 -0.5. */
export function weatherMoveModifier(c: Character, weather: Weather): number {
  const kind = equippedKind(c);
  if (!kind) return 0;
  const heavy = HEAVY_KINDS.includes(kind);
  if (weather === 'rain' && heavy) return -0.5;
  if (weather === 'snow' && !heavy) return -0.5;
  return 0;
}

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
  const damage = Math.max(1, Math.round(c.baseStats.hp / 16));
  c.currentHp = Math.max(0, c.currentHp - damage);
  return damage;
}

export function pickRandomWeather(rng: () => number): Weather {
  return WEATHERS[Math.floor(rng() * WEATHERS.length)] ?? 'clear';
}
