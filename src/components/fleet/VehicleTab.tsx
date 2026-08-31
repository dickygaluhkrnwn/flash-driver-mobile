import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import Animated, { FadeInDown, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { 
  Truck, Plus, X, UserSquare2, FileText, ShieldAlert, AlertTriangle, 
  Trash2, Edit2, History, MapPin, Package, CheckCircle2, ChevronDown
} from "lucide-react-native";
import { collection, query, where, setDoc, doc, serverTimestamp, getDoc, onSnapshot, deleteDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { OrderDetail } from "@/types/order";

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

interface FleetDriver {
  id: string;
  name: string;
}

interface DynamicVehicle {
  id: string;
  name: string;
  category: string;
  maxWeight: number;
}

export default function VehicleTab() {
  const { user } = useAuthStore();
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<FleetDriver[]>([]);
  const [vehiclesConfig, setVehiclesConfig] = useState<DynamicVehicle[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);

  // Custom Dropdown States for React Native
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isDriverDropdownOpen, setIsDriverDropdownOpen] = useState(false);

  const [vendorCompanyName, setVendorCompanyName] = useState("");

  // History Modal State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedHistoryVehicle, setSelectedHistoryVehicle] = useState<FleetVehicle | null>(null);
  const [vehicleHistoryOrders, setVehicleHistoryOrders] = useState<OrderDetail[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Form State
  const [formData, setFormData] = useState({ vehicleType: "", licensePlate: "", driverId: "" });
  
  // File State
  const [files, setFiles] = useState<{ stnk: string|null, kir: string|null }>({ stnk: null, kir: null });
  const [oldUrls, setOldUrls] = useState<{ stnk: string, kir: string }>({ stnk: "", kir: "" });

  // 🔄 REAL-TIME LISTENER
  useEffect(() => {
    if (!user) return;
    setIsLoading(true);

    const initStaticData = async () => {
      try {
        const vendorSnap = await getDoc(doc(db, "users", user.uid));
        if (vendorSnap.exists()) setVendorCompanyName(vendorSnap.data().companyName || vendorSnap.data().displayName || "Vendor");

        const pricingSnap = await getDoc(doc(db, "settings", "pricing"));
        if (pricingSnap.exists() && pricingSnap.data().customVehicles) {
          setVehiclesConfig(pricingSnap.data().customVehicles.filter((v: DynamicVehicle) => v.category === "Truk"));
        }
      } catch (error) {
        console.error(error);
      }
    };

    initStaticData();

    const dQuery = query(collection(db, "driver_wallets"), where("partnerType", "==", "FleetDriver"), where("vendorId", "==", user.uid));
    const unsubDrivers = onSnapshot(dQuery, (snap) => {
      setAvailableDrivers(snap.docs.map(d => ({ id: d.id, name: d.data().name || "Tanpa Nama" })));
    });

    const vQuery = query(collection(db, "driver_wallets"), where("partnerType", "==", "FleetVehicle"), where("vendorId", "==", user.uid));
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

  const handlePickImage = async (type: keyof typeof files) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
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
    setEditingVehicleId(null);
    setFormData({ vehicleType: "", licensePlate: "", driverId: "" });
    setFiles({ stnk: null, kir: null });
    setOldUrls({ stnk: "", kir: "" });
    setIsTypeDropdownOpen(false);
    setIsDriverDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (vehicle: FleetVehicle) => {
    setModalMode("edit");
    setEditingVehicleId(vehicle.id);
    setFormData({ 
      vehicleType: vehicle.vehicleType || "", 
      licensePlate: vehicle.licensePlate || "", 
      driverId: vehicle.driverId || "" 
    });
    setFiles({ stnk: null, kir: null });
    setOldUrls({ 
      stnk: vehicle.stnkUrl || "", 
      kir: vehicle.kirUrl || "" 
    });
    setIsTypeDropdownOpen(false);
    setIsDriverDropdownOpen(false);
    setIsModalOpen(true);
  };

  const uploadFileIfPresent = async (uri: string | null, oldUrl: string): Promise<string> => {
    if (!uri) return oldUrl;
    return await uploadToCloudinary(uri);
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    if (!formData.vehicleType) return Alert.alert("Peringatan", "Harap pilih tipe klasifikasi truk.");
    if (!formData.licensePlate) return Alert.alert("Peringatan", "Harap masukkan plat nomor.");
    if (!formData.driverId) return Alert.alert("Peringatan", "Harap tugaskan truk ke salah satu sopir Anda.");
    
    if (modalMode === "add" && (!files.stnk || !files.kir)) {
      return Alert.alert("Peringatan", "Foto STNK dan KIR wajib diunggah!");
    }

    setIsSaving(true);
    try {
      const stnkUrl = await uploadFileIfPresent(files.stnk, oldUrls.stnk);
      const kirUrl = await uploadFileIfPresent(files.kir, oldUrls.kir);

      const docId = modalMode === "add" 
        ? `PRT-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}` 
        : editingVehicleId!;

      const assignedDriver = availableDrivers.find(d => d.id === formData.driverId);
      const formattedLicensePlate = formData.licensePlate.toUpperCase();
      const vehicleName = `${formattedLicensePlate} (${formData.vehicleType})`;

      const payload = {
        id: docId, name: vehicleName, partnerType: "FleetVehicle", 
        status: "Pending", 
        isSuspended: false, balance: 0, vendorId: user.uid, vendorName: vendorCompanyName,
        driverId: formData.driverId, driverName: assignedDriver?.name || "Sopir Tidak Diketahui",
        vehicleType: formData.vehicleType, licensePlate: formattedLicensePlate, stnkUrl: stnkUrl, kirUrl: kirUrl
      };

      if (modalMode === "add") Object.assign(payload, { createdAt: serverTimestamp() });
      else Object.assign(payload, { updatedAt: serverTimestamp() });

      await setDoc(doc(db, "driver_wallets", docId), payload, { merge: true });

      Alert.alert("Sukses", modalMode === "add" ? "Armada truk berhasil didaftarkan!" : "Data armada diperbarui. Menunggu review Admin.");
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal menyimpan data armada. Silakan coba lagi.");
    } finally {
      setIsSaving(false);
    }
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
              Alert.alert("Error", "Gagal menghapus data.");
            }
          }
        }
      ]
    );
  };

  const handleOpenHistory = async (vehicle: FleetVehicle) => {
    setSelectedHistoryVehicle(vehicle);
    setIsHistoryOpen(true);
    setIsLoadingHistory(true);
    setVehicleHistoryOrders([]);

    try {
      const q = query(collection(db, "orders"), where("vehicleName", "==", vehicle.name));
      const snap = await getDocs(q);
      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() } as OrderDetail));
      orders.sort((a, b) => getSafeMillis(b.updatedAt || b.createdAt) - getSafeMillis(a.updatedAt || a.createdAt));
      setVehicleHistoryOrders(orders);
    } catch (error) {
      console.error("Gagal menarik riwayat armada", error);
      Alert.alert("Error", "Gagal menarik riwayat armada.");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  return (
    <View className="flex-1 space-y-4">
      
      <View className="flex-row items-center justify-between mt-2 mb-2">
        <View className="flex-row items-center gap-2">
          <Truck size={16} color="#2563eb" />
          <Text className="text-sm font-black text-slate-800 uppercase tracking-widest">Daftar Truk Fisik</Text>
        </View>
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={handleOpenAdd} 
          className="bg-blue-600 px-4 py-2.5 rounded-full flex-row items-center gap-1.5 shadow-sm"
        >
          <Plus size={14} color="#FFFFFF" strokeWidth={3} />
          <Text className="text-[10px] text-white uppercase tracking-widest font-black">Tambah Truk</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        {isLoading ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">Memuat Data Armada...</Text>
          </View>
        ) : vehicles.length === 0 ? (
          <View className="glass-card bg-blue-50/50 border border-blue-100 rounded-[2rem] p-8 items-center shadow-sm">
            <View className="w-16 h-16 bg-blue-100 rounded-[1.25rem] items-center justify-center mb-4 border border-white">
              <Truck size={32} color="#60a5fa" />
            </View>
            <Text className="text-sm font-black text-slate-800 tracking-tight text-center">Belum Ada Truk Terdaftar</Text>
            <Text className="text-xs font-medium text-slate-500 mt-1 text-center mb-6 px-4">Daftarkan armada fisik Anda beserta kelengkapan dokumen STNK dan KIR.</Text>
            <Button 
              variant="primary" 
              size="md"
              onPress={handleOpenAdd} 
              className="w-full bg-blue-600 shadow-sm"
            >
              Daftarkan Truk Sekarang
            </Button>
          </View>
        ) : (
          <View className="space-y-4">
            {vehicles.map((vehicle, idx) => (
              <Animated.View 
                key={vehicle.id} 
                entering={FadeInDown.delay(idx * 50).duration(300)}
                className="glass-card bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex-col gap-4"
              >
                <View className="flex-row items-center gap-4 w-full">
                  <View className="w-14 h-14 bg-slate-50 rounded-[1.25rem] border border-slate-200 items-center justify-center">
                    <Truck size={24} color="#94a3b8" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-black text-slate-900 text-base tracking-tight uppercase" numberOfLines={1}>{vehicle.licensePlate}</Text>
                    <Text className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1.5">{vehicle.vehicleType}</Text>
                    <View className="flex-row items-center gap-1.5 bg-blue-50 border border-blue-100 px-2 py-1 rounded-md self-start">
                      <UserSquare2 size={12} color="#3b82f6" />
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
                    <TouchableOpacity onPress={() => handleOpenHistory(vehicle)} className="w-9 h-9 items-center justify-center bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
                      <History size={16} color="#64748b" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleOpenEdit(vehicle)} className="w-9 h-9 items-center justify-center bg-blue-50 rounded-xl border border-blue-200 shadow-sm">
                      <Edit2 size={16} color="#3b82f6" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteVehicle(vehicle.id, vehicle.licensePlate)} className="w-9 h-9 items-center justify-center bg-red-50 rounded-xl border border-red-200 shadow-sm">
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
      {/* MODAL TAMBAH/EDIT TRUK                                    */}
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
                  <Truck size={20} color="#2563eb" />
                  <Text className="text-lg font-black text-slate-900 tracking-tight">
                    {modalMode === "add" ? "Pendaftaran Truk PT" : "Edit Data Truk"}
                  </Text>
                </View>
                <Text className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">Manajemen Fisik Armada</Text>
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
                    Menyimpan perubahan akan mengembalikan status truk menjadi <Text className="font-black">Pending</Text> untuk ditinjau ulang oleh Admin.
                  </Text>
                </View>
              )}

              <View className="space-y-6">
                
                {/* DROPDOWN KLASIFIKASI TRUK */}
                <View className="relative z-50">
                  <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Tipe Klasifikasi Truk</Text>
                  <TouchableOpacity 
                    activeOpacity={0.8}
                    onPress={() => { setIsTypeDropdownOpen(!isTypeDropdownOpen); setIsDriverDropdownOpen(false); }}
                    className={`w-full px-5 py-4 bg-white rounded-[1.25rem] flex-row items-center justify-between border ${isTypeDropdownOpen ? 'border-blue-600' : 'border-slate-200'}`}
                  >
                    <Text className={`text-sm font-black ${formData.vehicleType ? 'text-slate-900' : 'text-slate-400'}`}>
                      {formData.vehicleType || "-- Pilih Tipe Armada --"}
                    </Text>
                    <ChevronDown size={20} color="#94a3b8" />
                  </TouchableOpacity>

                  {isTypeDropdownOpen && (
                    <View className="absolute top-[75px] left-0 right-0 bg-white border border-slate-100 rounded-2xl shadow-lg max-h-60 overflow-hidden z-50">
                      <ScrollView nestedScrollEnabled>
                        {vehiclesConfig.length === 0 && <Text className="p-4 text-center text-xs font-bold text-slate-500">Master Data Truk Kosong</Text>}
                        {vehiclesConfig.map(v => (
                          <TouchableOpacity 
                            key={v.id} 
                            onPress={() => { setFormData({ ...formData, vehicleType: v.name }); setIsTypeDropdownOpen(false); }}
                            className="px-5 py-4 border-b border-slate-100 bg-white"
                          >
                            <Text className="font-black text-slate-800 tracking-tight">{v.name}</Text>
                            <Text className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Maks Muatan: {v.maxWeight} Kg</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
                
                <View className="relative z-40">
                  <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Plat Nomor Kendaraan</Text>
                  <Input value={formData.licensePlate} onChangeText={t => setFormData({...formData, licensePlate: t})} placeholder="Cth: B 1234 CD" className="bg-white font-mono font-black uppercase" />
                </View>

                {/* DROPDOWN ASSIGN SOPIR */}
                <View className="bg-blue-50/50 border border-blue-200 p-5 rounded-[1.5rem] relative z-30">
                  <View className="flex-row items-center gap-1.5 mb-2">
                    <UserSquare2 size={16} color="#1d4ed8" />
                    <Text className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Pilih Sopir Penanggung Jawab</Text>
                  </View>
                  
                  <TouchableOpacity 
                    activeOpacity={0.8}
                    onPress={() => { setIsDriverDropdownOpen(!isDriverDropdownOpen); setIsTypeDropdownOpen(false); }}
                    className={`w-full px-5 py-4 bg-white rounded-[1rem] flex-row items-center justify-between border ${isDriverDropdownOpen ? 'border-blue-600' : 'border-slate-200'}`}
                  >
                    <Text className={`text-sm font-black ${formData.driverId ? 'text-slate-900' : 'text-slate-400'}`}>
                      {formData.driverId ? availableDrivers.find(d => d.id === formData.driverId)?.name : "-- Pilih Sopir PT Anda --"}
                    </Text>
                    <ChevronDown size={20} color="#94a3b8" />
                  </TouchableOpacity>

                  {isDriverDropdownOpen && (
                    <View className="absolute top-[90px] left-5 right-5 bg-white border border-slate-100 rounded-2xl shadow-lg max-h-48 overflow-hidden z-50">
                      <ScrollView nestedScrollEnabled>
                        {availableDrivers.length === 0 && <Text className="p-4 text-center text-xs font-bold text-slate-500">Anda belum mendaftarkan sopir satupun.</Text>}
                        {availableDrivers.map(d => (
                          <TouchableOpacity 
                            key={d.id} 
                            onPress={() => { setFormData({ ...formData, driverId: d.id }); setIsDriverDropdownOpen(false); }}
                            className="px-5 py-4 border-b border-slate-100 bg-white flex-row items-center gap-3"
                          >
                            <View className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"><UserSquare2 size={16} color="#64748b"/></View>
                            <Text className="font-black text-slate-800 tracking-tight flex-1">{d.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View className="pt-6 border-t border-slate-200 relative z-20">
                  <View className="flex-row items-center gap-1.5 mb-4">
                    <FileText size={14} color="#64748b" />
                    <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Upload Dokumen Kendaraan</Text>
                  </View>
                  
                  <View className="flex-row gap-3">
                    <UploadBox label="STNK Truk Asli" isRequired={modalMode === "add"} fileUri={files.stnk} oldUrl={oldUrls.stnk} onPress={() => handlePickImage('stnk')} icon={<FileText size={20} />} />
                    <UploadBox label="Buku KIR Aktif" isRequired={modalMode === "add"} fileUri={files.kir} oldUrl={oldUrls.kir} onPress={() => handlePickImage('kir')} icon={<ShieldAlert size={20} />} />
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
                    <Text className="text-white font-bold ml-2">Simpan Data Truk</Text>
                  </>
                )}
              </Button>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL RIWAYAT ORDER ARMADA                                */}
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
                  <Text className="text-lg font-black text-slate-900 tracking-tight">Riwayat Armada</Text>
                </View>
                <Text className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">{selectedHistoryVehicle?.licensePlate} ({selectedHistoryVehicle?.vehicleType})</Text>
              </View>
              <TouchableOpacity onPress={() => setIsHistoryOpen(false)} className="w-8 h-8 bg-slate-100 rounded-full items-center justify-center">
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView className="px-6 py-6" showsVerticalScrollIndicator={false}>
              {isLoadingHistory ? (
                <View className="items-center justify-center h-40">
                  <ActivityIndicator size="large" color="#2563eb" />
                  <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">Memuat log perjalanan...</Text>
                </View>
              ) : vehicleHistoryOrders.length === 0 ? (
                <View className="glass-card bg-white border border-slate-200 border-dashed rounded-[2rem] p-8 items-center shadow-sm">
                  <View className="w-14 h-14 bg-slate-50 rounded-[1.25rem] items-center justify-center mb-4 border border-slate-100">
                    <Package size={24} color="#cbd5e1" />
                  </View>
                  <Text className="text-sm font-black text-slate-800 tracking-tight">Belum Ada Riwayat Perjalanan</Text>
                  <Text className="text-xs font-medium text-slate-500 mt-1 text-center">Armada ini belum pernah menyelesaikan pengiriman apapun.</Text>
                </View>
              ) : (
                <View className="space-y-4">
                  {vehicleHistoryOrders.map(order => {
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
                          <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{dateStr}</Text>
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
                            <Text className="text-[9px] text-slate-400 uppercase tracking-widest font-black mb-0.5">Omset Truk</Text>
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
