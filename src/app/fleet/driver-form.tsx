import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { 
  UserPlus, Camera, User, ShieldAlert, CreditCard, CheckCircle2, ArrowLeft, AlertTriangle 
} from "lucide-react-native";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Input } from "@/components/ui/Input";

export default function DriverFormPage() {
  const router = useRouter();
  const { mode, id } = useLocalSearchParams<{ mode: string, id: string }>();
  const { user } = useAuthStore();
  
  const [vendorCompanyName, setVendorCompanyName] = useState("");
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({ name: "", phone: "", nik: "", simNumber: "" });
  const [files, setFiles] = useState<{ profile: string|null, ktp: string|null, sim: string|null }>({ profile: null, ktp: null, sim: null });
  const [oldUrls, setOldUrls] = useState<{ profile: string, ktp: string, sim: string }>({ profile: "", ktp: "", sim: "" });

  useEffect(() => {
    const fetchVendorInfo = async () => {
      if (!user) return;
      try {
        const vendorSnap = await getDoc(doc(db, "users", user.uid));
        if (vendorSnap.exists()) setVendorCompanyName(vendorSnap.data().companyName || vendorSnap.data().displayName || "Vendor");
      } catch (error) {
        console.error(error);
      }
    };
    fetchVendorInfo();

    if (mode === "edit" && id) {
      const fetchDriver = async () => {
        try {
          const snap = await getDoc(doc(db, "driver_wallets", id));
          if (snap.exists()) {
            const driver = snap.data();
            setFormData({ 
              name: driver.name || "", 
              phone: driver.phone || "", 
              nik: driver.nik || "", 
              simNumber: driver.simNumber || "" 
            });
            setOldUrls({ 
              profile: driver.fotoProfileUrl || "", 
              ktp: driver.fotoKtpUrl || "", 
              sim: driver.fotoSimUrl || "" 
            });
          }
        } catch (error) {
          console.error(error);
          Alert.alert("Error", "Gagal mengambil data sopir.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchDriver();
    }
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
    
    if (!formData.name || !formData.phone || !formData.nik || !formData.simNumber) {
      return Alert.alert("Peringatan", "Harap isi semua kolom teks wajib.");
    }

    if (mode === "add" && (!files.ktp || !files.sim)) {
      return Alert.alert("Peringatan", "Foto KTP dan SIM wajib diunggah!");
    }

    setIsSaving(true);
    try {
      const profileUrl = await uploadFileIfPresent(files.profile, oldUrls.profile);
      const ktpUrl = await uploadFileIfPresent(files.ktp, oldUrls.ktp);
      const simUrl = await uploadFileIfPresent(files.sim, oldUrls.sim);

      const docId = mode === "add" 
        ? `PRT-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}` 
        : id!;

      const payload = {
        id: docId, name: formData.name, phone: formData.phone, partnerType: "FleetDriver", 
        status: "Pending", 
        isSuspended: false, balance: 0, vendorId: user.uid, vendorName: vendorCompanyName,
        nik: formData.nik, simNumber: formData.simNumber, fotoProfileUrl: profileUrl, fotoKtpUrl: ktpUrl, fotoSimUrl: simUrl
      };

      if (mode === "add") Object.assign(payload, { createdAt: serverTimestamp() });
      else Object.assign(payload, { updatedAt: serverTimestamp() });

      await setDoc(doc(db, "driver_wallets", docId), payload, { merge: true });

      Alert.alert("Sukses", mode === "add" ? "Sopir berhasil didaftarkan!" : "Data sopir diperbarui. Menunggu review Admin.", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal menyimpan data. Silakan coba lagi.");
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
      <View className="px-5 pt-14 pb-4 bg-white border-b border-slate-200 flex-row items-center gap-4 shadow-sm">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-50 rounded-full border border-slate-200">
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <View>
          <Text className="text-lg font-black text-slate-800 tracking-tight">
            {mode === "add" ? "Pendaftaran Sopir" : "Edit Data Sopir"}
          </Text>
          <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Karyawan PT</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView className="flex-1 px-5 py-6" showsVerticalScrollIndicator={false}>
          {mode === "edit" && (
            <View className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-[1.25rem] flex-row gap-3 shadow-sm">
              <AlertTriangle size={20} color="#d97706" />
              <Text className="text-[10px] text-amber-800 font-medium flex-1">
                Menyimpan perubahan akan mengembalikan status sopir menjadi <Text className="font-black">Pending</Text> untuk ditinjau ulang.
              </Text>
            </View>
          )}

          <View className="space-y-6">
            <View>
              <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Nama Lengkap Sopir</Text>
              <Input value={formData.name} onChangeText={t => setFormData({...formData, name: t})} placeholder="Sesuai KTP" className="bg-white border-2 border-slate-200" />
            </View>
            
            <View>
              <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">No. HP / WhatsApp Aktif</Text>
              <Input value={formData.phone} onChangeText={t => setFormData({...formData, phone: t})} keyboardType="phone-pad" placeholder="0812xxxxxx" className="bg-white font-mono font-bold border-2 border-slate-200" />
            </View>

            <View className="flex-row gap-4">
              <View className="flex-1">
                <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">No. NIK KTP</Text>
                <Input value={formData.nik} onChangeText={t => setFormData({...formData, nik: t})} keyboardType="numeric" placeholder="16 Digit" className="bg-white font-mono font-bold border-2 border-slate-200" />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">No. SIM</Text>
                <Input value={formData.simNumber} onChangeText={t => setFormData({...formData, simNumber: t})} placeholder="B / B1 / B2" className="bg-white font-mono font-bold uppercase border-2 border-slate-200" />
              </View>
            </View>

            <View className="pt-6 border-t-2 border-slate-100">
              <View className="flex-row items-center gap-1.5 mb-4">
                <Camera size={14} color="#64748b" />
                <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Upload Dokumen Legalitas</Text>
              </View>
              
              <View className="flex-row gap-3">
                <UploadBox label="Foto Diri" fileUri={files.profile} oldUrl={oldUrls.profile} onPress={() => handlePickImage('profile')} icon={<User size={20} />} />
                <UploadBox label="KTP" isRequired={mode === "add"} fileUri={files.ktp} oldUrl={oldUrls.ktp} onPress={() => handlePickImage('ktp')} icon={<ShieldAlert size={20} />} />
                <UploadBox label="SIM" isRequired={mode === "add"} fileUri={files.sim} oldUrl={oldUrls.sim} onPress={() => handlePickImage('sim')} icon={<CreditCard size={20} />} />
              </View>
            </View>
          </View>
          <View className="h-20" />
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
                  <Text className="text-white font-black uppercase tracking-widest ml-2">Simpan Data Sopir</Text>
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
