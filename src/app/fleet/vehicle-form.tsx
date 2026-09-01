import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { 
  Truck, ArrowLeft, UserSquare2, FileText, ShieldAlert, AlertTriangle, CheckCircle2, ChevronDown
} from "lucide-react-native";
import { collection, query, where, setDoc, doc, serverTimestamp, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Input } from "@/components/ui/Input";

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

export default function VehicleFormPage() {
  const router = useRouter();
  const { mode, id } = useLocalSearchParams<{ mode: string, id: string }>();
  const { user } = useAuthStore();
  
  const [vendorCompanyName, setVendorCompanyName] = useState("");
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [isSaving, setIsSaving] = useState(false);

  const [availableDrivers, setAvailableDrivers] = useState<FleetDriver[]>([]);
  const [vehiclesConfig, setVehiclesConfig] = useState<DynamicVehicle[]>([]);

  // Custom Dropdown States
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isDriverDropdownOpen, setIsDriverDropdownOpen] = useState(false);

  const [formData, setFormData] = useState({ vehicleType: "", licensePlate: "", driverId: "" });
  const [files, setFiles] = useState<{ stnk: string|null, kir: string|null }>({ stnk: null, kir: null });
  const [oldUrls, setOldUrls] = useState<{ stnk: string, kir: string }>({ stnk: "", kir: "" });

  useEffect(() => {
    if (!user) return;

    const initData = async () => {
      try {
        const vendorSnap = await getDoc(doc(db, "users", user.uid));
        if (vendorSnap.exists()) setVendorCompanyName(vendorSnap.data().companyName || vendorSnap.data().displayName || "Vendor");

        const pricingSnap = await getDoc(doc(db, "settings", "pricing"));
        if (pricingSnap.exists() && pricingSnap.data().customVehicles) {
          setVehiclesConfig(pricingSnap.data().customVehicles.filter((v: DynamicVehicle) => v.category === "Truk"));
        }

        const dQuery = query(collection(db, "driver_wallets"), where("partnerType", "==", "FleetDriver"), where("vendorId", "==", user.uid));
        const dSnap = await getDocs(dQuery);
        setAvailableDrivers(dSnap.docs.map(d => ({ id: d.id, name: d.data().name || "Tanpa Nama" })));

        if (mode === "edit" && id) {
          const vSnap = await getDoc(doc(db, "driver_wallets", id));
          if (vSnap.exists()) {
            const vehicle = vSnap.data();
            setFormData({ 
              vehicleType: vehicle.vehicleType || "", 
              licensePlate: vehicle.licensePlate || "", 
              driverId: vehicle.driverId || "" 
            });
            setOldUrls({ 
              stnk: vehicle.stnkUrl || "", 
              kir: vehicle.kirUrl || "" 
            });
          }
        }
      } catch (error) {
        console.error(error);
        Alert.alert("Error", "Gagal memuat data formulir.");
      } finally {
        setIsLoading(false);
      }
    };

    initData();
  }, [user, mode, id]);

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

  const uploadFileIfPresent = async (uri: string | null, oldUrl: string): Promise<string> => {
    if (!uri) return oldUrl;
    return await uploadToCloudinary(uri);
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    if (!formData.vehicleType) return Alert.alert("Peringatan", "Harap pilih tipe klasifikasi truk.");
    if (!formData.licensePlate) return Alert.alert("Peringatan", "Harap masukkan plat nomor.");
    if (!formData.driverId) return Alert.alert("Peringatan", "Harap tugaskan truk ke salah satu sopir Anda.");
    
    if (mode === "add" && (!files.stnk || !files.kir)) {
      return Alert.alert("Peringatan", "Foto STNK dan KIR wajib diunggah!");
    }

    setIsSaving(true);
    try {
      const stnkUrl = await uploadFileIfPresent(files.stnk, oldUrls.stnk);
      const kirUrl = await uploadFileIfPresent(files.kir, oldUrls.kir);

      const docId = mode === "add" 
        ? `PRT-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}` 
        : id!;

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

      if (mode === "add") Object.assign(payload, { createdAt: serverTimestamp() });
      else Object.assign(payload, { updatedAt: serverTimestamp() });

      await setDoc(doc(db, "driver_wallets", docId), payload, { merge: true });

      Alert.alert("Sukses", mode === "add" ? "Armada truk berhasil didaftarkan!" : "Data armada diperbarui. Menunggu review Admin.", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal menyimpan data armada. Silakan coba lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#7a171d" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <View className="px-5 pt-14 pb-4 bg-white border-b border-slate-200 flex-row items-center gap-4 shadow-sm z-50">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-50 rounded-full border border-slate-200">
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <View>
          <Text className="text-lg font-black text-slate-800 tracking-tight">
            {mode === "add" ? "Pendaftaran Truk PT" : "Edit Data Truk"}
          </Text>
          <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manajemen Fisik Armada</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView className="flex-1 px-5 py-6" showsVerticalScrollIndicator={false}>
          {mode === "edit" && (
            <View className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-[1.25rem] flex-row gap-3 shadow-sm">
              <AlertTriangle size={20} color="#d97706" />
              <Text className="text-[10px] text-amber-800 font-medium flex-1">
                Menyimpan perubahan akan mengembalikan status truk menjadi <Text className="font-black">Pending</Text> untuk ditinjau ulang.
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
                className={`w-full px-5 py-4 bg-white rounded-[1.25rem] flex-row items-center justify-between border-2 ${isTypeDropdownOpen ? 'border-red-600' : 'border-slate-200'}`}
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
              <Input value={formData.licensePlate} onChangeText={t => setFormData({...formData, licensePlate: t})} placeholder="Cth: B 1234 CD" className="bg-white font-mono font-black uppercase border-2 border-slate-200" />
            </View>

            {/* DROPDOWN ASSIGN SOPIR */}
            <View className="bg-red-50/50 border border-red-200 p-5 rounded-[1.5rem] relative z-30">
              <View className="flex-row items-center gap-1.5 mb-2">
                <UserSquare2 size={16} color="#b91c1c" />
                <Text className="text-[10px] font-black text-red-700 uppercase tracking-widest">Pilih Sopir Penanggung Jawab</Text>
              </View>
              
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => { setIsDriverDropdownOpen(!isDriverDropdownOpen); setIsTypeDropdownOpen(false); }}
                className={`w-full px-5 py-4 bg-white rounded-[1rem] flex-row items-center justify-between border-2 ${isDriverDropdownOpen ? 'border-red-600' : 'border-slate-200'}`}
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
                <UploadBox label="STNK Truk Asli" isRequired={mode === "add"} fileUri={files.stnk} oldUrl={oldUrls.stnk} onPress={() => handlePickImage('stnk')} icon={<FileText size={20} />} />
                <UploadBox label="Buku KIR Aktif" isRequired={mode === "add"} fileUri={files.kir} oldUrl={oldUrls.kir} onPress={() => handlePickImage('kir')} icon={<ShieldAlert size={20} />} />
              </View>
            </View>
          </View>
          <View className="h-32" />
        </ScrollView>

        <View className="p-6 bg-white border-t border-slate-200 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
          <TouchableOpacity 
            onPress={handleSubmit} 
            disabled={isSaving} 
            activeOpacity={0.8}
            className="w-full relative"
          >
            <View className={`absolute inset-0 rounded-[1.25rem] translate-y-1.5 ${isSaving ? 'bg-slate-300' : 'bg-[#450a0a]'}`} />
            <View className={`h-14 rounded-[1.25rem] border-2 flex-row items-center justify-center relative z-10 ${isSaving ? 'bg-slate-100 border-slate-300' : 'bg-[#7a171d] border-[#450a0a]'}`}>
              {isSaving ? (
                <>
                  <ActivityIndicator size="small" color="#94a3b8" />
                  <Text className="text-slate-400 font-black uppercase tracking-widest ml-2">Memproses...</Text>
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} color="#FFF" />
                  <Text className="text-white font-black uppercase tracking-widest ml-2">Simpan Data Truk</Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
      <View className={`mb-2 w-8 h-8 rounded-lg items-center justify-center border-2 ${
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
