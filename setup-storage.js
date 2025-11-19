import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ndhjpeodvcmbavedpfpt.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kaGpwZW9kdmNtYmF2ZWRwZnB0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjUxNTE5MCwiZXhwIjoyMDc4MDkxMTkwfQ.z4lYCBR5_Krb16db97bz6z4h8JqL-IEFTsqpCKXNie4'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupStorage() {
  console.log('🚀 Setting up Supabase Storage...\n')

  // Create bucket
  console.log('1. Creating storage bucket...')
  const { data: bucket, error: bucketError } = await supabase.storage.createBucket('organization-files', {
    public: true,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: [
      'text/csv',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
  })

  if (bucketError) {
    if (bucketError.message.includes('already exists')) {
      console.log('   ✅ Bucket already exists')
    } else {
      console.error('   ❌ Error creating bucket:', bucketError)
      return
    }
  } else {
    console.log('   ✅ Bucket created successfully')
  }

  // Verify bucket
  console.log('\n2. Verifying bucket...')
  const { data: buckets } = await supabase.storage.listBuckets()
  const orgBucket = buckets?.find(b => b.id === 'organization-files')
  
  if (orgBucket) {
    console.log('   ✅ Bucket verified:')
    console.log('      - Name:', orgBucket.name)
    console.log('      - Public:', orgBucket.public)
    console.log('      - File size limit:', orgBucket.file_size_limit, 'bytes')
  } else {
    console.log('   ❌ Bucket not found')
  }

  console.log('\n✨ Setup complete!')
  console.log('\n📝 Next steps:')
  console.log('   1. Test file upload in the client sign-up form')
  console.log('   2. Verify files appear in Supabase Storage dashboard')
  console.log('   3. Test download links in organization pages')
}

setupStorage()
