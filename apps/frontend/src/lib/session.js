export const getSession = () => {
  if (typeof window === 'undefined') return null;
  try {
    const session = localStorage.getItem('session');
    return session ? JSON.parse(session) : null;
  } catch (error) {
    console.error('Error reading session from localStorage:', error);
    return null;
  }
};

export const setSession = (session) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('session', JSON.stringify(session));
  } catch (error) {
    console.error('Error writing session to localStorage:', error);
  }
};

export const clearSession = () => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('session');
  } catch (error) {
    console.error('Error clearing session from localStorage:', error);
  }
};

export const updateSession = (updates) => {
  const currentSession = getSession();
  if (currentSession) {
    const updatedSession = { ...currentSession, ...updates };
    setSession(updatedSession);
    return updatedSession;
  }
  return null;
}; 