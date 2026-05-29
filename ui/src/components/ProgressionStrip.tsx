import './Progression.css'
import { XPBar } from './XPBar'
import { RankBar } from './RankBar'

/* Bottom-rectangle wrapper composing the two progression modules
   (XPBar + RankBar) with a hairline divider between them. */

export interface ProgressionStripProps {
  xpGained?: number
  xpNewProgress?: number       // 0..1
  classPointsGained?: number
  cpNewProgress?: number       // 0..1
  level?: number
  levelUp?: boolean
}

export const ProgressionStrip = (p: ProgressionStripProps) => (
  <div class="prog-strip">
    <XPBar
      level={p.level || 1}
      xpGained={p.xpGained || 0}
      xpProgress={p.xpNewProgress || 0}
      levelUp={p.levelUp || false}
    />
    <div class="prog-divider" />
    <RankBar
      classPointsGained={p.classPointsGained || 0}
      cpProgress={p.cpNewProgress || 0}
    />
  </div>
)
