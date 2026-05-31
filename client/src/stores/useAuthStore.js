import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      login: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),

      logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),

      setAccessToken: (accessToken) => set({ accessToken }),
    }),
    {
      name: 'auth-storage',
      // accessToken은 sessionStorage에 보관 (탭 닫으면 삭제, localStorage보다 안전)
      storage: {
        getItem: (key) => {
          const item = sessionStorage.getItem(key);
          return item ? JSON.parse(item) : null;
        },
        setItem: (key, value) => sessionStorage.setItem(key, JSON.stringify(value)),
        removeItem: (key) => sessionStorage.removeItem(key),
      },
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
