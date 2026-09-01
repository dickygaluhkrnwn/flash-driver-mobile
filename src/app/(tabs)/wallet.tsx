import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { db } from "@/lib/firebase";
import { doc, collection, query, where, onSnapshot, getDoc, writeBatch, increment, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { 
  Wallet, ArrowDownCircle, ArrowUpCircle,
  ShieldAlert, Banknote, Building2, QrCode, Copy, Smartphone
} from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
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

  const { user, isHydrated } = useAuthStore();
  const router = useRouter();

  const [balance, setBalance] = useState<number>(0);
  const [vendorName, setVendorName] = useState<string>("");
  const [partnerType, setPartnerType] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  
  const [withdrawLogs, setWithdrawLogs] = useState<LedgerLog[]>([]);
  const [topupLogs, setTopupLogs] = useState<LedgerLog[]>([]);
  const [mutationLogs, setMutationLogs] = useState<LedgerLog[]>([]);
  
  const historyLogs = [...withdrawLogs, ...topupLogs, ...mutationLogs].sort((a, b) => getSafeMillis(b.timestamp) - getSafeMillis(a.timestamp));
  
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);

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

  const _handleTopupSubmit = async () => { /* dipindah ke topup.tsx */ };

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
      
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        
        {/* 1. RICH HEADER & HERO CARD (DANA/ShopeePay Vibe) */}
        <View className="px-5 pt-14 pb-8 bg-slate-50 relative z-10">
          
          {/* Top Header Row */}
          <Animated.View entering={FadeInDown.duration(400)} className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center gap-3">
              <View className="w-12 h-12 bg-red-100 rounded-full items-center justify-center border-2 border-red-200">
                <Text className="text-lg font-black text-[#7a171d]">{user?.displayName?.[0] || 'D'}</Text>
              </View>
              <View>
                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selamat Datang,</Text>
                <Text className="text-base font-black text-slate-800 tracking-tight">{user?.displayName || 'Driver Flash'}</Text>
              </View>
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity className="w-10 h-10 bg-white rounded-full items-center justify-center border-2 border-slate-200">
                <QrCode size={18} color="#0f172a" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Premium Physical Card */}
          <Animated.View 
            entering={FadeInDown.duration(600).delay(100).springify()}
            className="rounded-[2rem] overflow-hidden"
          >
            {/* 3D Depth Layer */}
            <View className="absolute inset-0 bg-[#450a0a] rounded-[2rem] top-2 left-0 right-0 bottom-[-8px]" />
            
            <View className="rounded-[2rem] overflow-hidden bg-[#7a171d] border-2 border-[#450a0a] relative p-6">
              <LinearGradient
                colors={isVendor ? ['#1e3a8a', '#1e40af'] : ['#9A242B', '#7a171d']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                className="absolute inset-0"
              />
              {/* Graphic Elements */}
              <View className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full" />
              <View className="absolute -left-12 -bottom-12 w-48 h-48 bg-black/10 rounded-full" />
              
              <View className="relative z-10">
                <View className="flex-row items-center justify-between mb-6">
                  <View className="flex-row items-center gap-2 bg-black/20 px-3.5 py-1.5 rounded-xl border border-white/10">
                    <Wallet size={14} color="#FACC15" />
                    <Text className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">FlashPay</Text>
                  </View>
                  {/* EMV Chip placeholder */}
                  <View className="w-10 h-7 bg-yellow-400/80 rounded-md border border-yellow-200/50" />
                </View>

                <Text className="text-[10px] font-bold text-red-100 uppercase tracking-widest mb-0.5">Total Saldo Aktif</Text>
                <View className="flex-row items-start gap-2 mb-4">
                  <Text className="text-xl font-bold text-red-200 mt-2">Rp</Text>
                  <Text className="text-4xl font-black text-white tracking-tighter">{balance.toLocaleString('id-ID')}</Text>
                </View>

                <View className="flex-row items-center justify-between">
                  <Text className="text-[11px] font-mono font-bold text-white/50 tracking-widest">**** **** **** 1945</Text>
                  {partnerType === "FleetDriver" && vendorName && (
                    <View className="flex-row items-center gap-1.5 bg-white/10 px-2 py-1 rounded border border-white/20">
                      <ShieldAlert size={12} color="#fcd34d" />
                      <Text className="text-[9px] font-black text-amber-300 tracking-wider uppercase">PT {vendorName}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* 2. MAIN MENU GRID (Like DANA) */}
        <Animated.View 
          entering={FadeInDown.duration(600).delay(200).springify()}
          className="px-5 mb-8"
        >
          <Text className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Layanan Utama</Text>
          
          <View className="bg-white rounded-[2rem] p-4 border-2 border-slate-200 flex-row flex-wrap justify-between shadow-sm" style={{ shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }}>
            
            <TouchableOpacity onPress={() => router.push("/wallet/withdraw")} activeOpacity={0.7} className="w-[22%] items-center mb-2">
              <View className="w-12 h-12 bg-red-50 rounded-2xl items-center justify-center border border-red-100 mb-2">
                <ArrowDownCircle size={22} color="#7a171d" />
              </View>
              <Text className="text-[9px] font-black text-slate-700 text-center tracking-tight">Tarik Saldo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => router.push("/wallet/topup")} activeOpacity={0.7} className="w-[22%] items-center mb-2">
              <View className="w-12 h-12 bg-amber-50 rounded-2xl items-center justify-center border border-amber-100 mb-2">
                <ArrowUpCircle size={22} color="#d97706" />
              </View>
              <Text className="text-[9px] font-black text-slate-700 text-center tracking-tight">Top-Up</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => Alert.alert("Segera Hadir", "Fitur Transfer antar driver segera hadir.")} activeOpacity={0.7} className="w-[22%] items-center mb-2">
              <View className="w-12 h-12 bg-blue-50 rounded-2xl items-center justify-center border border-blue-100 mb-2">
                <Building2 size={22} color="#2563eb" />
              </View>
              <Text className="text-[9px] font-black text-slate-700 text-center tracking-tight">Transfer</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => Alert.alert("Segera Hadir", "Fitur Mutasi lengkap segera hadir.")} activeOpacity={0.7} className="w-[22%] items-center mb-2">
              <View className="w-12 h-12 bg-slate-50 rounded-2xl items-center justify-center border border-slate-200 mb-2">
                <Banknote size={22} color="#475569" />
              </View>
              <Text className="text-[9px] font-black text-slate-700 text-center tracking-tight">Mutasi</Text>
            </TouchableOpacity>

          </View>
        </Animated.View>

        {/* 3. PROMO BANNERS SECTION */}
        <Animated.View 
          entering={FadeInDown.duration(600).delay(300).springify()}
          className="mb-8"
        >
          <View className="px-5 mb-3 flex-row justify-between items-end">
            <Text className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Info & Promo</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5" snapToInterval={width * 0.85 + 16} decelerationRate="fast">
            <View style={{ width: width * 0.85 }} className="bg-[#7a171d] rounded-[1.5rem] p-5 mr-4 border border-[#450a0a] overflow-hidden relative">
              <LinearGradient colors={['#9A242B', '#7a171d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} className="absolute inset-0" />
              <View className="relative z-10 w-2/3">
                <View className="bg-white/20 px-2 py-1 rounded-md mb-2 self-start"><Text className="text-[8px] font-black text-white uppercase">Info Driver</Text></View>
                <Text className="text-sm font-black text-white leading-tight mb-2">Tarik saldo di hari kerja diproses lebih cepat!</Text>
                <Text className="text-[9px] text-red-100 font-bold">Pastikan data bank valid.</Text>
              </View>
            </View>
            <View style={{ width: width * 0.85 }} className="bg-blue-600 rounded-[1.5rem] p-5 mr-10 border border-blue-800 overflow-hidden relative">
              <LinearGradient colors={['#3b82f6', '#1d4ed8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} className="absolute inset-0" />
              <View className="relative z-10 w-2/3">
                <View className="bg-white/20 px-2 py-1 rounded-md mb-2 self-start"><Text className="text-[8px] font-black text-white uppercase">Tips Keamanan</Text></View>
                <Text className="text-sm font-black text-white leading-tight mb-2">Waspada Penipuan Mengatasnamakan Flash Global!</Text>
                <Text className="text-[9px] text-blue-100 font-bold">Jaga kerahasiaan OTP.</Text>
              </View>
            </View>
          </ScrollView>
        </Animated.View>

        {/* 4. TRANSACTION HISTORY */}
        <Animated.View entering={FadeInDown.duration(600).delay(400)} className="px-5">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Aktivitas Terakhir</Text>
            <TouchableOpacity>
              <Text className="text-[10px] font-black text-[#7a171d] uppercase tracking-widest">Lihat Semua</Text>
            </TouchableOpacity>
          </View>

          <View className="space-y-3">
            {historyLogs.length === 0 ? (
              <View className="bg-white border-2 border-slate-200 border-dashed rounded-[2rem] p-8 items-center">
                <View className="w-16 h-16 bg-slate-100 rounded-[1.25rem] items-center justify-center mb-4">
                  <Banknote size={32} color="#cbd5e1" />
                </View>
                <Text className="text-sm font-black text-slate-800 tracking-tight mb-1">Brankas Kosong</Text>
                <Text className="text-xs font-bold text-slate-400 text-center">Belum ada riwayat transaksi.</Text>
              </View>
            ) : (
              historyLogs.slice(0, 10).map((log, index) => {
                const millis = getSafeMillis(log.timestamp);
                const dateStr = millis > 0 ? new Date(millis).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Baru saja";
                const isIncome = log.type === "TopUp" || log.type === "Income";

                return (
                  <View 
                    key={log.id} 
                    className="bg-white p-4 rounded-2xl border-2 border-slate-100 flex-row items-center justify-between"
                  >
                    <View className="flex-1 pr-2 flex-row items-center gap-3">
                      <View className={`w-12 h-12 rounded-2xl items-center justify-center shrink-0 border-2 ${isIncome ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                         {isIncome ? <ArrowUpCircle size={22} color="#10b981" /> : <ArrowDownCircle size={22} color="#ef4444" />}
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-black text-slate-800 tracking-tight leading-snug mb-1" numberOfLines={1}>
                          {log.description || (isIncome ? 'Pendapatan Saldo' : 'Potongan Saldo')}
                        </Text>
                        <Text className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{dateStr}</Text>
                      </View>
                    </View>
                    
                    <View className="items-end gap-1.5 shrink-0">
                      <Text className={`text-sm font-black tracking-tighter ${isIncome ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isIncome ? '+' : '-'} {formatRupiah(log.amount)}
                      </Text>
                      <View className={`px-2 py-1 rounded-lg ${getStatusBadgeColor(log.status)}`}>
                        <Text className={`text-[9px] font-black uppercase tracking-wider ${getStatusTextColor(log.status)}`}>
                          {log.status === "Pending" ? "Menunggu" : log.status === "Processing" ? "Proses" : log.status === "Success" ? "Berhasil" : log.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </Animated.View>
      </ScrollView>

    </View>
  );
}
