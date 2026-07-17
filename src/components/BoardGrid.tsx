import { useEffect, useRef } from 'react';
import type { BattleMap, Character, GridPos } from '../game/types';
import type { Side } from '../game/engine/battle';
import { posKey } from '../game/engine/grid';
import { UnitToken } from './UnitToken';

const CELL = 86; // px, 타일을 크게 고정하고 카메라가 캐릭터를 따라 스크롤한다(스타크래프트식)

const TERRAIN_ICON: Record<string, string> = {
  plain: '',
  forest: '🌲',
  hill: '⛰️',
  water: '🌊',
};

export function BoardGrid({
  map,
  teamA,
  teamB,
  currentUnitId,
  reachableTiles,
  targetableUnitIds,
  targetableTiles,
  revealedTiles,
  visibleEnemyIds,
  focusPos,
  previewUnitId,
  previewPos,
  motionAttackerId,
  motionTargetIds,
  onTileClick,
}: {
  map: BattleMap;
  teamA: Character[];
  teamB: Character[];
  currentUnitId: string | null;
  reachableTiles: Set<string>;
  targetableUnitIds: Set<string>;
  targetableTiles: Set<string>;
  revealedTiles: Set<string>;
  visibleEnemyIds: Set<string>;
  focusPos: GridPos | null;
  previewUnitId?: string | null;
  previewPos?: GridPos | null;
  motionAttackerId?: string | null;
  motionTargetIds?: Set<string>;
  onTileClick: (pos: GridPos) => void;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);

  // 카메라: focusPos가 주어지면 해당 칸을 뷰포트 중앙으로 스크롤한다.
  // (숨은 상대 유닛의 차례에는 focusPos가 null로 들어와 카메라가 움직이지 않는다.)
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || !focusPos) return;
    vp.scrollTo({
      left: (focusPos.x + 0.5) * CELL - vp.clientWidth / 2,
      top: (focusPos.y + 0.5) * CELL - vp.clientHeight / 2,
      behavior: 'smooth',
    });
  }, [focusPos]);

  const cells = [];
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile = map.tiles[y][x];
      const key = posKey({ x, y });
      // 숲 타일은 실루엣이 항상 보이고(내부 유닛만 은폐), 그 외 타일은 시야 밖이면 안개로 덮는다.
      const revealed = tile.terrain === 'forest' || revealedTiles.has(key);
      const classes = [
        'tile-cell',
        `tile-${tile.terrain}`,
        tile.status?.type === 'burning' ? 'tile-status-burning' : '',
        revealed ? '' : 'tile-fog',
        reachableTiles.has(key) ? 'tile-highlight-move' : '',
        targetableTiles.has(key) ? 'tile-highlight-target' : '',
      ]
        .filter(Boolean)
        .join(' ');
      const icon = tile.status?.type === 'burning' ? '🔥' : (revealed ? TERRAIN_ICON[tile.terrain] : '');
      cells.push(
        <div key={key} className={classes} style={{ gridColumn: x + 1, gridRow: y + 1 }} onClick={() => onTileClick({ x, y })}>
          {icon && <span className="terrain-icon">{icon}</span>}
        </div>,
      );
    }
  }

  return (
    <div className="board-viewport" ref={viewportRef}>
      <div
        className="grid-board"
        style={{
          gridTemplateColumns: `repeat(${map.width}, ${CELL}px)`,
          gridTemplateRows: `repeat(${map.height}, ${CELL}px)`,
        }}
      >
        {cells}
        {teamA.map((c) => c.currentHp > 0 && (
          <UnitToken
            key={c.id}
            character={c}
            side={'A' as Side}
            isCurrentTurn={c.id === currentUnitId}
            isSelectedTarget={targetableUnitIds.has(c.id)}
            posOverride={c.id === previewUnitId ? previewPos : null}
            isAttacking={c.id === motionAttackerId}
            isHit={motionTargetIds?.has(c.id) ?? false}
          />
        ))}
        {/* 적 유닛은 플레이어 시야에 들어온 경우에만 표시(안개/숲 은폐) */}
        {teamB.map((c) => c.currentHp > 0 && visibleEnemyIds.has(c.id) && (
          <UnitToken
            key={c.id}
            character={c}
            side={'B' as Side}
            isCurrentTurn={c.id === currentUnitId}
            isSelectedTarget={targetableUnitIds.has(c.id)}
            isAttacking={c.id === motionAttackerId}
            isHit={motionTargetIds?.has(c.id) ?? false}
          />
        ))}
      </div>
    </div>
  );
}
