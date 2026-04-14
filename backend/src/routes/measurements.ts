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
 * Access check helper to verify user can view/manage the given item
 */
const ensureItemAccess = async (token: string, itemId: string) => {
  const scopedClient = getSupabaseScopedClient(token);
  
  // Get item -> order -> project
  const { data: item, error: itemErr } = await scopedClient
    .from('items')
    .select('id, order_id')
    .eq('id', itemId)
    .maybeSingle();

  if (itemErr) return { ok: false, error: itemErr.message } as const;
  if (!item) return { ok: false, error: 'Item not found' } as const;

  const { data: order, error: orderErr } = await scopedClient
    .from('orders')
    .select('id, project_id')
    .eq('id', item.order_id)
    .maybeSingle();

  if (orderErr) return { ok: false, error: orderErr.message } as const;
  if (!order) return { ok: false, error: 'Order not found' } as const;

  const { data: project, error: projErr } = await scopedClient
    .from('projects')
    .select('id')
    .eq('id', order.project_id)
    .maybeSingle();

  if (projErr) return { ok: false, error: projErr.message } as const;
  if (!project) return { ok: false, error: 'Access denied: Project not found or no permission' } as const;

  return { ok: true, scopedClient } as const;
};

// GET measurements for an item
router.get('/item/:itemId', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { itemId } = req.params;
    const access = await ensureItemAccess(req.token!, itemId);
    if (!access.ok) return res.status(403).json({ error: access.error });

    const { data: measurements, error } = await access.scopedClient
      .from('measurements')
      .select('*')
      .eq('item_id', itemId)
      .order('created_at', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ measurements });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// POST to create a new measurement for an item
router.post('/item/:itemId', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { itemId } = req.params;
    const access = await ensureItemAccess(req.token!, itemId);
    if (!access.ok) return res.status(403).json({ error: access.error });

    const { 
      location_description, 
      length, 
      breadth, 
      depth, 
      quantity, 
      custom_fields 
    } = req.body;

    if (quantity === undefined || quantity === null) {
      return res.status(400).json({ error: 'Quantity is required' });
    }

    const { data: measurement, error } = await access.scopedClient
      .from('measurements')
      .insert({
        item_id: itemId,
        location_description: location_description || '',
        length: length || null,
        breadth: breadth || null,
        depth: depth || null,
        quantity: quantity,
        custom_fields: custom_fields || {},
        recorded_by: req.user?.id
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json({ measurement });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// PUT to update a measurement
router.put('/:measurementId', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { measurementId } = req.params;
    const scopedClient = getSupabaseScopedClient(req.token!);

    // Get the measurement to find its item_id for access check
    const { data: existing, error: fetchErr } = await scopedClient
      .from('measurements')
      .select('id, item_id')
      .eq('id', measurementId)
      .maybeSingle();

    if (fetchErr) return res.status(400).json({ error: fetchErr.message });
    if (!existing) return res.status(404).json({ error: 'Measurement not found' });

    const access = await ensureItemAccess(req.token!, existing.item_id);
    if (!access.ok) return res.status(403).json({ error: access.error });

    const {
      location_description,
      length,
      breadth,
      depth,
      quantity,
      custom_fields
    } = req.body;

    const { data: measurement, error } = await access.scopedClient
      .from('measurements')
      .update({
        location_description: location_description || '',
        length: length || null,
        breadth: breadth || null,
        depth: depth || null,
        quantity: quantity,
        custom_fields: custom_fields || {},
      })
      .eq('id', measurementId)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ measurement });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// DELETE a measurement
router.delete('/:measurementId', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { measurementId } = req.params;
    const scopedClient = getSupabaseScopedClient(req.token!);

    // Get the measurement to find its item_id for access check
    const { data: existing, error: fetchErr } = await scopedClient
      .from('measurements')
      .select('id, item_id')
      .eq('id', measurementId)
      .maybeSingle();

    if (fetchErr) return res.status(400).json({ error: fetchErr.message });
    if (!existing) return res.status(404).json({ error: 'Measurement not found' });

    const access = await ensureItemAccess(req.token!, existing.item_id);
    if (!access.ok) return res.status(403).json({ error: access.error });

    const { error } = await access.scopedClient
      .from('measurements')
      .delete()
      .eq('id', measurementId);

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

export default router;
