import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInUp, FadeInDown, Layout } from "react-native-reanimated";
import { 
  Wallet, ChevronRight, AlertTriangle, Lock,
  Building2, Truck, Wrench, Users, BarChart3, Activity
} from "lucide-react-native";

import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { LinearGradient } from "expo-linear-gradient";

interface DashboardVendorProps {
  driverStatus: "Pending" | "Active" | "Suspended" | "";
  isLocked: boolean;
  balance: number;
}

export default function DashboardVendor({ driverStatus, isLocked, balance }: DashboardVendorProps) {
  const router = useRouter();
  const { user } = useAuthStore();

  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [fleetStats, setFleetStats] = useState({ total: 0, active: 0, maintenance: 0 });
  const [driverStats, setDriverStats] = useState({ total: 0, onDuty: 0, idle: 0 });

  // Tarik Data Asli Armada & Sopir dari Firebase
  useEffect(() => {
    if (!user || isLocked) {
      setIsLoadingStats(false);
      return;
    }

    const fetchVendorStats = async () => {
      try {
        // 1. Tarik Data Sopir milik Vendor ini
        const driverQuery = query(
          collection(db, "driver_wallets"), 
          where("vendorId", "==", user.uid),
          where("partnerType", "==", "FleetDriver")
        );
        const driverSnap = await getDocs(driverQuery);
        
        const totalDrivers = driverSnap.size; 
        let activeDrivers = 0;
        
        driverSnap.forEach((doc) => {
          if (doc.data().status === "Active") activeDrivers++; 
        });

        setDriverStats({ 
          total: totalDrivers, 
          onDuty: activeDrivers, 
          idle: totalDrivers - activeDrivers 
        });

        // 2. Tarik Data Armada Truk milik Vendor ini
        const fleetQuery = query(
          collection(db, "driver_wallets"), 
          where("vendorId", "==", user.uid),
          where("partnerType", "==", "FleetVehicle")
        );
        const fleetSnap = await getDocs(fleetQuery);
        
        const totalVehicles = fleetSnap.size; 
        let activeVehicles = 0;

        fleetSnap.forEach((doc) => {
          if (doc.data().status === "Active") activeVehicles++;
        });

        setFleetStats({
          total: totalVehicles,
          active: activeVehicles,
          maintenance: totalVehicles - activeVehicles
        });

      } catch (error) {
        console.error("Gagal menarik data statistik vendor:", error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchVendorStats();
  }, [user, isLocked]);

  return (
    <View className="pt-4 pb-8">
      
      {/* ========================================================= */}
      {/* BANNER SOFT-LOCK                                          */}
      {/* ========================================================= */}
      {driverStatus === "Pending" && (
        <Animated.View 
          entering={FadeInDown.duration(400)}
          layout={Layout.springify()}
          className="bg-amber-50 rounded-[1.5rem] p-4 border border-amber-200/50 shadow-sm flex-row gap-3 overflow-hidden relative mb-8"
        >
          <View className="absolute -right-4 -top-4 w-20 h-20 bg-amber-200/30 rounded-full" />
          <View className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0 border border-amber-200">
            <AlertTriangle color="#d97706" size={20} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-black text-amber-900 mb-1 tracking-tight">Legalitas PT Sedang Direview</Text>
            <Text className="text-xs text-amber-800/80 mb-3 font-medium">Akun vendor Anda sedang dalam tahap verifikasi oleh Tim Admin. Anda belum bisa menugaskan armada.</Text>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => router.push("/(tabs)/profile")}
              className="bg-[#d97706] rounded-[1rem] py-2.5 px-4 items-center shadow-sm"
            >
              <Text className="text-white text-xs font-bold">Cek Status Berkas</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {driverStatus === "Suspended" && (
        <Animated.View 
          entering={FadeInDown.duration(400)}
          layout={Layout.springify()}
          className="bg-red-50 rounded-[1.5rem] p-4 border border-red-200/50 shadow-sm flex-row gap-3 overflow-hidden mb-8"
        >
          <View className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0 border border-red-200">
            <Lock color="#dc2626" size={20} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-black text-red-900 mb-1 tracking-tight">Vendor Ditangguhkan</Text>
            <Text className="text-xs text-red-800/80 font-medium">Operasional PT Anda dibekukan sementara. Seluruh armada dan sopir tidak dapat menerima order.</Text>
          </View>
        </Animated.View>
      )}

      {/* ========================================================= */}
      {/* SECTION 1: DOMPET KORPORAT (GOJEK/GRAB STYLE)               */}
      {/* ========================================================= */}
      <Animated.View 
        entering={FadeInUp.delay(100).duration(400)}
        className={`bg-[#1e40af] rounded-[2rem] p-6 mb-8 relative overflow-hidden ${isLocked ? 'opacity-80' : ''}`}
        style={{ elevation: 10, shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 }}
      >
        <View className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
        <View className="absolute right-12 top-12 w-16 h-16 bg-white/5 rounded-full" />
        
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <View className="flex-row items-center gap-1.5 mb-1">
              <Building2 color="#93c5fd" size={14} />
              <Text className="text-blue-200 text-[11px] font-black uppercase tracking-widest">Saldo Perusahaan</Text>
            </View>
            <View className="flex-row items-end gap-1">
              <Text className="text-blue-200 text-lg font-bold mb-1">Rp</Text>
              <Text className="text-3xl font-black text-white tracking-tight">
                {balance.toLocaleString('id-ID')}
              </Text>
            </View>
          </View>
          <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center">
            <Wallet color="#FFFFFF" size={24} />
          </View>
        </View>

        <View className="flex-row gap-3">
          <TouchableOpacity 
            disabled={isLocked}
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/wallet')}
            className={`flex-1 bg-white py-3.5 rounded-[1.25rem] items-center ${isLocked ? 'opacity-50' : ''}`}
            style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}
          >
            <Text className="text-[#1e40af] text-sm font-black tracking-wide">Tarik Dana PT</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            disabled={isLocked}
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/wallet')}
            className={`flex-1 bg-[#1e3a8a] py-3.5 rounded-[1.25rem] items-center border border-[#1e3a8a] ${isLocked ? 'opacity-50' : ''}`}
          >
            <Text className="text-white text-sm font-bold tracking-wide">Cek Mutasi</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ========================================================= */}
      {/* SECTION 2: STATUS ARMADA (FLEET VIEW BENTO BOX)             */}
      {/* ========================================================= */}
      <Animated.View entering={FadeInUp.delay(200).duration(400)} className="mb-8">
        <View className="flex-row items-center justify-between mb-3 px-2 mt-2">
          <Text className="text-sm font-black text-slate-800 tracking-tight">Manajemen Armada</Text>
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/fleet')}
            className="flex-row items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-full"
          >
            <Text className="text-[10px] font-black uppercase tracking-widest text-blue-600">Kelola Truk</Text>
            <ChevronRight color="#2563eb" size={12} strokeWidth={3} />
          </TouchableOpacity>
        </View>
        
        <View className="flex-row gap-4">
          <View className="flex-1 bg-white p-5 rounded-[2rem] border-2 border-slate-100 relative overflow-hidden" style={{ elevation: 5, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }}>
            <View className="absolute -right-4 -top-4 w-16 h-16 bg-blue-50/80 rounded-full" />
            <View className="w-12 h-12 rounded-[1.25rem] bg-blue-100 items-center justify-center mb-4 border border-blue-200">
              <Truck color="#2563eb" size={22} />
            </View>
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aktif & Siap Jalan</Text>
            <Text className="text-3xl font-black text-slate-900 mt-1 tracking-tight">
              {isLoadingStats ? "-" : fleetStats.active} <Text className="text-xs font-bold text-slate-400">/ {isLoadingStats ? "-" : fleetStats.total} Truk</Text>
            </Text>
          </View>
          
          <View className="flex-1 bg-white p-5 rounded-[2rem] border-2 border-slate-100 relative overflow-hidden" style={{ elevation: 5, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }}>
            <View className="absolute -right-4 -top-4 w-16 h-16 bg-red-50/80 rounded-full" />
            <View className="w-12 h-12 rounded-[1.25rem] bg-red-100 items-center justify-center mb-4 border border-red-200">
              <Wrench color="#dc2626" size={22} />
            </View>
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Masuk Bengkel</Text>
            <Text className="text-3xl font-black text-slate-900 mt-1 tracking-tight">
              {isLoadingStats ? "-" : fleetStats.maintenance} <Text className="text-xs font-bold text-slate-400">Truk</Text>
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* ========================================================= */}
      {/* SECTION 3: PERFORMA SOPIR (APPLE HEALTH PROGRESS BAR)       */}
      {/* ========================================================= */}
      <Animated.View entering={FadeInUp.delay(300).duration(400)} className="mb-8">
        <View className="flex-row items-center justify-between mb-3 px-2 mt-4">
          <Text className="text-sm font-black text-slate-800 tracking-tight">Performa Karyawan</Text>
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/fleet')}
            className="flex-row items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-full"
          >
            <Text className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Sopir</Text>
            <ChevronRight color="#4f46e5" size={12} strokeWidth={3} />
          </TouchableOpacity>
        </View>

        <View className="bg-white rounded-[2rem] p-6 border-2 border-slate-100" style={{ elevation: 5, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }}>
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center gap-4">
              <View className="w-14 h-14 bg-indigo-50 rounded-[1.25rem] items-center justify-center border border-indigo-100">
                <Users color="#4f46e5" size={28} />
              </View>
              <View>
                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Sopir Vendor</Text>
                <Text className="text-3xl font-black text-slate-900 tracking-tight">
                  {isLoadingStats ? "-" : driverStats.total} <Text className="text-sm font-bold text-slate-400">Orang</Text>
                </Text>
              </View>
            </View>
            <View className="w-12 h-12 bg-slate-50 rounded-full items-center justify-center border border-slate-200">
              <BarChart3 color="#94a3b8" size={22} />
            </View>
          </View>

          {/* Progress Bar Sopir */}
          <View className="space-y-4">
            <View>
              <View className="flex-row justify-between items-center mb-2">
                <View className="flex-row items-center gap-1.5">
                  <Activity color="#10b981" size={12} />
                  <Text className="text-xs font-black text-slate-600">Sedang Mengaspal</Text>
                </View>
                <View className="bg-slate-100 px-2 py-0.5 rounded-md">
                  <Text className="text-xs font-black text-slate-900">{isLoadingStats ? "-" : driverStats.onDuty}</Text>
                </View>
              </View>
              <View className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <View 
                  className="h-full bg-emerald-500 rounded-full" 
                  style={{ width: driverStats.total > 0 ? `${(driverStats.onDuty / driverStats.total) * 100}%` : '0%' }}
                />
              </View>
            </View>
            
            <View>
              <View className="flex-row justify-between items-center mb-2">
                <View className="flex-row items-center gap-1.5">
                  <Lock color="#f59e0b" size={12} />
                  <Text className="text-xs font-black text-slate-600">Sedang Idle</Text>
                </View>
                <View className="bg-slate-100 px-2 py-0.5 rounded-md">
                  <Text className="text-xs font-black text-slate-900">{isLoadingStats ? "-" : driverStats.idle}</Text>
                </View>
              </View>
              <View className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <View 
                  className="h-full bg-amber-400 rounded-full" 
                  style={{ width: driverStats.total > 0 ? `${(driverStats.idle / driverStats.total) * 100}%` : '0%' }}
                />
              </View>
            </View>
          </View>
        </View>
      </Animated.View>

    </View>
  );
}
