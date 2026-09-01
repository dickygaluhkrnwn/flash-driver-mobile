import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, ActivityIndicator
} from "react-native";
import { useRouter } from "expo-router";
import { doc, collection, getDoc, onSnapshot, writeBatch, increment, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { Input } from "@/components/ui/Input";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  ArrowLeft, ArrowDownCircle, Building2, Smartphone,
  AlertCircle, ShieldAlert, CheckCircle2
} from "lucide-react-native";

const formatRupiah = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

export default function WithdrawPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [balance, setBalance] = useState(0);
  const [partnerType, setPartnerType] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);

  const [withdrawMethod, setWithdrawMethod] = useState<"Manual_Bank" | "DANA_API">("Manual_Bank");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [wdBankName, setWdBankName] = useState("");
  const [wdAccountNumber, setWdAccountNumber] = useState("");
  const [wdAccountName, setWdAccountName] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);

  // Real-time saldo listener
  useEffect(() => {
    if (!user) return;
    const walletRef = doc(db, "driver_wallets", user.uid);
    const unsub = onSnapshot(walletRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setBalance(data.balance || 0);
        setPartnerType(data.partnerType || "Individual");
        if (data.vendorName) setVendorName(data.vendorName);
      }
      setIsLoadingBalance(false);
    });
    return () => unsub();
  }, [user]);

  const handleSubmit = async () => {
    if (!user || !withdrawAmount) return;

    const amount = Number(withdrawAmount);

    // Validasi
    if (amount < 50000) return Alert.alert("Peringatan", "Minimal penarikan adalah Rp 50.000");
    if (amount > balance) return Alert.alert("Peringatan", "Saldo tidak mencukupi untuk nominal tersebut.");

    if (withdrawMethod === "Manual_Bank") {
      if (!wdBankName.trim() || !wdAccountNumber.trim() || !wdAccountName.trim()) {
        return Alert.alert("Peringatan", "Lengkapi data rekening bank Anda.");
      }
    } else {
      if (!wdAccountNumber.trim()) return Alert.alert("Peringatan", "Masukkan nomor HP DANA Anda.");
      if (wdAccountNumber.length < 9) return Alert.alert("Peringatan", "Nomor DANA tidak valid.");
    }

    setIsProcessing(true);
    try {
      const payload: Record<string, unknown> = {
        driverId: user.uid,
        amount,
        status: "Pending",
        timestamp: serverTimestamp(),
        method: withdrawMethod,
        accountNumber: wdAccountNumber,
      };

      if (withdrawMethod === "Manual_Bank") {
        payload.bankName = wdBankName;
        payload.accountName = wdAccountName;
      }

      // 🚀 DANA_API: Panggil API disbursement terlebih dulu
      if (withdrawMethod === "DANA_API") {
        const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || "https://flashglobalslogistik.com";
        const response = await fetch(`${baseUrl}/api/dana/balance-disbursement`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: amount.toString(),
            userId: user.uid,
            userName: user.displayName || "Sopir",
            phoneNumber: wdAccountNumber,
          }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || "Gagal menghubungi API DANA.");
        }
        // DANA sukses → status langsung Success
        payload.status = "Success";
      }

      // 🚀 BATCH WRITE: Record withdrawal + potong saldo sekaligus
      const batch = writeBatch(db);

      const newWithdrawRef = doc(collection(db, "withdrawal_requests"));
      batch.set(newWithdrawRef, payload);

      const walletRef = doc(db, "driver_wallets", user.uid);
      batch.update(walletRef, {
        balance: increment(-amount),
        lastMutasi: serverTimestamp(),
      });

      await batch.commit();

      Alert.alert(
        "Sukses! ✅",
        withdrawMethod === "DANA_API"
          ? "Penarikan ke DANA berhasil diproses!"
          : "Pengajuan penarikan dana berhasil dikirim! Tim Finance akan memproses dalam 1x24 jam.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error: unknown) {
      console.error("Withdrawal Error:", error);
      const msg = error instanceof Error ? error.message : "Gagal mengirim pengajuan penarikan.";
      Alert.alert("Gagal", msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const isVendor = partnerType === "Vendor";
  const isFleetDriver = partnerType === "FleetDriver";
  const amount = Number(withdrawAmount);
  const isDisabled = isProcessing || !withdrawAmount || amount < 50000 || amount > balance;

  if (isLoadingBalance) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#7a171d" />
        <Text className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Memuat Saldo...</Text>
      </View>
    );
  }

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

          <View className="flex-row items-center gap-4 relative z-10 mb-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 bg-white/20 rounded-full items-center justify-center border border-white/20"
            >
              <ArrowLeft size={20} color="#FFF" />
            </TouchableOpacity>
            <View>
              <Text className="text-xl font-black text-white tracking-tight">Tarik Saldo</Text>
              <Text className="text-[10px] font-black text-white/60 uppercase tracking-widest">Penarikan Dana ke Rekening</Text>
            </View>
          </View>

          {/* Saldo Card */}
          <View className="bg-white/10 border border-white/20 rounded-[1.5rem] p-4 relative z-10 flex-row justify-between items-center">
            <Text className="text-[10px] font-black text-white/60 uppercase tracking-widest">Saldo Tersedia</Text>
            <Text className="text-xl font-black text-white font-mono tracking-tight">{formatRupiah(balance)}</Text>
          </View>
        </LinearGradient>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView className="flex-1 px-5 py-6" showsVerticalScrollIndicator={false}>

          <Animated.View entering={FadeInDown.duration(400).springify()} className="space-y-6">

            {/* Nominal */}
            <View>
              <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Nominal Penarikan (Rp)</Text>
              <View className="relative justify-center">
                <Text className="absolute left-5 text-slate-400 font-mono font-black text-xl z-10 top-5">Rp</Text>
                <Input
                  keyboardType="numeric"
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
                  placeholder="0"
                  className="pl-14 font-mono font-black text-2xl h-16 rounded-[1.5rem] bg-white border-2 border-slate-200"
                />
              </View>
              <Text className="text-[9px] text-slate-400 font-bold mt-2 uppercase tracking-widest pl-2">Minimal penarikan Rp 50.000</Text>
            </View>

            {/* FleetDriver Info */}
            {isFleetDriver && vendorName ? (
              <View className="bg-red-50 border border-red-200 p-4 rounded-[1.25rem] flex-row gap-3">
                <AlertCircle size={20} color="#dc2626" />
                <Text className="flex-1 text-[10px] text-red-800 font-bold leading-relaxed">
                  Anda terdaftar sebagai <Text className="font-black">Sopir Vendor PT {vendorName}</Text>. Dana yang ditarik akan ditransfer ke rekening Perusahaan.
                </Text>
              </View>
            ) : (
              <View>
                {/* Method Toggle */}
                <Text className="text-[10px] font-black text-slate-500 mb-3 uppercase tracking-widest">Pilih Metode Penarikan</Text>
                <View className="flex-row gap-3 mb-5">
                  <TouchableOpacity
                    onPress={() => setWithdrawMethod("Manual_Bank")}
                    className={`flex-1 py-3 rounded-2xl flex-row items-center justify-center gap-2 border-2 ${withdrawMethod === "Manual_Bank" ? (isVendor ? "bg-white border-blue-600" : "bg-white border-[#7a171d]") : "bg-slate-50 border-slate-100"}`}
                    activeOpacity={0.7}
                  >
                    <Building2 size={16} color={withdrawMethod === "Manual_Bank" ? (isVendor ? "#2563eb" : "#7a171d") : "#94a3b8"} />
                    <Text className={`text-xs font-bold ${withdrawMethod === "Manual_Bank" ? (isVendor ? "text-blue-600" : "text-[#7a171d]") : "text-slate-400"}`}>Transfer Bank</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setWithdrawMethod("DANA_API")}
                    className={`flex-1 py-3 rounded-2xl flex-row items-center justify-center gap-2 border-2 ${withdrawMethod === "DANA_API" ? "bg-white border-blue-600" : "bg-slate-50 border-slate-100"}`}
                    activeOpacity={0.7}
                  >
                    <Smartphone size={16} color={withdrawMethod === "DANA_API" ? "#2563eb" : "#94a3b8"} />
                    <Text className={`text-xs font-bold ${withdrawMethod === "DANA_API" ? "text-blue-600" : "text-slate-400"}`}>Saldo DANA</Text>
                  </TouchableOpacity>
                </View>

                {/* Manual Bank Fields */}
                {withdrawMethod === "Manual_Bank" ? (
                  <Animated.View entering={FadeInDown.duration(300)} className="space-y-4">
                    <View>
                      <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Nama Bank</Text>
                      <Input placeholder="Cth: BCA / Mandiri / BNI" value={wdBankName} onChangeText={setWdBankName} className="bg-white rounded-xl border-2 border-slate-200" />
                    </View>
                    <View>
                      <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Nomor Rekening</Text>
                      <Input keyboardType="numeric" placeholder="Cth: 1234567890" value={wdAccountNumber} onChangeText={setWdAccountNumber} className="bg-white rounded-xl font-mono font-bold tracking-widest border-2 border-slate-200" />
                    </View>
                    <View>
                      <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Atas Nama (Sesuai Buku Tabungan)</Text>
                      <Input placeholder="Cth: Budi Santoso" value={wdAccountName} onChangeText={(t) => setWdAccountName(t.toUpperCase())} className="bg-white rounded-xl uppercase border-2 border-slate-200" />
                    </View>
                  </Animated.View>
                ) : (
                  <Animated.View entering={FadeInDown.duration(300)} className="bg-blue-50 p-5 rounded-[1.5rem] border-2 border-blue-100">
                    <View className="flex-row items-center gap-2 mb-3">
                      <Smartphone size={16} color="#1d4ed8" />
                      <Text className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Nomor HP Terdaftar di DANA</Text>
                    </View>
                    <Input
                      keyboardType="numeric"
                      placeholder="08123456789"
                      value={wdAccountNumber}
                      onChangeText={setWdAccountNumber}
                      className="bg-white rounded-xl font-mono font-black text-xl tracking-widest text-blue-900 border-2 border-blue-200 h-14"
                    />
                    <Text className="text-[9px] text-blue-500 font-bold mt-2 leading-relaxed">
                      Dana akan ditransfer secara instan ke akun DANA Anda setelah disetujui.
                    </Text>
                  </Animated.View>
                )}
              </View>
            )}

            {/* FleetDriver info saldo */}
            {isFleetDriver && vendorName && (
              <View className="bg-amber-50 border border-amber-200 rounded-[1.25rem] p-4 flex-row gap-2 items-center">
                <ShieldAlert size={16} color="#d97706" />
                <Text className="flex-1 text-[10px] text-amber-800 font-bold uppercase tracking-widest">
                  Hak akses di bawah naungan PT {vendorName}
                </Text>
              </View>
            )}

          </Animated.View>
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
            <View className={`absolute inset-0 rounded-[1.25rem] translate-y-1 ${isDisabled ? 'bg-slate-300' : isVendor ? 'bg-blue-900' : 'bg-[#450a0a]'}`} />
            <View className={`h-14 rounded-[1.25rem] border-2 flex-row items-center justify-center relative z-10 gap-2 ${isDisabled ? 'bg-slate-100 border-slate-300' : isVendor ? 'bg-blue-600 border-blue-800' : 'bg-[#7a171d] border-[#450a0a]'}`}>
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <CheckCircle2 size={18} color={isDisabled ? "#94a3b8" : "#FFF"} />
                  <Text className={`font-black uppercase tracking-widest ${isDisabled ? 'text-slate-400' : 'text-white'}`}>
                    Ajukan Penarikan Dana
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
