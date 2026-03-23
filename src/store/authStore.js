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
      async (event, session) => {
        set({
          session,
          user: session?.user ?? null,
          isAuthenticated: !!session,
          isLoading: false,
        });

        if (event === 'SIGNED_IN' && session) {
          await get().checkOnboardingStatus();
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
      .single();

    if (!userData || !userData.tenant_id) {
      set({ needsOnboarding: true });
      return;
    }

    // 2. Check if the tenant has been customized (shop_name isn't default, city isn't empty)
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('shop_name, city')
      .eq('id', userData.tenant_id)
      .single();

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

  // Update tenant + user row after onboarding
  createTenantAndUser: async ({ shopName, ownerName, phone, whatsapp, city, categories }) => {
    const user = get().user;
    if (!user) return { success: false, error: 'Not authenticated' };

    // 1. Get the user's generated tenant_id
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_id', user.id)
      .single();

    if (fetchError || !userData) return { success: false, error: 'Could not find user record' };
    const tenantId = userData.tenant_id;

    // 2. Update tenant
    const { error: tenantError } = await supabase
      .from('tenants')
      .update({
        shop_name: shopName,
        owner_name: ownerName,
        phone,
        whatsapp: whatsapp || phone,
        city,
      })
      .eq('id', tenantId);

    if (tenantError) return { success: false, error: tenantError.message };

    // 3. Update user row
    const { error: userError } = await supabase
      .from('users')
      .update({
        name: ownerName,
        phone,
      })
      .eq('auth_id', user.id);

    if (userError) return { success: false, error: userError.message };

    // 4. Update reorder thresholds if customized categories were provided
    if (categories && categories.length > 0) {
      // First delete existing thresholds created by trigger
      await supabase.from('reorder_thresholds').delete().eq('tenant_id', tenantId);
      
      const newThresholds = categories.map(cat => ({
        tenant_id: tenantId,
        category: cat,
        threshold: cat === 'Wires' ? 30 : 15,
        unit: cat === 'Wires' ? 'meters' : 'pcs',
      }));
      await supabase.from('reorder_thresholds').insert(newThresholds);
    }

    set({ needsOnboarding: false });
    return { success: true };
  },

  clearError: () => set({ authError: null }),
}));

export default useAuthStore;
