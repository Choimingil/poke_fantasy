import type { ArmorKind, Character } from '../types';
import { getArmor } from '../data/armor';
import { maxHp } from './derivedStats';

export type Weather = 'clear' | 'rain' | 'snow' | 'heatwave';

const WEATHERS: Weather[] = ['clear', 'rain', 'snow', 'heatwave'];

export const WEATHER_LABEL: Record<Weather, string> = {
  clear: '맑음',
  rain: '비',
  snow: '눈',
  heatwave: '폭염',
};

// 중장(중갑·판금)은 비에, 경장(천·가죽, 미착용 포함)은 눈에 이동 페널티를 받는다.
const HEAVY_ARMOR: ArmorKind[] = ['mail', 'plate'];

function equippedArmorKind(c: Character): ArmorKind | undefined {
  if (!c.equippedArmorId) return undefined;
  const inst = c.armor.find((a) => a.instanceId === c.equippedArmorId);
  return inst ? getArmor(inst.templateId).kind : undefined;
}

/** 날씨에 따른 rawMove 보정치. 착용한 방어구 종류로 판정: 비=중장 -0.5, 눈=경장 -0.5. */
export function weatherMoveModifier(c: Character, weather: Weather): number {
  const heavy = HEAVY_ARMOR.includes(equippedArmorKind(c) ?? 'cloth'); // 미착용은 경장 취급
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
  const damage = Math.max(1, Math.round(maxHp(c) / 16));
  c.currentHp = Math.max(0, c.currentHp - damage);
  return damage;
}

export function pickRandomWeather(rng: () => number): Weather {
  return WEATHERS[Math.floor(rng() * WEATHERS.length)] ?? 'clear';
}
