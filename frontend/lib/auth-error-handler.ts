/**
 * Auth error handler utility
 * Handles common Supabase authentication errors
 */

export function handleAuthError(error: any): void {
  if (!error) return;

  // Check if it's an auth-related error
  const isAuthError = 
    error.message?.includes('refresh') ||
    error.message?.includes('Refresh Token') ||
    error.message?.includes('JWT') ||
    error.message?.includes('session') ||
    error.code === 'PGRST301' ||
    error.status === 401;

  if (isAuthError) {
    console.error('Authentication error detected:', error.message);
    
    // Clear local storage
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
      
      // Redirect to login
      window.location.href = '/auth/login';
    }
  }
}

export function isAuthError(error: any): boolean {
  if (!error) return false;
  
  return (
    error.message?.includes('refresh') ||
    error.message?.includes('Refresh Token') ||
    error.message?.includes('JWT') ||
    error.message?.includes('session') ||
    error.code === 'PGRST301' ||
    error.status === 401
  );
}
