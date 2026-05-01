"use client";

export type StoredRABillLine = {
  itemId: string;
  itemCode: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  milestoneKey: string;
  milestoneName: string;
  milestonePercentage: number;
  previousQty: number;
  currentQty: number;
  cumulativeQty: number;
  previousAmount: number;
  currentAmount: number;
  cumulativeAmount: number;
};

export type StoredRABillMeasurementMilestone = {
  milestoneKey: string;
  milestoneName: string;
  percentage: number;
  qty: number;
};

export type StoredRABillMeasurementRow = {
  id: string;
  locationDescription?: string;
  length?: number | null;
  breadth?: number | null;
  depth?: number | null;
  quantity?: number | null;
  customFields?: Record<string, any>;
  raBillMilestones: StoredRABillMeasurementMilestone[];
};

export type StoredRABillMeasurementItem = {
  itemId: string;
  itemCode: string;
  description: string;
  department: string;
  unit: string;
  contractQty: number;
  rate: number;
  measurements: StoredRABillMeasurementRow[];
};

export type StoredRABillTotals = {
  previousQty: number;
  currentQty: number;
  cumulativeQty: number;
  previousAmount: number;
  currentAmount: number;
  cumulativeAmount: number;
};

export type StoredRABill = {
  id: string;
  raNumber: string;
  projectId: string;
  projectName: string;
  clientName: string;
  orderId: string;
  orderNumber: string;
  orderTitle: string;
  totalAmount: number;
  totalQty: number;
  unit: string;
  generatedAt: string;
  lineItems?: StoredRABillLine[];
  measurementItems?: StoredRABillMeasurementItem[];
  totals?: StoredRABillTotals;
};

const STORAGE_KEY = "crabs_ra_bill_history";

function readRawBills(): StoredRABill[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getStoredRABills() {
  return readRawBills().sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
  );
}

export function getStoredRABill(orderId: string, raNumber: string) {
  return readRawBills().find(
    (entry) => entry.orderId === orderId && entry.raNumber === raNumber,
  );
}

export function saveStoredRABill(bill: StoredRABill) {
  if (typeof window === "undefined") return;
  const existing = readRawBills();
  const withoutDuplicate = existing.filter(
    (entry) => !(entry.orderId === bill.orderId && entry.raNumber === bill.raNumber),
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify([bill, ...withoutDuplicate]));
}
