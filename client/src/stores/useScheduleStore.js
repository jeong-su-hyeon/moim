import { create } from 'zustand';

const useScheduleStore = create((set) => ({
  myDates: [],
  aggregated: [],
  confirmedDate: null,

  setMyDates: (dates) => set({ myDates: dates }),
  toggleDate: (date) =>
    set((state) => ({
      myDates: state.myDates.includes(date)
        ? state.myDates.filter((d) => d !== date)
        : [...state.myDates, date],
    })),
  setAggregated: (aggregated) => set({ aggregated }),
  setConfirmedDate: (date) => set({ confirmedDate: date }),
  clear: () => set({ myDates: [], aggregated: [], confirmedDate: null }),
}));

export default useScheduleStore;
