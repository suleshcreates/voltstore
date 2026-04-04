import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  tenant: null,
  userProfile: null,
  isLoading: true,
  isAuthenticated: false,
  authError: null,
  needsOnboarding: false,

  // Initialize — restore session + listen for auth changes
  initialize: () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({
        session,
        user: session?.user ?? null,
        isAuthenticated: !!session,
      });
      if (session?.user) {
        get().loadTenant(session.user).finally(() => set({ isLoading: false }));
      } else {
        set({ isLoading: false });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        set({
          session,
          user: session?.user ?? null,
          isAuthenticated: !!session,
        });

        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
          setTimeout(() => get().loadTenant(session.user), 0);
        }

        if (event === 'SIGNED_OUT') {
          set({ tenant: null, userProfile: null, needsOnboarding: false });
        }
      }
    );

    return () => subscription.unsubscribe();
  },

  // Load tenant + user profile after auth
  loadTenant: async (authUser) => {
    const { data: userData } = await supabase
      .from('users')
      .select('*, tenants(*)')
      .eq('auth_id', authUser.id)
      .maybeSingle();

    if (!userData) {
      set({ needsOnboarding: true, tenant: null, userProfile: null });
      return;
    }

    const tenant = userData.tenants;
    set({
      userProfile: userData,
      tenant,
      needsOnboarding: !tenant?.onboarding_completed,
    });
  },

  // Sign up
  signUp: async (email, password, ownerName) => {
    set({ authError: null });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { owner_name: ownerName },
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    });

    if (error) {
      set({ authError: error.message });
      return { success: false, error: error.message };
    }
    return { success: true, data, email };
  },

  // Sign in
  signIn: async (email, password) => {
    set({ authError: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      set({ authError: error.message });
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },

  // Sign out
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, isAuthenticated: false, needsOnboarding: false, tenant: null, userProfile: null });
  },

  // Update tenant direct from settings page
  updateTenantProfile: async (updates) => {
    const tenantId = get().tenant?.id;
    if (!tenantId) return { success: false, error: 'No active tenant' };
    
    try {
      const { error } = await supabase.from('tenants').update(updates).eq('id', tenantId);
      if (error) return { success: false, error: error.message };
      
      // Update local state smoothly
      set({ tenant: { ...get().tenant, ...updates } });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Update tenant during onboarding
  updateTenant: async (updates) => {
    const session = get().session;
    if (!session) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch('http://localhost:5000/api/auth/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(updates),
      });

      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Update failed' };

      // Reload tenant
      if (get().user) await get().loadTenant(get().user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Could not reach server' };
    }
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
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      set({ authError: error.message });
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  // Resend confirmation email
  resendConfirmation: async (email) => {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  clearError: () => set({ authError: null }),
}));

export default useAuthStore;
