import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/useAuthStore';
import { Input } from '@/components/ui/Input';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { uploadToCloudinary } from '@/lib/cloudinary';
import {
  ArrowLeft, CheckCircle2, ChevronRight, User,
  Building2, MapPin, Truck, CreditCard, ShieldCheck,
  Phone, Upload, ChevronDown
} from 'lucide-react-native';

interface DynamicVehicle {
  id: string;
  name: string;
  category: string;
  maxWeight: number;
}

// Steps based on type:
// Individual: 1=Tipe, 2=Data Diri, 3=Data Kendaraan, 4=Upload Dokumen
// Vendor:     1=Tipe, 2=Data Perusahaan, 3=Upload Dokumen

export default function OnboardingPage() {
  const router = useRouter();
  const { user, login } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState(0); // 0 = pilih tipe

  const [partnerType, setPartnerType] = useState<'Individual' | 'Vendor' | null>(null);
  const [vehicleConfigs, setVehicleConfigs] = useState<DynamicVehicle[]>([]);
  const [isVehicleDropdownOpen, setIsVehicleDropdownOpen] = useState(false);
  const [isDetectingGPS, setIsDetectingGPS] = useState(false);

  const [formData, setFormData] = useState({
    phone: '', domisili: '', baseAddress: '',
    baseCoords: { lat: 0, lng: 0 },
    // Individual
    nik: '', simNumber: '', vehicleType: '', licensePlate: '',
    fotoKtpUrl: '', fotoSimUrl: '', stnkUrl: '', fotoKendaraanUrl: '',
    // Vendor
    companyName: '', npwp: '', npwpUrl: '', nibUrl: '',
  });

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setFormData(prev => ({ ...prev, ...data }));
          if (data.partnerType) setPartnerType(data.partnerType as 'Individual' | 'Vendor');
          if (data.partnerType) setStep(1);
        }

        const pricingSnap = await getDoc(doc(db, 'settings', 'pricing'));
        if (pricingSnap.exists() && pricingSnap.data().customVehicles) {
          const vehicles = pricingSnap.data().customVehicles.filter((v: DynamicVehicle) => v.category !== 'Truk');
          setVehicleConfigs(vehicles);
          if (!formData.vehicleType && vehicles.length > 0) {
            setFormData(prev => ({ ...prev, vehicleType: vehicles[0].name }));
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [user]);

  const handlePickImage = async (field: keyof typeof formData) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin Ditolak', 'Akses galeri dibutuhkan untuk upload dokumen.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      Alert.alert('Mengunggah...', 'Mohon tunggu sebentar.');
      try {
        const url = await uploadToCloudinary(result.assets[0].uri);
        setFormData(prev => ({ ...prev, [field]: url }));
      } catch {
        Alert.alert('Gagal', 'Upload dokumen gagal. Coba lagi.');
      }
    }
  };

  const handleGetGPS = async () => {
    setIsDetectingGPS(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin Ditolak', 'Akses lokasi dibutuhkan.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = loc.coords;
      
      let detectedCity = 'Pusat';
      try {
        const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
        detectedCity = geo.city || geo.subregion || geo.region || 'Pusat';
      } catch {}
      
      setFormData(prev => ({
        ...prev,
        baseCoords: { lat: latitude, lng: longitude },
        baseAddress: `GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
        domisili: detectedCity,
      }));
      Alert.alert('Sukses', `Lokasi dikunci di: ${detectedCity}`);
    } catch {
      Alert.alert('Gagal', 'Tidak dapat mendeteksi lokasi GPS.');
    } finally {
      setIsDetectingGPS(false);
    }
  };

  const validateCurrentStep = (): boolean => {
    if (step === 1) {
      if (!formData.phone.trim()) { Alert.alert('Peringatan', 'No. HP wajib diisi.'); return false; }
      if (partnerType === 'Individual') {
        if (!formData.nik.trim()) { Alert.alert('Peringatan', 'NIK KTP wajib diisi.'); return false; }
        if (!formData.simNumber.trim()) { Alert.alert('Peringatan', 'Nomor SIM wajib diisi.'); return false; }
      } else {
        if (!formData.companyName.trim()) { Alert.alert('Peringatan', 'Nama perusahaan wajib diisi.'); return false; }
        if (!formData.npwp.trim()) { Alert.alert('Peringatan', 'NPWP wajib diisi.'); return false; }
      }
    }
    if (step === 2 && partnerType === 'Individual') {
      if (!formData.vehicleType) { Alert.alert('Peringatan', 'Pilih tipe kendaraan.'); return false; }
      if (!formData.licensePlate.trim()) { Alert.alert('Peringatan', 'Plat nomor wajib diisi.'); return false; }
    }
    if ((step === 3 && partnerType === 'Individual') || (step === 2 && partnerType === 'Vendor')) {
      if (partnerType === 'Individual') {
        if (!formData.fotoKtpUrl || !formData.fotoSimUrl || !formData.stnkUrl || !formData.fotoKendaraanUrl) {
          Alert.alert('Peringatan', 'Semua dokumen wajib diunggah.'); return false;
        }
      } else {
        if (!formData.npwpUrl || !formData.nibUrl || !formData.fotoKtpUrl) {
          Alert.alert('Peringatan', 'Semua dokumen wajib diunggah.'); return false;
        }
      }
    }
    return true;
  };

  const maxSteps = partnerType === 'Vendor' ? 3 : 4;

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    if (step < maxSteps) setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!user || !partnerType) return;
    if (formData.baseCoords.lat === 0) {
      Alert.alert('Peringatan', 'Harap kunci lokasi GPS base Anda terlebih dahulu.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: user.displayName || 'Tanpa Nama',
        email: user.email,
        phone: formData.phone,
        partnerType,
        status: 'Pending',
        isSuspended: false,
        balance: 0,
        profileCompleted: true,
        baseCoords: formData.baseCoords,
        baseAddress: formData.baseAddress,
        domisili: formData.domisili || 'Pusat',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (partnerType === 'Individual') {
        Object.assign(payload, {
          nik: formData.nik,
          simNumber: formData.simNumber,
          vehicleType: formData.vehicleType,
          licensePlate: formData.licensePlate.toUpperCase(),
          fotoKtpUrl: formData.fotoKtpUrl,
          fotoSimUrl: formData.fotoSimUrl,
          stnkUrl: formData.stnkUrl,
          fotoKendaraanUrl: formData.fotoKendaraanUrl,
        });
      } else {
        Object.assign(payload, {
          companyName: formData.companyName,
          npwp: formData.npwp,
          npwpUrl: formData.npwpUrl,
          nibUrl: formData.nibUrl,
          fotoKtpUrl: formData.fotoKtpUrl,
        });
      }

      await updateDoc(doc(db, 'users', user.uid), payload);
      await setDoc(doc(db, 'driver_wallets', user.uid), payload, { merge: true });
      login({ ...user, ...payload });

      Alert.alert('Sukses!', 'Verifikasi berhasil dikirim ke Admin. Mohon tunggu 1x24 jam.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('Gagal', 'Terjadi kesalahan saat menyimpan data.');
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

  const isVendor = partnerType === 'Vendor';
  const accentColor = isVendor ? '#2563eb' : '#7a171d';
  const shadowColor = isVendor ? '#1e3a8a' : '#450a0a';
  const progressPct = partnerType ? (step / maxSteps) * 100 : 0;

  return (
    <View className="flex-1 bg-slate-50">

      {/* HEADER */}
      <View className="relative overflow-hidden">
        <LinearGradient
          colors={isVendor ? ['#1e3a8a', '#2563eb'] : ['#450a0a', '#7a171d']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ paddingTop: 56, paddingBottom: 28, paddingHorizontal: 20 }}
        >
          <View className="absolute -right-10 -top-10 w-48 h-48 bg-white/5 rounded-full" />
          <View className="absolute -left-16 bottom-0 w-48 h-48 bg-black/10 rounded-full" />
          <View className="flex-row items-center gap-4 relative z-10 mb-5">
            <TouchableOpacity
              onPress={() => { if (step === 0 || step === 1) router.back(); else setStep(step - 1); }}
              className="w-10 h-10 bg-white/20 rounded-full items-center justify-center border border-white/20"
            >
              <ArrowLeft size={20} color="#FFF" />
            </TouchableOpacity>
            <View>
              <Text className="text-xl font-black text-white tracking-tight">Verifikasi Profil</Text>
              <Text className="text-[10px] font-black text-white/60 uppercase tracking-widest">
                {partnerType ? `Langkah ${step} dari ${maxSteps}` : 'Pilih Tipe Kemitraan'}
              </Text>
            </View>
          </View>
          {/* Progress bar */}
          <View className="h-1.5 bg-white/20 rounded-full overflow-hidden relative z-10">
            <View style={{ width: `${progressPct}%`, height: '100%', backgroundColor: '#FFF', borderRadius: 99 }} />
          </View>
        </LinearGradient>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView className="flex-1 px-5 py-6" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* â”€â”€â”€ STEP 0: PILIH TIPE â”€â”€â”€ */}
          {step === 0 && (
            <Animated.View entering={FadeInDown.duration(400).springify()}>
              <View className="mb-6">
                <Text className="text-2xl font-black text-slate-800 tracking-tight">Tentukan Tipe Anda</Text>
                <Text className="text-xs font-bold text-slate-400 mt-1">Pilih entitas operasional Anda untuk melanjutkan.</Text>
              </View>
              <View className="space-y-4">
                <TouchableOpacity activeOpacity={0.8} onPress={() => { setPartnerType('Individual'); setStep(1); }}>
                  <View className="rounded-[1.5rem] p-5 border-2 border-slate-200 bg-white">
                    <View className="w-14 h-14 bg-red-50 rounded-2xl items-center justify-center border-2 border-red-100 mb-4">
                      <User size={26} color="#7a171d" />
                    </View>
                    <Text className="text-base font-black text-slate-800 tracking-tight">Mitra Individu (Pribadi)</Text>
                    <Text className="text-[11px] font-medium text-slate-500 mt-1">Mendaftar sebagai pengemudi mandiri dengan 1 unit kendaraan pribadi.</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.8} onPress={() => { setPartnerType('Vendor'); setStep(1); }}>
                  <View className="rounded-[1.5rem] p-5 border-2 border-slate-200 bg-white">
                    <View className="w-14 h-14 bg-blue-50 rounded-2xl items-center justify-center border-2 border-blue-100 mb-4">
                      <Building2 size={26} color="#2563eb" />
                    </View>
                    <Text className="text-base font-black text-slate-800 tracking-tight">Mitra Vendor (PT/CV)</Text>
                    <Text className="text-[11px] font-medium text-slate-500 mt-1">Mendaftar sebagai perusahaan berbadan hukum yang mengelola banyak armada truk.</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* â”€â”€â”€ STEP 1: DATA DIRI / PERUSAHAAN â”€â”€â”€ */}
          {partnerType && step === 1 && (
            <Animated.View entering={FadeInDown.duration(400).springify()}>
              <View className="mb-6">
                <Text className="text-2xl font-black text-slate-800 tracking-tight">
                  {isVendor ? 'Data Perusahaan' : 'Data Pribadi'}
                </Text>
                <Text className="text-xs font-bold text-slate-400 mt-1">Isi dengan data yang valid dan sesuai dokumen resmi.</Text>
              </View>
              <View className="bg-white rounded-[1.5rem] border-2 border-slate-200 p-5 space-y-5">
                <View>
                  <View className="flex-row items-center gap-2 mb-2">
                    <Phone size={14} color="#94a3b8" />
                    <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      {isVendor ? 'No. HP Manager' : 'No. HP / WhatsApp'}
                    </Text>
                  </View>
                  <Input value={formData.phone} onChangeText={t => setFormData(p => ({ ...p, phone: t }))} placeholder="08123xxxx" keyboardType="phone-pad" className="bg-slate-50 border-2 border-slate-200 font-bold" />
                </View>

                {!isVendor ? (
                  <>
                    <View>
                      <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Nomor Induk Kependudukan (NIK)</Text>
                      <Input value={formData.nik} onChangeText={t => setFormData(p => ({ ...p, nik: t }))} placeholder="16 digit NIK" keyboardType="numeric" className="bg-slate-50 border-2 border-slate-200 font-mono font-bold" />
                    </View>
                    <View>
                      <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Nomor SIM Aktif</Text>
                      <Input value={formData.simNumber} onChangeText={t => setFormData(p => ({ ...p, simNumber: t }))} placeholder="Nomor SIM" className="bg-slate-50 border-2 border-slate-200 font-mono font-bold uppercase" autoCapitalize="characters" />
                    </View>
                  </>
                ) : (
                  <>
                    <View>
                      <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Nama Entitas (PT/CV)</Text>
                      <Input value={formData.companyName} onChangeText={t => setFormData(p => ({ ...p, companyName: t }))} placeholder="PT Sukses Makmur" className="bg-slate-50 border-2 border-slate-200 font-bold" />
                    </View>
                    <View>
                      <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">NPWP Perusahaan</Text>
                      <Input value={formData.npwp} onChangeText={t => setFormData(p => ({ ...p, npwp: t }))} placeholder="Nomor NPWP" className="bg-slate-50 border-2 border-slate-200 font-mono font-bold" />
                    </View>
                  </>
                )}
              </View>
            </Animated.View>
          )}

          {/* â”€â”€â”€ STEP 2 (INDIVIDUAL): DATA KENDARAAN â”€â”€â”€ */}
          {partnerType === 'Individual' && step === 2 && (
            <Animated.View entering={FadeInDown.duration(400).springify()}>
              <View className="mb-6">
                <Text className="text-2xl font-black text-slate-800 tracking-tight">Detail Kendaraan</Text>
                <Text className="text-xs font-bold text-slate-400 mt-1">Informasi armada yang Anda gunakan beroperasi.</Text>
              </View>
              <View className="bg-white rounded-[1.5rem] border-2 border-slate-200 p-5 space-y-5">
                {/* Dynamic Vehicle Dropdown */}
                <View className="relative z-50">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Truck size={14} color="#94a3b8" />
                    <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Klasifikasi Kendaraan</Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setIsVehicleDropdownOpen(!isVehicleDropdownOpen)}
                    className={`w-full px-5 py-4 bg-slate-50 rounded-2xl flex-row items-center justify-between border-2 ${isVehicleDropdownOpen ? 'border-[#7a171d]' : 'border-slate-200'}`}
                  >
                    <Text className={`text-sm font-black ${formData.vehicleType ? 'text-slate-900' : 'text-slate-400'}`}>
                      {formData.vehicleType || '-- Pilih Jenis --'}
                    </Text>
                    <ChevronDown size={20} color="#94a3b8" />
                  </TouchableOpacity>
                  {isVehicleDropdownOpen && (
                    <View className="absolute top-[80px] left-0 right-0 bg-white border border-slate-100 rounded-2xl shadow-lg max-h-52 overflow-hidden z-50">
                      <ScrollView nestedScrollEnabled>
                        {vehicleConfigs.length === 0 && (
                          <Text className="p-4 text-center text-xs font-bold text-slate-500">Data kendaraan belum tersedia</Text>
                        )}
                        {vehicleConfigs.map((v) => (
                          <TouchableOpacity
                            key={v.id}
                            onPress={() => { setFormData(p => ({ ...p, vehicleType: v.name })); setIsVehicleDropdownOpen(false); }}
                            className="px-5 py-4 border-b border-slate-100 bg-white"
                          >
                            <Text className="font-black text-slate-800 tracking-tight">{v.name}</Text>
                            <Text className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Maks muatan: {v.maxWeight} Kg</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View>
                  <View className="flex-row items-center gap-2 mb-2">
                    <CreditCard size={14} color="#94a3b8" />
                    <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nomor Polisi (Plat)</Text>
                  </View>
                  <Input value={formData.licensePlate} onChangeText={t => setFormData(p => ({ ...p, licensePlate: t.toUpperCase() }))} placeholder="B 1234 ABC" className="bg-slate-50 border-2 border-slate-200 font-black font-mono uppercase" autoCapitalize="characters" />
                </View>
              </View>
            </Animated.View>
          )}

          {/* â”€â”€â”€ STEP UPLOAD DOKUMEN â”€â”€â”€ */}
          {((partnerType === 'Individual' && step === 3) || (partnerType === 'Vendor' && step === 2)) && (
            <Animated.View entering={FadeInDown.duration(400).springify()}>
              <View className="mb-6">
                <Text className="text-2xl font-black text-slate-800 tracking-tight">Upload Berkas Fisik</Text>
                <Text className="text-xs font-bold text-slate-400 mt-1">Semua dokumen wajib diunggah untuk verifikasi.</Text>
              </View>
              <View className="space-y-3">
                {!isVendor ? (
                  <>
                    <DocUploadBox label="Foto KTP Asli" url={formData.fotoKtpUrl} onPress={() => handlePickImage('fotoKtpUrl')} />
                    <DocUploadBox label="Foto SIM Aktif" url={formData.fotoSimUrl} onPress={() => handlePickImage('fotoSimUrl')} />
                    <DocUploadBox label="Foto STNK Kendaraan" url={formData.stnkUrl} onPress={() => handlePickImage('stnkUrl')} />
                    <DocUploadBox label="Foto Diri & Kendaraan" url={formData.fotoKendaraanUrl} onPress={() => handlePickImage('fotoKendaraanUrl')} />
                  </>
                ) : (
                  <>
                    <DocUploadBox label="Scan NPWP Perusahaan" url={formData.npwpUrl} onPress={() => handlePickImage('npwpUrl')} />
                    <DocUploadBox label="NIB / Izin Usaha Dasar" url={formData.nibUrl} onPress={() => handlePickImage('nibUrl')} />
                    <DocUploadBox label="KTP Penanggung Jawab" url={formData.fotoKtpUrl} onPress={() => handlePickImage('fotoKtpUrl')} />
                  </>
                )}
              </View>
            </Animated.View>
          )}

          {/* â”€â”€â”€ STEP TERAKHIR: LOKASI BASE â”€â”€â”€ */}
          {((partnerType === 'Individual' && step === 4) || (partnerType === 'Vendor' && step === 3)) && (
            <Animated.View entering={FadeInDown.duration(400).springify()}>
              <View className="mb-6">
                <Text className="text-2xl font-black text-slate-800 tracking-tight">Titik Pangkal (Base)</Text>
                <Text className="text-xs font-bold text-slate-400 mt-1">Tentukan lokasi asal operasional Anda agar lebih mudah mendapat order.</Text>
              </View>

              {/* GPS Status Card */}
              <View className={`rounded-[1.5rem] p-5 border-2 mb-4 ${formData.baseCoords.lat !== 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                <View className="flex-row items-center gap-3 mb-3">
                  <View className={`w-10 h-10 rounded-xl items-center justify-center border-2 ${formData.baseCoords.lat !== 0 ? 'bg-emerald-100 border-emerald-300' : 'bg-slate-100 border-slate-200'}`}>
                    <MapPin size={18} color={formData.baseCoords.lat !== 0 ? '#059669' : '#94a3b8'} />
                  </View>
                  <View className="flex-1">
                    <Text className={`text-sm font-black ${formData.baseCoords.lat !== 0 ? 'text-emerald-800' : 'text-slate-600'}`}>
                      {formData.baseCoords.lat !== 0 ? 'Lokasi Terkunci!' : 'Belum ada lokasi'}
                    </Text>
                    <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest" numberOfLines={1}>
                      {formData.baseAddress || 'Ketuk tombol di bawah untuk deteksi GPS'}
                    </Text>
                  </View>
                  {formData.baseCoords.lat !== 0 && <CheckCircle2 size={20} color="#059669" />}
                </View>

                {formData.domisili ? (
                  <View className="bg-white/80 rounded-xl px-4 py-2 flex-row items-center gap-2">
                    <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kota:</Text>
                    <Text className="text-sm font-black text-slate-800">{formData.domisili}</Text>
                  </View>
                ) : null}
              </View>

              {/* GPS Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleGetGPS}
                disabled={isDetectingGPS}
                className="relative mb-4"
              >
                <View className="absolute inset-0 bg-slate-300 rounded-[1.25rem] translate-y-1.5" />
                <View className="h-14 bg-white rounded-[1.25rem] border-2 border-slate-300 flex-row items-center justify-center relative z-10 gap-2">
                  {isDetectingGPS ? (
                    <ActivityIndicator size="small" color="#7a171d" />
                  ) : (
                    <MapPin size={18} color="#7a171d" />
                  )}
                  <Text className="font-black text-slate-700 uppercase tracking-widest">
                    {isDetectingGPS ? 'Mendeteksi...' : 'Kunci GPS Saat Ini'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Manual domisili input */}
              <View className="bg-white rounded-[1.5rem] border-2 border-slate-200 p-5">
                <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Atau isi kota domisili manual</Text>
                <Input
                  value={formData.domisili}
                  onChangeText={t => setFormData(p => ({ ...p, domisili: t }))}
                  placeholder="Contoh: Jakarta Selatan"
                  className="bg-slate-50 border-2 border-slate-200 font-bold"
                />
              </View>
            </Animated.View>
          )}

          <View className="h-36" />
        </ScrollView>

        {/* STICKY FOOTER */}
        {step > 0 && (
          <View className="p-6 bg-white border-t border-slate-100">
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => step === 1 ? setStep(0) : setStep(step - 1)}
                className="w-14 h-14 bg-slate-100 rounded-[1.25rem] items-center justify-center border-2 border-slate-200"
              >
                <ArrowLeft size={20} color="#64748b" />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={step < maxSteps ? handleNext : handleSubmit}
                disabled={isSaving}
                className="flex-1 relative"
              >
                <View className="absolute inset-0 rounded-[1.25rem] translate-y-1.5" style={{ backgroundColor: shadowColor }} />
                <View
                  className="h-14 rounded-[1.25rem] border-2 flex-row items-center justify-center relative z-10"
                  style={{ backgroundColor: accentColor, borderColor: shadowColor }}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Text className="text-white font-black uppercase tracking-widest mr-2">
                        {step < maxSteps ? 'Selanjutnya' : 'Selesai & Ajukan'}
                      </Text>
                      {step < maxSteps ? <ChevronRight size={18} color="#FFF" /> : <CheckCircle2 size={18} color="#FFF" />}
                    </>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

// â”€â”€â”€ DOC UPLOAD BOX COMPONENT â”€â”€â”€
function DocUploadBox({ label, url, onPress }: { label: string; url: string; onPress: () => void }) {
  const uploaded = Boolean(url);
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className={`rounded-[1.25rem] p-4 flex-row items-center justify-between border-2 ${uploaded ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 border-dashed'}`}
    >
      <View className="flex-1 pr-3">
        <Text className={`text-sm font-black tracking-tight ${uploaded ? 'text-emerald-900' : 'text-slate-800'}`}>{label}</Text>
        <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
          {uploaded ? 'File tersimpan. Ketuk untuk ubah.' : 'Maks 5MB (JPG/PNG)'}
        </Text>
      </View>
      <View className={`w-10 h-10 rounded-xl items-center justify-center border ${uploaded ? 'bg-emerald-500 border-emerald-600' : 'bg-slate-100 border-slate-200'}`}>
        {uploaded ? <CheckCircle2 size={18} color="#FFF" /> : <Upload size={18} color="#94a3b8" />}
      </View>
    </TouchableOpacity>
  );
}

