import type { Character } from '../game/types';
import type { Side } from '../game/engine/battle';
import { TrainerSprite } from './TrainerSprite';
import { HpBar } from './HpBar';

export function UnitToken({
  character,
  side,
  isCurrentTurn,
  isSelectedTarget,
}: {
  character: Character;
  side: Side;
  isCurrentTurn: boolean;
  isSelectedTarget: boolean;
}) {
  const classes = ['unit-token', `unit-token-team${side}`, isCurrentTurn ? 'unit-token-current' : '', isSelectedTarget ? 'unit-token-targetable' : '']
    .filter(Boolean)
    .join(' ');
  return (
    <div
      className={classes}
      style={{ gridColumn: character.position.x + 1, gridRow: character.position.y + 1 }}
      title={`${character.name} Lv.${character.level} (${character.currentHp}/${character.baseStats.hp})`}
    >
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
