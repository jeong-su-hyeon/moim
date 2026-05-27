import { create } from 'zustand';

const useLocationStore = create((set) => ({
  myOrigin: null,
  candidates: [],
  travelTimes: {},
  confirmedPlace: null,

  setMyOrigin: (origin) => set({ myOrigin: origin }),
  setCandidates: (candidates) => set({ candidates }),
  addCandidate: (place) => set((state) => ({ candidates: [...state.candidates, place] })),
  removeCandidate: (placeId) =>
    set((state) => ({
      candidates: state.candidates.filter((p) => p.id !== placeId),
    })),
  setTravelTimes: (placeId, times) =>
    set((state) => ({ travelTimes: { ...state.travelTimes, [placeId]: times } })),
  setConfirmedPlace: (place) => set({ confirmedPlace: place }),
  clear: () => set({ myOrigin: null, candidates: [], travelTimes: {}, confirmedPlace: null }),
}));

export default useLocationStore;
