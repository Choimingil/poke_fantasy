import type { Character, GridPos } from '../game/types';
import type { Side } from '../game/engine/battle';
import { maxHp } from '../game/engine/derivedStats';
import { TrainerSprite } from './TrainerSprite';
import { HpBar } from './HpBar';

export function UnitToken({
  character,
  side,
  isCurrentTurn,
  isSelectedTarget,
  posOverride,
  isAttacking = false,
  isHit = false,
  float = null,
  floatKey = 0,
}: {
  character: Character;
  side: Side;
  isCurrentTurn: boolean;
  isSelectedTarget: boolean;
  posOverride?: GridPos | null;
  isAttacking?: boolean;
  isHit?: boolean;
  float?: { text: string; kind: string } | null;
  floatKey?: number;
}) {
  const pos = posOverride ?? character.position;
  const classes = [
    'unit-token',
    `unit-token-team${side}`,
    isCurrentTurn ? 'unit-token-current' : '',
    isSelectedTarget ? 'unit-token-targetable' : '',
    isAttacking ? 'unit-token-attacking' : '',
    isHit ? 'unit-token-hit' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div
      className={classes}
      style={{ gridColumn: pos.x + 1, gridRow: pos.y + 1 }}
      title={`${character.name}${character.isBoss ? ' [보스]' : character.isElite ? ' [정예]' : ''} Lv.${character.level} (${character.currentHp}/${maxHp(character)})`}
    >
      {float && (
        <span key={floatKey} className={`combat-float combat-float-${float.kind}`}>{float.text}</span>
      )}
      <TrainerSprite
        jobId={character.spriteJob}
        gender={character.gender}
        facing={side === 'A' ? 'back' : 'front'}
        className="unit-token-sprite"
      />
      <HpBar character={character} />
    </div>
  );
}
