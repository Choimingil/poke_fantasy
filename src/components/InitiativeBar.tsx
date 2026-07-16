import type { Character } from '../game/types';

/**
 * 참여 중인 모든 캐릭터를 스피드 순으로 보여주고 현재 차례를 표시한다.
 * 암흑(시야 밖)으로 플레이어에게 공개되지 않은 상대는 ???로 표시한다.
 */
export function InitiativeBar({
  units,
  currentUnitId,
  visibleEnemyIds,
}: {
  units: Character[]; // 이미 스피드 내림차순으로 정렬된 살아있는 유닛
  currentUnitId: string | null;
  visibleEnemyIds: Set<string>;
}) {
  return (
    <div className="initiative-bar" role="list" aria-label="행동 순서">
      {units.map((u) => {
        const isPlayer = u.side === 'A';
        const revealed = isPlayer || visibleEnemyIds.has(u.id);
        const isCurrent = u.id === currentUnitId;
        const classes = [
          'init-chip',
          isPlayer ? 'init-chip-ally' : 'init-chip-enemy',
          isCurrent ? 'init-chip-current' : '',
          revealed ? '' : 'init-chip-hidden',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <span key={u.id} className={classes} role="listitem">
            {isCurrent && <span className="init-chip-marker">▶</span>}
            {revealed ? `${u.name} Lv.${u.level}` : '???'}
          </span>
        );
      })}
    </div>
  );
}
