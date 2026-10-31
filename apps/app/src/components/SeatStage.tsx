import { SeatPlan, type SeatPlanProps } from './SeatPlan';

/** Natively the room is the plan from above. */
export function SeatStage(props: SeatPlanProps & { group: number }) {
  return <SeatPlan {...props} />;
}
