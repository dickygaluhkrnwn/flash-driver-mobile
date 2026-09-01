import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, ActivityIndicator
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { doc, collection, addDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Input } from "@/components/ui/Input";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  ArrowLeft, ArrowUpCircle, QrCode, Building2, Copy, Upload, CheckCircle2
} from "lucide-react-native";

interface PaymentMethod {
  bankName: string;
  accountNumber: string;
  accountName: string;
  color: string;
}

interface PaymentConfig {
  transferBank: PaymentMethod[];
  qrisImageUrl: string | null;
}

export default function TopupPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  const [topupAmount, setTopupAmount] = useState("");
  const [topupImageUri, setTopupImageUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch payment config dari settings/payments
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "payments"));
        if (snap.exists()) setPaymentConfig(snap.data() as PaymentConfig);
      } catch (error) {
        console.error("Gagal menarik metode pembayaran", error);
      } finally {
        setIsLoadingConfig(false);
      }
    };
    fetchConfig();
  }, []);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Izin Ditolak", "Butuh izin akses galeri untuk mengunggah bukti.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      setTopupImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!user || !topupAmount) return;
    if (!topupImageUri) return Alert.alert("Peringatan", "Harap unggah bukti transfer/pembayaran.");

    const amount = Number(topupAmount);
    if (amount < 20000) return Alert.alert("Peringatan", "Minimal Top-Up adalah Rp 20.000");

    setIsProcessing(true);
    try {
      // Upload bukti ke Cloudinary
      const finalProofUrl = await uploadToCloudinary(topupImageUri);

      // Submit ke Firestore
      await addDoc(collection(db, "deposit_requests"), {
        userId: user.uid,
        clientName: user.displayName || "Sopir Flash Global",
        amount,
        proofUrl: finalProofUrl,
        status: "Pending",
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        "Sukses! ✅",
        "Pengajuan Top-Up berhasil dikirim! Menunggu verifikasi tim Finance.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal memproses pengajuan Top-Up. Coba lagi.");
    } finally {
      setIsProcessing(false);
    }
  };

  const isDisabled = isProcessing || !topupImageUri || !topupAmount || Number(topupAmount) < 20000;

  return (
    <View className="flex-1 bg-slate-50">

      {/* HEADER */}
      <View className="relative overflow-hidden">
        <LinearGradient
          colors={['#78500A', '#C5A059']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ paddingTop: 56, paddingBottom: 28, paddingHorizontal: 20 }}
        >
          <View className="absolute -right-10 -top-10 w-48 h-48 bg-white/5 rounded-full" />
          <View className="absolute -left-16 bottom-0 w-48 h-48 bg-black/10 rounded-full" />

          <View className="flex-row items-center gap-4 relative z-10">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 bg-white/20 rounded-full items-center justify-center border border-white/20"
            >
              <ArrowLeft size={20} color="#FFF" />
            </TouchableOpacity>
            <View>
              <Text className="text-xl font-black text-white tracking-tight">Isi Saldo</Text>
              <Text className="text-[10px] font-black text-white/60 uppercase tracking-widest">Deposit untuk Order COD</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView className="flex-1 px-5 py-6" showsVerticalScrollIndicator={false}>

          {isLoadingConfig ? (
            <View className="items-center py-8">
              <ActivityIndicator size="large" color="#C5A059" />
            </View>
          ) : (
            <Animated.View entering={FadeInDown.duration(400).springify()} className="space-y-6">

              {/* PAYMENT METHODS dari Admin */}
              {paymentConfig?.qrisImageUrl && (
                <View className="bg-white border-2 border-slate-100 rounded-[1.5rem] p-5 items-center">
                  <View className="flex-row items-center gap-2 mb-3">
                    <QrCode size={16} color="#7a171d" />
                    <Text className="text-[10px] font-black text-slate-700 uppercase tracking-widest">QRIS (Scan Otomatis)</Text>
                  </View>
                  <Image
                    source={{ uri: paymentConfig.qrisImageUrl }}
                    style={{ width: 200, height: 200, borderRadius: 16 }}
                    contentFit="contain"
                  />
                </View>
              )}

              {paymentConfig?.transferBank && paymentConfig.transferBank.length > 0 && (
                <View className="space-y-3">
                  <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Transfer Bank Manual</Text>
                  {paymentConfig.transferBank.map((bank, idx) => (
                    <View key={idx} className="bg-white border-2 border-slate-100 rounded-[1.25rem] p-4 flex-row items-center justify-between">
                      <View className="flex-row items-center gap-3">
                        <View className="w-12 h-12 rounded-xl bg-blue-50 border-2 border-blue-100 items-center justify-center">
                          <Building2 size={20} color="#2563eb" />
                        </View>
                        <View>
                          <Text className="text-xs font-black text-slate-800 tracking-tight">{bank.bankName}</Text>
                          <Text className="text-sm font-mono font-black text-[#7a171d] my-0.5 tracking-tight">{bank.accountNumber}</Text>
                          <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">A.N: {bank.accountName}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={async () => {
                          await Clipboard.setStringAsync(bank.accountNumber);
                          Alert.alert("Tersalin ✅", "Nomor rekening berhasil disalin.");
                        }}
                        className="p-3 bg-slate-100 rounded-xl"
                        activeOpacity={0.7}
                      >
                        <Copy size={16} color="#64748b" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* DIVIDER */}
              <View className="border-t-2 border-slate-100 pt-6">
                <Text className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4">
                  Konfirmasi Pembayaran
                </Text>

                {/* Nominal */}
                <View className="mb-5">
                  <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Masukkan Nominal Transfer (Rp)</Text>
                  <Input
                    keyboardType="numeric"
                    value={topupAmount}
                    onChangeText={setTopupAmount}
                    placeholder="0"
                    className="w-full text-2xl font-black font-mono text-center h-16 rounded-[1.5rem] bg-white border-2 border-slate-200"
                  />
                  <View className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mt-2">
                    <Text className="text-[9px] text-amber-600 font-bold text-center uppercase tracking-widest">Minimal Top-Up adalah Rp 20.000</Text>
                  </View>
                </View>

                {/* Upload Bukti */}
                <View>
                  <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Upload Bukti Transfer</Text>
                  <TouchableOpacity
                    onPress={handlePickImage}
                    activeOpacity={0.8}
                    className={`border-2 rounded-[1.5rem] overflow-hidden items-center justify-center ${topupImageUri ? 'border-[#C5A059]' : 'border-slate-200 border-dashed bg-slate-50'}`}
                    style={{ minHeight: 160 }}
                  >
                    {topupImageUri ? (
                      <Image
                        source={{ uri: topupImageUri }}
                        style={{ width: '100%', height: 200 }}
                        contentFit="cover"
                      />
                    ) : (
                      <View className="items-center py-8">
                        <View className="w-14 h-14 bg-white rounded-full items-center justify-center border-2 border-slate-100 mb-3">
                          <Upload size={22} color="#94a3b8" />
                        </View>
                        <Text className="text-xs font-black text-slate-500 tracking-tight">Ketuk untuk pilih foto bukti transfer</Text>
                        <Text className="text-[9px] text-slate-400 font-bold mt-1">JPG / PNG / HEIC</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  {topupImageUri && (
                    <TouchableOpacity onPress={() => setTopupImageUri(null)} className="mt-2 items-center">
                      <Text className="text-[10px] font-black text-red-500 uppercase tracking-widest">Hapus Foto</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

            </Animated.View>
          )}

          <View className="h-32" />
        </ScrollView>

        {/* STICKY FOOTER BUTTON */}
        <View className="p-6 bg-white border-t border-slate-100">
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isDisabled}
            activeOpacity={0.8}
            className="relative"
          >
            <View className={`absolute inset-0 rounded-[1.25rem] translate-y-1 ${isDisabled ? 'bg-slate-300' : 'bg-[#78500A]'}`} />
            <View className={`h-14 rounded-[1.25rem] border-2 flex-row items-center justify-center relative z-10 gap-2 ${isDisabled ? 'bg-slate-100 border-slate-300' : 'bg-[#C5A059] border-[#A68039]'}`}>
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <CheckCircle2 size={18} color={isDisabled ? "#94a3b8" : "#78350f"} />
                  <Text className={`font-black uppercase tracking-widest ${isDisabled ? 'text-slate-400' : 'text-amber-900'}`}>
                    Kirim Pengajuan Saldo
                  </Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
