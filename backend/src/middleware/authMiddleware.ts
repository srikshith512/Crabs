import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_ANON_KEY || '').trim();
const supabase = createClient(supabaseUrl, supabaseKey);

export interface AuthenticatedRequest extends Request {
  user?: any;
  token?: string;
}

export const authenticateUser = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
      return;
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};
