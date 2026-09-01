import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'expo-router';
import { 
  User, CreditCard, Car, ChevronRight, 
  ShieldCheck, FileText, Clock, AlertTriangle, Camera, Building2, Truck, Star, Trophy, Settings, LogOut, HelpCircle
} from 'lucide-react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { uploadToCloudinary } from '@/lib/cloudinary';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const { user, login, isVendor, logout } = useAuthStore();
  const router = useRouter();
  const [dbUser, setDbUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  const handleLogout = () => {
    Alert.alert(
      "Keluar Akun", 
      "Apakah Anda yakin ingin keluar?",
      [
        { text: "Batal", style: "cancel" },
        { text: "Keluar", style: "destructive", onPress: logout }
      ]
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color={vendorMode ? '#2563eb' : '#7a171d'} />
      </View>
    );
  }

  const isProfileComplete = dbUser?.profileCompleted === true;
  const isPendingApproval = isProfileComplete && dbUser?.status === 'Pending';
  const isVerified = isProfileComplete && dbUser?.status === 'Active';

  return (
    <View className="flex-1 bg-slate-50">
      
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        
        {/* 1. HERO SECTION (MEMBERSHIP ID CARD) */}
        <View className="px-5 pt-14 pb-8 relative z-10 bg-slate-50">
          <Animated.View 
            entering={FadeInDown.duration(600).springify()}
            className="rounded-[2.5rem] overflow-hidden"
          >
            {/* 3D Depth Layer */}
            <View className={`absolute inset-0 rounded-[2.5rem] top-2 left-0 right-0 bottom-[-8px] ${vendorMode ? 'bg-[#1e3a8a]' : 'bg-[#450a0a]'}`} />
            
            <View className={`rounded-[2.5rem] overflow-hidden border-2 relative p-6 ${vendorMode ? 'bg-[#2563eb] border-[#1e3a8a]' : 'bg-[#7a171d] border-[#450a0a]'}`}>
              <LinearGradient
                colors={vendorMode ? ['#1d4ed8', '#1e3a8a'] : ['#9A242B', '#7a171d']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                className="absolute inset-0"
              />
              <View className="absolute -right-12 -top-12 w-48 h-48 bg-white/5 rounded-full" />
              <View className="absolute -left-16 -bottom-16 w-56 h-56 bg-black/10 rounded-full" />

              <View className="relative z-10">
                <View className="flex-row items-center justify-between mb-6">
                  <View className="flex-row items-center gap-2 bg-black/20 px-3 py-1.5 rounded-xl border border-white/10">
                    <Trophy size={14} color="#FACC15" />
                    <Text className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">{vendorMode ? 'Vendor Elite' : 'Flash Driver'}</Text>
                  </View>
                  <TouchableOpacity onPress={() => Alert.alert("ID", user?.uid || "-")} className="bg-white/20 p-2 rounded-xl">
                    <QrCodeIcon size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>

                <View className="flex-row items-center gap-5">
                  <View className="w-20 h-20 relative">
                    <View className="w-full h-full rounded-2xl overflow-hidden border-4 border-white/20 bg-black/20">
                      {isUploadingFoto ? (
                        <View className="flex-1 items-center justify-center">
                          <ActivityIndicator color="#FFFFFF" size="small" />
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
                      className={`absolute -bottom-2 -right-2 p-2 rounded-xl border-2 border-white/20 ${vendorMode ? 'bg-[#3b82f6]' : 'bg-[#d97706]'}`}
                    >
                      <Camera size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>

                  <View className="flex-1">
                    <Text className="text-xl font-black text-white tracking-tight mb-1" numberOfLines={2}>
                      {vendorMode ? dbUser?.companyName || "Perusahaan" : dbUser?.displayName || "Sopir Flash"}
                    </Text>
                    <Text className="text-[11px] font-bold text-white/70 mb-3">{dbUser?.email || "Email tidak tersedia"}</Text>
                    
                    {isVerified ? (
                      <View className="self-start flex-row items-center gap-1.5 bg-emerald-500/20 border border-emerald-400/50 px-3 py-1 rounded-lg">
                        <ShieldCheck size={12} color="#6ee7b7" />
                        <Text className="text-emerald-300 text-[9px] font-black uppercase tracking-widest">Akun Terverifikasi</Text>
                      </View>
                    ) : (
                      <View className="self-start flex-row items-center gap-1.5 bg-white/10 border border-white/20 px-3 py-1 rounded-lg">
                        <AlertTriangle size={12} color="#fcd34d" />
                        <Text className="text-amber-300 text-[9px] font-black uppercase tracking-widest">Belum Verifikasi</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* STATS INCORPORATED INTO HERO SECTION */}
                <View className="mt-8 flex-row bg-black/20 rounded-2xl border border-white/10 p-4 justify-around">
                  <View className="items-center">
                    <View className="flex-row items-center gap-1 mb-1">
                      <Star size={12} color="#FCD34D" />
                      <Text className="text-[10px] text-white/70 font-black uppercase tracking-widest">Rating</Text>
                    </View>
                    <Text className="text-xl font-black text-white">4.9<Text className="text-xs text-white/50">/5</Text></Text>
                  </View>
                  <View className="w-px bg-white/10 h-full" />
                  <View className="items-center">
                    <View className="flex-row items-center gap-1 mb-1">
                      {vendorMode ? <Truck size={12} color="#93C5FD" /> : <Car size={12} color="#FCA5A5" />}
                      <Text className="text-[10px] text-white/70 font-black uppercase tracking-widest">Total Trip</Text>
                    </View>
                    <Text className="text-xl font-black text-white">142</Text>
                  </View>
                </View>

              </View>
            </View>
          </Animated.View>
        </View>

        {/* 2. ALERTS & NOTICES */}
        {(!isProfileComplete || isPendingApproval) && (
          <Animated.View entering={FadeInDown.duration(600).delay(300)} className="px-5 mb-8 space-y-4">
            {!isProfileComplete && (
              <View className="bg-amber-400 border-2 border-amber-500 rounded-[1.5rem] p-5 shadow-sm relative overflow-hidden">
                <View className="absolute -right-4 -bottom-4 opacity-20">
                  <AlertTriangle size={100} color="#000" />
                </View>
                <View className="flex-row gap-3 mb-4 relative z-10">
                  <View className="w-10 h-10 bg-white/30 rounded-xl items-center justify-center">
                    <AlertTriangle size={20} color="#78350f" />
                  </View>
                  <View className="flex-1 justify-center">
                    <Text className="text-sm font-black text-amber-900 tracking-tight">Akun Belum Lengkap!</Text>
                    <Text className="text-[10px] text-amber-800 font-bold uppercase tracking-widest">Selesaikan pendaftaran Anda</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => router.push('/profile/onboarding')} className="bg-amber-900 rounded-xl h-12 items-center justify-center border border-amber-950 relative z-10">
                  <Text className="text-white text-xs font-black uppercase tracking-widest">Verifikasi Sekarang</Text>
                </TouchableOpacity>
              </View>
            )}

            {isPendingApproval && (
              <View className="bg-blue-500 border-2 border-blue-600 rounded-[1.5rem] p-5 relative overflow-hidden">
                <View className="absolute -right-4 -bottom-4 opacity-20">
                  <Clock size={100} color="#000" />
                </View>
                <View className="flex-row gap-3 relative z-10">
                  <View className="w-10 h-10 bg-white/30 rounded-xl items-center justify-center">
                    <Clock size={20} color="#1e3a8a" />
                  </View>
                  <View className="flex-1 justify-center">
                    <Text className="text-sm font-black text-white tracking-tight">Sedang Ditinjau Admin</Text>
                    <Text className="text-[10px] text-blue-100 font-bold leading-relaxed pr-4">Mohon tunggu 1x24 jam untuk proses validasi dokumen kendaraan Anda.</Text>
                  </View>
                </View>
              </View>
            )}
          </Animated.View>
        )}

        {/* 4. MAIN MENU GROUPS (DANA Vibe) */}
        <Animated.View entering={FadeInDown.duration(600).delay(400)} className="px-5">
          
          {/* Akun & Keamanan */}
          <View>
            <Text className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Akun & Kendaraan</Text>
            <View className="bg-white rounded-[2rem] border-2 border-slate-200 overflow-hidden">
              
              {isProfileComplete && (
                <TouchableOpacity onPress={() => router.push('/profile/onboarding')} className="p-4 flex-row items-center justify-between border-b-2 border-slate-50 active:bg-slate-50">
                  <View className="flex-row items-center gap-4">
                    <View className={`w-10 h-10 rounded-xl items-center justify-center border-2 ${vendorMode ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
                      {vendorMode ? <Building2 size={18} color="#2563eb" /> : <Car size={18} color="#ef4444" />}
                    </View>
                    <View>
                      <Text className="text-sm font-black text-slate-800 tracking-tight">{vendorMode ? 'Profil Perusahaan' : 'Data Sopir & Kendaraan'}</Text>
                      <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{dbUser?.licensePlate || "Ubah Data Pribadi"}</Text>
                    </View>
                  </View>
                  <View className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"><ChevronRight size={16} color="#64748b" /></View>
                </TouchableOpacity>
              )}

              <TouchableOpacity className="p-4 flex-row items-center justify-between border-b-2 border-slate-50 active:bg-slate-50">
                <View className="flex-row items-center gap-4">
                  <View className="w-10 h-10 rounded-xl items-center justify-center border-2 bg-emerald-50 border-emerald-100">
                    <CreditCard size={18} color="#10b981" />
                  </View>
                  <View>
                    <Text className="text-sm font-black text-slate-800 tracking-tight">Akun Bank & Pencairan</Text>
                    <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Pengaturan Dana</Text>
                  </View>
                </View>
                <View className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"><ChevronRight size={16} color="#64748b" /></View>
              </TouchableOpacity>

              <TouchableOpacity className="p-4 flex-row items-center justify-between active:bg-slate-50">
                <View className="flex-row items-center gap-4">
                  <View className="w-10 h-10 rounded-xl items-center justify-center border-2 bg-amber-50 border-amber-100">
                    <FileText size={18} color="#d97706" />
                  </View>
                  <View>
                    <Text className="text-sm font-black text-slate-800 tracking-tight">Dokumen Legalitas</Text>
                    <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">KTP, SIM, STNK</Text>
                  </View>
                </View>
                <View className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"><ChevronRight size={16} color="#64748b" /></View>
              </TouchableOpacity>

            </View>
          </View>

          {/* Pengaturan & Bantuan */}
          <View className="mt-8">
            <Text className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Lainnya</Text>
            <View className="bg-white rounded-[2rem] border-2 border-slate-200 overflow-hidden">
              
              <TouchableOpacity className="p-4 flex-row items-center justify-between border-b-2 border-slate-50 active:bg-slate-50">
                <View className="flex-row items-center gap-4">
                  <View className="w-10 h-10 rounded-xl items-center justify-center border-2 bg-indigo-50 border-indigo-100">
                    <HelpCircle size={18} color="#6366f1" />
                  </View>
                  <View>
                    <Text className="text-sm font-black text-slate-800 tracking-tight">Pusat Bantuan</Text>
                    <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Hubungi CS Flash</Text>
                  </View>
                </View>
                <View className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"><ChevronRight size={16} color="#64748b" /></View>
              </TouchableOpacity>

              <TouchableOpacity className="p-4 flex-row items-center justify-between active:bg-slate-50">
                <View className="flex-row items-center gap-4">
                  <View className="w-10 h-10 rounded-xl items-center justify-center border-2 bg-slate-100 border-slate-200">
                    <Settings size={18} color="#475569" />
                  </View>
                  <View>
                    <Text className="text-sm font-black text-slate-800 tracking-tight">Pengaturan Aplikasi</Text>
                    <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Notifikasi, Keamanan</Text>
                  </View>
                </View>
                <View className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"><ChevronRight size={16} color="#64748b" /></View>
              </TouchableOpacity>

            </View>
          </View>

        </Animated.View>

        {/* LOGOUT BUTTON */}
        <Animated.View entering={FadeInDown.duration(600).delay(500)} className="px-5 mt-10">
          <TouchableOpacity 
            onPress={handleLogout}
            activeOpacity={0.8}
            className="bg-white border-2 border-red-100 rounded-[1.5rem] p-4 flex-row items-center justify-center gap-2"
          >
            <LogOut size={16} color="#ef4444" />
            <Text className="text-sm font-black text-red-500 uppercase tracking-widest">Keluar Akun</Text>
          </TouchableOpacity>
          <Text className="text-center text-[9px] font-bold text-slate-400 mt-4 tracking-widest uppercase">Flash Global v1.0.0</Text>
        </Animated.View>

      </ScrollView>
    </View>
  );
}

// QrCodeIcon Helper since it was missing from lucide import
function QrCodeIcon({ size, color }: { size: number, color: string }) {
  return (
    <View style={{ width: size, height: size, borderWidth: 2, borderColor: color, borderRadius: 4, padding: 2 }}>
      <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
         <View style={{ width: '40%', height: '40%', backgroundColor: color }} />
         <View style={{ width: '40%', height: '40%', backgroundColor: color }} />
         <View style={{ width: '40%', height: '40%', backgroundColor: color, marginTop: '20%' }} />
         <View style={{ width: '40%', height: '40%', backgroundColor: color, marginTop: '20%', borderRadius: 2 }} />
      </View>
    </View>
  )
}

