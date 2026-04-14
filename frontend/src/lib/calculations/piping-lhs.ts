/**
 * Calculations for Piping-LHS department.
 * In the demo flow, the billing quantity is the entered diameter value.
 */
export const calculatePipingLHSQuantity = (diameterInch: number): number => {
  return Number(diameterInch || 0);
};

