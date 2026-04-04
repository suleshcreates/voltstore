import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  authError: null,
  needsOnboarding: false,

  // Initialize auth listener
  initialize: () => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({
        session,
        user: session?.user ?? null,
        isAuthenticated: !!session,
        isLoading: false,
      });
      if (session) get().checkOnboardingStatus();
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        set({
          session,
          user: session?.user ?? null,
          isAuthenticated: !!session,
          isLoading: false,
        });

        if (event === 'SIGNED_IN' && session) {
          // Defer execution to avoid deadlocking the auth client
          setTimeout(() => {
            get().checkOnboardingStatus();
          }, 0);
        }

        if (event === 'SIGNED_OUT') {
          set({ needsOnboarding: false });
        }
      }
    );

    return () => subscription.unsubscribe();
  },

  // Check if user has completed onboarding (has customized their tenant details)
  checkOnboardingStatus: async () => {
    const user = get().user;
    if (!user) return;

    // 1. Get the user's generated tenant_id
    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_id', user.id)
      .maybeSingle();

    if (!userData || !userData.tenant_id) {
      set({ needsOnboarding: true });
      return;
    }

    // 2. Check if the tenant has been customized (shop_name isn't default, city isn't empty)
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('shop_name, city')
      .eq('id', userData.tenant_id)
      .maybeSingle();

    const needsSetup = !tenantData || tenantData.shop_name === 'My Shop' || !tenantData.city;
    set({ needsOnboarding: needsSetup });
  },

  // Sign up with email + password
  signUp: async (email, password, name) => {
    set({ authError: null });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    });

    if (error) {
      set({ authError: error.message });
      return { success: false, error: error.message };
    }

    return { success: true, data };
  },

  // Sign in with email + password
  signIn: async (email, password) => {
    set({ authError: null });
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      set({ authError: error.message });
      return { success: false, error: error.message };
    }

    return { success: true, data };
  },

  // Sign out
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, isAuthenticated: false, needsOnboarding: false });
  },

  // Forgot password
  resetPassword: async (email) => {
    set({ authError: null });
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      set({ authError: error.message });
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  // Update password (from reset link)
  updatePassword: async (newPassword) => {
    set({ authError: null });
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      set({ authError: error.message });
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  // Update tenant + user row after onboarding (calls backend API)
  createTenantAndUser: async ({ shopName, ownerName, phone, whatsapp, city, categories }) => {
    const session = get().session;
    if (!session) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch('http://localhost:5000/api/auth/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ shopName, ownerName, phone, whatsapp, city, categories }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Onboarding failed' };
      }

      set({ needsOnboarding: false });
      return { success: true };
    } catch (err) {
      console.error('Onboarding API error:', err);
      return { success: false, error: err.message || 'Could not reach server' };
    }
  },

  clearError: () => set({ authError: null }),
}));

export default useAuthStore;
