import { ProgressLane } from './ProgressLane'

/* Class Rank / Class Points module — wraps ProgressLane with rank-specific
   config. White fill (not orange) to differentiate from XP visually. */

export interface RankBarProps {
  classPointsGained: number
  cpProgress: number      // 0..1
}

export const RankBar = ({ classPointsGained, cpProgress }: RankBarProps) => (
  <ProgressLane
    label="Class Rank"
    gain={classPointsGained}
    gainUnit="CP"
    variant="cp"
    target={cpProgress}
    startLabel="Current"
    endLabel="Next"
  />
)
