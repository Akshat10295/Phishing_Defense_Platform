import { create } from 'zustand';

const useAppStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('sentinel_user')) || null,
  accessToken: localStorage.getItem('sentinel_access') || null,
  refreshToken: localStorage.getItem('sentinel_refresh') || null,
  isAuthenticated: !!localStorage.getItem('sentinel_access'),

  setAuth: (user, accessToken, refreshToken) => {
    localStorage.setItem('sentinel_user', JSON.stringify(user));
    localStorage.setItem('sentinel_access', accessToken);
    localStorage.setItem('sentinel_refresh', refreshToken);
    set({ user, accessToken, refreshToken, isAuthenticated: true });
  },

  clearAuth: () => {
    localStorage.removeItem('sentinel_user');
    localStorage.removeItem('sentinel_access');
    localStorage.removeItem('sentinel_refresh');
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },
}));

export default useAppStore;
