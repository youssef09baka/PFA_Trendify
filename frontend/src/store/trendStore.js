import { create } from 'zustand'

const useTrendStore = create((set) => ({
  trends: [],

  setTrends: (data) => set({ trends: data }),
}))

export default useTrendStore