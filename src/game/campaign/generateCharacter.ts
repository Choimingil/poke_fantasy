import type { ArmorKind, Character, Element, ProcEffect, SpriteGender, StatBlock, WeaponKind } from '../types';
import { createCharacter } from '../engine/characterFactory';
import { weaponTemplatesForKind } from '../data/weapons';
import { SKILLS } from '../data/skills';
import { gainProficiencyExp, seededProficiencyExp } from '../data/promotions';
import { rollTraitForRole, roleForWeaponKind } from '../data/traits';

const ELEMENTS: Exclude<Element, 'none'>[] = ['fire', 'water', 'wood', 'steel', 'earth'];
const PROCS: ProcEffect[] = ['bleed', 'stun', 'pierce', 'focus', 'crit'];

/** 무기 종류별 능력치 분배 가중치(주스탯/체력/스피드/지구력, 합 1). magic=지력 주스탯. */
const PROFILE: Record<WeaponKind, { magic: boolean; main: number; hp: number; spd: number; end: number }> = {
  sword: { magic: false, main: 0.42, hp: 0.28, spd: 0.18, end: 0.12 },
  blunt: { magic: false, main: 0.40, hp: 0.34, spd: 0.12, end: 0.14 },
  spear: { magic: false, main: 0.44, hp: 0.26, spd: 0.18, end: 0.12 },
  bow: { magic: false, main: 0.42, hp: 0.20, spd: 0.30, end: 0.08 },
  crossbow: { magic: false, main: 0.46, hp: 0.24, spd: 0.22, end: 0.08 },
  dagger: { magic: false, main: 0.38, hp: 0.18, spd: 0.38, end: 0.06 },
  thrown: { magic: false, main: 0.42, hp: 0.22, spd: 0.28, end: 0.08 },
  staff: { magic: true, main: 0.45, hp: 0.22, spd: 0.15, end: 0.18 },
  tome: { magic: true, main: 0.43, hp: 0.24, spd: 0.18, end: 0.15 },
  shield: { magic: false, main: 0.40, hp: 0.30, spd: 0.15, end: 0.15 },
};

/** 종류별 방어구(무게가 적재량을 넘지 않도록 근접만 중갑/판금). */
const ARMOR_BY_KIND: Record<WeaponKind, ArmorKind> = {
  sword: 'mail', blunt: 'plate', spear: 'mail', bow: 'leather', crossbow: 'leather',
  dagger: 'leather', thrown: 'leather', staff: 'cloth', tome: 'cloth', shield: 'leather',
};

/** 종류별 스프라이트(로스터에서 확인된 job+gender 조합). */
const SPRITE_BY_KIND: Record<WeaponKind, { job: string; gender: SpriteGender }> = {
  sword: { job: 'east_duelist', gender: 'male' },
  blunt: { job: 'west_knight', gender: 'male' },
  spear: { job: 'east_general', gender: 'male' },
  bow: { job: 'east_archer', gender: 'male' },
  crossbow: { job: 'west_berserker', gender: 'male' },
  dagger: { job: 'west_ranger', gender: 'female' },
  thrown: { job: 'east_strategist', gender: 'male' },
  staff: { job: 'west_witch', gender: 'female' },
  tome: { job: 'west_priest', gender: 'female' },
  shield: { job: 'west_knight', gender: 'male' },
};

const NAME_POOL = [
  '강도현', '백건우', '서지훈', '윤재하', '한도영', '류시아', '오세준', '임하늘', '문서준', '정유안',
  '김태랑', '이설아', '박무진', '최연우', '장하람', '홍가온', '남지오', '조은결', '유시헌', '노아린',
  '배도윤', '신라온', '고은샘', '허재이', '엄태오', '양다온', '심우주', '진서율', '표한결', '변시온',
];

/** 레벨에 따른 전직 티어(10레벨 단위, 최대 3). */
function masteryTierForLevel(level: number): number {
  return Math.min(3, Math.floor(level / 10));
}

export function randomName(rng: () => number): string {
  return NAME_POOL[Math.floor(rng() * NAME_POOL.length)];
}

