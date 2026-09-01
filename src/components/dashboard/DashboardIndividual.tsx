import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { 
  Navigation, Package, Wallet, TrendingUp, 
  ChevronRight, Power, AlertTriangle, Lock,
  Clock, CheckCircle2, History, Truck
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { OrderDetail } from "@/types/order";
import { LinearGradient } from "expo-linear-gradient";

const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

const getSafeMillis = (ts: any): number => {
  if (!ts) return 0;
  if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts).getTime();
  
  if (typeof ts === 'object' && ts !== null) {
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (typeof ts.seconds === 'number') return ts.seconds * 1000;
    if (typeof ts.toDate === 'function') {
      const dateObj = ts.toDate();
      return dateObj.getTime();
    }
  }
  return new Date(String(ts)).getTime();
};

interface DashboardIndividualProps {
  driverStatus: "Pending" | "Active" | "Suspended" | "";
  isLocked: boolean;
  balance: number;
}

export default function DashboardIndividual({ driverStatus, isLocked, balance }: DashboardIndividualProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [isOnline, setIsOnline] = useState(false);
  const [recentOrders, setRecentOrders] = useState<OrderDetail[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // STATE UNTUK MENDETEKSI ORDER AKTIF
  const [activeOrder, setActiveOrder] = useState<OrderDetail | null>(null);

  // Status Online Async Storage
  useEffect(() => {
    const loadStatus = async () => {
      try {
        const savedStatus = await AsyncStorage.getItem("driver_is_online");
        if (savedStatus !== null && !isLocked) {
          setIsOnline(savedStatus === "true");
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadStatus();
  }, [isLocked]);

  const toggleOnline = async (status: boolean) => {
    if (isLocked) return;
    setIsOnline(status);
    try {
      await AsyncStorage.setItem("driver_is_online", status.toString());
    } catch (e) {
      console.error(e);
    }
  };

  // FETCH ACTIVE ORDER SECARA REALTIME
  useEffect(() => {
    if (!user || isLocked) return;
    
    const activeStatuses = ["Menuju Lokasi Jemput", "Sedang Diproses", "Dikirim"];
    const q = query(
      collection(db, "orders"),
      where("driverId", "==", user.uid),
      where("status", "in", activeStatuses)
    );

    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setActiveOrder({ id: snap.docs[0].id, ...snap.docs[0].data() } as OrderDetail);
      } else {
        setActiveOrder(null);
      }
    });

    return () => unsub();
  }, [user, isLocked]);

  // Fetch History Orders (Untuk order Selesai)
  useEffect(() => {
    if (!user || isLocked) {
      setIsLoadingHistory(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        const q = query(
          collection(db, "orders"),
          where("driverId", "==", user.uid),
          where("status", "==", "Selesai")
        );
        const snap = await getDocs(q);
        const ordersData = snap.docs.map(d => ({ id: d.id, ...d.data() } as OrderDetail));

        ordersData.sort((a, b) => {
          return getSafeMillis(b.updatedAt || b.createdAt) - getSafeMillis(a.updatedAt || a.createdAt);
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayOrders = ordersData.filter(o => {
          const tsMillis = getSafeMillis(o.updatedAt || o.createdAt);
          return tsMillis >= today.getTime();
        });

        setTodayCount(todayOrders.length);
        setRecentOrders(ordersData.slice(0, 3));
      } catch (error) {
        console.error("Gagal menarik riwayat:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [user, isLocked]);

  return (
    <View className="pt-4 pb-8">
      
      {/* ========================================================= */}
      {/* BANNER SOFT-LOCK                                          */}
      {/* ========================================================= */}
      {driverStatus === "Pending" && (
        <View 
          className="bg-amber-50 rounded-[1.5rem] p-4 border border-amber-200/50 shadow-sm flex-row gap-3 overflow-hidden relative mb-8"
        >
          <View className="absolute -right-4 -top-4 w-20 h-20 bg-amber-200/30 rounded-full" />
          <View className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0 border border-amber-200">
            <AlertTriangle color="#d97706" size={20} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-black text-amber-900 mb-1 tracking-tight">Profil Belum Lengkap</Text>
            <Text className="text-xs text-amber-800/80 mb-3 font-medium">Anda belum bisa menerima order. Segera lengkapi dokumen KTP, SIM, dan kendaraan Anda.</Text>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => router.push("/(tabs)/profile")}
              className="bg-[#d97706] rounded-[1rem] py-2.5 px-4 items-center shadow-sm"
            >
              <Text className="text-white text-xs font-bold">Lengkapi Sekarang</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {driverStatus === "Suspended" && (
        <View 
          className="bg-red-50 rounded-[1.5rem] p-4 border border-red-200/50 shadow-sm flex-row gap-3 overflow-hidden mb-8"
        >
          <View className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0 border border-red-200">
            <Lock color="#dc2626" size={20} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-black text-red-900 mb-1 tracking-tight">Akun Ditangguhkan</Text>
            <Text className="text-xs text-red-800/80 font-medium">Sistem mendeteksi aktivitas tidak biasa. Silakan hubungi tim Support kami.</Text>
          </View>
        </View>
      )}

      {/* ========================================================= */}
      {/* 🚀 BANNER PENGIRIMAN AKTIF                                  */}
      {/* ========================================================= */}
      {activeOrder && (
        <View className="mb-8" style={{ elevation: 10, shadowColor: '#10b981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15 }}>
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => { /* router.push('/driver/awb/${activeOrder.id}') */ }}
            className="rounded-[1.5rem] overflow-hidden border border-emerald-300"
          >
            <LinearGradient
              colors={['#10b981', '#059669']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              className="p-4"
              style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.4)' }}
            >
              <View className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full" />
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3.5">
                  <View className="w-10 h-10 bg-white/20 rounded-xl border border-white/30 flex items-center justify-center" style={{ elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 }}>
                    <Truck color="#FFFFFF" size={20} />
                  </View>
                  <View>
                    <View className="flex-row items-center gap-2 mb-1">
                      <View className="w-2 h-2 bg-emerald-200 rounded-full" />
                      <Text className="text-[10px] font-black text-emerald-100 uppercase tracking-widest">Pengiriman Aktif</Text>
                    </View>
                    <Text className="text-sm font-black text-white tracking-tight">{activeOrder.status}</Text>
                  </View>
                </View>
                <ChevronRight color="#a7f3d0" size={20} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* ========================================================= */}
      {/* SECTION 1: TOGGLE STATUS (iOS SEGMENTED CONTROL VIBE)     */}
      {/* ========================================================= */}
      <View 
        className={`bg-slate-100 p-1.5 rounded-[2.5rem] flex-row items-center mb-8 ${isLocked ? 'opacity-80' : ''}`}
        style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, borderWidth: 1, borderColor: '#e2e8f0' }}
      >
        <TouchableOpacity 
          disabled={isLocked}
          activeOpacity={0.8}
          onPress={() => toggleOnline(false)}
          className={`flex-1 flex-row items-center justify-center gap-2 py-4 rounded-[2rem] ${!isOnline ? 'bg-white border-2 border-slate-200' : ''} ${isLocked ? 'bg-slate-100' : ''}`}
          style={!isOnline && !isLocked ? { elevation: 5, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6 } : {}}
        >
          <Text className={`text-sm ${!isOnline ? 'text-slate-800 font-black' : 'text-slate-400 font-bold'}`}>Offline</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          disabled={isLocked}
          activeOpacity={0.8}
          onPress={() => toggleOnline(true)}
          className={`flex-1 flex-row items-center justify-center gap-2 py-4 rounded-[2rem] ${isOnline ? 'bg-[#7A171D] border-2 border-[#5A0E13]' : ''} ${isLocked ? 'bg-slate-100' : ''}`}
          style={isOnline && !isLocked ? { elevation: 8, shadowColor: '#7A171D', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' } : {}}
        >
          {isLocked ? <Lock size={16} color="#94a3b8" /> : <Power size={16} color={isOnline ? "#FFFFFF" : "#94a3b8"} />}
          <Text className={`text-sm ${isOnline ? 'text-white font-black' : 'text-slate-400 font-bold'}`}>
            {isLocked ? "Terkunci" : "Online"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ========================================================= */}
      {/* SECTION 2: RADAR & CURRENT ACTIVITY                       */}
      {/* ========================================================= */}
      <View className="mb-8">
        {isOnline ? (
          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={() => router.push("/(tabs)/radar")}
            className="bg-white rounded-[2rem] p-6 items-center border border-white"
            style={{ elevation: 15, shadowColor: '#9A242B', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20 }}
          >
            <View className="w-20 h-20 bg-[#7A171D]/10 rounded-full items-center justify-center mb-5" style={{ borderWidth: 1, borderColor: 'rgba(122,23,29,0.2)' }}>
              <View className="w-14 h-14 bg-white rounded-full items-center justify-center" style={{ elevation: 8, shadowColor: '#7A171D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}>
                <Navigation color="#7A171D" size={28} />
              </View>
            </View>
            <Text className="text-2xl font-black text-slate-900 mb-1 tracking-tight">Mencari Order...</Text>
            <Text className="text-sm font-bold text-slate-500">Ketuk untuk membuka Radar Penuh.</Text>
          </TouchableOpacity>
        ) : (
          <View className="bg-white rounded-[2rem] p-6 items-center border border-slate-100" style={{ elevation: 3, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 }}>
            <View className="w-16 h-16 bg-slate-50 rounded-full items-center justify-center mb-4 border border-slate-200">
              <Power color="#94a3b8" size={24} />
            </View>
            <Text className="text-lg font-black text-slate-800 mb-1 tracking-tight">Anda Sedang Offline</Text>
            <Text className="text-xs font-bold text-slate-500 text-center px-4">
              {isLocked ? "Selesaikan pendaftaran untuk menerima order." : "Geser tombol ke Online untuk mulai menerima penawaran order."}
            </Text>
          </View>
        )}
      </View>

      {/* ========================================================= */}
      {/* SECTION 3: DOMPET & PENDAPATAN (GOJEK/GRAB STYLE)           */}
      {/* ========================================================= */}
      <View 
        className="bg-[#9A242B] rounded-[2rem] p-6 mb-8 relative overflow-hidden"
        style={{ elevation: 10, shadowColor: '#7A171D', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 }}
      >
        {/* Dekorasi simpel lingkaran */}
        <View className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
        <View className="absolute right-12 top-12 w-16 h-16 bg-white/5 rounded-full" />
        
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-white/80 text-[11px] font-black uppercase tracking-widest mb-1">Saldo Anda</Text>
            <View className="flex-row items-end gap-1">
              <Text className="text-white/70 text-lg font-bold mb-1">Rp</Text>
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
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/wallet')}
            className="flex-1 bg-white py-3.5 rounded-[1.25rem] items-center"
            style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}
          >
            <Text className="text-[#9A242B] text-sm font-black tracking-wide">Tarik Dana</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/wallet')}
            className="flex-1 bg-[#7A171D] py-3.5 rounded-[1.25rem] items-center border border-[#5A0E13]"
          >
            <Text className="text-white text-sm font-bold tracking-wide">Riwayat</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ========================================================= */}
      {/* SECTION 4: METRIK HARI INI                                */}
      {/* ========================================================= */}
      <View className="mb-8">
        <Text className="text-sm font-black text-slate-800 tracking-tight mb-3 px-2">Ringkasan Hari Ini</Text>
        
        <View className="flex-row gap-4">
          <View className="flex-1 bg-white p-5 rounded-[2rem] border border-slate-100" style={{ elevation: 4, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 }}>
            <View className="w-12 h-12 rounded-2xl bg-blue-50 items-center justify-center mb-4">
              <Package color="#2563eb" size={24} />
            </View>
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pesanan Selesai</Text>
            <Text className="text-3xl font-black text-slate-900 mt-1 tracking-tight">
              {isLoadingHistory ? "-" : todayCount} <Text className="text-sm font-bold text-slate-400">Order</Text>
            </Text>
          </View>
          
          <View className="flex-1 bg-white p-5 rounded-[2rem] border border-slate-100" style={{ elevation: 4, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 }}>
            <View className="w-12 h-12 rounded-2xl bg-emerald-50 items-center justify-center mb-4">
              <TrendingUp color="#10b981" size={24} />
            </View>
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tingkat Sukses</Text>
            <Text className="text-3xl font-black text-slate-900 mt-1 tracking-tight">
              100<Text className="text-sm font-bold text-slate-400">%</Text>
            </Text>
          </View>
        </View>
      </View>

      {/* ========================================================= */}
      {/* SECTION 5: RIWAYAT TERBARU                                */}
      {/* ========================================================= */}
      <View className="mb-8">
        <View className="flex-row items-center justify-between mb-3 px-2 mt-4">
          <View className="flex-row items-center gap-2">
            <History color="#7A171D" size={16} />
            <Text className="text-sm font-black text-slate-800 tracking-tight">Riwayat Terakhir</Text>
          </View>
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => router.push("/(tabs)/orders")}
            className="bg-[#7A171D]/10 px-3 py-1.5 rounded-full"
          >
            <Text className="text-[10px] font-black uppercase tracking-widest text-[#7A171D]">Lihat Semua</Text>
          </TouchableOpacity>
        </View>

        <View className="space-y-3">
          {isLoadingHistory ? (
            <View className="glass-card bg-white/60 p-6 rounded-[1.5rem] items-center border border-white">
              <Text className="text-xs font-bold text-slate-400">Menarik riwayat...</Text>
            </View>
          ) : recentOrders.length === 0 ? (
            <View className="glass-card bg-white/40 p-8 rounded-[1.5rem] items-center border-dashed border-2 border-slate-200">
              <Text className="text-xs font-bold text-slate-500">Belum ada riwayat.</Text>
            </View>
          ) : (
            recentOrders.map((order, idx) => {
              const destObj = order.destinations && order.destinations.length > 0 ? order.destinations[0] : null;
              const destAddr = destObj?.address || order.destination || "Alamat tidak diketahui";
              const earned = order.finalGrandTotal || order.breakdown?.grandTotal || order.totalCost || 0;
              
              let dateStr = "Hari ini";
              const tsMillis = getSafeMillis(order.updatedAt || order.createdAt);
              if (tsMillis > 0) {
                dateStr = new Date(tsMillis).toLocaleDateString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
              }

              return (
                <TouchableOpacity 
                  key={order.id} 
                  activeOpacity={0.8}
                  onPress={() => router.push(`/awb/${order.id}`)}
                  className="bg-white p-5 rounded-[1.5rem] flex-row items-center gap-4 border border-slate-100 mb-3"
                  style={{ elevation: 3, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5 }}
                >
                  <View className="bg-emerald-50 w-12 h-12 rounded-2xl items-center justify-center">
                    <CheckCircle2 color="#10b981" size={24} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-black text-slate-800 mb-1 tracking-tight" numberOfLines={1}>{destAddr}</Text>
                    <View className="flex-row items-center gap-2">
                      <View className="bg-slate-100 px-2 py-0.5 rounded-md">
                        <Text className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">#{order.id.substring(0,6)}</Text>
                      </View>
                      <View className="w-1 h-1 bg-slate-300 rounded-full" />
                      <View className="flex-row items-center gap-1">
                        <Clock color="#64748b" size={12} />
                        <Text className="text-[11px] text-slate-500 font-bold">{dateStr}</Text>
                      </View>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-base font-black text-emerald-600 tracking-tight">+{formatRupiah(earned)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </View>

    </View>
  );
}
