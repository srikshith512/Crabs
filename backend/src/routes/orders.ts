import { Router, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateUser, AuthenticatedRequest } from '../middleware/authMiddleware';

const router = Router();
const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_ANON_KEY || '').trim();

const getSupabaseScopedClient = (token: string) => {
  return createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
};

const ensureProjectAccess = async (token: string, projectId: string) => {
  const scopedClient = getSupabaseScopedClient(token);
  const { data, error } = await scopedClient
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message } as const;
  }

  if (!data) {
    return { ok: false, error: 'Project not found' } as const;
  }

  return { ok: true, scopedClient } as const;
};

// GET all orders for a project
router.get('/project/:projectId', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ error: 'Project id is required.' });
    }

    const access = await ensureProjectAccess(req.token!, projectId);
    if (!access.ok) {
      return res.status(404).json({ error: access.error });
    }

    const { data, error } = await access.scopedClient
      .from('orders')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ orders: data });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// CREATE a new order for a project
router.post('/project/:projectId', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { order_number, date, status } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'Project id is required.' });
    }

    if (!order_number || !date) {
      return res.status(400).json({ error: 'Order number and date are required.' });
    }

    const access = await ensureProjectAccess(req.token!, projectId);
    if (!access.ok) {
      return res.status(404).json({ error: access.error });
    }

    const { data, error } = await access.scopedClient
      .from('orders')
      .insert([
        {
          project_id: projectId,
          order_number,
          date,
          status: status || 'draft'
        }
      ])
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({ order: data[0] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// UPDATE an order
router.put('/:orderId', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const { order_number, date, status } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order id is required.' });
    }

    const scopedClient = getSupabaseScopedClient(req.token!);
    const { data: existingOrder, error: orderError } = await scopedClient
      .from('orders')
      .select('id, project_id')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError) {
      return res.status(400).json({ error: orderError.message });
    }

    if (!existingOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const access = await ensureProjectAccess(req.token!, existingOrder.project_id);
    if (!access.ok) {
      return res.status(404).json({ error: access.error });
    }

    const updatePayload: Record<string, any> = {};
    if (order_number !== undefined) updatePayload.order_number = order_number;
    if (date !== undefined) updatePayload.date = date;
    if (status !== undefined) updatePayload.status = status;

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    const { data, error } = await access.scopedClient
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ order: data[0] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// DELETE an order
router.delete('/:orderId', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({ error: 'Order id is required.' });
    }

    const scopedClient = getSupabaseScopedClient(req.token!);
    const { data: existingOrder, error: orderError } = await scopedClient
      .from('orders')
      .select('id, project_id')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError) {
      return res.status(400).json({ error: orderError.message });
    }

    if (!existingOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const access = await ensureProjectAccess(req.token!, existingOrder.project_id);
    if (!access.ok) {
      return res.status(404).json({ error: access.error });
    }

    const { error } = await access.scopedClient
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

export default router;
