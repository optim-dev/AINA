import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

export const useAuthStore = create()(
	persist(
		(set) => ({
			user: null,
			loading: false,
			error: null,

			setUser: (user) => set({ user, error: null }),
			setLoading: (loading) => set({ loading }),
			setError: (error) => set({ error }),
			logout: () => set({ user: null, error: null }),
		}),
		{
			name: "auth-storage",
			storage: createJSONStorage(() => sessionStorage),
			partialize: (state) => ({ user: state.user }),
		}
	)
)
