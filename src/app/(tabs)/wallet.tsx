import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Alert, Modal } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { db } from "@/lib/firebase";
import { doc, collection, addDoc, serverTimestamp, query, where, onSnapshot, getDoc, writeBatch, increment } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { 
  Wallet, ArrowDownCircle, ArrowUpCircle, CheckCircle2, AlertCircle, 
  ShieldAlert, ArrowLeft, Banknote, Building2, QrCode, Copy, X, Smartphone, Upload
} from "lucide-react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from "react-native-reanimated";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

const { height, width } = Dimensions.get("window");
const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

const getSafeMillis = (ts: unknown): number => {
  if (!ts) return 0;
  if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts).getTime();
  if (typeof ts === 'object' && ts !== null) {
    const obj = ts as Record<string, unknown>;
    if (typeof obj.toMillis === 'function') return obj.toMillis();
    if (typeof obj.seconds === 'number') return obj.seconds * 1000;
    if (typeof obj.toDate === 'function') {
      const dateObj = obj.toDate() as Date;
      return dateObj.getTime();
    }
  }
  return new Date(String(ts)).getTime();
};

interface LedgerLog {
  id: string;
  type: "Withdrawal" | "TopUp" | "Income" | "Deduction";
  amount: number;
  status: "Pending" | "Processing" | "Disetujui" | "Ditolak" | "Success";
  timestamp: unknown; 
  description?: string;
}

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

