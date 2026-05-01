import { Router, Response } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/authMiddleware';
import { createUserSupabaseClient } from '../lib/supabaseUserClient';

const router = Router();

/**
 * Helper to ensure the user has access to the order's parent project.
 */
const ensureOrderAccess = async (token: string, orderId: string) => {
  const scopedClient = createUserSupabaseClient(token);
  
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
      .select('*, milestones:item_milestones(*), measurements(*)')
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

// PUT update an item
router.put('/:itemId', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { itemId } = req.params;
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

    const scopedClient = createUserSupabaseClient(req.token!);

    // Verify access to item
    const { data: itemData, error: lookupErr } = await scopedClient
      .from('items')
      .select('order_id')
      .eq('id', itemId)
      .maybeSingle();

    if (lookupErr || !itemData) return res.status(404).json({ error: 'Item not found' });
    
    const access = await ensureOrderAccess(req.token!, itemData.order_id);
    if (!access.ok) return res.status(403).json({ error: access.error });

    // Update item
    const { data: updatedItem, error: updateErr } = await scopedClient
      .from('items')
      .update({
        item_code,
        description,
        short_description,
        unit,
        department,
        quantity,
        rate
      })
      .eq('id', itemId)
      .select()
      .single();

    if (updateErr) return res.status(400).json({ error: updateErr.message });

    // Replace Milestones
    if (milestones && Array.isArray(milestones)) {
      // Delete old milestones
      await scopedClient.from('item_milestones').delete().eq('item_id', itemId);
      
      // Insert new ones
      if (milestones.length > 0) {
        const milestonesToInsert = milestones.map(m => ({
          item_id: itemId,
          name: m.name,
          percentage: m.percentage
        }));

        const { error: msErr } = await scopedClient
          .from('item_milestones')
          .insert(milestonesToInsert);

        if (msErr) {
          return res.status(400).json({ error: 'Item updated but milestones failed: ' + msErr.message });
        }
      }
    }

    return res.status(200).json({ item: updatedItem });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// DELETE an item
router.delete('/:itemId', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { itemId } = req.params;
    const scopedClient = createUserSupabaseClient(req.token!);

    // Verify access to item
    const { data: itemData, error: lookupErr } = await scopedClient
      .from('items')
      .select('order_id')
      .eq('id', itemId)
      .maybeSingle();

    if (lookupErr || !itemData) return res.status(404).json({ error: 'Item not found' });
    
    const access = await ensureOrderAccess(req.token!, itemData.order_id);
    if (!access.ok) return res.status(403).json({ error: access.error });

    const { error: deleteErr } = await scopedClient
      .from('items')
      .delete()
      .eq('id', itemId);

    if (deleteErr) return res.status(400).json({ error: deleteErr.message });

    return res.status(200).json({ success: true, message: 'Item deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

export default router;
