/**
 * Calculations for Equipment Insulation department.
 * Demo behavior bills by total insulated area.
 */

const toNumber = (value: string | number | null | undefined, fallback = 0): number => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  const parsed = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundTo = (value: number, decimals = 4): number => {
  const factor = 10 ** decimals;
  return Math.round((Number(value || 0) + Number.EPSILON) * factor) / factor;
};

export const calculateEquipmentShellArea = (
  insulatedDiameter: string | number | undefined,
  heightLength: string | number | undefined,
  thicknessMm: string | number | undefined,
): number => {
  const diameter = toNumber(insulatedDiameter);
  const length = toNumber(heightLength);
  const thicknessMeters = toNumber(thicknessMm) / 1000;
  if (diameter <= 0 || length <= 0) return 0;
  return roundTo(Math.PI * (diameter + 2 * thicknessMeters) * length, 4);
};

export const calculateEquipmentDishArea = (
  insulatedDiameter: string | number | undefined,
  thicknessMm: string | number | undefined,
  dishFactor: string | number | undefined,
  dishEndNos: string | number | undefined,
): number => {
  const diameter = toNumber(insulatedDiameter);
  const thicknessMeters = toNumber(thicknessMm) / 1000;
  const factor = toNumber(dishFactor, 1) || 1;
  const ends = toNumber(dishEndNos);
  if (diameter <= 0 || ends <= 0) return 0;
  const effectiveDiameter = diameter + 2 * thicknessMeters;
  return roundTo((Math.PI / 4) * effectiveDiameter * effectiveDiameter * factor * ends, 4);
};

export const calculateEquipmentTotalArea = (
  shellArea: string | number | undefined,
  dishArea: string | number | undefined,
  otherArea: string | number | undefined,
): number => {
  return roundTo(toNumber(shellArea) + toNumber(dishArea) + toNumber(otherArea), 4);
};

export const calculateEquipmentInsulationValues = (fields: {
  insulatedDia?: string | number;
  heightLength?: string | number;
  thickness?: string | number;
  dishFactor?: string | number;
  dishEndNos?: string | number;
  otherArea?: string | number;
}): {
  shellArea: number;
  dishArea: number;
  totalArea: number;
} => {
  const shellArea = calculateEquipmentShellArea(
    fields.insulatedDia,
    fields.heightLength,
    fields.thickness,
  );
  const dishArea = calculateEquipmentDishArea(
    fields.insulatedDia,
    fields.thickness,
    fields.dishFactor ?? 1.27,
    fields.dishEndNos,
  );
  const totalArea = calculateEquipmentTotalArea(shellArea, dishArea, fields.otherArea);

  return { shellArea, dishArea, totalArea };
};
