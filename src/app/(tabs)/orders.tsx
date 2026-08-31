import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { OrderDetail } from "@/types/order";
import { CheckCircle2, Clock, Package, Truck, AlertTriangle, History } from "lucide-react-native";

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
      >
        <TouchableOpacity
          activeOpacity={0.8}
          // onPress={() => router.push(`/(tabs)/awb/${order.id}`)} // Placeholder AWB
          className={`glass-card p-4 rounded-[1.5rem] flex-col gap-3 relative overflow-hidden border ${isActive ? "border-emerald-200/50 bg-white" : "border-slate-100 bg-white"}`}
          style={isActive ? {
            shadowColor: '#10b981',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 5
          } : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 5,
            elevation: 1
          }}
        >
          {isActive && (
            <View className="absolute top-0 right-0 w-24 h-24 bg-emerald-400/10 rounded-full" />
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

          <View className="flex-row gap-3 relative z-10 mt-2">
            <View className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              isActive ? "bg-emerald-50 border-emerald-100" : 
              isSuccess ? "bg-blue-50 border-blue-100" : 
              isFailed ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-100"
            }`}>
              {isActive ? <Truck size={20} color="#059669" /> : 
               isSuccess ? <CheckCircle2 size={20} color="#2563eb" /> : 
               isFailed ? <AlertTriangle size={20} color="#dc2626" /> : 
               <Package size={20} color="#475569" />}
            </View>
            
            <View className="flex-1 overflow-hidden">
               <Text className="text-xs font-black text-slate-800 leading-snug tracking-tight mb-1" numberOfLines={2}>{destAddr}</Text>
               <Text className="text-sm font-black text-emerald-600 tracking-tight">{formatRupiah(earned)}</Text>
            </View>
          </View>
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
        
        {/* TAB SWITCHER */}
        <View className="bg-slate-100/80 p-1.5 rounded-[1.25rem] flex-row items-center mb-6 border border-slate-200">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab("Active")}
            className={`flex-1 py-3 items-center rounded-xl ${
              activeTab === "Active" ? "bg-white border border-slate-100" : ""
            }`}
            style={activeTab === "Active" ? { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 } : {}}
          >
            <Text className={`text-xs font-black ${
              activeTab === "Active" ? "text-slate-900" : "text-slate-400"
            }`}>
              Sedang Berjalan
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab("History")}
            className={`flex-1 py-3 items-center rounded-xl ${
              activeTab === "History" ? "bg-white border border-slate-100" : ""
            }`}
            style={activeTab === "History" ? { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 } : {}}
          >
            <Text className={`text-xs font-black ${
              activeTab === "History" ? "text-slate-900" : "text-slate-400"
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
