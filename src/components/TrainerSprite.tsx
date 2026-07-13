const HAIR = '#3d2314';
const SKIN = '#f2c39a';
const SHIRT = '#3b64c9';
const SHIRT_DARK = '#2c4a99';
const PANTS = '#2b3040';
const SHOES = '#5a3a1e';
const EYE = '#1a1a1a';

export type SpriteFacing = 'front' | 'back';

/** 임시 플레이스홀더 캐릭터 스프라이트. 모든 캐릭터가 동일한 남자 모습을 공유한다. */
export function TrainerSprite({ facing, className }: { facing: SpriteFacing; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 32"
      className={className}
      shapeRendering="crispEdges"
      style={{ imageRendering: 'pixelated' }}
      aria-hidden="true"
    >
      {/* 다리 */}
      <rect x={7} y={19} width={4} height={8} fill={PANTS} />
      <rect x={13} y={19} width={4} height={8} fill={PANTS} />
      {/* 신발 */}
      <rect x={6} y={27} width={5} height={3} fill={SHOES} />
      <rect x={13} y={27} width={5} height={3} fill={SHOES} />
      {/* 팔(소매+손) */}
      <rect x={3} y={12} width={3} height={5} fill={SHIRT_DARK} />
      <rect x={3} y={17} width={3} height={2} fill={SKIN} />
      <rect x={18} y={12} width={3} height={5} fill={SHIRT_DARK} />
      <rect x={18} y={17} width={3} height={2} fill={SKIN} />
      {/* 몸통 */}
      <rect x={6} y={11} width={12} height={9} fill={SHIRT} />
      <rect x={6} y={18} width={12} height={1} fill={SHIRT_DARK} />

      {facing === 'front' ? (
        <>
          {/* 얼굴 */}
          <rect x={8} y={5} width={8} height={6} fill={SKIN} />
          <rect x={6} y={4} width={12} height={3} fill={HAIR} />
          <rect x={6} y={5} width={2} height={4} fill={HAIR} />
          <rect x={16} y={5} width={2} height={4} fill={HAIR} />
          <rect x={10} y={8} width={1} height={1} fill={EYE} />
          <rect x={13} y={8} width={1} height={1} fill={EYE} />
        </>
      ) : (
        <>
          {/* 뒷머리 (얼굴 특징 없음) */}
          <rect x={8} y={5} width={8} height={6} fill={SKIN} />
          <rect x={6} y={4} width={12} height={7} fill={HAIR} />
          <rect x={11} y={5} width={2} height={6} fill="#2c1a0e" />
        </>
      )}
    </svg>
  );
}
