import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rwurgthulmhxyzsthpnf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3dXJndGh1bG1oeHl6c3RocG5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MzUzNTcsImV4cCI6MjEwNzAxMTM1N30.N4yp4vuNCFd34s6OzznaxnX__dScz5kBFG_-qb3FNUo';

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);