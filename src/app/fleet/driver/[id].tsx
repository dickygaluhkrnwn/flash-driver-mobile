import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft, MapPin, Package, Calendar, Phone, CreditCard } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { OrderDetail } from "@/types/order";

const { width } = Dimensions.get("window");

interface FleetDriver {
  id: string;
  name: string;
  phone: string;
  status: string;
  fotoProfileUrl?: string;
  fotoKtpUrl?: string;
  fotoSimUrl?: string;
  simNumber: string;
  nik: string;
}

const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

const getSafeMillis = (ts: unknown): number => {
  if (!ts) return 0;
  if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts).getTime();
  if (typeof ts === 'object' && ts !== null) {
    const obj = ts as Record<string, unknown>;
    if (typeof obj.toMillis === 'function') return (obj.toMillis as () => number)();
    if (typeof obj.seconds === 'number') return obj.seconds * 1000;
    if (typeof obj.toDate === 'function') return (obj.toDate as () => Date)().getTime();
  }
  return new Date(String(ts)).getTime();
};

export default function DriverDetailPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [driver, setDriver] = useState<FleetDriver | null>(null);
  const [historyOrders, setHistoryOrders] = useState<OrderDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDriverData = async () => {
      if (!id || typeof id !== "string") return;
      try {
        // Fetch Driver Details
        const driverDoc = await getDoc(doc(db, "driver_wallets", id));
        if (driverDoc.exists()) {
          setDriver({ id: driverDoc.id, ...driverDoc.data() } as FleetDriver);
        } else {
          Alert.alert("Error", "Data driver tidak ditemukan");
          router.back();
          return;
        }

        // Fetch History
        const q = query(
          collection(db, "orders"),
          where("driverId", "==", id),
          where("status", "in", ["Delivered", "Canceled", "Returned"])
        );
        const orderSnap = await getDocs(q);
        const orders = orderSnap.docs.map(d => ({ id: d.id, ...d.data() })) as OrderDetail[];
        
        // Sort manually by timestamp (descending)
        orders.sort((a, b) => getSafeMillis(b.createdAt) - getSafeMillis(a.createdAt));
        
        setHistoryOrders(orders);
      } catch (error) {
        console.error("Error fetching driver details:", error);
        Alert.alert("Error", "Gagal mengambil detail driver");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDriverData();
  }, [id]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#7A171D" />
      </View>
    );
  }

  if (!driver) return null;

  return (
    <View className="flex-1 bg-slate-50">
      <View className="relative overflow-hidden">
        <LinearGradient
          colors={['#450a0a', '#7a171d']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ paddingTop: 56, paddingBottom: 28, paddingHorizontal: 20 }}
        >
          <View className="absolute -right-10 -top-10 w-48 h-48 bg-white/5 rounded-full" />
          <View className="flex-row items-center gap-4 relative z-10 mb-4">
            <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-white/20 rounded-full items-center justify-center border border-white/20">
              <ArrowLeft size={20} color="#FFF" />
            </TouchableOpacity>
            <View>
              <Text className="text-xl font-bold text-white tracking-tight">Detail Karyawan</Text>
              <Text className="text-xs font-semibold text-red-200">Riwayat & Dokumen</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Profile Card */}
        <Animated.View entering={FadeInDown.duration(400)} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm mt-5 mb-6">
          <View className="flex-row gap-4 items-center mb-4">
            <View className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 border border-slate-200">
              {driver.fotoProfileUrl ? (
                <Image source={{ uri: driver.fotoProfileUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <View className="flex-1 items-center justify-center bg-slate-100">
                  <Text className="text-xl font-bold text-slate-400">{driver.name?.charAt(0).toUpperCase()}</Text>
                </View>
              )}
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-slate-800">{driver.name}</Text>
              <View className="flex-row items-center gap-1.5 mt-1">
                <Phone size={14} color="#64748b" />
                <Text className="text-sm font-medium text-slate-500">{driver.phone}</Text>
              </View>
              <View className="flex-row items-center gap-1.5 mt-1">
                <CreditCard size={14} color="#64748b" />
                <Text className="text-sm font-medium text-slate-500">NIK: {driver.nik || '-'}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Documents */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)} className="mb-6">
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Dokumen Karyawan</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible">
            {driver.fotoKtpUrl && (
              <View className="mr-4">
                <Text className="text-[10px] font-semibold text-slate-500 mb-1">Foto KTP</Text>
                <Image source={{ uri: driver.fotoKtpUrl }} style={{ width: 140, height: 90, borderRadius: 12, backgroundColor: '#f8fafc' }} contentFit="cover" />
              </View>
            )}
            {driver.fotoSimUrl && (
              <View className="mr-4">
                <Text className="text-[10px] font-semibold text-slate-500 mb-1">Foto SIM</Text>
                <Image source={{ uri: driver.fotoSimUrl }} style={{ width: 140, height: 90, borderRadius: 12, backgroundColor: '#f8fafc' }} contentFit="cover" />
              </View>
            )}
          </ScrollView>
        </Animated.View>

        {/* History */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Riwayat Pengiriman</Text>
          {historyOrders.length === 0 ? (
            <View className="bg-slate-100 rounded-2xl p-6 items-center border border-slate-200">
              <Package size={24} color="#94a3b8" />
              <Text className="text-sm font-semibold text-slate-400 mt-2">Belum ada riwayat pengiriman.</Text>
            </View>
          ) : (
            historyOrders.map((order) => (
              <View key={order.id} className="bg-white border border-slate-100 rounded-2xl p-4 mb-3 shadow-sm">
                <View className="flex-row justify-between items-center mb-3 pb-3 border-b border-slate-50">
                  <Text className="text-xs font-bold font-mono text-slate-500">#{order.resi || order.id.substring(0, 8)}</Text>
                  <View className={`px-2 py-0.5 rounded ${order.status === 'Selesai' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    <Text className={`text-[10px] font-bold ${order.status === 'Selesai' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {order.status === 'Selesai' ? 'SELESAI' : 'GAGAL'}
                    </Text>
                  </View>
                </View>
                <View className="flex-row gap-2 mb-2">
                  <MapPin size={16} color="#64748b" />
                  <View className="flex-1">
                    <Text className="text-xs font-semibold text-slate-700">{order.destinations?.[0]?.receiverName || order.senderName || 'Penerima tidak diketahui'}</Text>
                    <Text className="text-[11px] text-slate-500" numberOfLines={1}>{order.destinations?.[0]?.address || order.destination || 'Alamat tidak diketahui'}</Text>
                  </View>
                </View>
                <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-slate-50">
                  <Text className="text-[10px] font-medium text-slate-400">
                    {order.createdAt ? new Date(getSafeMillis(order.createdAt)).toLocaleString('id-ID') : '-'}
                  </Text>
                  <Text className="text-xs font-bold text-emerald-600">{formatRupiah(order.finalGrandTotal || order.totalCost || 0)}</Text>
                </View>
              </View>
            ))
          )}
        </Animated.View>

      </ScrollView>
    </View>
  );
}
