import warriorFront from '../assets/warrior-front.png';
import warriorBack from '../assets/warrior-back.png';

export type SpriteFacing = 'front' | 'back';

/**
 * 공용 캐릭터 스프라이트. 사용자가 제공한 다크 워리어 원화를 누끼(배경 제거)만 해서
 * 그대로 사용한다. 정면/후면 두 컷을 각각 상대/플레이어 진영에 표시한다.
 */
export function TrainerSprite({ facing, className }: { facing: SpriteFacing; className?: string }) {
  return (
    <img
      src={facing === 'front' ? warriorFront : warriorBack}
      className={className}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
