/**
 * Calculations for Piping-Spool Status department.
 * Demo behavior bills by inch-meter, so the computed inch-meter is also the row quantity.
 */

const roundTo = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round((Number(value || 0) + Number.EPSILON) * factor) / factor;
};

export const calculateSpoolInchMeter = (
  lengthMeters: number,
  lineSizeInch: number,
): number => {
  return roundTo(Number(lengthMeters || 0) * Number(lineSizeInch || 0), 3);
};

export const calculateSpoolStatusQuantity = (inchMeter: number): number => {
  return Number(inchMeter || 0);
};
