import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ndhjpeodvcmbavedpfpt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kaGpwZW9kdmNtYmF2ZWRwZnB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MTUxOTAsImV4cCI6MjA3ODA5MTE5MH0.75oSDp2v82LliU5sJuB23QTI8c98qe_tKrkM264jadU'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testUpload() {
  console.log('🧪 Testing anonymous upload...\n')

  // Create a test file (PDF)
  const testContent = '%PDF-1.4 test file'
  const testFile = new Blob([testContent], { type: 'application/pdf' })
  const testFileName = `test_${Date.now()}.pdf`
  const filePath = `test/${testFileName}`

  try {
    const { data, error } = await supabase.storage
      .from('organization-files')
      .upload(filePath, testFile)

    if (error) {
      console.error('❌ Upload failed:', error.message)
      console.error('   Error details:', error)
      
      if (error.message.includes('row-level security')) {
        console.log('\n🔒 RLS Policy Issue Detected!')
        console.log('   The storage policies are not configured correctly.')
        console.log('   Please verify you ran the SETUP_STORAGE_POLICIES.sql script.')
      }
    } else {
      console.log('✅ Upload successful!')
      console.log('   File path:', data.path)
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('organization-files')
        .getPublicUrl(filePath)
      
      console.log('   Public URL:', urlData.publicUrl)
      
      // Clean up - delete test file
      await supabase.storage.from('organization-files').remove([filePath])
      console.log('   Test file cleaned up')
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err)
  }
}

testUpload()
