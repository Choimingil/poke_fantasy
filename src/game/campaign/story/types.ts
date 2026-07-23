import type { SpriteGender, WeaponKind } from '../../types';

/**
 * 스토리 캠페인 데이터 모델(《재가 된 깃발》 시나리오).
 * 절차적 로그라이트와 별개로, 라운드별 스크립트(맵·컷씬·목표·동료 합류)를 정의한다.
 */

/** 컷씬 대사 한 줄. */
interface CutsceneLine {
  /** 화자 표시 이름. narration이면 무시. */
  speaker?: string;
  /** 초상 스프라이트 직업 키(assets/jobs). 미지정+hero=false면 초상 없음. */
  portraitJob?: string;
  portraitGender?: SpriteGender;
  /** true면 주인공 본인(이름·스프라이트를 캠페인에서 주입). */
  hero?: boolean;
  /** 지문(중앙 이탤릭, 화자/초상 없음). */
  narration?: boolean;
  text: string;
}

export interface Cutscene {
  lines: CutsceneLine[];
}

/** 스토리 라운드의 주 목표(전투 엔진이 지원하는 3종으로 매핑). */
type StoryPrimary = 'annihilate' | 'killCommander' | 'surviveTurns';

/** 라운드 적 편성 한 슬롯. */
interface StoryEnemySlot {
  kind: WeaponKind;
  /** commander면 지휘관 처치 목표의 대상이 되고 정예 능력치를 갖는다. */
  role?: 'commander' | 'elite' | 'normal';
  spriteJob?: string;
  gender?: SpriteGender;
  name?: string;
  /** 산출된 기준 레벨 대비 가감(지휘관 +, 잡졸 -). */
  levelOffset?: number;
}

/** 승리 후 적용되는 동료 이벤트. */
export interface CompanionEvent {
  companionId: string;
  type: 'official' | 'leave';
}

export interface StoryRoundDef {
  round: number;
  act: number;
  title: string;
  /** 권장 레벨 밴드(적 레벨을 이 범위로 클램프해 주인공 레벨에 맞춘다). */
  recLevelMin: number;
  recLevelMax: number;
  mapId: string;
  /** 이번 라운드 최대 출전 인원. */
  deployMax: number;
  primary: StoryPrimary;
  /** surviveTurns 목표의 제한 턴. */
  turnLimit?: number;
  enemies: StoryEnemySlot[];
  /** 전투 전 배치 시 로스터에 확보하고 자동 출전시킬 동료 id(임시/정식 공용). */
  joinBefore?: string[];
  /** 이 라운드 출전에서 제외할 동료 id(예: 그 동료가 적으로 등장하는 라운드). */
  excludeDeploy?: string[];
  /** 승리 후 동료 이벤트(정식 합류 등). */
  eventsAfter?: CompanionEvent[];
  preScene: Cutscene;
  postScene: Cutscene;
  /** 주 목표 표시 문구. */
  objectiveText: string;
  /** 선택 목표(연출·표시용). 현재 엔진 미강제 항목은 안내로만 노출. */
  optionalText?: string[];
}
