import { ProgressLane } from './ProgressLane'

/* Driving Level XP module — wraps ProgressLane with XP-specific config. */

export interface XPBarProps {
  level: number
  xpGained: number
  xpProgress: number      // 0..1
  levelUp?: boolean
}

export const XPBar = ({ level, xpGained, xpProgress, levelUp }: XPBarProps) => (
  <ProgressLane
    label="Driving Level"
    badge={<>LVL<span class="lvl-num">{level}</span></>}
    flash={levelUp ? 'Level Up' : undefined}
    gain={xpGained}
    gainUnit="XP"
    variant="xp"
    target={xpProgress}
    startLabel={`Lvl ${level}`}
    endLabel={`Lvl ${level + 1}`}
  />
)
