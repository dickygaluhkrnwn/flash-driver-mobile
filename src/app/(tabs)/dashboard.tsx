import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/useAuthStore';

// IMPORT KOMPONEN MODULAR
import DashboardIndividual from '@/components/dashboard/DashboardIndividual';
import DashboardVendor from '@/components/dashboard/DashboardVendor';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, isHydrated, isVendor } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(true);
  
  // States Global
  const [balance, setBalance] = useState(0);
  const [driverStatus, setDriverStatus] = useState<"Pending" | "Active" | "Suspended" | "">("");

  const vendorMode = isVendor();

  // Fetch Data dari Firestore
  useEffect(() => {
    // Pastikan Zustand sudah terhidrasi sebelum mengecek user
    if (!isHydrated) return;

    const fetchDashboardData = async () => {
      // AUTH GUARD: Cegah infinite loading jika user tidak ada
      if (!user) {
        router.replace('/(auth)/login');
        return;
      }
      
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setDriverStatus(data.status || "Pending");
        }
      } catch (error) {
        console.error("Gagal verifikasi status:", error);
      } finally {
        setIsVerifying(false);
      }
    };

    fetchDashboardData();

    // 🚀 FIX: Tarik Saldo secara Real-Time dari driver_wallets
    let unsubWallet = () => {};
    if (user) {
      unsubWallet = onSnapshot(doc(db, "driver_wallets", user.uid), (snap) => {
        if (snap.exists()) {
          setBalance(snap.data().balance || 0);
        }
      });
    }

    return () => {
      unsubWallet();
    };
  }, [user, isHydrated, router]);

  // Layar Loading
  if (isVerifying) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color={vendorMode ? '#3b82f6' : '#7A171D'} />
        <Text className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400">Memuat Radar...</Text>
      </View>
    );
  }

  const isLocked = driverStatus === "Pending" || driverStatus === "Suspended";

  return (
    <ScrollView 
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
      bounces={false}
      showsVerticalScrollIndicator={false}
    >
      {/* 
        Header sudah di-handle oleh _layout.tsx via komponen <Header />
        Jadi di sini kita langsung fokus pada konten utama dashboard
      */}

      {vendorMode ? (
        <DashboardVendor 
          driverStatus={driverStatus} 
          isLocked={isLocked} 
          balance={balance} 
        />
      ) : (
        <DashboardIndividual 
          driverStatus={driverStatus} 
          isLocked={isLocked} 
          balance={balance} 
        />
      )}
    </ScrollView>
  );
}
