import dotenv from 'dotenv';

dotenv.config();

const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'] as const;
const missing = required.filter((key) => !process.env[key]?.trim());

if (missing.length > 0) {
  console.error(
    `[FATAL] Missing required environment variables: ${missing.join(', ')}\n` +
      'Add them in the Render Dashboard: your backend service → Environment.\n' +
      'If you use a Blueprint, keys with sync: false are not auto-filled — set the values manually.'
  );
  process.exit(1);
}
