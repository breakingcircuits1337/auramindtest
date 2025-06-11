
export const validateEnvironment = () => {
  const warnings: string[] = [];
  
  if (!import.meta.env.VITE_GOOGLE_API_KEY) {
    warnings.push('VITE_GOOGLE_API_KEY is not set - AI features will use mock responses');
  }
  
  if (!import.meta.env.VITE_SUPABASE_URL) {
    warnings.push('VITE_SUPABASE_URL is not set - Database features disabled');
  }
  
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
    warnings.push('VITE_SUPABASE_ANON_KEY is not set - Database features disabled');
  }
  
  if (warnings.length > 0 && import.meta.env.DEV) {
    console.warn('Environment Configuration Warnings:', warnings);
  }
  
  return {
    hasGoogleApi: !!import.meta.env.VITE_GOOGLE_API_KEY,
    hasSupabase: !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY),
    warnings
  };
};

export const ENV_CONFIG = validateEnvironment();
