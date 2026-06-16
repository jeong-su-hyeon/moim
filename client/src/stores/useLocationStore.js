import { create } from 'zustand';

const useLocationStore = create((set) => ({
  myOrigin: null,
  candidates: [],
  travelTimes: {},
  confirmedPlace: null,

  setMyOrigin: (origin) => set({ myOrigin: origin }),
  setCandidates: (candidates) => set({ candidates }),
  addCandidate: (place) => set((state) => (
    state.candidates.some((p) => p.id === place.id)
      ? state
      : { candidates: [...state.candidates, place] }
  )),
  removeCandidate: (placeId) =>
    set((state) => ({
      candidates: state.candidates.filter((p) => p.id !== placeId),
    })),
  updatePlaceLike: (placeId, likeCount, likedUserIds, currentUserId) =>
    set((state) => ({
      candidates: state.candidates.map((p) =>
        p.id === placeId
          ? { ...p, likeCount, likedUserIds, likedByMe: likedUserIds.includes(currentUserId) }
          : p
      ),
    })),
  setTravelTimes: (placeId, times) =>
    set((state) => ({ travelTimes: { ...state.travelTimes, [placeId]: times } })),
  setConfirmedPlace: (place) => set({ confirmedPlace: place }),
  clear: () => set({ myOrigin: null, candidates: [], travelTimes: {}, confirmedPlace: null }),
}));

export default useLocationStore;
