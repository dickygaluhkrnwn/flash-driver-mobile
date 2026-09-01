import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft, MapPin, Package, Truck, Calendar } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { OrderDetail } from "@/types/order";

const { width } = Dimensions.get("window");

interface FleetVehicle {
  id: string;
  name: string;
  licensePlate: string;
  vehicleType: string;
  driverName: string;
  driverId: string;
  status: string;
  stnkUrl?: string;
  kirUrl?: string;
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

export default function VehicleDetailPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [vehicle, setVehicle] = useState<FleetVehicle | null>(null);
  const [historyOrders, setHistoryOrders] = useState<OrderDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVehicleData = async () => {
      if (!id || typeof id !== "string") return;
      try {
        // Fetch Vehicle Details
        const vehicleDoc = await getDoc(doc(db, "vehicles", id));
        if (vehicleDoc.exists()) {
          setVehicle({ id: vehicleDoc.id, ...vehicleDoc.data() } as FleetVehicle);
        } else {
          Alert.alert("Error", "Data kendaraan tidak ditemukan");
          router.back();
          return;
        }

        // Fetch History
        const q = query(
          collection(db, "orders"),
          where("vehicleId", "==", id),
          where("status", "in", ["Delivered", "Canceled", "Returned"])
        );
        const orderSnap = await getDocs(q);
        const orders = orderSnap.docs.map(d => ({ id: d.id, ...d.data() })) as OrderDetail[];
        
        // Sort manually
        orders.sort((a, b) => getSafeMillis(b.createdAt) - getSafeMillis(a.createdAt));
        
        setHistoryOrders(orders);
      } catch (error) {
        console.error("Error fetching vehicle details:", error);
        Alert.alert("Error", "Gagal mengambil detail kendaraan");
      } finally {
        setIsLoading(false);
      }
    };

    fetchVehicleData();
  }, [id]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#7A171D" />
      </View>
    );
  }

  if (!vehicle) return null;

  return (
    <View className="flex-1 bg-slate-50">
      <View className="relative overflow-hidden">
        <LinearGradient
          colors={['#0f172a', '#334155']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ paddingTop: 56, paddingBottom: 28, paddingHorizontal: 20 }}
        >
          <View className="absolute -right-10 -top-10 w-48 h-48 bg-white/5 rounded-full" />
          <View className="flex-row items-center gap-4 relative z-10 mb-4">
            <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-white/20 rounded-full items-center justify-center border border-white/20">
              <ArrowLeft size={20} color="#FFF" />
            </TouchableOpacity>
            <View>
              <Text className="text-xl font-bold text-white tracking-tight">Detail Kendaraan</Text>
              <Text className="text-xs font-semibold text-slate-300">Riwayat & Dokumen Fisik</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Info Card */}
        <Animated.View entering={FadeInDown.duration(400)} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm mt-5 mb-6">
          <View className="flex-row justify-between items-start mb-4">
            <View>
              <Text className="text-lg font-bold text-slate-800">{vehicle.name}</Text>
              <View className="bg-slate-100 px-2 py-1 rounded mt-1 self-start">
                <Text className="text-xs font-bold font-mono text-slate-700">{vehicle.licensePlate}</Text>
              </View>
            </View>
            <View className={`px-2 py-1 rounded ${vehicle.status === 'Active' ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-100'}`}>
              <Text className={`text-[10px] font-bold uppercase tracking-widest ${vehicle.status === 'Active' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {vehicle.status}
              </Text>
            </View>
          </View>
          
          <View className="flex-row items-center gap-2 mt-2 pt-4 border-t border-slate-50">
            <View className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center border border-blue-100">
              <Truck size={14} color="#3b82f6" />
            </View>
            <View>
              <Text className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Sopir Ditugaskan</Text>
              <Text className="text-sm font-semibold text-slate-700">{vehicle.driverName || 'Belum Ada Sopir'}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Documents */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)} className="mb-6">
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Dokumen Fisik</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible">
            {vehicle.stnkUrl && (
              <View className="mr-4">
                <Text className="text-[10px] font-semibold text-slate-500 mb-1">Foto STNK</Text>
                <Image source={{ uri: vehicle.stnkUrl }} style={{ width: 140, height: 90, borderRadius: 12, backgroundColor: '#f8fafc' }} contentFit="cover" />
              </View>
            )}
            {vehicle.kirUrl && (
              <View className="mr-4">
                <Text className="text-[10px] font-semibold text-slate-500 mb-1">Buku KIR</Text>
                <Image source={{ uri: vehicle.kirUrl }} style={{ width: 140, height: 90, borderRadius: 12, backgroundColor: '#f8fafc' }} contentFit="cover" />
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
              <Text className="text-sm font-semibold text-slate-400 mt-2">Belum ada riwayat pengiriman kendaraan ini.</Text>
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
