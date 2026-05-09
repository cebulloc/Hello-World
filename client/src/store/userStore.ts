import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api, type User } from "../api/endpoints";

interface UserStore {
  user: User | null;
  loading: boolean;
  error: string | null;
  bootstrap: () => Promise<void>;
  refreshUser: () => Promise<void>;
  applyUserDelta: (delta: Partial<User>) => void;
}

export const useUser = create<UserStore>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      error: null,
      async bootstrap() {
        if (get().user) return;
        set({ loading: true, error: null });
        try {
          const user = await api.demoUser();
          set({ user, loading: false });
        } catch (e) {
          set({
            error: e instanceof Error ? e.message : String(e),
            loading: false,
          });
        }
      },
      async refreshUser() {
        const id = get().user?.id;
        if (!id) return;
        try {
          const user = await api.getUser(id);
          set({ user });
        } catch (e) {
          set({ error: e instanceof Error ? e.message : String(e) });
        }
      },
      applyUserDelta(delta) {
        const u = get().user;
        if (!u) return;
        set({ user: { ...u, ...delta } });
      },
    }),
    {
      name: "fretforge-user",
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
