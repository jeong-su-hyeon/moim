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
  updatePlace: (place) =>
    set((state) => ({
      candidates: state.candidates.map((p) => (p.id === place.id ? { ...p, ...place } : p)),
    })),
  // 본인 이동시간만 저장 — placeId당 단일 값 (또는 null: 출발지 미입력/조회 실패)
  setTravelTime: (placeId, time) =>
    set((state) => ({ travelTimes: { ...state.travelTimes, [placeId]: time } })),
  setConfirmedPlace: (place) => set({ confirmedPlace: place }),
  clear: () => set({ myOrigin: null, candidates: [], travelTimes: {}, confirmedPlace: null }),
}));

export default useLocationStore;