export default function MobileWalletPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();

  const [balance, setBalance] = useState<number>(0);
  const [vendorName, setVendorName] = useState<string>("");
  const [partnerType, setPartnerType] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  
  const [withdrawLogs, setWithdrawLogs] = useState<LedgerLog[]>([]);
  const [topupLogs, setTopupLogs] = useState<LedgerLog[]>([]);
  const [mutationLogs, setMutationLogs] = useState<LedgerLog[]>([]);
  
  const historyLogs = [...withdrawLogs, ...topupLogs, ...mutationLogs].sort((a, b) => getSafeMillis(b.timestamp) - getSafeMillis(a.timestamp));
  
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null); 
  
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showTopupModal, setShowTopupModal] = useState(false); 

  const [withdrawMethod, setWithdrawMethod] = useState<"Manual_Bank" | "DANA_API">("Manual_Bank");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [wdBankName, setWdBankName] = useState("");
  const [wdAccountNumber, setWdAccountNumber] = useState("");
  const [wdAccountName, setWdAccountName] = useState("");

  const [topupAmount, setTopupAmount] = useState<string>("");
  const [topupImageUri, setTopupImageUri] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!user) return;

    const walletRef = doc(db, "driver_wallets", user.uid);
    const unsubWallet = onSnapshot(walletRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBalance(data.balance || 0);
        setPartnerType(data.partnerType || "Individual");
        if (data.vendorName) setVendorName(data.vendorName);
      }
      setIsLoading(false);
    });

    const withdrawQ = query(collection(db, "withdrawal_requests"), where("driverId", "==", user.uid));
    const unsubWithdrawals = onSnapshot(withdrawQ, (snapshot) => {
      const logs: LedgerLog[] = snapshot.docs.map(doc => ({
        id: doc.id, type: "Withdrawal", description: "Pengajuan Penarikan Dana", ...doc.data()
      })) as LedgerLog[];
      setWithdrawLogs(logs);
    });

    const topupQ = query(collection(db, "deposit_requests"), where("userId", "==", user.uid));
    const unsubTopups = onSnapshot(topupQ, (snapshot) => {
      const logs: LedgerLog[] = snapshot.docs.map(doc => ({
        id: doc.id, type: "TopUp", description: "Pengisian Saldo Dompet", ...doc.data()
      })) as LedgerLog[];
      setTopupLogs(logs);
    });

    const logsQ = query(collection(db, "wallet_logs"), where("userId", "==", user.uid));
    const unsubLogs = onSnapshot(logsQ, (snapshot) => {
      const logs: LedgerLog[] = snapshot.docs.map(doc => {
        const data = doc.data();
        let uiType: LedgerLog["type"] = "Income";
        if (data.type === "deduction") uiType = "Deduction";
        else if (data.type === "deposit" || data.type === "credit_payment") uiType = "Income";

        return {
          id: doc.id,
          type: uiType,
          amount: data.amount,
          status: "Success",
          timestamp: data.createdAt,
          description: data.description || (uiType === "Income" ? "Pendapatan Order" : "Pemotongan Saldo")
        };
      });
      setMutationLogs(logs);
    });

    const fetchPaymentConfig = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "payments"));
        if (snap.exists()) setPaymentConfig(snap.data() as PaymentConfig);
      } catch (error) {
        console.error("Gagal menarik metode pembayaran", error);
      }
    };

    fetchPaymentConfig();
    
    return () => {
      unsubWallet();
      unsubWithdrawals();
      unsubTopups();
      unsubLogs(); 
    };
  }, [user]);

  const handleWithdrawRequest = async () => {
    if (!user || !withdrawAmount) return;

    const amount = Number(withdrawAmount);
    if (amount < 50000) return Alert.alert("Peringatan", "Minimal penarikan adalah Rp 50.000");
    if (amount > balance) return Alert.alert("Peringatan", "Saldo tidak mencukupi.");

    if (withdrawMethod === "Manual_Bank") {
      if (!wdBankName.trim() || !wdAccountNumber.trim() || !wdAccountName.trim()) {
        return Alert.alert("Peringatan", "Lengkapi data rekening bank Anda.");
      }
    } else {
      if (!wdAccountNumber.trim()) {
        return Alert.alert("Peringatan", "Masukkan nomor HP DANA Anda.");
      }
      if (wdAccountNumber.length < 9) return Alert.alert("Peringatan", "Nomor DANA tidak valid.");
    }

    setIsProcessing(true);
    try {
      const payload: Record<string, unknown> = {
        driverId: user.uid,
        amount: amount,
        status: "Pending",
        timestamp: serverTimestamp(),
        method: withdrawMethod,
        accountNumber: wdAccountNumber
      };

      if (withdrawMethod === "Manual_Bank") {
        payload.bankName = wdBankName;
        payload.accountName = wdAccountName;
      }

      // CALL DANA API if selected
      if (withdrawMethod === "DANA_API") {
        const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || "https://flashglobalslogistik.com";
        const response = await fetch(`${baseUrl}/api/dana/balance-disbursement`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            amount: amount.toString(),
            userId: user.uid,
            userName: user.displayName || "Sopir",
            phoneNumber: wdAccountNumber
          })
        });

        const data = await response.json();
        
        if (!response.ok || !data.success) {
          throw new Error(data.message || "Gagal menghubungi API DANA.");
        }
        
        // If success, we change status to Processing/Success based on API logic
        // The DANA API usually takes care of the deduction on the server side via admin SDK,
        // But let's assume we still need to record the withdrawal request as Success
        payload.status = "Success";
      }

      const batch = writeBatch(db);
      const newWithdrawRef = doc(collection(db, "withdrawal_requests"));
      batch.set(newWithdrawRef, payload);

      const walletRef = doc(db, "driver_wallets", user.uid);
      batch.update(walletRef, {
        balance: increment(-amount),
        lastMutasi: serverTimestamp()
      });

      await batch.commit();

      Alert.alert("Sukses", withdrawMethod === "DANA_API" ? "Penarikan ke DANA berhasil diproses!" : "Pengajuan penarikan dana manual berhasil dikirim!");
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      setWdBankName("");
      setWdAccountNumber("");
      setWdAccountName("");
    } catch (error: any) {
      console.error("Withdrawal Error:", error);
      Alert.alert("Gagal", error.message || "Gagal mengirim pengajuan penarikan.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePickTopupImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Izin Ditolak", "Butuh izin akses galeri untuk unggah bukti.");
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

  const handleTopupSubmit = async () => {
    if (!user || !topupAmount) return;
    if (!topupImageUri) return Alert.alert("Peringatan", "Harap unggah bukti transfer/pembayaran.");
    
    const amount = Number(topupAmount);
    if (amount < 20000) return Alert.alert("Peringatan", "Minimal Top-Up adalah Rp 20.000");

    setIsProcessing(true);
    try {
      const finalProofUrl = await uploadToCloudinary(topupImageUri);

      await addDoc(collection(db, "deposit_requests"), {
        userId: user.uid,
        clientName: user.displayName || "Sopir Flash Global",
        amount: amount,
        proofUrl: finalProofUrl,
        status: "Pending",
        createdAt: serverTimestamp() 
      });

      Alert.alert("Sukses", "Pengajuan Top-Up berhasil! Menunggu verifikasi tim Finance.");
      setTopupAmount("");
      setTopupImageUri(null);
      setShowTopupModal(false);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal memproses pengajuan Top-Up.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    if (status === "Disetujui" || status === "Success") return "bg-emerald-50 border-emerald-200 text-emerald-600";
    if (status === "Ditolak") return "bg-red-50 border-red-200 text-red-600";
    if (status === "Processing") return "bg-blue-50 border-blue-200 text-blue-600";
    return "bg-amber-50 border-amber-200 text-amber-600";
  };

  const getStatusTextColor = (status: string) => {
    if (status === "Disetujui" || status === "Success") return "text-emerald-700";
    if (status === "Ditolak") return "text-red-700";
    if (status === "Processing") return "text-blue-700";
    return "text-amber-700";
  };

  if (!isHydrated || isLoading) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#c5a059" />
        <Text className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Menghubungkan Brankas...</Text>
      </View>
    );
  }

  const isVendor = partnerType === "Vendor";

  return (
    <View className="flex-1 bg-slate-50">
      
      {/* HEADER CARD (CREDIT CARD STYLE) */}
      <View 
        className="rounded-b-[3rem] px-6 pt-16 pb-20 overflow-hidden relative z-10"
        style={{ elevation: 15, shadowColor: isVendor ? '#1e3a8a' : '#7a171d', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 }}
      >
        <LinearGradient
          colors={isVendor ? ['#1e3a8a', '#3b82f6'] : ['#450a0a', '#9A242B']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          className="absolute inset-0"
        />
        <View className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
        <View className="absolute -bottom-10 -left-10 w-32 h-32 bg-black/20 rounded-full blur-xl" />

        <View className="flex-row items-center justify-between mb-8 z-10 relative">
          <View className="flex-row items-center gap-2 bg-white/20 px-4 py-2.5 rounded-[1.25rem] border border-white/30" style={{ elevation: 5, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5 }}>
            <Wallet size={16} color="#FFF" />
            <Text className="text-[10px] font-black text-white uppercase tracking-widest">Dompet Digital</Text>
          </View>
        </View>

        <View className="items-start justify-center z-10 relative">
          <Text className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1.5">Total Saldo Tersedia</Text>
          <View className="flex-row items-start justify-center gap-2">
            <Text className="text-3xl font-bold text-white/70 mt-1">Rp</Text>
            <Text className="text-5xl font-black text-white tracking-tighter">{balance.toLocaleString('id-ID')}</Text>
          </View>

          {partnerType === "FleetDriver" && vendorName && (
            <View className="mt-4 flex-row items-center gap-2 bg-white/20 border border-white/30 px-4 py-2.5 rounded-[1.25rem]">
              <ShieldAlert size={16} color="#fcd34d" />
              <Text className="text-xs font-black text-amber-300 tracking-tight">Akses PT {vendorName}</Text>
            </View>
          )}
        </View>
      </View>

      {/* FLOATING ACTIONS */}
      <View className="flex-row px-6 -mt-8 z-20 gap-4 mb-4">
        <TouchableOpacity 
          onPress={() => setShowWithdrawModal(true)}
          activeOpacity={0.8}
          className="flex-1 bg-white border border-slate-200 rounded-[1.5rem] py-4 items-center justify-center"
          style={{ elevation: 8, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10 }}
        >
          <View className={`w-12 h-12 rounded-[1.25rem] mb-2 items-center justify-center border ${isVendor ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
             <ArrowDownCircle size={24} color={isVendor ? "#2563eb" : "#7a171d"} />
          </View>
          <Text className="text-sm font-black text-slate-800 tracking-tight">Tarik Tunai</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => setShowTopupModal(true)}
          activeOpacity={0.8}
          className="flex-1 rounded-[1.5rem] py-4 items-center justify-center overflow-hidden"
          style={{ elevation: 8, shadowColor: '#C5A059', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10 }}
        >
          <LinearGradient 
            colors={['#DFBE7B', '#C5A059']} 
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            className="absolute inset-0 border border-[#E2C68A]/50" 
            style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.4)' }}
          />
          <View className="w-12 h-12 rounded-[1.25rem] bg-white/20 border border-white/30 items-center justify-center mb-2 z-10" style={{ elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 }}>
            <ArrowUpCircle size={24} color="#FFF" />
          </View>
          <Text className="text-sm font-black text-white tracking-tight z-10">Isi Saldo</Text>
        </TouchableOpacity>
      </View>

      {/* TRANSACTION HISTORY */}
      <ScrollView className="flex-1 px-5 pt-2 pb-32" showsVerticalScrollIndicator={false}>
        <Text className="text-sm font-black text-slate-800 tracking-tight mb-4 ml-1">Riwayat Transaksi</Text>

        <View className="space-y-3 pb-24">
          {historyLogs.length === 0 ? (
            <View className="bg-white/40 border border-slate-200 border-dashed rounded-[2rem] p-10 items-center">
              <View className="w-16 h-16 bg-slate-100 rounded-[1.25rem] items-center justify-center mb-4">
                <Banknote size={32} color="#cbd5e1" />
              </View>
              <Text className="text-sm font-black text-slate-800 tracking-tight mb-1">Brankas Kosong</Text>
              <Text className="text-xs font-medium text-slate-500 text-center">Belum ada riwayat penarikan maupun pengisian saldo.</Text>
            </View>
          ) : (
            historyLogs.map(log => {
              const millis = getSafeMillis(log.timestamp);
              const dateStr = millis > 0 ? new Date(millis).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Baru saja";
              const isIncome = log.type === "TopUp" || log.type === "Income";

              return (
                <View 
                  key={log.id} 
                  className="bg-white p-4 rounded-[1.5rem] border border-slate-100 flex-row items-center justify-between overflow-hidden relative mb-3"
                  style={{ elevation: 2, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}
                >
                  <View className={`absolute left-0 top-0 bottom-0 w-1.5 ${log.status === 'Disetujui' || log.status === 'Success' ? 'bg-emerald-500' : log.status === 'Ditolak' ? 'bg-red-500' : log.status === 'Processing' ? 'bg-blue-500' : 'bg-amber-400'}`} />
                  
                  <View className="flex-1 pl-3 pr-2 flex-row items-center gap-3">
                    <View className={`w-10 h-10 rounded-xl items-center justify-center shrink-0 border ${isIncome ? 'bg-emerald-50 border-emerald-100' : isVendor ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
                       {isIncome ? <ArrowUpCircle size={20} color="#10b981" /> : <ArrowDownCircle size={20} color={isVendor ? "#2563eb" : "#7a171d"} />}
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-black text-slate-800 tracking-tight leading-snug mb-0.5" numberOfLines={1}>{log.description || (isIncome ? 'Pendapatan Saldo' : 'Potongan Saldo')}</Text>
                      <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{dateStr}</Text>
                    </View>
                  </View>
                  
                  <View className="items-end gap-1.5 shrink-0">
                    <Text className={`text-base font-black tracking-tight ${isIncome ? 'text-emerald-600' : isVendor ? 'text-blue-600' : 'text-[#7a171d]'}`}>
                      {isIncome ? '+' : '-'} {formatRupiah(log.amount)}
                    </Text>
                    <View className={`px-2 py-0.5 border rounded-md ${getStatusBadgeColor(log.status)}`}>
                      <Text className={`text-[9px] font-black uppercase tracking-wider ${getStatusTextColor(log.status)}`}>
                        {log.status === "Pending" ? "Menunggu" : log.status === "Processing" ? "Proses Bank" : log.status === "Success" ? "Selesai" : log.status}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* WITHDRAW MODAL */}
      <Modal visible={showWithdrawModal} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-slate-900/60">
          <View className="bg-white rounded-t-[2.5rem] w-full max-h-[85vh]">
            <View className="w-full items-center pt-3 pb-1">
              <View className="w-12 h-1.5 bg-slate-300 rounded-full" />
            </View>

            <View className="px-6 py-4 flex-row items-center justify-between border-b border-slate-100">
              <View>
                <View className="flex-row items-center gap-2">
                  <ArrowDownCircle size={20} color={isVendor ? "#2563eb" : "#7a171d"} />
                  <Text className="text-xl font-black text-slate-900 tracking-tight">Penarikan Dana</Text>
                </View>
                <Text className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">Tarik Saldo ke Rekening</Text>
              </View>
              <TouchableOpacity onPress={() => setShowWithdrawModal(false)} className="w-8 h-8 items-center justify-center bg-slate-100 rounded-full">
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView className="px-6 py-6" showsVerticalScrollIndicator={false}>
              <View className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-200 mb-6 flex-row justify-between items-center shadow-sm">
                <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Saldo Tersedia</Text>
                <Text className="text-xl font-mono font-black text-slate-900 tracking-tight">Rp {balance.toLocaleString('id-ID')}</Text>
              </View>

              <View className="space-y-6 pb-20">
                <View>
                  <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Nominal Penarikan (Rp)</Text>
                  <View className="relative justify-center">
                    <Text className="absolute left-4 text-slate-400 font-mono font-black text-xl z-10 top-5">Rp</Text>
                    <Input 
                      keyboardType="numeric"
                      value={withdrawAmount}
                      onChangeText={setWithdrawAmount}
                      placeholder="0"
                      className="pl-14 font-mono font-black text-2xl h-16 rounded-[1.5rem] bg-white border-slate-200"
                    />
                  </View>
                  <Text className="text-[9px] text-slate-400 font-bold mt-2 uppercase tracking-widest pl-2">Minimal penarikan Rp 50.000</Text>
                </View>

                {partnerType === "FleetDriver" && vendorName ? (
                  <View className="bg-red-50 border border-red-200 p-4 rounded-[1.25rem] flex-row gap-3">
                    <AlertCircle size={20} color="#dc2626" />
                    <Text className="flex-1 text-[10px] text-red-800 font-bold leading-relaxed">
                      Anda terdaftar sebagai Sopir Vendor PT {vendorName}. Dana yang ditarik akan ditransfer ke rekening Perusahaan.
                    </Text>
                  </View>
                ) : (
                  <View>
                    <View className="flex-row bg-slate-100 p-1 rounded-2xl mb-4">
                      <TouchableOpacity 
                        onPress={() => setWithdrawMethod("Manual_Bank")}
                        className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-2 ${withdrawMethod === "Manual_Bank" ? "bg-white shadow-sm" : ""}`}
                      >
                        <Building2 size={14} color={withdrawMethod === "Manual_Bank" ? "#0f172a" : "#64748b"} />
                        <Text className={`text-xs font-bold ${withdrawMethod === "Manual_Bank" ? "text-slate-900" : "text-slate-500"}`}>Transfer Bank</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => setWithdrawMethod("DANA_API")}
                        className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-2 ${withdrawMethod === "DANA_API" ? "bg-blue-50 border border-blue-100 shadow-sm" : ""}`}
                      >
                        <Smartphone size={14} color={withdrawMethod === "DANA_API" ? "#1d4ed8" : "#64748b"} />
                        <Text className={`text-xs font-bold ${withdrawMethod === "DANA_API" ? "text-blue-700" : "text-slate-500"}`}>Saldo DANA</Text>
                      </TouchableOpacity>
                    </View>

                    {withdrawMethod === "Manual_Bank" ? (
                      <View className="space-y-4">
                        <View>
                          <Text className="text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Nama Bank</Text>
                          <Input placeholder="Cth: BCA / Mandiri / BNI" value={wdBankName} onChangeText={setWdBankName} className="bg-white rounded-xl" />
                        </View>
                        <View>
                          <Text className="text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Nomor Rekening</Text>
                          <Input keyboardType="numeric" placeholder="Cth: 1234567890" value={wdAccountNumber} onChangeText={setWdAccountNumber} className="bg-white rounded-xl font-mono font-bold tracking-widest" />
                        </View>
                        <View>
                          <Text className="text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Atas Nama</Text>
                          <Input placeholder="Cth: Budi Santoso" value={wdAccountName} onChangeText={(text) => setWdAccountName(text.toUpperCase())} className="bg-white rounded-xl uppercase" />
                        </View>
                      </View>
                    ) : (
                      <View className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                        <View className="flex-row items-center gap-1.5 mb-2">
                          <Smartphone size={14} color="#1e40af" />
                          <Text className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Nomor HP DANA</Text>
                        </View>
                        <Input keyboardType="numeric" placeholder="Cth: 08123456789" value={wdAccountNumber} onChangeText={setWdAccountNumber} className="bg-white rounded-xl font-mono font-black text-lg tracking-widest text-blue-900 border-blue-200" />
                        <Text className="text-[9px] text-blue-600/70 font-bold mt-2 leading-relaxed">Dana akan ditransfer otomatis ke akun DANA Anda setelah disetujui.</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </ScrollView>

            <View className="p-6 bg-white border-t border-slate-100 pb-8 shrink-0">
              <Button 
                variant="primary"
                size="lg"
                onPress={handleWithdrawRequest}
                disabled={isProcessing || !withdrawAmount || Number(withdrawAmount) > balance}
                className={`w-full h-14 ${isVendor ? 'bg-blue-600' : 'bg-[#7a171d]'}`}
              >
                {isProcessing ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-white font-bold text-sm">Ajukan Penarikan Dana</Text>}
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* TOPUP MODAL */}
      <Modal visible={showTopupModal} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-slate-900/60">
          <View className="bg-white rounded-t-[2.5rem] w-full max-h-[90vh]">
            <View className="w-full items-center pt-3 pb-1">
              <View className="w-12 h-1.5 bg-slate-300 rounded-full" />
            </View>

            <View className="px-6 py-4 flex-row items-center justify-between border-b border-slate-100">
              <View>
                <View className="flex-row items-center gap-2">
                  <ArrowUpCircle size={20} color="#C5A059" />
                  <Text className="text-xl font-black text-slate-900 tracking-tight">Isi Saldo (Top-Up)</Text>
                </View>
                <Text className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">Deposit untuk Order COD</Text>
              </View>
              <TouchableOpacity onPress={() => setShowTopupModal(false)} className="w-8 h-8 items-center justify-center bg-slate-100 rounded-full">
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView className="px-6 py-6" showsVerticalScrollIndicator={false}>
              
              {/* PAYMENT CONFIGURATIONS */}
              <View className="space-y-4 mb-6">
                {paymentConfig?.qrisImageUrl && (
                  <View className="bg-slate-50 border border-slate-200 rounded-[1.5rem] p-5 items-center">
                    <View className="flex-row items-center gap-2 mb-3">
                      <QrCode size={16} color="#7a171d" />
                      <Text className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Scan QRIS (Otomatis)</Text>
                    </View>
                    <Image source={{ uri: paymentConfig.qrisImageUrl }} style={{ width: 200, height: 200, borderRadius: 20 }} contentFit="contain" className="bg-white border-2 border-white shadow-sm p-2" />
                  </View>
                )}

                {paymentConfig?.transferBank && paymentConfig.transferBank.length > 0 && (
                  <View className="space-y-3">
                    <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Transfer Bank Manual</Text>
                    {paymentConfig.transferBank.map((bank, idx) => (
                      <View key={idx} className="bg-white border border-slate-200 rounded-[1.25rem] p-4 flex-row items-center justify-between shadow-sm mb-2">
                        <View className="flex-row items-center gap-3.5">
                          <View className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 items-center justify-center">
                            <Building2 size={20} color="#2563eb" />
                          </View>
                          <View>
                            <Text className="text-xs font-black text-slate-800 tracking-tight">{bank.bankName}</Text>
                            <Text className="text-sm font-mono font-black text-slate-600 my-0.5 tracking-tight">{bank.accountNumber}</Text>
                            <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">A.N: {bank.accountName}</Text>
                          </View>
                        </View>
                        <TouchableOpacity 
                          onPress={async () => {
                            await Clipboard.setStringAsync(bank.accountNumber);
                            Alert.alert("Tersalin", "Nomor rekening berhasil disalin.");
                          }}
                          className="p-2.5 bg-slate-50 border border-slate-200 rounded-[1rem]"
                        >
                          <Copy size={16} color="#64748b" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* FORM TOPUP */}
              <View className="space-y-6 pb-20 border-t border-slate-100 pt-6">
                <View>
                  <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Masukkan Nominal Transfer (Rp)</Text>
                  <Input 
                    keyboardType="numeric"
                    value={topupAmount}
                    onChangeText={setTopupAmount}
                    placeholder="0"
                    className="w-full text-2xl font-black font-mono text-center h-16 rounded-[1.5rem] bg-white focus-visible:border-[#C5A059]"
                  />
                  <Text className="text-[9px] text-amber-600 font-bold mt-2 text-center uppercase tracking-widest bg-amber-50 py-1.5 rounded-lg border border-amber-100">Minimal Top-Up Rp 20.000</Text>
                </View>

                <View>
                  <Text className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Upload Bukti Transfer</Text>
                  <TouchableOpacity 
                    onPress={handlePickTopupImage}
                    activeOpacity={0.8}
                    className={`border-2 rounded-[1.5rem] min-h-[160px] items-center justify-center overflow-hidden ${topupImageUri ? 'border-[#C5A059]' : 'border-slate-200 border-dashed bg-slate-50'}`}
                  >
                    {topupImageUri ? (
                      <Image source={{ uri: topupImageUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : (
                      <View className="items-center">
                        <View className="w-12 h-12 bg-white rounded-full items-center justify-center border border-slate-200 shadow-sm mb-2">
                          <Upload size={20} color="#94a3b8" />
                        </View>
                        <Text className="text-xs font-black text-slate-600 tracking-tight">Ketuk untuk pilih foto bukti</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View className="p-6 bg-white border-t border-slate-100 pb-8 shrink-0">
              <TouchableOpacity 
                onPress={handleTopupSubmit}
                disabled={isProcessing || !topupImageUri || !topupAmount}
                activeOpacity={0.8}
                className="w-full h-14 rounded-[1.5rem] items-center justify-center overflow-hidden shadow-lg shadow-[#C5A059]/30"
              >
                <LinearGradient colors={['#DFBE7B', '#C5A059']} className="absolute inset-0" />
                {isProcessing ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-white font-bold text-sm z-10">Kirim Pengajuan Saldo</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}
