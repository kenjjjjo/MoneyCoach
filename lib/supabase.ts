import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://oytimjztgedqbkcjikrj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95dGltanp0Z2VkcWJrY2ppa3JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMTQzNDQsImV4cCI6MjA5Nzg5MDM0NH0.8ZhcqPrOxiqx-aPd9OjgiIYMazl5oIXjnRLAFgz0bLI'

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)