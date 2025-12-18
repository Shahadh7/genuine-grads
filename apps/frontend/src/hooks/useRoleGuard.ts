'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AUTH_EVENT,
  getDefaultRouteForRole,
  UserRole,
  UserSession,
  validateSession
} from '@/lib/session';

interface RoleGuardResult {
  session: UserSession | null;
  loading: boolean;
}

export const useRoleGuard = (allowedRoles: UserRole[]): RoleGuardResult => {
  const router = useRouter();
  const rolesKey = allowedRoles.slice().sort().join('|');
  const allowedRolesSet = useMemo(() => new Set<UserRole>(allowedRoles), [rolesKey]);
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isActive = true;

    const enforceRole = async () => {
      setLoading(true);
      const currentSession = await validateSession();

      if (!isActive) return;

      if (!currentSession) {
        setSession(null);
        setLoading(false);
        // Redirect to role-specific login page
        const loginPath = allowedRolesSet.has('student') ? '/student-login' : '/login';
        router.replace(loginPath);
        return;
      }

      if (allowedRolesSet.size > 0 && !allowedRolesSet.has(currentSession.role)) {
        setSession(null);
        setLoading(false);
        router.replace(getDefaultRouteForRole(currentSession.role));
        return;
      }

      setSession(currentSession);
      setLoading(false);
    };

    const handleAuthEvent = (event: Event) => {
      const detail = (event as CustomEvent<UserSession | null>).detail ?? null;

      if (!isActive) return;

      if (!detail) {
        setSession(null);
        setLoading(false);
        // Redirect to role-specific login page
        const loginPath = allowedRolesSet.has('student') ? '/student-login' : '/login';
        router.replace(loginPath);
        return;
      }

      if (allowedRolesSet.size > 0 && !allowedRolesSet.has(detail.role)) {
        setSession(null);
        setLoading(false);
        router.replace(getDefaultRouteForRole(detail.role));
        return;
      }

      setSession(detail);
      setLoading(false);
    };

    enforceRole();
    window.addEventListener(AUTH_EVENT, handleAuthEvent);

    return () => {
      isActive = false;
      window.removeEventListener(AUTH_EVENT, handleAuthEvent);
    };
  }, [router, rolesKey, allowedRolesSet]);

  return { session, loading };
};

