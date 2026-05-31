import { create } from 'zustand';

const useScheduleStore = create((set, get) => ({
  // roomId별 선택 날짜 관리 { [roomId]: string[] }
  myDatesByRoom: {},
  aggregated: {},
  confirmedDate: null,

  getMyDates: (roomId) => get().myDatesByRoom[roomId] ?? [],

  toggleDate: (roomId, date) =>
    set((state) => {
      const prev = state.myDatesByRoom[roomId] ?? [];
      const next = prev.includes(date)
        ? prev.filter((d) => d !== date)
        : [...prev, date];
      return { myDatesByRoom: { ...state.myDatesByRoom, [roomId]: next } };
    }),

  setAggregated: (aggregated) => set({ aggregated }),
  setConfirmedDate: (date) => set({ confirmedDate: date }),
  clearRoom: (roomId) =>
    set((state) => {
      const { [roomId]: _, ...rest } = state.myDatesByRoom;
      return { myDatesByRoom: rest, aggregated: {}, confirmedDate: null };
    }),
}));

export default useScheduleStore;
