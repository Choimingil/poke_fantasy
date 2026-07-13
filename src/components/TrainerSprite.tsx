const HAIR = '#3d2314';
const HAIR_SHADE = '#2c190e';
const SKIN = '#f5c9a0';
const SKIN_SHADE = '#e8b285';
const CHEEK = '#f5a08a';
const SHIRT = '#4472e0';
const SHIRT_SHADE = '#3159bd';
const PANTS = '#33384a';
const PANTS_SHADE = '#262a38';
const SHOES = '#6b4426';
const EYE = '#241a1a';

export type SpriteFacing = 'front' | 'back';

/**
 * 임시 플레이스홀더 캐릭터 스프라이트. 모든 캐릭터가 동일한 남자 모습을 공유한다.
 * 둥근 도형 위주의 치비(chibi) JRPG 스타일로, 각진 픽셀 블록 대신 곡선 실루엣을 사용한다.
 */
export function TrainerSprite({ facing, className }: { facing: SpriteFacing; className?: string }) {
  return (
    <svg viewBox="0 0 100 130" className={className} aria-hidden="true">
      {/* 그림자 */}
      <ellipse cx={50} cy={124} rx={26} ry={5} fill="rgba(0,0,0,0.18)" />

      {/* 다리 */}
      <rect x={30} y={90} width={16} height={30} rx={7} fill={PANTS} />
      <rect x={54} y={90} width={16} height={30} rx={7} fill={PANTS} />
      <rect x={30} y={108} width={16} height={14} rx={7} fill={PANTS_SHADE} />
      <rect x={54} y={108} width={16} height={14} rx={7} fill={PANTS_SHADE} />

      {/* 신발 */}
      <ellipse cx={38} cy={122} rx={11} ry={7} fill={SHOES} />
      <ellipse cx={62} cy={122} rx={11} ry={7} fill={SHOES} />

      {/* 팔 */}
      <rect x={12} y={58} width={16} height={34} rx={8} fill={SHIRT} />
      <rect x={72} y={58} width={16} height={34} rx={8} fill={SHIRT} />
      <circle cx={20} cy={94} r={9} fill={SKIN} />
      <circle cx={80} cy={94} r={9} fill={SKIN} />

      {/* 몸통 */}
      <path d="M32 52 Q50 40 68 52 L72 96 Q50 106 28 96 Z" fill={SHIRT} />
      <path d="M32 52 Q50 40 68 52 L69 62 Q50 50 31 62 Z" fill={SHIRT_SHADE} />

      {/* 목 */}
      <rect x={42} y={38} width={16} height={14} rx={6} fill={SKIN_SHADE} />

      {/* 머리 */}
      <circle cx={50} cy={26} r={24} fill={SKIN} />

      {facing === 'front' ? (
        <>
          <path
            d="M26 24 Q24 -2 50 2 Q76 -2 74 24 Q74 10 62 8 Q56 18 50 8 Q44 18 38 8 Q26 10 26 24 Z"
            fill={HAIR}
          />
          <circle cx={38} cy={40} r={4} fill={CHEEK} opacity={0.7} />
          <circle cx={62} cy={40} r={4} fill={CHEEK} opacity={0.7} />
          <ellipse cx={41} cy={28} rx={2.6} ry={3.4} fill={EYE} />
          <ellipse cx={59} cy={28} rx={2.6} ry={3.4} fill={EYE} />
          <path d="M46 38 Q50 41 54 38" stroke={SKIN_SHADE} strokeWidth={2} fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path
            d="M25 26 Q22 -4 50 1 Q78 -4 75 26 Q76 44 65 50 Q70 30 62 16 Q56 26 50 14 Q44 26 38 16 Q30 30 35 50 Q24 44 25 26 Z"
            fill={HAIR}
          />
          <path d="M50 14 Q54 24 50 34 Q46 24 50 14 Z" fill={HAIR_SHADE} />
        </>
      )}
    </svg>
  );
}
