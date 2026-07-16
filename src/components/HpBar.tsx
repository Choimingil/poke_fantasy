import type { Character } from '../game/types';

function hpRatioClass(ratio: number): string {
  if (ratio <= 0.2) return 'low';
  if (ratio <= 0.5) return 'mid';
  return 'high';
}

export function HpBar({ character }: { character: Character }) {
  const ratio = Math.max(0, character.currentHp / character.baseStats.hp);
  return (
    <div className="hp-bar">
      <div className={`hp-bar-fill ${hpRatioClass(ratio)}`} style={{ width: `${ratio * 100}%` }} />
    </div>
  );
}
