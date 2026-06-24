// Supabase public frontend config
// Catatan: anon key boleh dipakai di frontend.
// Jangan pernah taruh service_role key di file frontend atau GitHub.

const SUPABASE_URL = 'https://jiwulsqtpbnhmavtwpwv.supabase.co';
const SUPABASE_REST_URL = 'https://jiwulsqtpbnhmavtwpwv.supabase.co/rest/v1';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imppd3Vsc3F0cGJuaG1hdnR3cHd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxOTU4NDUsImV4cCI6MjA5Nzc3MTg0NX0.NP-QfNpdXUsPs2OnHyg012WSGmW-dJYIPFVXiDWTjIM';

const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

window.supabaseClient = supabaseClient;