/** 능력치 합 = 25 + (level-1)*3. 무기 주스탯 위주로 분배. */
function generateStats(kind: WeaponKind, level: number): StatBlock {
  const P = Math.max(0, (level - 1) * 3);
  const p = PROFILE[kind];
  const main = Math.round(P * p.main);
  const hp = Math.round(P * p.hp);
  const spd = Math.round(P * p.spd);
  const end = Math.round(P * p.end);
  const stats: StatBlock = {
    hp: 5 + hp,
    attack: 5 + (p.magic ? 0 : main),
    magicAttack: 5 + (p.magic ? main : 0),
    speed: 5 + spd,
    endurance: 5 + end,
  };
  // 반올림 오차를 주스탯에 흡수시켜 합을 정확히 25+P로 맞춘다.
  const target = 25 + P;
  const diff = target - (stats.hp + stats.attack + stats.magicAttack + stats.speed + stats.endurance);
  if (p.magic) stats.magicAttack += diff;
  else stats.attack += diff;
  return stats;
}

export interface GenerateOptions {
  id: string;
  name?: string;
  rng?: () => number;
  /** 성별 지정(주인공용). 미지정 시 무기 종류 기본값. */
  gender?: SpriteGender;
  /** 방어구 종류 지정(주인공용). 미지정 시 무기 종류 기본값. */
  armorKind?: ArmorKind;
  isBoss?: boolean;
  isElite?: boolean;
  /** 고유 특성 id 지정(미지정 시 역할 가중치로 무작위 배정). */
  traitId?: string;
  /** 후반 라운드 난이도 스케일(능력치 배수, 기본 1). */
  statMult?: number;
}

/** 무기 종류·레벨에 맞춰 능력치·장비·전직·로드아웃을 갖춘 캐릭터를 생성한다. */
export function generateCharacter(kind: WeaponKind, level: number, opts: GenerateOptions): Character {
  const rng = opts.rng ?? Math.random;
  const templates = weaponTemplatesForKind(kind);
  const tpl = templates[Math.floor(rng() * templates.length)];
  const element = kind === 'staff' ? ELEMENTS[Math.floor(rng() * ELEMENTS.length)] : undefined;
  const procEffect = kind === 'tome' || kind === 'thrown' ? PROCS[Math.floor(rng() * PROCS.length)] : undefined;
  const tier = masteryTierForLevel(level);
  const stats = generateStats(kind, level);
  const mult = opts.statMult ?? 1;
  if (mult !== 1) {
    stats.hp = Math.round(stats.hp * mult);
    stats.attack = Math.round(stats.attack * mult);
    stats.magicAttack = Math.round(stats.magicAttack * mult);
    stats.speed = Math.round(stats.speed * mult);
  }
  if (opts.isBoss) {
    stats.hp = Math.round(stats.hp * 2.2); // 보스는 체력이 크게 높다
    stats.attack = Math.round(stats.attack * 1.2);
    stats.magicAttack = Math.round(stats.magicAttack * 1.2);
  } else if (opts.isElite) {
    stats.hp = Math.round(stats.hp * 1.5); // 정예는 보스와 일반 사이
    stats.attack = Math.round(stats.attack * 1.1);
    stats.magicAttack = Math.round(stats.magicAttack * 1.1);
  }
  const sprite = SPRITE_BY_KIND[kind];
  const weaponSkillIds = SKILLS.filter((s) => s.weaponKind === kind).map((s) => s.id);
  const basic = PROFILE[kind].magic ? 'incantation' : 'power_strike';

  const c = createCharacter({
    id: opts.id,
    name: opts.name ?? randomName(rng),
    spriteJob: sprite.job,
    gender: opts.gender ?? sprite.gender,
    level,
    baseStats: stats,
    sight: 5,
    starterWeaponTemplateId: tpl.id,
    starterWeaponLevel: level,
    starterWeaponElement: element,
    starterWeaponProcEffect: procEffect,
    starterArmorKind: opts.armorKind ?? ARMOR_BY_KIND[kind],
    starterArmorLevel: level,
    weaponMastery: { [kind]: tier },
    skillLoadout: [basic, ...weaponSkillIds],
  });
  // 무기 숙련도(전직과 별개)는 레벨에 맞춰 기본치를 부여한다.
  gainProficiencyExp(c, kind, seededProficiencyExp(level));
  // 고유 특성: 지정값 또는 무기 역할 가중치로 무작위 배정(§43.11).
  c.traitId = opts.traitId ?? rollTraitForRole(roleForWeaponKind(kind), rng).id;
  if (opts.isBoss) c.isBoss = true;
  if (opts.isElite) c.isElite = true;
  return c;
}
