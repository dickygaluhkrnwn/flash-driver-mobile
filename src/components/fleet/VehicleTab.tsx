import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Modal, Alert, ActivityIndicator, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { 
  Truck, Plus, X, UserSquare2, 
  Trash2, Edit2, History, MapPin, Package
} from "lucide-react-native";
import { collection, query, where, deleteDoc, doc, onSnapshot, getDocs, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { OrderDetail } from "@/types/order";

// ==========================================
// UTILS
// ==========================================
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

export default function VehicleTab() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [availableDriversCount, setAvailableDriversCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);



  // 🔄 REAL-TIME LISTENER — kendaraan + sopir (sama persis dengan web)
  useEffect(() => {
    if (!user) return;
    setIsLoading(true);

    // Real-time sopir tersedia (untuk info counter di UI)
    const dQuery = query(
      collection(db, "driver_wallets"),
      where("partnerType", "==", "FleetDriver"),
      where("vendorId", "==", user.uid)
    );
    const unsubDrivers = onSnapshot(dQuery, (snap) => {
      setAvailableDriversCount(snap.docs.length);
    });

    // Real-time kendaraan
    const vQuery = query(
      collection(db, "driver_wallets"),
      where("partnerType", "==", "FleetVehicle"),
      where("vendorId", "==", user.uid)
    );
    const unsubVehicles = onSnapshot(vQuery, (snap) => {
      const vData = snap.docs.map(d => ({ id: d.id, ...d.data() })) as FleetVehicle[];
      setVehicles(vData);
      setIsLoading(false);
    }, (error) => {
      console.error(error);
      Alert.alert("Error", "Gagal menyinkronkan data truk.");
      setIsLoading(false);
    });

    return () => {
      unsubDrivers();
      unsubVehicles();
    };
  }, [user]);

  const handleOpenAdd = () => {
    if (availableDriversCount === 0) {
      Alert.alert(
        "Belum Ada Sopir",
        "Harap daftarkan minimal 1 sopir sebelum menambah armada truk.",
        [{ text: "OK" }]
      );
      return;
    }
    router.push("/fleet/vehicle-form?mode=add");
  };

  const handleOpenEdit = (vehicle: FleetVehicle) => {
    router.push({ pathname: "/fleet/vehicle-form", params: { mode: "edit", id: vehicle.id } });
  };

  const handleDeleteVehicle = async (id: string, plate: string) => {
    Alert.alert(
      "Hapus Armada",
      `Yakin ingin menghapus Armada "${plate}" dari sistem?`,
      [
        { text: "Batal", style: "cancel" },
        { 
          text: "Hapus", 
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "driver_wallets", id));
              Alert.alert("Sukses", `Data armada ${plate} berhasil dihapus.`);
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Gagal menghapus data. Periksa koneksi Anda.");
            }
          }
        }
      ]
    );
  };

  // 🚀 NAVIGASI KE HALAMAN DETAIL KENDARAAN
  const handleOpenHistory = (vehicle: FleetVehicle) => {
    router.push(`/fleet/vehicle/${vehicle.id}` as any);
  };

  return (
    <View className="flex-1 space-y-4">
      
      {/* HEADER BAR */}
      <View className="flex-row items-center justify-between mt-2 mb-2">
        <View className="flex-row items-center gap-2">
          <Truck size={16} color="#2563eb" />
          <Text className="text-sm font-black text-slate-800 uppercase tracking-widest">Daftar Truk Fisik</Text>
        </View>
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={handleOpenAdd}
          className="relative"
        >
          <View className="absolute inset-0 bg-blue-800 rounded-full translate-y-0.5" />
          <View className="bg-blue-600 px-4 py-2.5 rounded-full flex-row items-center gap-1.5 relative z-10 border border-blue-700">
            <Plus size={14} color="#FFFFFF" strokeWidth={3} />
            <Text className="text-[10px] text-white uppercase tracking-widest font-black">Tambah Truk</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Info: jumlah sopir tersedia */}
      {availableDriversCount > 0 && (
        <View className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-2.5 flex-row items-center gap-2">
          <UserSquare2 size={14} color="#2563eb" />
          <Text className="text-[10px] font-black text-blue-700 uppercase tracking-widest">
            {availableDriversCount} sopir tersedia untuk ditugaskan
          </Text>
        </View>
      )}

      <View style={{ paddingBottom: 20 }}>
        {isLoading ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">Memuat Data Armada...</Text>
          </View>
        ) : vehicles.length === 0 ? (
          <View className="bg-blue-50/50 border border-blue-100 rounded-[2rem] p-8 items-center shadow-sm">
            <View className="w-16 h-16 bg-blue-100 rounded-[1.25rem] items-center justify-center mb-4 border border-white shadow-sm">
              <Truck size={32} color="#60a5fa" />
            </View>
            <Text className="text-sm font-black text-slate-800 tracking-tight text-center">Belum Ada Truk Terdaftar</Text>
            <Text className="text-xs font-medium text-slate-500 mt-1 text-center mb-6 px-4">Daftarkan armada fisik Anda beserta kelengkapan dokumen STNK dan KIR.</Text>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={handleOpenAdd}
              className="w-full relative mt-2"
            >
              <View className="absolute inset-0 bg-blue-800 rounded-[1.25rem] translate-y-1" />
              <View className="bg-blue-600 rounded-[1.25rem] h-14 items-center justify-center border border-blue-700 relative z-10 flex-row gap-2">
                <Truck size={18} color="#FFF" />
                <Text className="text-white font-black uppercase tracking-widest">Daftarkan Truk Sekarang</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="space-y-4">
            {vehicles.map((vehicle, idx) => (
              <Animated.View 
                key={vehicle.id} 
                entering={FadeInDown.delay(idx * 50).duration(300)}
                className="bg-white p-5 rounded-[1.5rem] border border-slate-100 flex-col gap-4"
                style={{ shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 }}
              >
                <View className="flex-row items-center gap-4 w-full">
                  <View className="w-14 h-14 bg-slate-50 rounded-[1.25rem] border border-slate-200 items-center justify-center">
                    <Truck size={24} color="#94a3b8" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-black text-slate-900 text-base tracking-tight uppercase" numberOfLines={1}>{vehicle.licensePlate}</Text>
                    <Text className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1.5">{vehicle.vehicleType}</Text>
                    <View className="flex-row items-center gap-1.5 bg-blue-50 border border-blue-100 px-2 py-1 rounded-md self-start">
                      <UserSquare2 size={12} color="#2563eb" />
                      <Text className="text-[10px] font-bold text-blue-800" numberOfLines={1}>{vehicle.driverName}</Text>
                    </View>
                  </View>
                </View>

                <View className="flex-row items-center justify-between w-full pt-4 border-t border-slate-100">
                  {vehicle.status === "Active" ? (
                    <View className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-md shadow-sm">
                      <Text className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Aktif Mengaspal</Text>
                    </View>
                  ) : (
                    <View className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-md shadow-sm">
                      <Text className="text-[9px] font-black uppercase tracking-widest text-amber-600">Menunggu Verifikasi</Text>
                    </View>
                  )}
                  
                  <View className="flex-row gap-2">
                    <TouchableOpacity onPress={() => handleOpenHistory(vehicle)} className="w-9 h-9 items-center justify-center bg-slate-50 rounded-xl border border-slate-200 shadow-sm" accessibilityLabel="Riwayat Order Armada">
                      <History size={16} color="#64748b" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleOpenEdit(vehicle)} className="w-9 h-9 items-center justify-center bg-blue-50 rounded-xl border border-blue-200 shadow-sm" accessibilityLabel="Edit Data">
                      <Edit2 size={16} color="#3b82f6" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteVehicle(vehicle.id, vehicle.licensePlate)} className="w-9 h-9 items-center justify-center bg-red-50 rounded-xl border border-red-200 shadow-sm" accessibilityLabel="Hapus Armada">
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            ))}
          </View>
        )}
      </View>

    </View>
  );
}
