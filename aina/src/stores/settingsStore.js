import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

export const useSettingsStore = create()(
	persist(
		(set) => ({
			selectedModel: "salamandra-7b-vertex", // Default model

			setSelectedModel: (selectedModel) => set({ selectedModel }),
		}),
		{
			name: "settings-storage",
			storage: createJSONStorage(() => localStorage),
		}
	)
)
