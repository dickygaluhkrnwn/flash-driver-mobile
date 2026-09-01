import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { useUIStore } from "@/store/useUIStore";
import { OrderDetail } from "@/types/order";
import { CheckCircle2, Clock, Package, Truck, AlertTriangle, History } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";

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

export default function DriverOrdersPage() {
  const router = useRouter();
  const { user, isHydrated, isVendor } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<"Active" | "History">("Active");
  const [activeOrders, setActiveOrders] = useState<OrderDetail[]>([]);
  const [historyOrders, setHistoryOrders] = useState<OrderDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Scroll state for Header auto-hide
  const setHeaderVisible = useUIStore(s => s.setHeaderVisible);
  const lastScrollY = React.useRef(0);

  useFocusEffect(
    useCallback(() => {
      setHeaderVisible(true);
    }, [setHeaderVisible])
  );

  const handleScroll = (event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    if (currentScrollY <= 0) {
      setHeaderVisible(true);
    } else if (currentScrollY > lastScrollY.current + 5) {
      setHeaderVisible(false); // scroll down
    } else if (currentScrollY < lastScrollY.current - 5) {
      setHeaderVisible(true); // scroll up
    }
    lastScrollY.current = currentScrollY;
  };

  // Jika user adalah vendor, arahkan ke fleet atau tampilkan pesan bahwa halaman ini untuk Mandiri
  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      router.replace("/(auth)/login");
      return;
    }
    if (isVendor()) {
      router.replace("/(tabs)/fleet");
    }
  }, [user, isHydrated, isVendor, router]);

  useEffect(() => {
    if (!user || isVendor()) return;

    const qAll = query(
      collection(db, "orders"),
      where("driverId", "==", user.uid)
    );

    const unsub = onSnapshot(qAll, (snap) => {
      const allData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrderDetail));
      
      const activeStatuses = ["Menuju Lokasi Jemput", "Sedang Diproses", "Dikirim"];
      
      const active = allData.filter(o => activeStatuses.includes(o.status));
      const history = allData.filter(o => o.status === "Selesai" || o.status === "Batal" || o.status === "Gagal");

      active.sort((a, b) => getSafeMillis(b.updatedAt || b.createdAt) - getSafeMillis(a.updatedAt || a.createdAt));
      history.sort((a, b) => getSafeMillis(b.updatedAt || b.createdAt) - getSafeMillis(a.updatedAt || a.createdAt));

      setActiveOrders(active);
      setHistoryOrders(history);
      setIsLoading(false);
    });

    return () => unsub();
  }, [user, isVendor]);

  const renderOrderCard = (order: OrderDetail, idx: number, isActive: boolean) => {
    const destObj = order.destinations && order.destinations.length > 0 ? order.destinations[0] : null;
    const destAddr = destObj?.address || order.destination || "Alamat tidak diketahui";
    const earned = order.finalGrandTotal || order.breakdown?.grandTotal || order.totalCost || 0;
    
    let dateStr = "-";
    const tsMillis = getSafeMillis(order.updatedAt || order.createdAt);
    if (tsMillis > 0) {
      dateStr = new Date(tsMillis).toLocaleDateString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    }

    const isSuccess = order.status === "Selesai";
    const isFailed = order.status === "Batal" || order.status === "Gagal";

    return (
      <Animated.View 
        key={order.id} 
        entering={FadeInDown.delay(idx * 100).springify()}
        style={{ marginBottom: isActive ? 16 : 12 }}
      >
        {isActive ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push(`/awb/${order.id}`)}
            className="rounded-2xl flex-col bg-white overflow-hidden border border-emerald-100 border-l-[6px] border-l-emerald-500"
            style={{
              elevation: 6,
              shadowColor: '#10b981',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 8
            }}
          >
            <View className="p-4 gap-3 relative">
              <View className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full" />
              
              <View className="flex-row justify-between items-center relative z-10">
                <View className="flex-row items-center gap-2">
                  <View className="px-2.5 py-1 rounded-md bg-emerald-100">
                    <Text className="text-[9px] font-black uppercase tracking-widest text-emerald-700">
                      {order.status}
                    </Text>
                  </View>
                  <View className="bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                    <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">#{order.id.substring(0,8)}</Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-1">
                  <Clock size={12} color="#64748b" />
                  <Text className="text-[10px] text-slate-500 font-bold">{dateStr}</Text>
                </View>
              </View>

              <View className="flex-row gap-3 relative z-10 mt-2">
                <View className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-emerald-50">
                  <Truck size={24} color="#059669" />
                </View>
                <View className="flex-1 justify-center">
                   <Text className="text-sm font-black text-slate-800 leading-snug tracking-tight mb-0.5" numberOfLines={2}>{destAddr}</Text>
                   <Text className="text-[15px] font-black text-emerald-600 tracking-tight">{formatRupiah(earned)}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => router.push(`/awb/${order.id}`)}
            className="bg-white p-5 rounded-[1.5rem] flex-row items-center gap-4 border border-slate-100"
            style={{
              elevation: 3,
              shadowColor: '#94a3b8',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 5
            }}
          >
            <View className={`w-12 h-12 rounded-2xl items-center justify-center ${
              isSuccess ? 'bg-emerald-50' : 'bg-red-50'
            }`}>
              {isSuccess ? <CheckCircle2 color="#10b981" size={24} /> : <AlertTriangle color="#dc2626" size={24} />}
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
              <Text className={`text-base font-black tracking-tight ${isSuccess ? 'text-emerald-600' : 'text-slate-400 line-through'}`}>
                {isSuccess ? '+' : ''}{formatRupiah(earned)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  };

  if (isVendor()) {
    return null; // Akan dialihkan ke Fleet
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView 
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 110, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        
        {/* TAB SWITCHER (GEN-Z CAPSULE) */}
        <View 
          className="bg-slate-100 p-1.5 rounded-full flex-row items-center mb-6 border border-slate-200"
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab("Active")}
            className={`flex-1 py-3.5 items-center justify-center rounded-full ${
              activeTab === "Active" ? "bg-[#7A171D]" : "bg-transparent"
            }`}
            style={activeTab === "Active" ? { elevation: 4, shadowColor: '#7A171D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 } : {}}
          >
            <Text className={`text-[13px] font-black tracking-wide ${
              activeTab === "Active" ? "text-white" : "text-slate-500"
            }`}>
              Sedang Berjalan
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab("History")}
            className={`flex-1 py-3.5 items-center justify-center rounded-full ${
              activeTab === "History" ? "bg-white" : "bg-transparent"
            }`}
            style={activeTab === "History" ? { elevation: 4, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 6 } : {}}
          >
            <Text className={`text-[13px] font-black tracking-wide ${
              activeTab === "History" ? "text-slate-800" : "text-slate-500"
            }`}>
              Riwayat Selesai
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View className="flex-col items-center justify-center py-20 opacity-50">
            <ActivityIndicator size="large" color="#7A171D" />
          </View>
        ) : (
          <View className="space-y-4">
            {activeTab === "Active" && (
              activeOrders.length === 0 ? (
                <Animated.View 
                  entering={FadeInDown.springify()}
                  className="bg-white p-10 rounded-3xl items-center justify-center border-dashed border-2 border-slate-200 mt-10"
                >
                  <View className="w-20 h-20 bg-slate-50 rounded-full items-center justify-center mb-4 border border-slate-100">
                    <Truck size={40} color="#94a3b8" />
                  </View>
                  <Text className="text-[15px] font-black text-slate-800 tracking-tight text-center">Tidak Ada Order Aktif</Text>
                  <Text className="text-xs font-medium text-slate-500 mt-1.5 text-center">Buka Radar untuk mencari order baru.</Text>
                </Animated.View>
              ) : (
                activeOrders.map((order, idx) => renderOrderCard(order, idx, true))
              )
            )}

            {activeTab === "History" && (
              historyOrders.length === 0 ? (
                <Animated.View 
                  entering={FadeInDown.springify()}
                  className="bg-white p-10 rounded-3xl items-center justify-center border-dashed border-2 border-slate-200 mt-10"
                >
                  <View className="w-20 h-20 bg-slate-50 rounded-full items-center justify-center mb-4 border border-slate-100">
                    <History size={40} color="#94a3b8" />
                  </View>
                  <Text className="text-[15px] font-black text-slate-800 tracking-tight text-center">Riwayat Kosong</Text>
                  <Text className="text-xs font-medium text-slate-500 mt-1.5 text-center">Anda belum menyelesaikan order apapun.</Text>
                </Animated.View>
              ) : (
                historyOrders.map((order, idx) => renderOrderCard(order, idx, false))
              )
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
