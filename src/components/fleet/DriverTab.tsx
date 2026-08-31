import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import Animated, { FadeInDown, FadeInUp, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { 
  Users, Plus, X, User, CreditCard, Camera, ShieldAlert, AlertTriangle, 
  Trash2, Edit2, History, MapPin, Package, UserPlus, CheckCircle2 
} from "lucide-react-native";
import { collection, query, where, setDoc, doc, serverTimestamp, getDoc, onSnapshot, deleteDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { OrderDetail } from "@/types/order";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

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
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [vendorCompanyName, setVendorCompanyName] = useState("");

  // History Modal State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedHistoryDriver, setSelectedHistoryDriver] = useState<FleetDriver | null>(null);
  const [driverHistoryOrders, setDriverHistoryOrders] = useState<OrderDetail[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Form State
  const [formData, setFormData] = useState({ name: "", phone: "", nik: "", simNumber: "" });
  
  // File State
  const [files, setFiles] = useState<{ profile: string|null, ktp: string|null, sim: string|null }>({ profile: null, ktp: null, sim: null });
  const [oldUrls, setOldUrls] = useState<{ profile: string, ktp: string, sim: string }>({ profile: "", ktp: "", sim: "" });

  // 🔄 REAL-TIME LISTENER
  useEffect(() => {
    if (!user) return;
    setIsLoading(true);

    const fetchVendorInfo = async () => {
      try {
        const vendorSnap = await getDoc(doc(db, "users", user.uid));
        if (vendorSnap.exists()) setVendorCompanyName(vendorSnap.data().companyName || vendorSnap.data().displayName || "Vendor");
      } catch (error) {
        console.error(error);
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

  const handlePickImage = async (type: keyof typeof files) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7, // Compress slightly
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFiles(prev => ({ ...prev, [type]: result.assets[0].uri }));
      }
    } catch (error) {
      console.error("Gagal memilih gambar:", error);
      Alert.alert("Error", "Gagal membuka galeri.");
    }
  };

  const handleOpenAdd = () => {
    setModalMode("add");
    setEditingDriverId(null);
    setFormData({ name: "", phone: "", nik: "", simNumber: "" });
    setFiles({ profile: null, ktp: null, sim: null });
    setOldUrls({ profile: "", ktp: "", sim: "" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (driver: FleetDriver) => {
    setModalMode("edit");
    setEditingDriverId(driver.id);
    setFormData({ 
      name: driver.name || "", 
      phone: driver.phone || "", 
      nik: driver.nik || "", 
      simNumber: driver.simNumber || "" 
    });
    setFiles({ profile: null, ktp: null, sim: null }); 
    setOldUrls({ 
      profile: driver.fotoProfileUrl || "", 
      ktp: driver.fotoKtpUrl || "", 
      sim: driver.fotoSimUrl || "" 
    });
    setIsModalOpen(true);
  };

  const uploadFileIfPresent = async (uri: string | null, oldUrl: string): Promise<string> => {
    if (!uri) return oldUrl;
    return await uploadToCloudinary(uri);
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    if (!formData.name || !formData.phone || !formData.nik || !formData.simNumber) {
      return Alert.alert("Peringatan", "Harap isi semua kolom teks wajib.");
    }

    if (modalMode === "add" && (!files.ktp || !files.sim)) {
      return Alert.alert("Peringatan", "Foto KTP dan SIM wajib diunggah!");
    }

    setIsSaving(true);
    try {
      const profileUrl = await uploadFileIfPresent(files.profile, oldUrls.profile);
      const ktpUrl = await uploadFileIfPresent(files.ktp, oldUrls.ktp);
      const simUrl = await uploadFileIfPresent(files.sim, oldUrls.sim);

      const docId = modalMode === "add" 
        ? `PRT-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}` 
        : editingDriverId!;

      const payload = {
        id: docId, name: formData.name, phone: formData.phone, partnerType: "FleetDriver", 
        status: "Pending", 
        isSuspended: false, balance: 0, vendorId: user.uid, vendorName: vendorCompanyName,
        nik: formData.nik, simNumber: formData.simNumber, fotoProfileUrl: profileUrl, fotoKtpUrl: ktpUrl, fotoSimUrl: simUrl
      };

      if (modalMode === "add") Object.assign(payload, { createdAt: serverTimestamp() });
      else Object.assign(payload, { updatedAt: serverTimestamp() });

      await setDoc(doc(db, "driver_wallets", docId), payload, { merge: true });

      Alert.alert("Sukses", modalMode === "add" ? "Sopir berhasil didaftarkan!" : "Data sopir diperbarui. Menunggu review Admin.");
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal menyimpan data. Silakan coba lagi.");
    } finally {
      setIsSaving(false);
    }
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
              Alert.alert("Error", "Gagal menghapus data.");
            }
          }
        }
      ]
    );
  };

  const handleOpenHistory = async (driver: FleetDriver) => {
    setSelectedHistoryDriver(driver);
    setIsHistoryOpen(true);
    setIsLoadingHistory(true);
    setDriverHistoryOrders([]);

    try {
      const q = query(collection(db, "orders"), where("driverId", "==", driver.id));
      const snap = await getDocs(q);
      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() } as OrderDetail));
      orders.sort((a, b) => getSafeMillis(b.updatedAt || b.createdAt) - getSafeMillis(a.updatedAt || a.createdAt));
      setDriverHistoryOrders(orders);
    } catch (error) {
      console.error("Gagal menarik riwayat", error);
      Alert.alert("Error", "Gagal menarik riwayat sopir.");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  return (
    <View className="flex-1 space-y-4">
      
      <View className="flex-row items-center justify-between mt-2 mb-2">
        <View className="flex-row items-center gap-2">
          <Users size={16} color="#2563eb" />
          <Text className="text-sm font-black text-slate-800 uppercase tracking-widest">Daftar Sopir PT</Text>
        </View>
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={handleOpenAdd} 
          className="bg-blue-600 px-4 py-2.5 rounded-full flex-row items-center gap-1.5 shadow-sm"
        >
          <Plus size={14} color="#FFFFFF" strokeWidth={3} />
          <Text className="text-[10px] text-white uppercase tracking-widest font-black">Daftarkan Baru</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        {isLoading ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">Memuat Data Sopir...</Text>
          </View>
        ) : drivers.length === 0 ? (
          <View className="glass-card bg-blue-50/50 border border-blue-100 rounded-[2rem] p-8 items-center shadow-sm">
            <View className="w-16 h-16 bg-blue-100 rounded-[1.25rem] items-center justify-center mb-4 border border-white">
              <Users size={32} color="#60a5fa" />
            </View>
            <Text className="text-sm font-black text-slate-800 tracking-tight text-center">Belum Ada Sopir Terdaftar</Text>
            <Text className="text-xs font-medium text-slate-500 mt-1 text-center mb-6 px-4">Tambahkan data karyawan sopir yang bekerja di bawah naungan PT Anda.</Text>
            <Button 
              variant="primary" 
              size="md"
              onPress={handleOpenAdd} 
              className="w-full bg-blue-600 shadow-sm"
            >
              Daftarkan Sopir Sekarang
            </Button>
          </View>
        ) : (
          <View className="space-y-4">
            {drivers.map((driver, idx) => (
              <Animated.View 
                key={driver.id} 
                entering={FadeInDown.delay(idx * 50).duration(300)}
                className="glass-card bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex-col gap-4"
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
                    <TouchableOpacity onPress={() => handleOpenHistory(driver)} className="w-9 h-9 items-center justify-center bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
                      <History size={16} color="#64748b" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleOpenEdit(driver)} className="w-9 h-9 items-center justify-center bg-blue-50 rounded-xl border border-blue-200 shadow-sm">
                      <Edit2 size={16} color="#3b82f6" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteDriver(driver.id, driver.name)} className="w-9 h-9 items-center justify-center bg-red-50 rounded-xl border border-red-200 shadow-sm">
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ========================================================= */}
      {/* MODAL TAMBAH/EDIT SOPIR                                   */}
      {/* ========================================================= */}
      <Modal visible={isModalOpen} transparent animationType="none" onRequestClose={() => !isSaving && setIsModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-end bg-slate-900/60">
          <TouchableOpacity className="flex-1" onPress={() => !isSaving && setIsModalOpen(false)} />
          
          <Animated.View entering={SlideInDown.springify().damping(20)} exiting={SlideOutDown} className="bg-slate-50 rounded-t-[2.5rem] overflow-hidden max-h-[90%] flex-col">
            <View className="items-center pt-3 pb-1">
              <View className="w-12 h-1.5 bg-slate-300 rounded-full" />
            </View>

            <View className="px-6 py-4 flex-row items-center justify-between border-b border-slate-200 bg-white">
              <View>
                <View className="flex-row items-center gap-2">
                  <UserPlus size={20} color="#2563eb" />
                  <Text className="text-lg font-black text-slate-900 tracking-tight">
                    {modalMode === "add" ? "Pendaftaran Sopir" : "Edit Data Sopir"}
                  </Text>
                </View>
                <Text className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">Manajemen Karyawan PT</Text>
              </View>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} className="w-8 h-8 bg-slate-100 rounded-full items-center justify-center">
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView className="px-6 py-6" showsVerticalScrollIndicator={false}>
              
              {modalMode === "edit" && (
                <View className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-[1.25rem] flex-row gap-3 shadow-sm">
                  <AlertTriangle size={20} color="#d97706" />
                  <Text className="text-[10px] text-amber-800 font-medium flex-1">
                    Menyimpan perubahan akan mengembalikan status sopir menjadi <Text className="font-black">Pending</Text> untuk ditinjau ulang oleh Admin.
                  </Text>
                </View>
              )}

              <View className="space-y-6">
                <View>
                  <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Nama Lengkap Sopir</Text>
                  <Input value={formData.name} onChangeText={t => setFormData({...formData, name: t})} placeholder="Sesuai KTP" className="bg-white" />
                </View>
                
                <View>
                  <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">No. HP / WhatsApp Aktif</Text>
                  <Input value={formData.phone} onChangeText={t => setFormData({...formData, phone: t})} keyboardType="phone-pad" placeholder="0812xxxxxx" className="bg-white font-mono font-bold" />
                </View>

                <View className="flex-row gap-4">
                  <View className="flex-1">
                    <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">No. NIK KTP</Text>
                    <Input value={formData.nik} onChangeText={t => setFormData({...formData, nik: t})} keyboardType="numeric" placeholder="16 Digit" className="bg-white font-mono font-bold" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">No. SIM</Text>
                    <Input value={formData.simNumber} onChangeText={t => setFormData({...formData, simNumber: t})} placeholder="B / B1 / B2" className="bg-white font-mono font-bold uppercase" />
                  </View>
                </View>

                <View className="pt-6 border-t border-slate-200">
                  <View className="flex-row items-center gap-1.5 mb-4">
                    <Camera size={14} color="#64748b" />
                    <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Upload Dokumen Legalitas</Text>
                  </View>
                  
                  <View className="flex-row gap-3">
                    <UploadBox label="Foto Diri" fileUri={files.profile} oldUrl={oldUrls.profile} onPress={() => handlePickImage('profile')} icon={<User size={20} />} />
                    <UploadBox label="KTP" isRequired={modalMode === "add"} fileUri={files.ktp} oldUrl={oldUrls.ktp} onPress={() => handlePickImage('ktp')} icon={<ShieldAlert size={20} />} />
                    <UploadBox label="SIM" isRequired={modalMode === "add"} fileUri={files.sim} oldUrl={oldUrls.sim} onPress={() => handlePickImage('sim')} icon={<CreditCard size={20} />} />
                  </View>
                </View>
              </View>
              <View className="h-32" />
            </ScrollView>

            <View className="p-6 bg-white border-t border-slate-200 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
              <Button 
                onPress={handleSubmit} 
                disabled={isSaving} 
                variant="primary"
                className="w-full bg-blue-600 flex-row gap-2"
              >
                {isSaving ? (
                  <>
                    <ActivityIndicator size="small" color="#FFF" />
                    <Text className="text-white font-bold ml-2">Memproses...</Text>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={20} color="#FFF" />
                    <Text className="text-white font-bold ml-2">Simpan Data Sopir</Text>
                  </>
                )}
              </Button>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL RIWAYAT ORDER SOPIR                                 */}
      {/* ========================================================= */}
      <Modal visible={isHistoryOpen} transparent animationType="none" onRequestClose={() => setIsHistoryOpen(false)}>
        <View className="flex-1 justify-end bg-slate-900/60">
          <TouchableOpacity className="flex-1" onPress={() => setIsHistoryOpen(false)} />
          
          <Animated.View entering={SlideInDown.springify().damping(20)} exiting={SlideOutDown} className="bg-slate-50 rounded-t-[2.5rem] overflow-hidden max-h-[85%] flex-col">
            <View className="items-center pt-3 pb-1">
              <View className="w-12 h-1.5 bg-slate-300 rounded-full" />
            </View>

            <View className="px-6 py-4 flex-row items-center justify-between border-b border-slate-200 bg-white">
              <View>
                <View className="flex-row items-center gap-2">
                  <History size={20} color="#2563eb" />
                  <Text className="text-lg font-black text-slate-900 tracking-tight">Riwayat Sopir</Text>
                </View>
                <Text className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">{selectedHistoryDriver?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsHistoryOpen(false)} className="w-8 h-8 bg-slate-100 rounded-full items-center justify-center">
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView className="px-6 py-6" showsVerticalScrollIndicator={false}>
              {isLoadingHistory ? (
                <View className="items-center justify-center h-40">
                  <ActivityIndicator size="large" color="#2563eb" />
                  <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">Mencari rekam jejak...</Text>
                </View>
              ) : driverHistoryOrders.length === 0 ? (
                <View className="glass-card bg-white border border-slate-200 border-dashed rounded-[2rem] p-8 items-center shadow-sm">
                  <View className="w-14 h-14 bg-slate-50 rounded-[1.25rem] items-center justify-center mb-4 border border-slate-100">
                    <Package size={24} color="#cbd5e1" />
                  </View>
                  <Text className="text-sm font-black text-slate-800 tracking-tight">Belum Ada Riwayat</Text>
                  <Text className="text-xs font-medium text-slate-500 mt-1 text-center">Sopir ini belum pernah mengerjakan atau menyelesaikan order apapun.</Text>
                </View>
              ) : (
                <View className="space-y-4">
                  {driverHistoryOrders.map(order => {
                    const destObj = order.destinations && order.destinations.length > 0 ? order.destinations[0] : null;
                    const destAddr = destObj?.address || order.destination || "Alamat tidak diketahui";
                    const earned = order.finalGrandTotal || order.breakdown?.grandTotal || order.totalCost || 0;
                    const tsMillis = getSafeMillis(order.updatedAt || order.createdAt);
                    const dateStr = tsMillis > 0 ? new Date(tsMillis).toLocaleDateString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-";
                    const isDone = order.status === "Selesai";

                    return (
                      <View key={order.id} className="glass-card bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm">
                        <View className="flex-row justify-between items-start mb-4">
                          <View className={`px-2.5 py-1 rounded-lg border ${isDone ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                            <Text className={`text-[9px] font-black uppercase tracking-widest ${isDone ? 'text-emerald-600' : 'text-amber-600'}`}>{order.status}</Text>
                          </View>
                          <Text className="text-[10px] font-bold text-slate-400">{dateStr}</Text>
                        </View>
                        
                        <View className="flex-row items-start gap-3 mb-4">
                          <View className="mt-0.5 bg-slate-50 p-1.5 rounded-full border border-slate-100">
                            <MapPin size={14} color="#94a3b8" />
                          </View>
                          <Text className="text-xs font-bold text-slate-700 flex-1" numberOfLines={2}>{destAddr}</Text>
                        </View>

                        <View className="pt-4 border-t border-slate-100 flex-row justify-between items-center bg-slate-50/50 -mx-5 px-5 pb-1">
                          <View>
                            <Text className="text-[9px] text-slate-400 uppercase tracking-widest font-black mb-0.5">Resi AWB</Text>
                            <Text className="text-xs font-mono font-black text-slate-600">#{order.id.substring(0,8)}</Text>
                          </View>
                          <View className="items-end">
                            <Text className="text-[9px] text-slate-400 uppercase tracking-widest font-black mb-0.5">Omset Order</Text>
                            <Text className="text-sm font-black text-emerald-600 tracking-tight">{formatRupiah(earned)}</Text>
                          </View>
                        </View>
                      </View>
                    )
                  })}
                  <View className="h-10" />
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

    </View>
  );
}

function UploadBox({ label, fileUri, oldUrl, onPress, isRequired = false, icon }: { label: string, fileUri: string | null, oldUrl: string, onPress: () => void, isRequired?: boolean, icon: React.ReactNode }) {
  const showSuccess = fileUri || oldUrl;
  return (
    <TouchableOpacity 
      activeOpacity={0.8}
      onPress={onPress} 
      className={`flex-1 border-2 rounded-[1rem] p-3 items-center justify-center h-28 shadow-sm ${
        showSuccess ? "border-emerald-400 bg-emerald-50/50" : "border-slate-200 border-dashed bg-slate-50"
      }`}
    >
      <View className={`mb-2 w-8 h-8 rounded-lg items-center justify-center border ${
        showSuccess ? "bg-emerald-100 border-emerald-200" : "bg-white border-slate-200"
      }`}>
        {showSuccess ? <CheckCircle2 size={16} color="#059669" /> : React.cloneElement(icon as React.ReactElement<any>, { color: "#94a3b8" })}
      </View>
      <Text className={`text-[9px] font-black uppercase tracking-widest text-center ${
        showSuccess ? "text-emerald-700" : "text-slate-600"
      }`}>
        {label} {isRequired && !showSuccess && <Text className="text-red-500">*</Text>}
      </Text>
      {fileUri ? (
        <Text className="text-[8px] text-emerald-600 mt-1 font-bold text-center" numberOfLines={1}>File dipilih</Text>
      ) : oldUrl ? (
        <Text className="text-[8px] text-emerald-600 mt-1 font-bold text-center">Terunggah</Text>
      ) : null}
    </TouchableOpacity>
  );
}
