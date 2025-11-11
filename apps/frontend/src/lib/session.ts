import { graphqlClient } from './graphql-client';

export type UserRole = 'super_admin' | 'university_admin' | 'student';

export interface UserSession {
  id: string;
  email: string;
  fullName?: string;
  role: UserRole;
  university?: {
    id: string;
    name: string;
    domain: string;
    status: string;
    walletAddress?: string | null;
  };
  walletAddress?: string | null;
}

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const SESSION_KEY = 'session';

export const AUTH_EVENT = 'genuinegrads:auth';

const dispatchAuthEvent = (session: UserSession | null) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: session }));
};

const storeSession = (session: UserSession | null) => {
  if (typeof window === 'undefined') return;

  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }

  dispatchAuthEvent(session);
};

export const getSession = (): UserSession | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserSession;
  } catch (error) {
    console.error('Failed to parse session from storage', error);
    return null;
  }
};

export const setSession = (
  session: UserSession,
  accessToken: string,
  refreshToken: string
) => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.removeItem('user'); // Legacy key
    storeSession(session);
    graphqlClient.setToken(accessToken);
  } catch (error) {
    console.error('Failed to persist session', error);
  }
};

export const clearSession = () => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem('user');
    storeSession(null);
    graphqlClient.setToken(null);
  } catch (error) {
    console.error('Failed to clear session', error);
  }
};

export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(ACCESS_TOKEN_KEY) && !!getSession();
};

export const createSessionFromAdmin = (admin: any): UserSession => {
  const role: UserRole = admin.isSuperAdmin ? 'super_admin' : 'university_admin';

  return {
    id: admin.id,
    email: admin.email,
    fullName: admin.fullName || admin.username || admin.email,
    role,
    university: admin.university
      ? {
          id: admin.university.id,
          name: admin.university.name,
          domain: admin.university.domain,
          status: admin.university.status,
          walletAddress: admin.university.walletAddress,
        }
      : undefined,
  };
};

export const validateSession = async (): Promise<UserSession | null> => {
  if (typeof window === 'undefined') return null;

  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

  const clearAndReturn = () => {
    clearSession();
    return null;
  };

  if (!accessToken && !refreshToken) {
    return clearAndReturn();
  }

  try {
    const response = await graphqlClient.me();

    if (response.data?.me) {
      const session = createSessionFromAdmin(response.data.me);
      storeSession(session);
      return session;
    }
  } catch (error) {
    console.error('Session validation failed:', error);
  }

  if (!refreshToken) {
    return clearAndReturn();
  }

  try {
    const refreshResponse = await graphqlClient.refreshAccessToken();
    if (refreshResponse.data?.refreshToken) {
      const admin = refreshResponse.data.refreshToken.admin;
      const session = createSessionFromAdmin(admin);
      storeSession(session);
      return session;
    }

    if (refreshResponse.errors) {
      console.error('Token refresh errors:', refreshResponse.errors);
    }
  } catch (refreshError) {
    console.error('Token refresh failed:', refreshError);
  }

  return clearAndReturn();
};

export const getDefaultRouteForRole = (role: UserRole): string => {
  switch (role) {
    case 'super_admin':
      return '/admin/dashboard';
    case 'university_admin':
      return '/university/dashboard';
    case 'student':
      return '/student/dashboard';
    default:
      return '/login';
  }
};