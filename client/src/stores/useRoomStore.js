import { create } from 'zustand';

const useRoomStore = create((set) => ({
  room: null,
  participants: [],

  setRoom: (room) => set({ room }),
  setParticipants: (participants) => set({ participants }),
  clearRoom: () => set({ room: null, participants: [] }),
}));

export default useRoomStore;
