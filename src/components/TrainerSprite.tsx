export type SpriteFacing = 'front' | 'back';
export type Gender = 'male' | 'female';

// 직업×성별×방향별 원화 컷(누끼)을 자동 수집한다.
// 파일명 규칙: {jobId}-{gender}-{front|back}.png
const modules = import.meta.glob('../assets/jobs/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const SPRITES: Record<string, string> = {};
for (const [path, url] of Object.entries(modules)) {
  const key = path.split('/').pop()!.replace('.png', '');
  SPRITES[key] = url;
}

function resolveSprite(jobId: string, gender: Gender, facing: SpriteFacing): string | undefined {
  return (
    SPRITES[`${jobId}-${gender}-${facing}`] ??
    SPRITES[`${jobId}-male-${facing}`] ??
    SPRITES[`${jobId}-female-${facing}`]
  );
}

/**
 * 직업·성별에 맞는 캐릭터 원화를 누끼(배경 제거)만 해서 그대로 표시한다.
 * 정면(front)은 상대 진영, 후면(back)은 플레이어 진영에 쓰인다.
 * 스프라이트를 찾지 못하면 아무것도 렌더하지 않는다(캐릭터가 사각형 이미지로 덮이지 않도록).
 */
export function TrainerSprite({
  jobId,
  gender,
  facing,
  className,
}: {
  jobId: string;
  gender: Gender;
  facing: SpriteFacing;
  className?: string;
}) {
  const src = resolveSprite(jobId, gender, facing);
  if (!src) return null;
  return <img src={src} className={className} alt="" aria-hidden="true" draggable={false} />;
}
