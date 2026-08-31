import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@/types/user';

// Interface untuk data preferensi regional
export interface UserRegional {
  country?: string;
  city?: string;
  timezone?: string;
  language?: string;
  currency?: string;
  measurement?: string;
}

// Extend Global User untuk kebutuhan internal Store
export interface StoreUser extends User {
  regional?: UserRegional;
}

// Mendefinisikan struktur fungsi dan variabel di dalam Store
interface AuthState {
  user: StoreUser | null;
  login: (userData: StoreUser) => void;
  logout: () => void;
  isHydrated: boolean;
  setHydrated: (state: boolean) => void;
  // Helpers
  isVendor: () => boolean;
  isIndividual: () => boolean;
}

// Membuat Global Store menggunakan Zustand + Persist (AsyncStorage untuk React Native)
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null, // Kondisi awal: Belum login
      isHydrated: false,
      
      login: (userData) => set({ user: userData }),
      logout: () => set({ user: null }),
      setHydrated: (state) => set({ isHydrated: state }),
      
      isVendor: () => {
        const user = get().user;
        return user?.partnerType === 'Vendor';
      },
      isIndividual: () => {
        const user = get().user;
        return user?.partnerType === 'Individual' || user?.partnerType === 'FleetDriver' || !user?.partnerType;
      },
    }),
    {
      name: 'auth-storage', // nama key di AsyncStorage
      storage: createJSONStorage(() => AsyncStorage), // Wajib untuk React Native
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);
