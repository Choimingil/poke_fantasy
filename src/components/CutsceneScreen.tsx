import { useState } from 'react';
import type { Cutscene } from '../game/campaign/story/types';
import type { SpriteGender } from '../game/types';
import { TrainerSprite } from './TrainerSprite';

export interface CutsceneHero {
  name: string;
  spriteJob: string;
  gender: SpriteGender;
}

/**
 * 스토리 컷씬(대사창 + 직업 스프라이트 초상). 화면 아무 곳이나 클릭하면 다음 줄로 진행,
 * 마지막 줄에서 진행하면 onDone. narration 줄은 화자·초상 없이 중앙 지문으로 표시한다.
 */
export function CutsceneScreen({
  cutscene,
  hero,
  title,
  onDone,
}: {
  cutscene: Cutscene;
  hero: CutsceneHero;
  title?: string;
  onDone: () => void;
}) {
  const [i, setI] = useState(0);
  const lines = cutscene.lines;
  if (lines.length === 0) {
    onDone();
    return null;
  }
  const line = lines[i];
  const advance = () => {
    if (i + 1 >= lines.length) onDone();
    else setI(i + 1);
  };

  const isHero = !!line.hero;
  const speaker = isHero ? hero.name : line.speaker;
  const portraitJob = isHero ? hero.spriteJob : line.portraitJob;
  const portraitGender: SpriteGender = isHero ? hero.gender : (line.portraitGender ?? 'male');

  return (
    <div
      onClick={advance}
      style={{
        position: 'fixed', inset: 0, background: 'radial-gradient(circle at 50% 30%, #241a33, #0f0a17)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        color: '#f2ecff', cursor: 'pointer', userSelect: 'none', overflow: 'hidden',
      }}
    >
      {title && (
        <div style={{ position: 'absolute', top: 20, left: 0, right: 0, textAlign: 'center', fontSize: 15, letterSpacing: 2, color: '#b9a7e6' }}>
          — {title} —
        </div>
      )}

      {/* 진행 카운터 + 건너뛰기 */}
      <div style={{ position: 'absolute', top: 16, right: 20, fontSize: 12, color: '#8a7ab0' }}>{i + 1}/{lines.length}</div>
      <button
        onClick={(e) => { e.stopPropagation(); onDone(); }}
        style={{ position: 'absolute', top: 14, left: 20, background: 'transparent', border: '1px solid #5a4b7a', color: '#b9a7e6', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
      >
        건너뛰기 »
      </button>

      {/* 초상 */}
      {!line.narration && portraitJob && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', flex: 1, paddingBottom: 8 }}>
          <TrainerSprite jobId={portraitJob} gender={portraitGender} facing="front" className="cutscene-portrait" />
        </div>
      )}
      {(line.narration || !portraitJob) && <div style={{ flex: 1 }} />}

      {/* 대사 박스 */}
      <div style={{ padding: '0 6vw 8vh' }}>
        <div
          style={{
            maxWidth: 820, margin: '0 auto', background: 'rgba(20,14,32,0.92)',
            border: '2px solid #6a58a0', borderRadius: 12, padding: '18px 22px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          }}
        >
          {line.narration ? (
            <p style={{ margin: 0, fontStyle: 'italic', color: '#cbbff0', lineHeight: 1.6, textAlign: 'center' }}>{line.text}</p>
          ) : (
            <>
              <div style={{ fontWeight: 700, color: '#ffd98a', marginBottom: 8, fontSize: 15 }}>{speaker}</div>
              <p style={{ margin: 0, lineHeight: 1.7, fontSize: 16 }}>{line.text}</p>
            </>
          )}
          <div style={{ textAlign: 'right', marginTop: 10, color: '#8a7ab0', fontSize: 13 }}>
            {i + 1 >= lines.length ? '클릭하여 시작 ▶' : '클릭하여 계속 ▼'}
          </div>
        </div>
      </div>
    </div>
  );
}
