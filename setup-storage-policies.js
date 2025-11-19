import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ndhjpeodvcmbavedpfpt.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kaGpwZW9kdmNtYmF2ZWRwZnB0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUxNTE5MCwiZXhwIjoyMDc4MDkxMTkwfQ.z4lYCBR5_Krb16db97bz6z4h8JqL-IEFTsqpCKXNie4'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupStoragePolicies() {
  console.log('🔐 Setting up Storage Policies...\n')

  // SQL to create storage policies
  const policies = `
    -- Drop existing policies if any
    DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
    DROP POLICY IF EXISTS "Allow public downloads" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
    
    -- Allow anyone to upload to organization-files bucket
    CREATE POLICY "Allow authenticated uploads"
    ON storage.objects FOR INSERT
    TO public
    WITH CHECK (bucket_id = 'organization-files');

    -- Allow public read access
    CREATE POLICY "Allow public downloads"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'organization-files');

    -- Allow anyone to update files
    CREATE POLICY "Allow authenticated updates"
    ON storage.objects FOR UPDATE
    TO public
    USING (bucket_id = 'organization-files')
    WITH CHECK (bucket_id = 'organization-files');

    -- Allow anyone to delete files
    CREATE POLICY "Allow authenticated deletes"
    ON storage.objects FOR DELETE
    TO public
    USING (bucket_id = 'organization-files');
  `

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: policies })
    
    if (error) {
      console.log('⚠️  RPC method not available, using direct query...\n')
      
      // Alternative: Execute each policy separately
      const policyQueries = [
        `CREATE POLICY IF NOT EXISTS "Allow authenticated uploads" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'organization-files')`,
        `CREATE POLICY IF NOT EXISTS "Allow public downloads" ON storage.objects FOR SELECT TO public USING (bucket_id = 'organization-files')`,
        `CREATE POLICY IF NOT EXISTS "Allow authenticated updates" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'organization-files') WITH CHECK (bucket_id = 'organization-files')`,
        `CREATE POLICY IF NOT EXISTS "Allow authenticated deletes" ON storage.objects FOR DELETE TO public USING (bucket_id = 'organization-files')`
      ]
      
      console.log('📝 Please run these SQL commands in Supabase SQL Editor:\n')
      console.log('=' .repeat(70))
      console.log(policies)
      console.log('=' .repeat(70))
      console.log('\nOR go to: https://supabase.com/dashboard/project/ndhjpeodvcmbavedpfpt/sql/new')
    } else {
      console.log('✅ Policies created successfully!')
    }
  } catch (err) {
    console.error('Error:', err)
    console.log('\n📝 Please run this SQL in Supabase SQL Editor:\n')
    console.log('=' .repeat(70))
    console.log(policies)
    console.log('=' .repeat(70))
  }

  console.log('\n✨ Next: Copy the SQL above and run it in Supabase Dashboard > SQL Editor')
  console.log('   URL: https://supabase.com/dashboard/project/ndhjpeodvcmbavedpfpt/sql/new')
}

setupStoragePolicies()
