// 업로드된 다크 워리어 캐릭터 기준 팔레트: 흑발 장발 + 흑색 플레이트 갑옷 +
// 회색 금속 플레이팅 + 가슴의 붉은 X자 발광 문양 + 보라색 포인트.
const HAIR = '#100e16';
const HAIR_DARK = '#060509';
const HAIR_HI = '#2a2636';
const SKIN = '#c99569';
const SKIN_SHADE = '#a97a4f';
const PLATE = '#2b2833';
const PLATE_DARK = '#181620';
const STEEL = '#5f5b6b';
const STEEL_DARK = '#413e4c';
const PURPLE = '#4a3560';
const EMBER = '#d8384f';
const EMBER_HI = '#ff6d80';
const EYE = '#100c0c';

export type SpriteFacing = 'front' | 'back';

/**
 * 다크 워리어 플레이스홀더 스프라이트. 모든 캐릭터가 동일한 모습을 공유한다.
 * 저해상도 픽셀 그리드(20x28 유닛) + crispEdges로 도트(픽셀 아트) 질감을 내고,
 * 흑색 플레이트 갑옷 + 붉은 문양 + 보라 포인트로 어두운 판타지 분위기를 낸다.
 */
export function TrainerSprite({ facing, className }: { facing: SpriteFacing; className?: string }) {
  return (
    <svg viewBox="0 0 20 28" className={className} shapeRendering="crispEdges" aria-hidden="true">
      {/* 그림자 */}
      <rect x={5} y={27} width={10} height={1} fill="rgba(0,0,0,0.3)" />

      {/* 다리(장갑 각반) */}
      <rect x={7} y={19} width={2} height={7} fill={PLATE} />
      <rect x={11} y={19} width={2} height={7} fill={PLATE} />
      <rect x={7} y={19} width={1} height={7} fill={PLATE_DARK} />
      <rect x={11} y={19} width={1} height={7} fill={PLATE_DARK} />
      <rect x={7} y={22} width={2} height={1} fill={STEEL} />
      <rect x={11} y={22} width={2} height={1} fill={STEEL} />

      {/* 강화 부츠 */}
      <rect x={6} y={26} width={4} height={2} fill={PLATE_DARK} />
      <rect x={10} y={26} width={4} height={2} fill={PLATE_DARK} />
      <rect x={6} y={26} width={4} height={1} fill={STEEL_DARK} />
      <rect x={10} y={26} width={4} height={1} fill={STEEL_DARK} />

      {/* 팔(플레이트) */}
      <rect x={3} y={11} width={3} height={8} fill={PLATE} />
      <rect x={3} y={11} width={1} height={8} fill={PLATE_DARK} />
      <rect x={14} y={11} width={3} height={8} fill={PLATE} />
      <rect x={16} y={11} width={1} height={8} fill={PLATE_DARK} />
      {/* 건틀릿 */}
      <rect x={3} y={17} width={3} height={2} fill={STEEL_DARK} />
      <rect x={14} y={17} width={3} height={2} fill={STEEL_DARK} />
      <rect x={3} y={19} width={3} height={2} fill={SKIN} />
      <rect x={14} y={19} width={3} height={2} fill={SKIN} />

      {/* 어깨 갑옷(견갑) — 각진 금속 */}
      <rect x={3} y={9} width={5} height={3} fill={STEEL} />
      <rect x={12} y={9} width={5} height={3} fill={STEEL} />
      <rect x={3} y={11} width={5} height={1} fill={STEEL_DARK} />
      <rect x={12} y={11} width={5} height={1} fill={STEEL_DARK} />
      <rect x={3} y={9} width={1} height={3} fill={PURPLE} />
      <rect x={16} y={9} width={1} height={3} fill={PURPLE} />

      {/* 몸통(흉갑) */}
      <rect x={7} y={10} width={6} height={9} fill={PLATE} />
      <rect x={7} y={10} width={6} height={1} fill={PLATE_DARK} />
      <rect x={7} y={10} width={1} height={9} fill={PLATE_DARK} />

      {/* 허리띠 */}
      <rect x={7} y={18} width={6} height={1} fill={STEEL_DARK} />
      <rect x={9} y={18} width={2} height={1} fill={PURPLE} />

      {/* 목 */}
      <rect x={8} y={9} width={4} height={1} fill={SKIN_SHADE} />

      {facing === 'front' ? (
        <>
          {/* 가슴의 붉은 X자 발광 문양 */}
          <rect x={8} y={12} width={1} height={1} fill={EMBER} />
          <rect x={11} y={12} width={1} height={1} fill={EMBER} />
          <rect x={9} y={13} width={2} height={1} fill={EMBER_HI} />
          <rect x={8} y={14} width={1} height={1} fill={EMBER} />
          <rect x={11} y={14} width={1} height={1} fill={EMBER} />
          <rect x={9} y={15} width={2} height={1} fill={EMBER} />

          {/* 흑발 (앞머리 + 옆으로 흘러내림) */}
          <rect x={5} y={0} width={10} height={4} fill={HAIR} />
          <rect x={5} y={0} width={10} height={1} fill={HAIR_DARK} />
          <rect x={7} y={1} width={2} height={1} fill={HAIR_HI} />
          <rect x={5} y={4} width={2} height={6} fill={HAIR} />
          <rect x={13} y={4} width={2} height={6} fill={HAIR} />
          <rect x={5} y={4} width={1} height={6} fill={HAIR_DARK} />
          <rect x={14} y={4} width={1} height={6} fill={HAIR_DARK} />
          {/* 얼굴 */}
          <rect x={7} y={4} width={6} height={5} fill={SKIN} />
          <rect x={7} y={3} width={2} height={1} fill={HAIR} />
          <rect x={11} y={3} width={2} height={1} fill={HAIR} />
          {/* 날카로운 눈 */}
          <rect x={8} y={6} width={1} height={1} fill={EYE} />
          <rect x={11} y={6} width={1} height={1} fill={EYE} />
        </>
      ) : (
        <>
          {/* 뒷모습: 등까지 흘러내린 장발 */}
          <rect x={5} y={0} width={10} height={11} fill={HAIR} />
          <rect x={5} y={11} width={3} height={4} fill={HAIR} />
          <rect x={12} y={11} width={3} height={4} fill={HAIR} />
          <rect x={9} y={0} width={2} height={15} fill={HAIR_DARK} />
          <rect x={6} y={1} width={2} height={1} fill={HAIR_HI} />
          <rect x={5} y={0} width={1} height={11} fill={HAIR_DARK} />
          <rect x={14} y={0} width={1} height={11} fill={HAIR_DARK} />
        </>
      )}
    </svg>
  );
}
