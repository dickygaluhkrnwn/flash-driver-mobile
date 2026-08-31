import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { OrderDetail } from "@/types/order";
import { CheckCircle2, Clock, Package, Truck, AlertTriangle, History } from "lucide-react-native";
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

export default function DriverOrdersPage() {
  const router = useRouter();
  const { user, isHydrated, isVendor } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<"Active" | "History">("Active");
  const [activeOrders, setActiveOrders] = useState<OrderDetail[]>([]);
  const [historyOrders, setHistoryOrders] = useState<OrderDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      <View 
        key={order.id} 
        style={isActive ? {
          elevation: 10,
          shadowColor: '#10b981',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 10
        } : {
          elevation: 3,
          shadowColor: '#94a3b8',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 5
        }}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          // onPress={() => router.push(`/(tabs)/awb/${order.id}`)} // Placeholder AWB
          className={`rounded-[1.5rem] flex-col overflow-hidden border ${isActive ? "border-emerald-300 bg-white" : "border-slate-200 bg-white"}`}
        >
          <LinearGradient
            colors={isActive ? ['#ecfdf5', '#d1fae5'] : ['#ffffff', '#f8fafc']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            className="p-5 gap-3"
            style={isActive ? { borderTopWidth: 2, borderTopColor: 'rgba(255,255,255,0.8)' } : { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,1)' }}
          >
          {isActive && (
            <View className="absolute top-0 right-0 w-24 h-24 bg-emerald-400/20 rounded-full blur-md" />
          )}

          <View className="flex-row justify-between items-center relative z-10">
            <View className="flex-row items-center gap-2">
              <View className={`px-2.5 py-1 rounded-md ${
                isActive ? "bg-emerald-100" : 
                isSuccess ? "bg-blue-50" : 
                isFailed ? "bg-red-50" : "bg-slate-100"
              }`}>
                <Text className={`text-[9px] font-black uppercase tracking-widest ${
                  isActive ? "text-emerald-700" : 
                  isSuccess ? "text-blue-600" : 
                  isFailed ? "text-red-600" : "text-slate-600"
                }`}>
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

          <View className="flex-row gap-4 relative z-10 mt-3">
            <View className={`w-12 h-12 rounded-[1.25rem] flex items-center justify-center shrink-0 border-2 ${
              isActive ? "bg-emerald-100 border-emerald-200" : 
              isSuccess ? "bg-blue-50 border-blue-100" : 
              isFailed ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-200"
            }`} style={isActive ? { elevation: 5, shadowColor: '#10b981', shadowOpacity: 0.2, shadowRadius: 5 } : {}}>
              {isActive ? <Truck size={24} color="#059669" /> : 
               isSuccess ? <CheckCircle2 size={24} color="#2563eb" /> : 
               isFailed ? <AlertTriangle size={24} color="#dc2626" /> : 
               <Package size={24} color="#475569" />}
            </View>
            
            <View className="flex-1 overflow-hidden">
               <Text className="text-sm font-black text-slate-800 leading-snug tracking-tight mb-1" numberOfLines={2}>{destAddr}</Text>
               <Text className="text-lg font-black text-emerald-600 tracking-tight">{formatRupiah(earned)}</Text>
            </View>
          </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  if (isVendor()) {
    return null; // Akan dialihkan ke Fleet
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView 
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        
        {/* TAB SWITCHER (GEN-Z CAPSULE) */}
        <View 
          className="bg-slate-200 p-1.5 rounded-[2.5rem] flex-row items-center mb-6"
          style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, borderWidth: 1, borderColor: '#cbd5e1' }}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab("Active")}
            className={`flex-1 py-4 items-center justify-center rounded-[2rem] ${
              activeTab === "Active" ? "bg-[#7A171D] border-2 border-[#5A0E13]" : "bg-transparent border-2 border-transparent"
            }`}
            style={activeTab === "Active" ? { elevation: 8, shadowColor: '#7A171D', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' } : {}}
          >
            <Text className={`text-sm font-black ${
              activeTab === "Active" ? "text-white" : "text-slate-500"
            }`}>
              Sedang Berjalan
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab("History")}
            className={`flex-1 py-4 items-center justify-center rounded-[2rem] ${
              activeTab === "History" ? "bg-white border-2 border-slate-300" : "bg-transparent border-2 border-transparent"
            }`}
            style={activeTab === "History" ? { elevation: 8, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 8, borderTopWidth: 1, borderTopColor: '#ffffff' } : {}}
          >
            <Text className={`text-sm font-black ${
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
                <View 
                  className="glass-card p-10 rounded-[2rem] items-center justify-center border-dashed border-2 border-slate-200 mt-10"
                >
                  <Truck size={48} color="#cbd5e1" className="mb-3" />
                  <Text className="text-sm font-black text-slate-800 tracking-tight mt-3">Tidak Ada Order Aktif</Text>
                  <Text className="text-xs font-medium text-slate-500 mt-1">Buka Radar untuk mencari order baru.</Text>
                </View>
              ) : (
                activeOrders.map((order, idx) => renderOrderCard(order, idx, true))
              )
            )}

            {activeTab === "History" && (
              historyOrders.length === 0 ? (
                <View 
                  className="glass-card p-10 rounded-[2rem] items-center justify-center border-dashed border-2 border-slate-200 mt-10"
                >
                  <History size={48} color="#cbd5e1" className="mb-3" />
                  <Text className="text-sm font-black text-slate-800 tracking-tight mt-3">Riwayat Kosong</Text>
                  <Text className="text-xs font-medium text-slate-500 mt-1">Anda belum menyelesaikan order apapun.</Text>
                </View>
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
