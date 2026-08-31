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
    <View className="space-y-6">
      
      {/* ========================================================= */}
      {/* BANNER SOFT-LOCK                                          */}
      {/* ========================================================= */}
      {driverStatus === "Pending" && (
        <Animated.View 
          entering={FadeInDown.duration(400)}
          layout={Layout.springify()}
          className="bg-amber-50 rounded-[1.5rem] p-4 border border-amber-200/50 shadow-sm flex-row gap-3 overflow-hidden relative"
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
          className="bg-red-50 rounded-[1.5rem] p-4 border border-red-200/50 shadow-sm flex-row gap-3 overflow-hidden"
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
      {/* SECTION 1: DOMPET KORPORAT (3D PREMIUM CARD)                */}
      {/* ========================================================= */}
      <Animated.View 
        entering={FadeInUp.delay(100).duration(400)}
        className={`bg-[#0f172a] rounded-[2rem] p-6 overflow-hidden shadow-lg border border-slate-800 relative ${isLocked ? 'opacity-80' : ''}`}
      >
        <View className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full" />
        <View className="absolute -bottom-5 -left-5 w-24 h-24 bg-indigo-500/30 rounded-full" />
        
        <View className="flex-row justify-between items-start mb-8">
          <View>
            <View className="flex-row items-center gap-1.5 mb-1">
              <Building2 color="#60a5fa" size={12} />
              <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Pendapatan</Text>
            </View>
            <Text className="text-3xl font-black text-white tracking-tight">
              <Text className="text-lg text-slate-400">Rp </Text>
              {balance.toLocaleString('id-ID')}
            </Text>
          </View>
          <View className="w-12 h-12 bg-white/10 rounded-[1.25rem] items-center justify-center border border-white/10">
            <Wallet color="#60a5fa" size={22} />
          </View>
        </View>

        <View className="flex-row gap-3">
          <TouchableOpacity 
            disabled={isLocked}
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/wallet')}
            className={`flex-1 bg-blue-600 py-3.5 rounded-[1.25rem] items-center shadow-sm ${isLocked ? 'opacity-50' : ''}`}
          >
            <Text className="text-white text-sm font-black">Tarik Dana PT</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            disabled={isLocked}
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/wallet')}
            className={`flex-1 bg-white/10 py-3.5 rounded-[1.25rem] items-center border border-white/20 ${isLocked ? 'opacity-50' : ''}`}
          >
            <Text className="text-white text-sm font-bold">Cek Mutasi</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ========================================================= */}
      {/* SECTION 2: STATUS ARMADA (FLEET VIEW BENTO BOX)             */}
      {/* ========================================================= */}
      <Animated.View entering={FadeInUp.delay(200).duration(400)}>
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
          <View className="flex-1 glass-card bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
            <View className="absolute -right-4 -top-4 w-16 h-16 bg-blue-50/50 rounded-full" />
            <View className="w-10 h-10 rounded-xl bg-blue-100 items-center justify-center mb-3 border border-blue-200">
              <Truck color="#2563eb" size={20} />
            </View>
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aktif & Siap Jalan</Text>
            <Text className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
              {isLoadingStats ? "-" : fleetStats.active} <Text className="text-xs font-bold text-slate-400">/ {isLoadingStats ? "-" : fleetStats.total} Truk</Text>
            </Text>
          </View>
          
          <View className="flex-1 glass-card bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
            <View className="absolute -right-4 -top-4 w-16 h-16 bg-red-50/50 rounded-full" />
            <View className="w-10 h-10 rounded-xl bg-red-100 items-center justify-center mb-3 border border-red-200">
              <Wrench color="#dc2626" size={20} />
            </View>
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Masuk Bengkel</Text>
            <Text className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
              {isLoadingStats ? "-" : fleetStats.maintenance} <Text className="text-xs font-bold text-slate-400">Truk</Text>
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* ========================================================= */}
      {/* SECTION 3: PERFORMA SOPIR (APPLE HEALTH PROGRESS BAR)       */}
      {/* ========================================================= */}
      <Animated.View entering={FadeInUp.delay(300).duration(400)}>
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

        <View className="glass-card bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center gap-4">
              <View className="w-12 h-12 bg-indigo-50 rounded-[1.25rem] items-center justify-center border border-indigo-100">
                <Users color="#4f46e5" size={24} />
              </View>
              <View>
                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Sopir Vendor</Text>
                <Text className="text-2xl font-black text-slate-900 tracking-tight">
                  {isLoadingStats ? "-" : driverStats.total} <Text className="text-sm text-slate-400">Orang</Text>
                </Text>
              </View>
            </View>
            <View className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center border border-slate-200">
              <BarChart3 color="#94a3b8" size={18} />
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
