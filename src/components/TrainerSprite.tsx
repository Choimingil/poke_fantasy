const HAIR = '#241a15';
const HAIR_DARK = '#160f0b';
const SKIN = '#c99569';
const SKIN_SHADE = '#a97a4f';
const IRON = '#7c828c';
const IRON_DARK = '#565c66';
const CLOTH = '#5c2b2b';
const CLOTH_DARK = '#431d1d';
const PANTS = '#332e2a';
const LEATHER = '#4a3220';
const LEATHER_DARK = '#2d1e11';
const EYE = '#141010';

export type SpriteFacing = 'front' | 'back';

/**
 * 임시 플레이스홀더 캐릭터 스프라이트. 모든 캐릭터가 동일한 남자 모습을 공유한다.
 * 저해상도 픽셀 그리드(20x28 유닛) + crispEdges로 도트(픽셀 아트) 질감을 내고,
 * 갑옷/가죽 위주의 무채색 톤으로 중세·무협 판타지 분위기를 낸다.
 */
export function TrainerSprite({ facing, className }: { facing: SpriteFacing; className?: string }) {
  return (
    <svg viewBox="0 0 20 28" className={className} shapeRendering="crispEdges" aria-hidden="true">
      {/* 그림자 */}
      <rect x={5} y={27} width={10} height={1} fill="rgba(0,0,0,0.25)" />

      {/* 다리 */}
      <rect x={7} y={19} width={2} height={7} fill={PANTS} />
      <rect x={11} y={19} width={2} height={7} fill={PANTS} />

      {/* 신발 */}
      <rect x={6} y={26} width={4} height={2} fill={LEATHER_DARK} />
      <rect x={10} y={26} width={4} height={2} fill={LEATHER_DARK} />

      {/* 팔 */}
      <rect x={3} y={11} width={3} height={8} fill={CLOTH} />
      <rect x={3} y={11} width={1} height={8} fill={CLOTH_DARK} />
      <rect x={14} y={11} width={3} height={8} fill={CLOTH} />
      <rect x={16} y={11} width={1} height={8} fill={CLOTH_DARK} />
      <rect x={3} y={19} width={3} height={2} fill={SKIN} />
      <rect x={14} y={19} width={3} height={2} fill={SKIN} />

      {/* 어깨 갑옷(견갑) */}
      <rect x={4} y={10} width={4} height={2} fill={IRON} />
      <rect x={12} y={10} width={4} height={2} fill={IRON} />
      <rect x={4} y={11} width={4} height={1} fill={IRON_DARK} />
      <rect x={12} y={11} width={4} height={1} fill={IRON_DARK} />

      {/* 몸통(튜닉) */}
      <rect x={7} y={10} width={6} height={9} fill={CLOTH} />
      <rect x={7} y={10} width={6} height={1} fill={CLOTH_DARK} />

      {/* 허리띠 */}
      <rect x={7} y={18} width={6} height={1} fill={LEATHER} />
      <rect x={9} y={18} width={2} height={1} fill={IRON} />

      {/* 목 */}
      <rect x={8} y={9} width={4} height={1} fill={SKIN_SHADE} />

      {facing === 'front' ? (
        <>
          {/* 머리카락 */}
          <rect x={6} y={0} width={8} height={4} fill={HAIR} />
          <rect x={6} y={4} width={1} height={5} fill={HAIR} />
          <rect x={13} y={4} width={1} height={5} fill={HAIR} />
          {/* 얼굴 */}
          <rect x={7} y={4} width={6} height={5} fill={SKIN} />
          <rect x={8} y={6} width={1} height={1} fill={EYE} />
          <rect x={11} y={6} width={1} height={1} fill={EYE} />
        </>
      ) : (
        <>
          {/* 뒷머리 (얼굴 특징 없음) */}
          <rect x={6} y={0} width={8} height={9} fill={HAIR} />
          <rect x={9} y={0} width={2} height={9} fill={HAIR_DARK} />
        </>
      )}
    </svg>
  );
}
