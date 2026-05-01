/**
 * Calculations for Piping Insulation department.
 * Demo behavior bills by RMT while also deriving insulation area for reference.
 */

type InsulationFactors = {
  elbow90: number;
  elbow45: number;
  tee: number;
  reducer: number;
  endCap: number;
  flangeRem: number;
  valveRem: number;
  flangeFix: number;
  valveFix: number;
  weldValveFix: number;
};

const DEFAULT_FACTORS: InsulationFactors = {
  elbow90: 0.6,
  elbow45: 0.4,
  tee: 0.7,
  reducer: 0.2,
  endCap: 0.2,
  flangeRem: 1.9,
  valveRem: 3,
  flangeFix: 1.14,
  valveFix: 1.8,
  weldValveFix: 0.6,
};

const roundTo = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round((Number(value || 0) + Number.EPSILON) * factor) / factor;
};

export const PIPING_INSULATION_FACTOR_TABLE: Record<string, InsulationFactors> = {
  "15": { ...DEFAULT_FACTORS, elbow90: 0.5, elbow45: 0.35, flangeRem: 1.8, valveRem: 2.5, flangeFix: 1.08, valveFix: 1.5, weldValveFix: 0.2 },
  "20": { ...DEFAULT_FACTORS, elbow90: 0.5, elbow45: 0.35, flangeRem: 1.8, valveRem: 2.5, flangeFix: 1.08, valveFix: 1.5, weldValveFix: 0.2 },
  "25": { ...DEFAULT_FACTORS, elbow90: 0.5, elbow45: 0.35, flangeRem: 1.8, valveRem: 2.5, flangeFix: 1.08, valveFix: 1.5, weldValveFix: 0.2 },
  "32": { ...DEFAULT_FACTORS, elbow90: 0.5, elbow45: 0.35, flangeRem: 1.8, valveRem: 2.5, flangeFix: 1.08, valveFix: 1.5, weldValveFix: 0.2 },
  "40": { ...DEFAULT_FACTORS, elbow90: 0.5, elbow45: 0.35, flangeRem: 1.8, valveRem: 2.5, flangeFix: 1.08, valveFix: 1.5, weldValveFix: 0.2 },
  "50": DEFAULT_FACTORS,
  "65": DEFAULT_FACTORS,
  "80": DEFAULT_FACTORS,
  "100": { ...DEFAULT_FACTORS, elbow90: 1, elbow45: 0.65, flangeRem: 2, valveRem: 3.5, flangeFix: 1.32, valveFix: 2.1 },
  "125": { ...DEFAULT_FACTORS, elbow90: 1, elbow45: 0.65, flangeRem: 2, valveRem: 3.5, flangeFix: 1.32, valveFix: 2.1 },
  "150": { ...DEFAULT_FACTORS, elbow90: 1, elbow45: 0.65, flangeRem: 2, valveRem: 3.5, flangeFix: 1.32, valveFix: 2.1 },
  "200": { ...DEFAULT_FACTORS, elbow90: 1.4, elbow45: 0.85, tee: 0.75, flangeRem: 2.5, valveRem: 4, flangeFix: 1.5, valveFix: 2.4 },
  "250": { ...DEFAULT_FACTORS, elbow90: 1.4, elbow45: 0.85, tee: 0.75, flangeRem: 2.5, valveRem: 4, flangeFix: 1.5, valveFix: 2.4 },
  "300": { ...DEFAULT_FACTORS, elbow90: 1.4, elbow45: 0.85, tee: 0.75, flangeRem: 2.5, valveRem: 4, flangeFix: 1.5, valveFix: 2.4 },
  "350": { ...DEFAULT_FACTORS, elbow90: 1.4, elbow45: 0.85, tee: 0.75, flangeRem: 2.5, valveRem: 4, flangeFix: 1.5, valveFix: 2.4 },
  "400": { ...DEFAULT_FACTORS, elbow90: 1.5, elbow45: 0.9, tee: 0.85, reducer: 0.3, flangeRem: 2.7, valveRem: 4.5, flangeFix: 1.62, valveFix: 2.7 },
  "450": { ...DEFAULT_FACTORS, elbow90: 1.5, elbow45: 0.9, tee: 0.85, reducer: 0.3, flangeRem: 2.7, valveRem: 4.5, flangeFix: 1.62, valveFix: 2.7 },
  "500": { ...DEFAULT_FACTORS, elbow90: 1.5, elbow45: 0.9, tee: 0.85, reducer: 0.3, flangeRem: 2.7, valveRem: 4.5, flangeFix: 1.62, valveFix: 2.7 },
  "600": { ...DEFAULT_FACTORS, elbow90: 1.7, elbow45: 1.05, tee: 1.1, reducer: 0.45, flangeRem: 3, valveRem: 6, flangeFix: 1.8, valveFix: 3 },
};

const toNumber = (value: string | number | null | undefined, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getPipingInsulationFactors = (lineSize: string): InsulationFactors => {
  return PIPING_INSULATION_FACTOR_TABLE[lineSize] || DEFAULT_FACTORS;
};

export const calculatePipingInsulationValues = (
  fields: {
    lineSize?: string;
    pipeLength?: number;
    pipeOD?: number;
    insulationThickness?: number;
    qtyElbow90?: number;
    qtyElbow45?: number;
    qtyTee?: number;
    qtyReducer?: number;
    qtyEndCap?: number;
    qtyFlangeRem?: number;
    qtyValveRem?: number;
    qtyFlangeFix?: number;
    qtyValveFix?: number;
    qtyWeldValveFix?: number;
  },
): {
  totalFittingsLength: number;
  rmt: number;
  area: number;
} => {
  const factors = getPipingInsulationFactors(String(fields.lineSize || "50"));
  const totalFittingsLength =
    toNumber(fields.qtyElbow90) * factors.elbow90 +
    toNumber(fields.qtyElbow45) * factors.elbow45 +
    toNumber(fields.qtyTee) * factors.tee +
    toNumber(fields.qtyReducer) * factors.reducer +
    toNumber(fields.qtyEndCap) * factors.endCap +
    toNumber(fields.qtyFlangeRem) * factors.flangeRem +
    toNumber(fields.qtyValveRem) * factors.valveRem +
    toNumber(fields.qtyFlangeFix) * factors.flangeFix +
    toNumber(fields.qtyValveFix) * factors.valveFix +
    toNumber(fields.qtyWeldValveFix) * factors.weldValveFix;

  const rmt = toNumber(fields.pipeLength) + totalFittingsLength;
  const insulatedODMeters =
    (toNumber(fields.pipeOD) + 2 * toNumber(fields.insulationThickness)) / 1000;
  const area = Math.PI * insulatedODMeters * rmt;

  return {
    totalFittingsLength: roundTo(totalFittingsLength, 2),
    rmt: roundTo(rmt, 2),
    area: roundTo(area, 3),
  };
};
