import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JOBS } from '../src/game/data/jobs';
import { TRAIT_DESCRIPTIONS } from '../src/game/data/traitDescriptions';
import type { CombatType, Faction, JobDef } from '../src/game/types';

const TYPE_LABEL: Record<CombatType, string> = {
  melee: '전사(근거리)',
  ranged: '격수(원거리)',
  magic: '법사(마법)',
};

const FACTION_LABEL: Record<Faction, string> = {
  east: '동양',
  west: '서양',
};

function jobHeading(job: JobDef): string {
  const tierLabel = job.tier === 0 ? '기본직' : `${job.tier}차 전직`;
  return `### ${job.name} — ${TYPE_LABEL[job.type]} · ${tierLabel}`;
}

function jobBody(job: JobDef): string[] {
  const lines: string[] = [];
  if (job.parentId) {
    const parent = JOBS.find((j) => j.id === job.parentId);
    if (parent) lines.push(`- 분기 원본: ${parent.name}`);
  }
  lines.push(`- 기술칸: ${job.skillSlots}개`);
  if (job.fixedWeaponType) lines.push(`- 무기 제한: ${TYPE_LABEL[job.fixedWeaponType]} 무기 고정`);
  if (job.fixedHandedness) lines.push(`- 무기 제한: ${job.fixedHandedness === 'twoHanded' ? '두손무기' : '한손무기'} 고정`);
  if (job.traits.length === 0) {
    lines.push('- 직업 특성: 없음');
  } else {
    for (const trait of job.traits) {
      lines.push(`- 직업 특성: ${TRAIT_DESCRIPTIONS[trait]}`);
    }
  }
  return lines;
}

function renderFaction(faction: Faction): string {
  const jobs = JOBS.filter((j) => j.faction === faction);
  const baseJobs = jobs.filter((j) => j.tier === 0);
  const sections: string[] = [`## ${FACTION_LABEL[faction]}`];

  for (const base of baseJobs) {
    sections.push(jobHeading(base), ...jobBody(base), '');
    const branches = jobs.filter((j) => j.parentId === base.id);
    for (const branch of branches) {
      sections.push(jobHeading(branch), ...jobBody(branch), '');
    }
  }
  return sections.join('\n');
}

const generatedAt = new Date().toISOString();

const content = `# 클래스 가이드 (자동 생성)

<!-- 이 문서는 scripts/generate-classes-doc.ts 가 src/game/data/jobs.ts 를 읽어 자동 생성합니다.
     jobs.ts / traitDescriptions.ts 를 수정하면 자동으로 다시 생성되므로 이 파일을 직접 편집하지 마세요. -->

동양(무협) vs 서양(중세) 두 진영, 각 진영은 전사(근거리)/법사(마법)/격수(원거리) 세 기본직에서 시작해 1차 전직 시 두 갈래로 분기합니다.
타입 상성: 전사(근거리) > 격수(원거리) > 법사(마법) > 전사(근거리).

${renderFaction('east')}

${renderFaction('west')}

---
_생성 시각: ${generatedAt}_
`;

const outPath = resolve(fileURLToPath(import.meta.url), '../../CLASSES.md');
writeFileSync(outPath, content, 'utf-8');
console.log(`Generated ${outPath}`);
