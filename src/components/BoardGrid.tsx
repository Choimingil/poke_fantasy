import type { BattleMap, Character, GridPos } from '../game/types';
import type { Side } from '../game/engine/battle';
import { posKey } from '../game/engine/grid';
import { UnitToken } from './UnitToken';

export function BoardGrid({
  map,
  teamA,
  teamB,
  currentUnitId,
  reachableTiles,
  targetableUnitIds,
  targetableTiles,
  onTileClick,
}: {
  map: BattleMap;
  teamA: Character[];
  teamB: Character[];
  currentUnitId: string | null;
  reachableTiles: Set<string>;
  targetableUnitIds: Set<string>;
  targetableTiles: Set<string>;
  onTileClick: (pos: GridPos) => void;
}) {
  const cells = [];
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile = map.tiles[y][x];
      const key = posKey({ x, y });
      const classes = [
        'tile-cell',
        `tile-${tile.terrain}`,
        tile.status?.type === 'burning' ? 'tile-status-burning' : '',
        reachableTiles.has(key) ? 'tile-highlight-move' : '',
        targetableTiles.has(key) ? 'tile-highlight-target' : '',
      ]
        .filter(Boolean)
        .join(' ');
      cells.push(
        <div key={key} className={classes} style={{ gridColumn: x + 1, gridRow: y + 1 }} onClick={() => onTileClick({ x, y })} />,
      );
    }
  }

  return (
    <div className="grid-board" style={{ gridTemplateColumns: `repeat(${map.width}, 1fr)`, gridTemplateRows: `repeat(${map.height}, 1fr)` }}>
      {cells}
      {teamA.map((c) => c.currentHp > 0 && (
        <UnitToken key={c.id} character={c} side={'A' as Side} isCurrentTurn={c.id === currentUnitId} isSelectedTarget={targetableUnitIds.has(c.id)} />
      ))}
      {teamB.map((c) => c.currentHp > 0 && (
        <UnitToken key={c.id} character={c} side={'B' as Side} isCurrentTurn={c.id === currentUnitId} isSelectedTarget={targetableUnitIds.has(c.id)} />
      ))}
    </div>
  );
}
