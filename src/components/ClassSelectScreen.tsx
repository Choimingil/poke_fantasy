import type { WeaponKind } from '../game/types';
import { PLAYABLE_WEAPON_KINDS } from '../game/data/weapons';

const CLASS_INFO: Partial<Record<WeaponKind, { name: string; desc: string }>> = {
  sword: { name: '검사', desc: '근력 기반 근접. 반월참·일섬·섬광참.' },
  blunt: { name: '둔격병', desc: '높은 체력·근력. 다리타격·밀쳐내기·광역보호.' },
  spear: { name: '창병', desc: '관통·봉쇄·돌진. 패시브 반격.' },
  bow: { name: '궁수', desc: '원거리·높은 스피드. 천궁·도약사격·저격.' },
  crossbow: { name: '석궁병', desc: '방어 관통·고정피해. 철갑·관통·치명사격.' },
  dagger: { name: '도적', desc: '최고 스피드. 기습·은신·축지.' },
  thrown: { name: '투척병', desc: '맹독·분신·쇄상. 패시브 협공.' },
  staff: { name: '마법사', desc: '지력 기반 속성 마법. 원소탄·약화·원소폭풍.' },
  tome: { name: '주술사', desc: '치료·정화·재행동 지원.' },
};

export function ClassSelectScreen({ onSelect, onBack }: { onSelect: (kind: WeaponKind) => void; onBack: () => void }) {
  return (
    <div className="app-shell setup-screen">
      <div className="inventory-header">
        <button type="button" className="link-button" onClick={onBack}>← 뒤로</button>
        <h1>주인공 직업 선택</h1>
      </div>
      <p>시작할 직업을 고르세요. 레벨 10 주인공 1명으로 캠페인을 시작합니다.</p>
      <div className="class-grid">
        {PLAYABLE_WEAPON_KINDS.map((kind) => {
          const info = CLASS_INFO[kind];
          if (!info) return null;
          return (
            <button key={kind} type="button" className="class-card" onClick={() => onSelect(kind)}>
              <strong>{info.name}</strong>
              <span className="class-card-desc">{info.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
