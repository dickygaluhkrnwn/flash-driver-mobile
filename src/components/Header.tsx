import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { 
  ChevronLeft, Bell, ChevronDown, 
  LogOut, Settings, LifeBuoy, User, Truck, Wallet 
} from 'lucide-react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

export interface HeaderProps {
  title: string;
  showBack?: boolean;
}

export function Header({ title, showBack = false }: HeaderProps) {
  const router = useRouter();
  const { user, isVendor, logout } = useAuthStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const vendorMode = isVendor();
  const notifColor = vendorMode ? 'bg-blue-500' : 'bg-[#7A171D]';
  const roleLabel = vendorMode ? 'Mitra Vendor' : 'Mitra Mandiri';
  const roleBadgeStyle = vendorMode 
    ? 'bg-blue-50 border-blue-200 text-blue-700' 
    : 'bg-[#7A171D]/10 border-[#7A171D]/20 text-[#7A171D]';

  const handleLogout = async () => {
    setIsProfileOpen(false);
    try {
      await signOut(auth);
      logout();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error("Gagal Logout:", error);
    }
  };

  return (
    <View className="w-full bg-white/90 backdrop-blur-xl pt-14 pb-4 px-4 flex-row items-center justify-between border-b border-slate-100 z-50" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}>
      
      {/* KIRI: Tombol Back & Judul */}
      <View className="flex-row items-center gap-3">
        {showBack && (
          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white border border-slate-100" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}
          >
            <ChevronLeft size={24} color="#1e293b" />
          </TouchableOpacity>
        )}
        <Text className="text-xl font-black text-slate-900 tracking-tight">
          {title}
        </Text>
      </View>

      {/* KANAN: Notifikasi & Profil */}
      <View className="flex-row items-center gap-2">
        <TouchableOpacity className="relative w-10 h-10 flex items-center justify-center rounded-2xl bg-white border border-slate-100" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }}>
          <Bell size={20} color="#334155" />
          <View className={`absolute top-2 right-2.5 w-2 h-2 rounded-full border border-white ${notifColor}`} />
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setIsProfileOpen(true)}
          className={`flex-row items-center gap-1.5 p-1 pr-2 rounded-2xl border ${isProfileOpen ? 'bg-white border-slate-200' : 'bg-white/70 border-white'}`} style={!isProfileOpen ? { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 } : {}}
        >
          <View className="relative w-8 h-8 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <View className="w-full h-full bg-[#7A171D] flex items-center justify-center">
                <User size={16} color="#FFFFFF" />
              </View>
            )}
          </View>
          <ChevronDown size={16} color="#64748b" style={{ transform: [{ rotate: isProfileOpen ? '180deg' : '0deg' }] }} />
        </TouchableOpacity>
      </View>

      {/* MODAL DROPDOWN PROFIL */}
      <Modal visible={isProfileOpen} transparent animationType="none">
        <TouchableOpacity 
          className="flex-1 bg-black/10" 
          activeOpacity={1} 
          onPress={() => setIsProfileOpen(false)}
        >
          <View 
            className="absolute top-[85px] right-4 w-[240px] bg-white/95 backdrop-blur-2xl rounded-3xl p-2 border border-slate-100" style={{ elevation: 15, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 }}
          >
            {/* Header Profil Mini */}
            <View className="px-3 py-3 mb-2 bg-slate-50/80 rounded-2xl border border-slate-100 items-center">
              <Text className="text-sm font-black text-slate-900 text-center" numberOfLines={1}>{user?.displayName}</Text>
              <Text className="text-[10px] font-medium text-slate-500 text-center mt-0.5">{user?.email}</Text>
              <View className={`mt-2 px-2.5 py-0.5 rounded-md border ${roleBadgeStyle}`}>
                <Text className={`text-[9px] font-black uppercase tracking-widest ${vendorMode ? 'text-blue-700' : 'text-[#7A171D]'}`}>
                  {roleLabel}
                </Text>
              </View>
            </View>

            {/* List Menu Cepat */}
            <View className="space-y-1">
              {vendorMode && (
                <TouchableOpacity onPress={() => { setIsProfileOpen(false); router.push('/(tabs)/fleet'); }} className="flex-row items-center gap-3 px-3 py-2.5 rounded-xl">
                  <Truck size={16} color="#3b82f6" />
                  <Text className="text-xs font-bold text-slate-700">Kelola Armada</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => { setIsProfileOpen(false); router.push('/(tabs)/wallet'); }} className="flex-row items-center gap-3 px-3 py-2.5 rounded-xl">
                <Wallet size={16} color="#10b981" />
                <Text className="text-xs font-bold text-slate-700">Dompet & Komisi</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setIsProfileOpen(false); router.push('/(tabs)/profile'); }} className="flex-row items-center gap-3 px-3 py-2.5 rounded-xl">
                <Settings size={16} color="#64748b" />
                <Text className="text-xs font-bold text-slate-700">Pengaturan Akun</Text>
              </TouchableOpacity>
            </View>

            {/* Footer: Logout */}
            <View className="mt-1 pt-1 border-t border-slate-100">
              <TouchableOpacity onPress={handleLogout} className="flex-row items-center gap-3 px-3 py-2.5 rounded-xl">
                <LogOut size={16} color="#dc2626" />
                <Text className="text-xs font-bold text-red-600">Keluar Sesi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
