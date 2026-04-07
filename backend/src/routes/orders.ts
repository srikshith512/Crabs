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
      .select(`
        *,
        items (
          id,
          rate,
          measurements (
            quantity
          )
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const ordersWithStats = (data || []).map((order: any) => {
      const items = order.items || [];
      const itemCount = items.length;
      const totalAmount = items.reduce((total: number, item: any) => {
        const rate = Number(item.rate) || 0;
        const totalQuantity = (item.measurements || []).reduce(
          (sum: number, m: any) => sum + (Number(m.quantity) || 0),
          0
        );
        return total + (rate * totalQuantity);
      }, 0);

      // Remove items array to keep the response lean if not needed by frontend
      const { items: _, ...orderData } = order;
      return {
        ...orderData,
        item_count: itemCount,
        total_amount: totalAmount
      };
    });

    return res.json({ orders: ordersWithStats });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// CREATE a new order for a project
router.post('/project/:projectId', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { order_code, title, description } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'Project id is required.' });
    }

    if (!order_code || !title) {
      return res.status(400).json({ error: 'Order code and title are strictly required.' });
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
          order_code,
          title,
          description: description || ''
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

// GET a single order by id
router.get('/:orderId', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({ error: 'Order id is required.' });
    }

    const scopedClient = getSupabaseScopedClient(req.token!);
    const { data: order, error } = await scopedClient
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Ensure user has access to the project this order belongs to
    const access = await ensureProjectAccess(req.token!, order.project_id);
    if (!access.ok) {
      return res.status(403).json({ error: 'Access denied: ' + access.error });
    }

    return res.json({ order });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// UPDATE an order
router.put('/:orderId', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const { order_code, title, description } = req.body;

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
    if (order_code !== undefined) updatePayload.order_code = order_code;
    if (title !== undefined) updatePayload.title = title;
    if (description !== undefined) updatePayload.description = description;

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
