import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { User, PermissionSet } from '../types.ts';
import { getPermissionProfiles, login as apiLogin, registerAdmin as apiRegisterAdmin, logout as apiLogout, getProfile } from '../iStorePro/services/mockApi.ts';
import { supabase } from '../supabaseClient.ts';

interface UserContextData {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  permissions: PermissionSet | null;
  login: (email: string, password_param: string) => Promise<void>;
  logout: () => void;
  register: (name: string, email: string, password_param: string) => Promise<void>;
  refreshPermissions: () => void;
}

const UserContext = createContext<UserContextData | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [permissions, setPermissions] = useState<PermissionSet | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('user') !== null;
  });
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshPermissions = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const updateUserAndPermissions = useCallback(async (userData: User | null) => {
    console.log('UserContext: Updating user state:', userData?.email || 'Guest');
    if (userData) {
      setUser(userData);
      setIsAuthenticated(true);
      try {
        const profiles = await getPermissionProfiles();
        const profile = profiles.find(p => p.id === userData.permissionProfileId);
        if (profile) {
          setPermissions(profile.permissions);
        } else {
          console.warn('UserContext: Profile ID not found:', userData.permissionProfileId);
          setPermissions(null);
        }
        localStorage.setItem('user', JSON.stringify(userData));
      } catch (e) {
        console.error("UserContext: Failed to fetch permissions", e);
        setPermissions(null);
      }
    } else {
      setUser(null);
      setPermissions(null);
      setIsAuthenticated(false);
      localStorage.removeItem('user');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let authSubscription: any = null;

    const syncAuth = async (session: any) => {
      console.log('UserContext: Syncing auth state, session:', session ? 'Present' : 'None');

      if (session?.user) {
        try {
          const profile = await getProfile(session.user.id);
          if (!isMounted) return;

          const userData = profile || {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || 'Usuário',
            permissionProfileId: 'profile-admin',
            phone: '',
            createdAt: session.user.created_at
          } as User;

          await updateUserAndPermissions(userData);
        } catch (err) {
          console.error("UserContext: Profile sync failed", err);
        }
      } else if (isMounted) {
        await updateUserAndPermissions(null);
      }

      if (isMounted) {
        console.log('UserContext: Sync complete, setting loading to false');
        setLoading(false);
      }
    };

    const init = async (retryCount = 0) => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await syncAuth(session);
      } catch (err: any) {
        console.error("UserContext: Session check failed", err);

        // If AbortError, try to fallback to cache immediately without retrying indefinitely or blocking
        const isAbort = err?.message?.includes('aborted') || err?.name === 'AbortError';

        if (isAbort) {
          console.warn("UserContext: AbortError detected. Skipping retries and falling back to local cache significantly.");
        } else if (retryCount < 3) { // Reduced max retries
          const delay = Math.min(500 * Math.pow(2, retryCount), 2000);
          await new Promise(resolve => setTimeout(resolve, delay));
          return init(retryCount + 1);
        }

        // If we have a cached user, use it
        const cachedUser = localStorage.getItem('user');
        if (cachedUser && isMounted) {
          console.log('UserContext: Using cached user due to session check failure');
          const userData = JSON.parse(cachedUser);
          setUser(userData);
          setIsAuthenticated(true);
          try {
            const profiles = await getPermissionProfiles();
            const profile = profiles.find(p => p.id === userData.permissionProfileId);
            if (profile) setPermissions(profile.permissions);
          } catch (e) {
            console.warn('UserContext: Failed to load permissions from cache path, using null');
          }
        } else if (isMounted && !isAbort) { // Only force logout if it wasn't an abort (which might be transient)
          // No cached user and session failed - check if we need to require login
          console.log('UserContext: No session and no cache - user needs to login');
          setUser(null);
          setIsAuthenticated(false);
        }

        if (isMounted) setLoading(false);
      }


      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('UserContext: Auth event:', event);

        // Critical fix: Only treat explicit SIGNED_OUT or INITIAL_SESSION (if null) as logout.
        // Ignore other events with null session (like timeouts) to preserve local cache state if available.
        if (event === 'SIGNED_OUT') {
          if (isMounted) await updateUserAndPermissions(null);
        } else if (session?.user) {
          if (isMounted) await syncAuth(session);
        } else if (event === 'INITIAL_SESSION' && !session) {
          // Only clear if initial session check explicitly returns nothing
          if (isMounted) await updateUserAndPermissions(null);
        }
      });
      authSubscription = subscription;
    };



    // --- App Lifecycle & Network Events ---
    const handleRevalidation = async () => {
      if (!navigator.onLine) return;

      console.log('UserContext: Revalidating session...');
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
          console.log('UserContext: Session invalid on revalidation, logging out.');
          // Only force logout if we were previously authenticated and now we are definitely not
          if (isAuthenticated) {
            await updateUserAndPermissions(null);
          }
        } else {
          console.log('UserContext: Session valid. Triggering data refresh.');
          // Broadcast event for pages to reload data
          window.dispatchEvent(new Event('app-focus-refetch'));
        }
      } catch (e) {
        console.error('UserContext: Revalidation error', e);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleRevalidation();
      }
    };

    const handleWindowFocus = () => {
      handleRevalidation();
    };

    const handleOnline = () => {
      console.log('UserContext: App is back online');
      handleRevalidation();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('online', handleOnline);

    init();

    const timeout = setTimeout(() => {
      setLoading(currentLoading => {
        if (isMounted && currentLoading) {
          console.warn("UserContext: Safety timeout reached, forcing loading to false");
          return false;
        }
        return currentLoading;
      });
    }, 5000);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      if (authSubscription) authSubscription.unsubscribe();
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [updateUserAndPermissions]);

  const login = async (email: string, password_param: string) => {
    console.log('UserContext: Manual login started');
    const userData = await apiLogin(email, password_param);
    if (userData) {
      await updateUserAndPermissions(userData);
    }
  };

  const register = async (name: string, email: string, password_param: string) => {
    const userData = await apiRegisterAdmin(name, email, password_param);
    if (userData) {
      await updateUserAndPermissions(userData);
    }
  };

  const logout = async () => {
    console.log('UserContext: Logging out');
    // Optimistic logout: Clear state first, then tell API
    // This prevents hanging if network is down
    await updateUserAndPermissions(null);
    try {
      if (user) await apiLogout(user.id, user.name);
    } catch (e) {
      console.warn("UserContext: API Logout failed (ignoring)", e);
    }
  };

  const contextValue = React.useMemo(() => ({
    user,
    isAuthenticated,
    loading,
    permissions,
    login,
    logout,
    register,
    refreshPermissions
  }), [user, isAuthenticated, loading, permissions, login, logout, register, refreshPermissions]);

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
