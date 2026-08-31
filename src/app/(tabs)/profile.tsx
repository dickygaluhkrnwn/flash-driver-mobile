import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  User, CreditCard, Car, ChevronRight, 
  ShieldCheck, FileText, Clock, AlertTriangle, Camera, Building2, Truck 
} from 'lucide-react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { Header } from '@/components/Header';
import { OnboardingWizard } from '@/components/profile/OnboardingWizard';
import { Button } from '@/components/ui/Button';

export default function ProfileScreen() {
  const { user, login, isVendor } = useAuthStore();
  const [dbUser, setDbUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [isUploadingFoto, setIsUploadingFoto] = useState(false);

  const vendorMode = isVendor();

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) setDbUser(userDoc.data());
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [user]);

  const showToast = (message: string, type: string = 'error') => {
    Alert.alert(type === 'success' ? 'Sukses' : 'Gagal', message);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast('Mohon izinkan akses galeri untuk upload foto profil', 'error');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && user) {
      setIsUploadingFoto(true);
      try {
        const uploadedUrl = await uploadToCloudinary(result.assets[0].uri);
        await updateDoc(doc(db, "users", user.uid), { photoURL: uploadedUrl });
        
        setDbUser((prev: any) => ({ ...prev, photoURL: uploadedUrl }));
        login({ ...user, photoURL: uploadedUrl });
        
        showToast("Foto profil diperbarui!", "success");
      } catch (err) {
        showToast("Gagal mengunggah foto profil.", "error");
      } finally {
        setIsUploadingFoto(false);
      }
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color={vendorMode ? '#3b82f6' : '#7A171D'} />
      </View>
    );
  }

  const isProfileComplete = dbUser?.profileCompleted === true;
  const isPendingApproval = isProfileComplete && dbUser?.status === 'Pending';
  const isVerified = isProfileComplete && dbUser?.status === 'Active';

  return (
    <View className="flex-1 bg-slate-50">
      
      {showWizard && (
        <OnboardingWizard 
          dbUser={dbUser} 
          onClose={() => setShowWizard(false)} 
          showToast={showToast}
          onSuccess={async (payload) => {
            // Update to DB and Store
            try {
              if (user) {
                await updateDoc(doc(db, "users", user.uid), { ...payload, profileCompleted: true });
                setDbUser((prev: any) => ({ ...prev, profileCompleted: true, ...payload }));
                login({ ...user, ...payload });
                setShowWizard(false);
                showToast("Verifikasi berhasil dikirim ke Admin!", "success");
              }
            } catch (e) {
              showToast("Gagal menyimpan data", "error");
            }
          }}
        />
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} bounces={false}>
        
        {/* HERO SECTION */}
        <View className={`pt-20 pb-16 px-6 rounded-b-[3rem] items-center shadow-lg relative ${vendorMode ? 'bg-blue-600' : 'bg-[#7A171D]'}`}>
          
          <View className="w-28 h-28 mb-4 relative">
            <View className={`w-full h-full rounded-[1.5rem] overflow-hidden border-4 border-white/20 shadow-xl ${vendorMode ? 'bg-blue-800' : 'bg-[#5A0E13]'}`}>
              {isUploadingFoto ? (
                <View className="flex-1 items-center justify-center bg-black/20">
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              ) : (
                <Image 
                  source={{ uri: dbUser?.photoURL || `https://ui-avatars.com/api/?name=${dbUser?.companyName || dbUser?.displayName || "Mitra"}&background=${vendorMode ? '1e3a8a' : '5A0E13'}&color=fff&size=200` }} 
                  style={{ width: '100%', height: '100%' }}
                />
              )}
            </View>
            <TouchableOpacity 
              onPress={pickImage}
              className={`absolute -bottom-2 -right-2 p-2.5 rounded-xl shadow-lg border border-white/20 ${vendorMode ? 'bg-blue-500' : 'bg-[#C5A059]'}`}
            >
              <Camera size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text className="text-2xl font-black text-white tracking-tight drop-shadow-md text-center">
            {vendorMode ? dbUser?.companyName || "Perusahaan" : dbUser?.displayName || "Sopir"}
          </Text>
          <Text className="text-white/80 text-sm font-medium mb-4">{dbUser?.email}</Text>
          
          {isVerified ? (
            <View className="flex-row items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/50 px-4 py-1.5 rounded-full">
              <ShieldCheck size={14} color="#6ee7b7" />
              <Text className="text-emerald-300 text-[10px] font-black uppercase tracking-widest">
                Terverifikasi {vendorMode ? 'Vendor' : 'Mandiri'}
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-1.5 bg-white/10 border border-white/20 px-4 py-1.5 rounded-full">
              {vendorMode ? <Building2 size={14} color="#FFFFFF" /> : <User size={14} color="#FFFFFF" />}
              <Text className="text-white text-[10px] font-black uppercase tracking-widest">
                Akun Dasar (Belum Verifikasi)
              </Text>
            </View>
          )}
        </View>

        {/* BODY */}
        <View className="p-5 -mt-8 space-y-5">
          
          {!isProfileComplete && (
            <View className="bg-amber-50 rounded-[1.5rem] p-5 border border-amber-200/50 shadow-md flex-row gap-3 relative overflow-hidden">
              <View className="w-10 h-10 bg-amber-100 rounded-xl items-center justify-center border border-amber-200 shrink-0">
                <AlertTriangle size={20} color="#d97706" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-black text-amber-900 mb-0.5 tracking-tight">Lengkapi Pendaftaran</Text>
                <Text className="text-xs text-amber-800 mb-3 font-medium">Tentukan entitas Pribadi atau Perusahaan Anda sekarang.</Text>
                <Button 
                  onPress={() => setShowWizard(true)} 
                  variant="gold" 
                  size="sm"
                >
                  Mulai Verifikasi Akun
                </Button>
              </View>
            </View>
          )}

          {isPendingApproval && (
            <View className="bg-blue-50 rounded-[1.5rem] p-5 border border-blue-200/50 shadow-md flex-row gap-3">
              <View className="w-10 h-10 bg-blue-100 rounded-xl items-center justify-center border border-blue-200 shrink-0">
                <Clock size={20} color="#2563eb" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-black text-blue-900 mb-0.5 tracking-tight">Menunggu Persetujuan Admin</Text>
                <Text className="text-xs text-blue-800 font-medium leading-tight">Dokumen Anda sedang diperiksa secara manual oleh Tim Kemitraan Flash Global.</Text>
              </View>
            </View>
          )}

          {isProfileComplete && (
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => setShowWizard(true)}
              className="bg-white rounded-[1.5rem] p-5 border border-slate-100 shadow-sm flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-4">
                <View className={`w-12 h-12 rounded-[1rem] flex items-center justify-center border ${vendorMode ? 'bg-blue-50 border-blue-100' : 'bg-[#C5A059]/10 border-[#C5A059]/20'}`}>
                  {vendorMode ? <Truck size={24} color="#2563eb" /> : <Car size={24} color="#A68345" />}
                </View>
                <View>
                  <Text className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{vendorMode ? 'Manajemen Armada' : dbUser?.vehicleType || "Tipe Kendaraan"}</Text>
                  <Text className="text-base font-black text-slate-800 tracking-tight">{vendorMode ? 'Akses Portal Vendor' : dbUser?.licensePlate || "Belum ada plat"}</Text>
                </View>
              </View>
              <View className={`px-3 py-1.5 rounded-lg border ${vendorMode ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                <Text className={`text-[10px] font-black uppercase tracking-widest ${vendorMode ? 'text-blue-600' : 'text-slate-600'}`}>Edit</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* MENU LIST */}
          <View className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <MenuRow 
              icon={vendorMode ? <Building2 size={16} color="#3b82f6" /> : <User size={16} color="#7A171D" />} 
              title={vendorMode ? "Informasi PT/CV" : "Informasi Pribadi"} 
              bgIcon={vendorMode ? "bg-blue-50" : "bg-[#7A171D]/10"}
            />
            <MenuRow 
              icon={<CreditCard size={16} color="#10b981" />} 
              title={vendorMode ? "Rekening Perusahaan" : "Rekening & Pencairan"} 
              bgIcon="bg-emerald-50"
            />
            <MenuRow 
              icon={<FileText size={16} color="#f59e0b" />} 
              title="Dokumen Legalitas" 
              bgIcon="bg-amber-50"
            />
            <MenuRow 
              icon={<ShieldCheck size={16} color="#6366f1" />} 
              title="Pusat Bantuan & Tiket" 
              border={false} 
              bgIcon="bg-indigo-50"
            />
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

function MenuRow({ icon, title, border = true, bgIcon = "bg-slate-100" }: { icon: React.ReactNode, title: string, border?: boolean, bgIcon?: string }) {
  return (
    <TouchableOpacity className={`w-full flex-row items-center justify-between p-4 active:bg-slate-50 ${border ? 'border-b border-slate-100' : ''}`}>
      <View className="flex-row items-center gap-3.5">
        <View className={`w-8 h-8 rounded-lg items-center justify-center border border-white shadow-sm ${bgIcon}`}>
          {icon}
        </View>
        <Text className="text-sm font-bold text-slate-800">{title}</Text>
      </View>
      <ChevronRight color="#cbd5e1" size={18} />
    </TouchableOpacity>
  );
}
