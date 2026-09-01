import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Modal, Alert, ActivityIndicator, ScrollView } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { 
  Users, Plus, X, User, CreditCard, 
  Trash2, Edit2, History, MapPin, Package, UserPlus
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

export default function DriverTab() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [vendorCompanyName, setVendorCompanyName] = useState("");

  // 🔄 REAL-TIME LISTENER (matches web reference)
  useEffect(() => {
    if (!user) return;
    setIsLoading(true);

    // Fetch vendor company name (sama persis dengan web)
    const fetchVendorInfo = async () => {
      try {
        const vendorSnap = await getDoc(doc(db, "users", user.uid));
        if (vendorSnap.exists()) {
          setVendorCompanyName(vendorSnap.data().companyName || vendorSnap.data().displayName || "Vendor");
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchVendorInfo();

    const q = query(
      collection(db, "driver_wallets"), 
      where("partnerType", "==", "FleetDriver"),
      where("vendorId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as FleetDriver[];
      setDrivers(data);
      setIsLoading(false);
    }, (error) => {
      console.error(error);
      Alert.alert("Error", "Gagal menyinkronkan data sopir.");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleOpenAdd = () => {
    router.push("/fleet/driver-form?mode=add");
  };

  const handleOpenEdit = (driver: FleetDriver) => {
    router.push({ pathname: "/fleet/driver-form", params: { mode: "edit", id: driver.id } });
  };

  const handleDeleteDriver = async (id: string, name: string) => {
    Alert.alert(
      "Hapus Sopir",
      `Yakin ingin menghapus data Karyawan "${name}" dari sistem?`,
      [
        { text: "Batal", style: "cancel" },
        { 
          text: "Hapus", 
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "driver_wallets", id));
              Alert.alert("Sukses", `Data sopir ${name} berhasil dihapus.`);
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Gagal menghapus data. Periksa koneksi Anda.");
            }
          }
        }
      ]
    );
  };

  // 🚀 NAVIGASI KE HALAMAN DETAIL (menggantikan Modal)
  const handleOpenHistory = (driver: FleetDriver) => {
    router.push(`/fleet/driver/${driver.id}` as any);
  };

  return (
    <View className="flex-1 space-y-4">
      
      {/* HEADER BAR */}
      <View className="flex-row items-center justify-between mt-2 mb-2">
        <View className="flex-row items-center gap-2">
          <Users size={16} color="#2563eb" />
          <Text className="text-sm font-black text-slate-800 uppercase tracking-widest">Daftar Sopir PT</Text>
        </View>
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={handleOpenAdd}
          className="relative"
        >
          <View className="absolute inset-0 bg-blue-800 rounded-full translate-y-0.5" />
          <View className="bg-blue-600 px-4 py-2.5 rounded-full flex-row items-center gap-1.5 relative z-10 border border-blue-700">
            <Plus size={14} color="#FFFFFF" strokeWidth={3} />
            <Text className="text-[10px] text-white uppercase tracking-widest font-black">Daftarkan Baru</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={{ paddingBottom: 20 }}>
        {isLoading ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">Memuat Data Sopir...</Text>
          </View>
        ) : drivers.length === 0 ? (
          <View className="bg-blue-50/50 border border-blue-100 rounded-[2rem] p-8 items-center shadow-sm">
            <View className="w-16 h-16 bg-blue-100 rounded-[1.25rem] items-center justify-center mb-4 border border-white shadow-sm">
              <Users size={32} color="#60a5fa" />
            </View>
            <Text className="text-sm font-black text-slate-800 tracking-tight text-center">Belum Ada Sopir Terdaftar</Text>
            <Text className="text-xs font-medium text-slate-500 mt-1 text-center mb-6 px-4">Tambahkan data karyawan sopir yang bekerja di bawah naungan PT Anda.</Text>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={handleOpenAdd}
              className="w-full relative mt-2"
            >
              <View className="absolute inset-0 bg-blue-800 rounded-[1.25rem] translate-y-1" />
              <View className="bg-blue-600 rounded-[1.25rem] h-14 items-center justify-center border border-blue-700 relative z-10 flex-row gap-2">
                <UserPlus size={18} color="#FFF" />
                <Text className="text-white font-black uppercase tracking-widest">Daftarkan Sopir Sekarang</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="space-y-4">
            {drivers.map((driver, idx) => (
              <Animated.View 
                key={driver.id} 
                entering={FadeInDown.delay(idx * 50).duration(300)}
                className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex-col gap-4"
                style={{ shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 }}
              >
                <View className="flex-row items-center gap-4 w-full">
                  <View className="w-14 h-14 bg-slate-50 rounded-[1.25rem] overflow-hidden border border-slate-200 items-center justify-center">
                    {driver.fotoProfileUrl ? (
                      <Image source={{ uri: driver.fotoProfileUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : (
                      <User size={24} color="#cbd5e1" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="font-black text-slate-800 text-base tracking-tight" numberOfLines={1}>{driver.name}</Text>
                    <View className="flex-row items-center gap-1.5 mt-0.5">
                      <CreditCard size={12} color="#60a5fa" />
                      <Text className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">NIK: {driver.nik}</Text>
                    </View>
                  </View>
                </View>

                <View className="flex-row items-center justify-between w-full pt-4 border-t border-slate-100">
                  {driver.status === "Active" ? (
                    <View className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-md shadow-sm">
                      <Text className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Aktif Mengaspal</Text>
                    </View>
                  ) : (
                    <View className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-md shadow-sm">
                      <Text className="text-[9px] font-black uppercase tracking-widest text-amber-600">Menunggu Verifikasi</Text>
                    </View>
                  )}
                  
                  <View className="flex-row gap-2">
                    <TouchableOpacity onPress={() => handleOpenHistory(driver)} className="w-9 h-9 items-center justify-center bg-slate-50 rounded-xl border border-slate-200 shadow-sm" accessibilityLabel="Riwayat Order">
                      <History size={16} color="#64748b" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleOpenEdit(driver)} className="w-9 h-9 items-center justify-center bg-blue-50 rounded-xl border border-blue-200 shadow-sm" accessibilityLabel="Edit Data">
                      <Edit2 size={16} color="#3b82f6" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteDriver(driver.id, driver.name)} className="w-9 h-9 items-center justify-center bg-red-50 rounded-xl border border-red-200 shadow-sm" accessibilityLabel="Hapus Karyawan">
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
