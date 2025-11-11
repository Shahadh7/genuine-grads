'use client';

import { useEffect, useState } from 'react';
import { getSession, AUTH_EVENT, UserSession } from '@/lib/session';

export const useSession = () => {
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    setSession(getSession());

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<UserSession | null>).detail ?? null;
      setSession(detail);
    };

    window.addEventListener(AUTH_EVENT, handler);
    return () => window.removeEventListener(AUTH_EVENT, handler);
  }, []);

  return session;
};

