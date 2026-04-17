import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Helper to resolve the frontend URL from environment.
 * Render's `property: host` gives a bare hostname (no protocol),
 * so we prepend https:// if missing, and strip trailing slashes.
 */
const getFrontendUrl = (): string => {
  let url = process.env.FRONTEND_URL || 'http://localhost:3000';
  if (!url.startsWith('http')) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, '');
};

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error) return res.status(401).json({ error: error.message });
  return res.json({ session: data.session, user: data.user });
});

router.post('/signup', async (req, res) => {
  const { email, password, fullName, companyName, mobileNumber, gstNumber } = req.body;
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        company_name: companyName,
        mobile_number: mobileNumber,
        gst_number: gstNumber,
      }
    }
  });

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ session: data.session, user: data.user });
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  let backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  if (!backendUrl.startsWith('http')) {
    backendUrl = `https://${backendUrl}`;
  }
  backendUrl = backendUrl.replace(/\/+$/, '');
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${backendUrl}/api/auth/callback?next=/reset-password`,
  });

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ success: true });
});

router.get('/callback', async (req, res) => {
  const { code, next, token_hash, type } = req.query;
  const redirectPath = String(next || '/reset-password');
  const frontendUrl = getFrontendUrl();

  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash: String(token_hash)
    });
    if (!error && data.session) {
      return res.redirect(`${frontendUrl}${redirectPath}?access_token=${data.session.access_token}`);
    }
    return res.redirect(`${frontendUrl}/login?error=Invalid+Link`);
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(String(code));
    if (!error && data.session) {
      return res.redirect(`${frontendUrl}${redirectPath}?access_token=${data.session.access_token}`);
    }
    return res.redirect(`${frontendUrl}/login?error=Token+Exchange+Failed`);
  }

  return res.redirect(`${frontendUrl}/login?error=Invalid+Link+Parameters`);
});

// Support both /update-password and /reset-password (frontend uses /reset-password)
router.post('/update-password', handlePasswordUpdate);
router.post('/reset-password', handlePasswordUpdate);

async function handlePasswordUpdate(req: any, res: any) {
  const { password } = req.body;
  const authHeader = req.headers.authorization;
  
  if (!authHeader) return res.status(401).json({ error: "Missing authorization header" });

  const access_token = authHeader.split(' ')[1];

  // Scoped client for this specific user
  const scopedClient = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${access_token}` } }
  });

  const { error } = await scopedClient.auth.updateUser({ password });
  
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ success: true });
}

export default router;
