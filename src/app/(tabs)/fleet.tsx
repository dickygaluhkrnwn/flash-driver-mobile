import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { Users, Truck, Building2, ChevronRight, Activity, MapPin } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

// IMPORT TAB COMPONENT
import DriverTab from "@/components/fleet/DriverTab";
import VehicleTab from "@/components/fleet/VehicleTab";

const { width } = Dimensions.get("window");
const TAB_WIDTH = (width - 40 - 12) / 2; 

export default function FleetManagementPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [vendorName, setVendorName] = useState("");
  
  // State untuk Tab
  const [activeTab, setActiveTab] = useState<"drivers" | "vehicles">("drivers");

  // ROUTE GUARD: Verifikasi Otoritas Vendor
  useEffect(() => {
    const checkVendorRole = async () => {
      if (!user) {
        router.replace("/(auth)/login");
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.partnerType !== "Vendor") {
            router.replace("/(tabs)/dashboard");
          } else {
            setVendorName(data.companyName || data.displayName || "Perusahaan");
            setIsLoading(false);
          }
        } else {
          router.replace("/(tabs)/dashboard");
        }
      } catch (error) {
        console.error("Gagal verifikasi role:", error);
        router.replace("/(tabs)/dashboard");
      }
    };

    checkVendorRole();
  }, [user, router]);

  if (!isHydrated || isLoading) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#7A171D" />
        <Text className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Otorisasi Vendor...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        
        {/* 1. RICH HEADER & HERO CARD (Matches wallet.tsx) */}
        <View className="px-5 pt-14 pb-8 bg-slate-50 relative z-10">
          
          {/* Top Header Row */}
          <Animated.View entering={FadeInDown.duration(400)} className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center gap-3">
              <View className="w-12 h-12 bg-red-100 rounded-full items-center justify-center border-2 border-red-200">
                <Building2 size={22} color="#7a171d" />
              </View>
              <View>
                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Portal Manajemen Vendor</Text>
                <Text className="text-base font-black text-slate-800 tracking-tight">{vendorName}</Text>
              </View>
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity className="w-10 h-10 bg-white rounded-full items-center justify-center border-2 border-slate-200">
                <Activity size={18} color="#0f172a" />
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
                colors={['#9A242B', '#7a171d']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                className="absolute inset-0"
              />
              {/* Graphic Elements */}
              <View className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full" />
              <View className="absolute -left-12 -bottom-12 w-48 h-48 bg-black/10 rounded-full" />
              
              <View className="relative z-10">
                <View className="flex-row items-center justify-between mb-6">
                  <View className="flex-row items-center gap-2 bg-black/20 px-3.5 py-1.5 rounded-xl border border-white/10">
                    <Building2 size={14} color="#FACC15" />
                    <Text className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">Fleet Control</Text>
                  </View>
                  <View className="w-10 h-7 bg-white/20 rounded-md border border-white/10 items-center justify-center">
                    <Truck size={14} color="#FFF" />
                  </View>
                </View>

                <Text className="text-[10px] font-bold text-red-100 uppercase tracking-widest mb-0.5">Pusat Kendali Operasional</Text>
                <Text className="text-3xl font-black text-white tracking-tighter mb-4 drop-shadow-md">Armada PT</Text>

                <View className="flex-row items-center justify-between pt-4 border-t border-white/10">
                  <Text className="text-[11px] font-mono font-bold text-white/70 tracking-widest">Status: AKTIF</Text>
                  <View className="flex-row items-center gap-1.5 bg-white/10 px-2 py-1 rounded border border-white/20">
                    <MapPin size={12} color="#fcd34d" />
                    <Text className="text-[9px] font-black text-amber-300 tracking-wider uppercase">Nasional</Text>
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* 2. DUAL-TAB SWITCHER */}
        <Animated.View entering={FadeInDown.duration(600).delay(200).springify()} className="px-5 mb-8">
          <Text className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Kategori Manajemen</Text>
          <View className="bg-white p-1.5 rounded-[1.25rem] border-2 border-slate-200 shadow-sm relative flex-row items-center">
            {/* Indicator */}
            <Animated.View 
              className="absolute top-1.5 bottom-1.5 bg-slate-900 rounded-[1rem] border border-slate-800"
              style={{ 
                width: TAB_WIDTH,
                left: activeTab === "drivers" ? 6 : TAB_WIDTH + 6,
                elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3
              }} 
            />

            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => setActiveTab("drivers")} 
              className="flex-1 py-3 items-center justify-center flex-row gap-2 relative z-10"
            >
              <Users size={16} color={activeTab === "drivers" ? "#FFF" : "#64748b"} /> 
              <Text className={`text-xs font-black ${activeTab === "drivers" ? "text-white" : "text-slate-500"}`}>
                Data Karyawan
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => setActiveTab("vehicles")} 
              className="flex-1 py-3 items-center justify-center flex-row gap-2 relative z-10"
            >
              <Truck size={16} color={activeTab === "vehicles" ? "#FFF" : "#64748b"} /> 
              <Text className={`text-xs font-black ${activeTab === "vehicles" ? "text-white" : "text-slate-500"}`}>
                Fisik Kendaraan
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* 3. CONTENT AREA (Tab Contents) */}
        <View className="px-5 flex-1">
          {activeTab === "drivers" ? (
            <Animated.View key="tab-drivers" entering={FadeInDown.duration(400)} className="flex-1">
              <DriverTab />
            </Animated.View>
          ) : (
            <Animated.View key="tab-vehicles" entering={FadeInDown.duration(400)} className="flex-1">
              <VehicleTab />
            </Animated.View>
          )}
        </View>

      </ScrollView>
    </View>
  );
}
