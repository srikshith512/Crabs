export type Milestone = {
  name: string;
  percentage: number;
};

export type MeasurementRow = {
  id: string;
  description: string;
  quantity: number;
  custom_fields?: {
    structure_type?: string;
    mark?: string;
    length?: number;
    width?: number;
    thickness?: number;
    unit_weight?: number;
    qty?: number;
    ra_bill_key?: string;
    milestone_values?: Record<string, number>;
    breakup_status?: Record<string, boolean>; // Milestone name -> true/false
  };
};

export type Item = {
  id: string;
  item_code: string;
  description: string;
  unit: string;
  rate: number;
  quantity: number; // BOQ Quantity
  milestones?: Milestone[];
  measurements?: MeasurementRow[];
};

export type MilestoneResult = {
  name: string;
  percentage: number;
  previousQty: number;
  currentQty: number;
  cumulativeQty: number;
  previousAmount: number;
  currentAmount: number;
  cumulativeAmount: number;
};

export type RABillItemResult = {
  itemCode: string;
  description: string;
  department: string;
  unit: string;
  rate: number;
  boqQty: number;
  milestones: MilestoneResult[];
  measurements: MeasurementRow[];
  totals: {
    previousQty: number;
    currentQty: number;
    cumulativeQty: number;
    previousAmount: number;
    currentAmount: number;
    cumulativeAmount: number;
  };
};

/**
 * Generates RA Bill results with milestone breakdown and raw measurements.
 */
export function generateRABill(
  items: any[],
  currentKey: string,
  legacyKey?: string
): RABillItemResult[] {
  return items.map((item) => {
    const boqQty = Number(item.quantity || 0);
    const rate = Number(item.rate || 0);
    const department = item.department || "General";
    
    // Initialize results for each milestone defined for the item
    const milestoneResults: MilestoneResult[] = (item.milestones || []).map((ms: any) => ({
      name: ms.name,
      percentage: Number(ms.percentage || 0),
      previousQty: 0,
      previousAmount: 0,
      currentQty: 0,
      currentAmount: 0,
      cumulativeQty: 0,
      cumulativeAmount: 0,
    }));

    // Process each measurement row to allocate quantities to milestones and billing periods
    (item.measurements || []).forEach((m: any) => {
      const rowQty = Number(m.quantity || 0);
      const rowRAKey = m.custom_fields?.ra_bill_key;
      const rowBreakup = m.custom_fields?.breakup_status || {};

      // Logic:
      // 1. If ra_bill_key exists and is NOT the current bill ID, it's considered "Previous".
      // 2. If ra_bill_key matches currentKey OR is empty, it's considered "Current Bill".
      const isPrevious = rowRAKey && rowRAKey !== currentKey;
      const isCurrent = !rowRAKey || rowRAKey === currentKey;

      milestoneResults.forEach((msResult) => {
        // Check if this milestone is marked as 'true' (completed) for this measurement row
        const msCompleted = rowBreakup[msResult.name] === true;
        
        if (msCompleted) {
          const weightedQty = rowQty * (msResult.percentage / 100);
          const amount = weightedQty * rate;

          if (isPrevious) {
            msResult.previousQty += weightedQty;
            msResult.previousAmount += amount;
          } else if (isCurrent) {
            msResult.currentQty += weightedQty;
            msResult.currentAmount += amount;
          }
          
          // Cumulative is the total across all time
          msResult.cumulativeQty = msResult.previousQty + msResult.currentQty;
          msResult.cumulativeAmount = msResult.previousAmount + msResult.currentAmount;
        }
      });
    });

    // Calculate aggregate totals for the entire item
    const itemTotals = milestoneResults.reduce(
      (acc, ms) => ({
        previousQty: acc.previousQty + ms.previousQty,
        previousAmount: acc.previousAmount + ms.previousAmount,
        currentQty: acc.currentQty + ms.currentQty,
        currentAmount: acc.currentAmount + ms.currentAmount,
        cumulativeQty: acc.cumulativeQty + ms.cumulativeQty,
        cumulativeAmount: acc.cumulativeAmount + ms.cumulativeAmount,
      }),
      {
        previousQty: 0,
        previousAmount: 0,
        currentQty: 0,
        currentAmount: 0,
        cumulativeQty: 0,
        cumulativeAmount: 0,
      }
    );

    return {
      itemCode: item.item_code || "N/A",
      description: item.description || "No Description",
      department: department,
      unit: item.unit || "NOS",
      boqQty: boqQty,
      rate: rate,
      milestones: milestoneResults,
      totals: itemTotals,
      measurements: item.measurements || [],
    };
  });
}

/**
 * Calculates the grand total for the entire RA Bill
 */
export function getGrandTotal(results: RABillItemResult[]) {
  return results.reduce(
    (acc, item) => ({
      previousAmount: acc.previousAmount + item.totals.previousAmount,
      currentAmount: acc.currentAmount + item.totals.currentAmount,
      cumulativeAmount: acc.cumulativeAmount + item.totals.cumulativeAmount,
    }),
    { previousAmount: 0, currentAmount: 0, cumulativeAmount: 0 }
  );
}
