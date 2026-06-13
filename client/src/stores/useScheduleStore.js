import { create } from 'zustand';

const useScheduleStore = create((set, get) => ({
  // roomId별 선택 날짜 관리 { [roomId]: string[] }
  myDatesByRoom: {},
  // 서버에 저장된 날짜 { [roomId]: string[] }
  savedDatesByRoom: {},
  aggregated: {},
  confirmedDate: null,

  getMyDates: (roomId) => get().myDatesByRoom[roomId] ?? [],
  getSavedDates: (roomId) => get().savedDatesByRoom[roomId] ?? [],

  toggleDate: (roomId, date) =>
    set((state) => {
      const prev = state.myDatesByRoom[roomId] ?? [];
      const next = prev.includes(date)
        ? prev.filter((d) => d !== date)
        : [...prev, date];
      return { myDatesByRoom: { ...state.myDatesByRoom, [roomId]: next } };
    }),

  // 서버에서 불러온 날짜 — myDates와 savedDates 모두 갱신
  setMyDates: (roomId, dates) =>
    set((state) => ({
      myDatesByRoom: { ...state.myDatesByRoom, [roomId]: dates },
      savedDatesByRoom: { ...state.savedDatesByRoom, [roomId]: dates },
    })),

  // 저장 성공 시 savedDates를 현재 myDates로 갱신
  syncSavedDates: (roomId) =>
    set((state) => ({
      savedDatesByRoom: { ...state.savedDatesByRoom, [roomId]: state.myDatesByRoom[roomId] ?? [] },
    })),

  clearDates: (roomId) =>
    set((state) => ({
      myDatesByRoom: { ...state.myDatesByRoom, [roomId]: [] },
      savedDatesByRoom: { ...state.savedDatesByRoom, [roomId]: [] },
    })),

  setAggregated: (aggregated) => set({ aggregated }),
  setConfirmedDate: (date) => set({ confirmedDate: date }),
  clearRoom: (roomId) =>
    set((state) => {
      const { [roomId]: _, ...rest } = state.myDatesByRoom;
      return { myDatesByRoom: rest, aggregated: {}, confirmedDate: null };
    }),
}));

export default useScheduleStore;
