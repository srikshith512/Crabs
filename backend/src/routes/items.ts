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

/**
 * Helper to ensure the user has access to the order's parent project.
 */
const ensureOrderAccess = async (token: string, orderId: string) => {
  const scopedClient = getSupabaseScopedClient(token);
  
  // Fetch the order to get its project_id
  const { data: order, error: orderErr } = await scopedClient
    .from('orders')
    .select('id, project_id')
    .eq('id', orderId)
    .maybeSingle();

  if (orderErr) return { ok: false, error: orderErr.message } as const;
  if (!order) return { ok: false, error: 'Order not found' } as const;

  // Check project access
  const { data: project, error: projErr } = await scopedClient
    .from('projects')
    .select('id')
    .eq('id', order.project_id)
    .maybeSingle();

  if (projErr) return { ok: false, error: projErr.message } as const;
  if (!project) return { ok: false, error: 'Access denied: Project not found or no permission' } as const;

  return { ok: true, scopedClient, projectId: order.project_id } as const;
};

// GET all items for an order (including milestones)
router.get('/order/:orderId', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const access = await ensureOrderAccess(req.token!, orderId);
    if (!access.ok) return res.status(403).json({ error: access.error });

    const { data: items, error } = await access.scopedClient
      .from('items')
      .select('*, milestones:item_milestones(*)')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });

    return res.json({ items });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// POST create a new item for an order
router.post('/:orderId', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const { 
      item_code, 
      description, 
      short_description, 
      unit, 
      department, 
      quantity, 
      rate,
      milestones 
    } = req.body;

    if (!description || !unit || !rate) {
      return res.status(400).json({ error: 'Description, unit, and rate are required.' });
    }

    const access = await ensureOrderAccess(req.token!, orderId);
    if (!access.ok) return res.status(403).json({ error: access.error });

    // Step 1: Create the Item
    const { data: newItem, error: itemErr } = await access.scopedClient
      .from('items')
      .insert({
        order_id: orderId,
        item_code,
        description,
        short_description,
        unit,
        department,
        quantity,
        rate
      })
      .select()
      .single();

    if (itemErr) return res.status(400).json({ error: itemErr.message });

    // Step 2: Create Milestones if any
    if (milestones && Array.isArray(milestones) && milestones.length > 0) {
      const milestonesToInsert = milestones.map(m => ({
        item_id: newItem.id,
        name: m.name,
        percentage: m.percentage
      }));

      const { error: msErr } = await access.scopedClient
        .from('item_milestones')
        .insert(milestonesToInsert);

      if (msErr) {
        // In a real app, we might want to delete the item if milestone insert fails (atomicity)
        // Since Supabase REST doesn't support complex transactions easily here, we report the error.
        return res.status(400).json({ error: 'Item created but milestones failed: ' + msErr.message });
      }
    }

    return res.status(201).json({ item: newItem });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

export default router;
