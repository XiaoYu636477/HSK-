import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdmin() {
  const email = 'hskadmin@miaoda.com';
  const password = 'HskAdmin!2026@Password';
  const username = 'hskadmin';

  console.log('Registering admin...');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username }
    }
  });

  if (error) {
    console.error('Signup error:', error.message);
  } else {
    console.log('Signup success:', data.user?.id);
  }
}

createAdmin();