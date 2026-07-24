import { useLayoutEffect, useRef } from 'react';
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
  rock: '🪨',
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
  exploredTiles,
  visibleEnemyIds,
  focusPos,
  previewUnitId,
  previewPos,
  motionAttackerId,
  motionTargetIds,
  floatByUnit,
  floatKey = 0,
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
  exploredTiles: Set<string>;
  visibleEnemyIds: Set<string>;
  focusPos: GridPos | null;
  previewUnitId?: string | null;
  previewPos?: GridPos | null;
  motionAttackerId?: string | null;
  motionTargetIds?: Set<string>;
  floatByUnit?: Record<string, { text: string; kind: string }> | null;
  floatKey?: number;
  onTileClick: (pos: GridPos) => void;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const centeredOnceRef = useRef(false);

  // 카메라: focusPos가 주어지면 해당 칸을 뷰포트 중앙으로 스크롤한다.
  // 첫 배치는 paint 전에 **즉시**(behavior 'auto') 잡아 좌상단에서 튀는 현상을 없애고,
  // 이후 이동은 부드럽게(smooth) 따라간다. useLayoutEffect라 화면에 0,0이 잠깐 보이지 않는다.
  useLayoutEffect(() => {
    const vp = viewportRef.current;
    if (!vp || !focusPos) return;
    vp.scrollTo({
      left: (focusPos.x + 0.5) * CELL - vp.clientWidth / 2,
      top: (focusPos.y + 0.5) * CELL - vp.clientHeight / 2,
      behavior: centeredOnceRef.current ? 'smooth' : 'auto',
    });
    centeredOnceRef.current = true;
  }, [focusPos]);

  const cells = [];
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile = map.tiles[y][x];
      const key = posKey({ x, y });
      // 시야: 현재 보이면 지형 전체 색, 한 번 밝혔던(탐사) 타일은 지형 색을 어둡게(스타크래프트식),
      // 한 번도 못 본 타일은 지형을 알 수 없는 균일한 암흑 타일로 표시한다.
      const revealed = revealedTiles.has(key);
      const explored = revealed || exploredTiles.has(key);
      const classes = [
        'tile-cell',
        explored ? `tile-${tile.terrain}` : 'tile-unknown',
        !revealed && explored ? 'tile-explored' : '',
        revealed && tile.status?.type === 'burning' ? 'tile-status-burning' : '',
        reachableTiles.has(key) ? 'tile-highlight-move' : '',
        targetableTiles.has(key) ? 'tile-highlight-target' : '',
      ]
        .filter(Boolean)
        .join(' ');
      const icon = !explored ? '' : (revealed && tile.status?.type === 'burning' ? '🔥' : TERRAIN_ICON[tile.terrain]);
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
        {teamA.map((c) => (c.currentHp > 0 || floatByUnit?.[c.id]) && (
          <UnitToken
            key={c.id}
            character={c}
            side={'A' as Side}
            isCurrentTurn={c.id === currentUnitId}
            isSelectedTarget={targetableUnitIds.has(c.id)}
            posOverride={c.id === previewUnitId ? previewPos : null}
            isAttacking={c.id === motionAttackerId}
            isHit={motionTargetIds?.has(c.id) ?? false}
            float={floatByUnit?.[c.id] ?? null}
            floatKey={floatKey}
          />
        ))}
        {/* 적 유닛은 플레이어 시야에 들어온 경우에만 표시(안개/숲 은폐). 이번 턴 피해 표시가 있으면
            쓰러진 순간에도 데미지 숫자가 보이도록 잠깐 함께 렌더한다. */}
        {teamB.map((c) => ((c.currentHp > 0 && visibleEnemyIds.has(c.id)) || floatByUnit?.[c.id]) && (
          <UnitToken
            key={c.id}
            character={c}
            side={'B' as Side}
            isCurrentTurn={c.id === currentUnitId}
            isSelectedTarget={targetableUnitIds.has(c.id)}
            isAttacking={c.id === motionAttackerId}
            isHit={motionTargetIds?.has(c.id) ?? false}
            float={floatByUnit?.[c.id] ?? null}
            floatKey={floatKey}
          />
        ))}
      </div>
    </div>
  );
}
