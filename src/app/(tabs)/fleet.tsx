import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { Users, Truck } from "lucide-react-native";

// IMPORT TAB COMPONENT
import DriverTab from "@/components/fleet/DriverTab";
import VehicleTab from "@/components/fleet/VehicleTab";

const { width } = Dimensions.get("window");
const TAB_WIDTH = (width - 40 - 12) / 2; // (Screen Width - Padding - Border/Gap) / 2

export default function FleetManagementPage() {
  const router = useRouter();
  const { user, isVendor } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  
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
            // Kalau bukan Vendor, tendang keluar ke Dashboard (Dinamis Routing)
            router.replace("/(tabs)/dashboard");
          } else {
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

  // LOADING SCREEN SEBELUM GUARD SELESAI
  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Otorisasi Vendor...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      
      <View className="flex-1 px-5 pt-5 pb-[100px]">
        
        {/* 🚀 DUAL-TAB SWITCHER (APPLE SEGMENTED CONTROL) */}
        <View className="bg-slate-200/60 p-1.5 rounded-[1.25rem] border border-slate-300/50 mb-6 relative flex-row">
          {/* Indicator */}
          <View 
            className="absolute top-1.5 bottom-1.5 bg-white rounded-[1rem] border border-slate-100"
            style={{ 
              width: TAB_WIDTH,
              left: activeTab === "drivers" ? 6 : TAB_WIDTH + 6,
              elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2
            }} 
          />

          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => setActiveTab("drivers")} 
            className="flex-1 py-3 items-center justify-center flex-row gap-2 relative z-10"
          >
            <Users size={16} color={activeTab === "drivers" ? "#1e293b" : "#64748b"} /> 
            <Text className={`text-xs font-black ${activeTab === "drivers" ? "text-slate-800" : "text-slate-500"}`}>
              Data Sopir PT
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => setActiveTab("vehicles")} 
            className="flex-1 py-3 items-center justify-center flex-row gap-2 relative z-10"
          >
            <Truck size={16} color={activeTab === "vehicles" ? "#1e293b" : "#64748b"} /> 
            <Text className={`text-xs font-black ${activeTab === "vehicles" ? "text-slate-800" : "text-slate-500"}`}>
              Fisik Truk PT
            </Text>
          </TouchableOpacity>
        </View>

        {/* 🚀 CONTENT AREA (Pindah antar Tab) */}
        <View className="flex-1">
          {activeTab === "drivers" ? (
            <View key="tab-drivers" className="flex-1">
              <DriverTab />
            </View>
          ) : (
            <View key="tab-vehicles" className="flex-1">
              <VehicleTab />
            </View>
          )}
        </View>

      </View>
    </View>
  );
}
