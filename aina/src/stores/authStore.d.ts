// Type declarations for authStore
export interface AuthState {
	user: any | null
	loading: boolean
	signIn: (email: string, password: string) => Promise<void>
	signOut: () => Promise<void>
	checkAuth: () => void
}

export function useAuthStore<T>(selector: (state: AuthState) => T): T
