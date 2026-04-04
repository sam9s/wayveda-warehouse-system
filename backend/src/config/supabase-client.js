const { createClient } = require("@supabase/supabase-js");
const { appConfig } = require("./app-config");

const clientOptions = {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
};

const publicSupabase = createClient(
  appConfig.supabaseUrl,
  appConfig.supabaseAnonKey,
  clientOptions
);

const adminSupabase = createClient(
  appConfig.supabaseUrl,
  appConfig.supabaseServiceKey,
  clientOptions
);

module.exports = {
  adminSupabase,
  publicSupabase,
};
