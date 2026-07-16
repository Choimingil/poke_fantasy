import { COMMON_HANDLERS } from './common';
import { SWORD_HANDLERS } from './sword';
import { BLUNT_HANDLERS } from './blunt';
import { BOW_HANDLERS } from './bow';
import { STAFF_HANDLERS } from './staff';
import { TOME_HANDLERS } from './tome';
import type { SkillContext, SkillHandler } from './context';

const SKILL_HANDLERS: Record<string, SkillHandler> = {
  ...COMMON_HANDLERS,
  ...SWORD_HANDLERS,
  ...BLUNT_HANDLERS,
  ...BOW_HANDLERS,
  ...STAFF_HANDLERS,
  ...TOME_HANDLERS,
};

export function resolveSkill(ctx: SkillContext): void {
  const handler = SKILL_HANDLERS[ctx.skill.id];
  if (!handler) throw new Error(`No handler registered for skill: ${ctx.skill.id}`);
  handler(ctx);
}
