import { Router, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateUser, AuthenticatedRequest } from '../middleware/authMiddleware';

const router = Router();
const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_ANON_KEY || '').trim();

// Create a supabase client function tied to the user's token so RLS applies properly
const getSupabaseScopedClient = (token: string) => {
  return createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
};

// GET all projects for the authenticated user
router.get('/', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const scopedClient = getSupabaseScopedClient(req.token!);
    
    // RLS handles filtering by user_id automatically since we pass the user's JWT
    const { data, error } = await scopedClient
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ projects: data });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// GET a single project by id
router.get('/:projectId', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ error: 'Project id is required.' });
    }

    const scopedClient = getSupabaseScopedClient(req.token!);
    const { data, error } = await scopedClient
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .maybeSingle();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Project not found' });
    }

    return res.json({ project: data });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// POST new project
router.post('/', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, client_name } = req.body;
    
    if (!name || !client_name) {
      return res.status(400).json({ error: 'Project Name and Client Name are required.' });
    }

    const scopedClient = getSupabaseScopedClient(req.token!);
    const userId = req.user.id;

    const { data, error } = await scopedClient
      .from('projects')
      .insert([
        { 
          name, 
          client_name,
          owner_id: userId
        }
      ])
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({ project: data[0] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

export default router;
