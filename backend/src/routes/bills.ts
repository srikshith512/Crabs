import { Router, Response, Request } from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateUser, AuthenticatedRequest } from '../middleware/authMiddleware';
import fetch from 'cross-fetch';

const router = Router();
const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_ANON_KEY || '').trim();

const getSupabaseScopedClient = (token: string) => {
  return createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` }, fetch }
  });
};

const getDataQuery = () => `
  id,
  name,
  client_name,
  orders (
    id,
    order_code,
    title,
    items (
      id,
      item_code,
      description,
      quantity,
      rate,
      unit,
      department,
      measurements (
        id,
        location_description,
        length,
        breadth,
        depth,
        quantity,
        custom_fields
      )
    )
  )
`;

const getLocks = (measurement: any) => Array.isArray(measurement?.custom_fields?.ra_locks)
  ? measurement.custom_fields.ra_locks
  : [];

function buildBillCollection(data: any[]) {
  const grouped = new Map<string, any>();

  (data || []).forEach((project: any) => {
    (project.orders || []).forEach((order: any) => {
      (order.items || []).forEach((item: any) => {
        (item.measurements || []).forEach((measurement: any) => {
          getLocks(measurement).forEach((lock: any) => {
            if (!lock?.raNumber) return;
            const key = `${order.id}-${lock.raNumber}`;
            const existing = grouped.get(key) || {
              id: key,
              raNumber: lock.raNumber,
              projectId: project.id,
              projectName: project.name || 'Project',
              clientName: project.client_name || '-',
              orderId: order.id,
              orderNumber: order.order_code || '---',
              orderTitle: order.title || 'Order',
              totalAmount: 0,
              totalQty: 0,
              unit: item.unit || 'Unit',
              generatedAt: lock.lockedAt || new Date().toISOString(),
            };

            existing.totalAmount += Number(lock.amount || 0);
            existing.totalQty += Number(lock.qty || 0);

            if (lock.lockedAt && new Date(lock.lockedAt).getTime() > new Date(existing.generatedAt).getTime()) {
              existing.generatedAt = lock.lockedAt;
            }

            grouped.set(key, existing);
          });
        });
      });
    });
  });

  return Array.from(grouped.values()).sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
  );
}

function buildBillDetail(data: any[], orderId: string, raNumber: string) {
  for (const project of data || []) {
    for (const order of project.orders || []) {
      if (order.id !== orderId) continue;

      const lineMap = new Map<string, any>();
      const measurementItems: any[] = [];
      let generatedAt = '';

      for (const item of order.items || []) {
        const measurementRows: any[] = [];

        for (const measurement of item.measurements || []) {
          const allLocks = getLocks(measurement);
          const matchingLocks = allLocks.filter((lock: any) => lock.raNumber === raNumber);
          if (!matchingLocks.length) continue;

          matchingLocks.forEach((lock: any) => {
            const lineKey = `${item.id}-${lock.milestoneKey}`;
            const previousQty = allLocks
              .filter((entry: any) => entry.milestoneKey === lock.milestoneKey && entry.raNumber !== raNumber)
              .reduce((sum: number, entry: any) => sum + Number(entry.qty || 0), 0);
            const currentQty = matchingLocks
              .filter((entry: any) => entry.milestoneKey === lock.milestoneKey)
              .reduce((sum: number, entry: any) => sum + Number(entry.qty || 0), 0);

            const existingLine = lineMap.get(lineKey) || {
              itemId: item.id,
              itemCode: item.item_code || '-',
              description: item.description,
              unit: item.unit,
              quantity: Number(item.quantity || 0),
              rate: Number(item.rate || 0),
              milestoneKey: lock.milestoneKey,
              milestoneName: lock.milestoneName,
              milestonePercentage: Number(lock.percentage || 0),
              previousQty,
              currentQty,
              cumulativeQty: previousQty + currentQty,
              previousAmount: previousQty * Number(item.rate || 0),
              currentAmount: currentQty * Number(item.rate || 0),
              cumulativeAmount: (previousQty + currentQty) * Number(item.rate || 0),
            };

            lineMap.set(lineKey, existingLine);
          });

          measurementRows.push({
            id: measurement.id,
            locationDescription: measurement.location_description || '',
            length: measurement.length ?? null,
            breadth: measurement.breadth ?? null,
            depth: measurement.depth ?? null,
            quantity: Number(measurement.quantity || 0),
            customFields: {
              ...(measurement.custom_fields || {}),
            },
            raBillMilestones: matchingLocks.map((lock: any) => ({
              milestoneKey: lock.milestoneKey,
              milestoneName: lock.milestoneName,
              percentage: Number(lock.percentage || 0),
              qty: Number(lock.qty || 0),
            })),
          });

          delete measurementRows[measurementRows.length - 1].customFields.milestone_values;
          delete measurementRows[measurementRows.length - 1].customFields.ra_locks;

          matchingLocks.forEach((lock: any) => {
            if (lock.lockedAt && (!generatedAt || new Date(lock.lockedAt).getTime() > new Date(generatedAt).getTime())) {
              generatedAt = lock.lockedAt;
            }
          });
        }

        if (measurementRows.length) {
          measurementItems.push({
            itemId: item.id,
            itemCode: item.item_code || '-',
            description: item.description,
            department: item.department || 'Others',
            unit: item.unit || 'Unit',
            contractQty: Number(item.quantity || 0),
            rate: Number(item.rate || 0),
            measurements: measurementRows,
          });
        }
      }

      const lineItems = Array.from(lineMap.values());
      if (!lineItems.length) return null;

      const totals = {
        previousQty: lineItems.reduce((sum, line) => sum + Number(line.previousQty || 0), 0),
        currentQty: lineItems.reduce((sum, line) => sum + Number(line.currentQty || 0), 0),
        cumulativeQty: lineItems.reduce((sum, line) => sum + Number(line.cumulativeQty || 0), 0),
        previousAmount: lineItems.reduce((sum, line) => sum + Number(line.previousAmount || 0), 0),
        currentAmount: lineItems.reduce((sum, line) => sum + Number(line.currentAmount || 0), 0),
        cumulativeAmount: lineItems.reduce((sum, line) => sum + Number(line.cumulativeAmount || 0), 0),
      };

      return {
        id: `${order.id}-${raNumber}`,
        raNumber,
        projectId: project.id,
        projectName: project.name || 'Project',
        clientName: project.client_name || '-',
        orderId: order.id,
        orderNumber: order.order_code || '---',
        orderTitle: order.title || 'Order',
        totalAmount: totals.currentAmount,
        totalQty: totals.currentQty,
        unit: lineItems[0]?.unit || 'Unit',
        generatedAt: generatedAt || new Date().toISOString(),
        totals,
        lineItems,
        measurementItems,
      };
    }
  }

  return null;
}

router.get('/history', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const scopedClient = getSupabaseScopedClient(req.token!);
    const { data, error } = await scopedClient
      .from('projects')
      .select(getDataQuery())
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    return res.json({ bills: buildBillCollection(data || []) });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

router.get('/history/:orderId/:raNumber', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const scopedClient = getSupabaseScopedClient(req.token!);
    const { data, error } = await scopedClient
      .from('projects')
      .select(getDataQuery())
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    const bill = buildBillDetail(data || [], req.params.orderId, req.params.raNumber);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    return res.json({ bill });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

export default router;
