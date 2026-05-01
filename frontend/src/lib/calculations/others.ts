/**
 * Calculations for Others department
 */
export const calculateOthersQuantity = (
  length: number,
  breadth: number,
  height: number,
  nos: number
): number => {
  return (
    Number(length || 0) *
    Number(breadth || 0) *
    Number(height || 0) *
    Number(nos || 1)
  );
};
