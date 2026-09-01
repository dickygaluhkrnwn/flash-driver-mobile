import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Alert, Modal } from "react-native";
import { useRouter } from "expo-router";
import { db } from "@/lib/firebase";
import { doc, updateDoc, arrayUnion, collection, query, where, getDocs } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { useOrderRadar } from "@/hooks/useOrderRadar";
import { OrderDetail, LocationDetail } from "@/types/order";
import { 
  Radar, MapPin, Package, Weight, Clock, 
  CheckCircle2, AlertTriangle, UserPlus, X, ArrowRight, ScanLine, Navigation
} from "lucide-react-native";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing, FadeInDown } from "react-native-reanimated";
import { Button } from "@/components/ui/Button";
import MapView, { PROVIDER_DEFAULT } from "react-native-maps";
import { startBackgroundLocationTracking } from "@/lib/locationTask";
import * as Location from "expo-location";

const { height, width } = Dimensions.get("window");
const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

interface FleetDriver {
  id: string;
  name: string;
}

export default function MobileRadarPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  
  const { orders, isLoading: radarLoading, error } = useOrderRadar(
    user?.partnerType || "", 
    user?.city || ""
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [selectedOrderForVendor, setSelectedOrderForVendor] = useState<OrderDetail | null>(null);
  const [vendorDrivers, setVendorDrivers] = useState<FleetDriver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [myLocation, setMyLocation] = useState<{lat: number, lng: number} | null>(null);

  const pulseAnim = useSharedValue(1);
  const ring1Anim = useSharedValue(1);
  const ring2Anim = useSharedValue(1);
  const ring1Opacity = useSharedValue(0.3);
  const ring2Opacity = useSharedValue(0.3);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1, true
    );
    ring1Anim.value = withRepeat(withTiming(3, { duration: 3000, easing: Easing.out(Easing.ease) }), -1, false);
    ring1Opacity.value = withRepeat(withTiming(0, { duration: 3000, easing: Easing.out(Easing.ease) }), -1, false);

    setTimeout(() => {
      ring2Anim.value = withRepeat(withTiming(3, { duration: 3000, easing: Easing.out(Easing.ease) }), -1, false);
      ring2Opacity.value = withRepeat(withTiming(0, { duration: 3000, easing: Easing.out(Easing.ease) }), -1, false);
    }, 1000);

    const initLocation = async () => {
      const started = await startBackgroundLocationTracking();
      if (started) {
        const loc = await Location.getCurrentPositionAsync({});
        setMyLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    };
    initLocation();
  }, []);

  const animatedPulse = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }]
  }));
  const animatedRing1 = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Anim.value }],
    opacity: ring1Opacity.value
  }));
  const animatedRing2 = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Anim.value }],
    opacity: ring2Opacity.value
  }));

  useEffect(() => {
    if (user?.partnerType === "Vendor") {
      const fetchDrivers = async () => {
        try {
          const q = query(collection(db, "driver_wallets"), where("vendorId", "==", user.uid), where("partnerType", "==", "FleetDriver"));
          const snap = await getDocs(q);
          setVendorDrivers(snap.docs.map(d => ({ id: d.id, name: d.data().name || "Tanpa Nama" })));
        } catch (error) {
          console.error("Gagal menarik data sopir:", error);
        }
      };
      fetchDrivers();
    }
  }, [user]);

  const handleAcceptOrder = async (order: OrderDetail, assignedDriverId?: string, assignedDriverName?: string) => {
    setIsProcessing(true);
    try {
      const orderRef = doc(db, "orders", order.id);
      const logDate = new Date().toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const uniqueId = Date.now().toString();

      const finalDriverId = assignedDriverId || user?.uid;
      const finalDriverName = assignedDriverName || user?.displayName || "Mitra Kurir";

      const trackingLog = {
        id: uniqueId,
        status: "Menuju Lokasi Jemput",
        date: logDate,
        description: `Sopir ${finalDriverName} telah menerima pesanan dan sedang menuju lokasi penjemputan.`,
        location: "Titik Kurir Berangkat"
      };

      await updateDoc(orderRef, {
        status: "Menuju Lokasi Jemput",
        driverId: finalDriverId,
        driverName: finalDriverName,
        trackingHistory: arrayUnion(trackingLog)
      });

      Alert.alert("Sukses", `Berhasil mengambil pesanan #${order.id.substring(0,8)}!`);
      setShowVendorModal(false);
      
      setTimeout(() => {
        router.push(`/awb/${order.id}`);
      }, 1500);

    } catch (error) {
      console.error(error);
      Alert.alert("Gagal", "Gagal mengambil order. Mungkin sudah diambil kurir lain.");
    } finally {
      setIsProcessing(false);
    }
  };

  const onVendorClickAccept = (order: OrderDetail) => {
    setSelectedOrderForVendor(order);
    setSelectedDriverId("");
    setShowVendorModal(true);
  };

  if (!isHydrated) return null;

  return (
    <View className="flex-1 bg-[#0f172a] relative">
      
      {/* MAP BACKGROUND */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.4 }}>
        <MapView 
          provider={PROVIDER_DEFAULT}
          style={{ width: '100%', height: '100%' }}
          showsUserLocation={true}
          showsMyLocationButton={false}
          initialRegion={{
            latitude: myLocation?.lat || -6.200000,
            longitude: myLocation?.lng || 106.816666,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          }}
        />
      </View>

      {/* BACKGROUND RADAR ANIMATION */}
      <View className="absolute inset-0 items-center justify-center pointer-events-none z-0 overflow-hidden">
        <View className="absolute w-[800px] h-[800px] bg-emerald-500/10 rounded-full" style={{ filter: 'blur(80px)' }} />
        
        <Animated.View style={[animatedRing1, { position: 'absolute', width: 160, height: 160, borderWidth: 2, borderColor: '#34d399', borderRadius: 100 }]} />
        <Animated.View style={[animatedRing2, { position: 'absolute', width: 160, height: 160, borderWidth: 2, borderColor: '#10b981', borderRadius: 100 }]} />
        
        <View className="w-20 h-20 bg-slate-800/80 rounded-full items-center justify-center border border-white/10 z-10 shadow-lg shadow-emerald-500/30">
          <Radar size={40} color="#34d399" />
        </View>
      </View>

      {/* FLOATING HEADER */}
      <View className="absolute top-12 left-4 right-4 z-40">
        <View className="bg-white px-5 py-4 rounded-full flex-row items-center justify-between border border-slate-100" style={{ elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }}>
          <View>
            <View className="flex-row items-center gap-2">
              <Animated.View style={animatedPulse}>
                <Radar size={20} color="#10b981" />
              </Animated.View>
              <Text className="text-lg font-black text-slate-800 tracking-tight">Radar Bursa</Text>
            </View>
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Memindai Area: {user?.city || "Pusat"}</Text>
          </View>
          <View className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full flex-row items-center gap-2">
            <Animated.View style={[animatedPulse, { width: 8, height: 8, backgroundColor: '#10b981', borderRadius: 4 }]} />
            <Text className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Online</Text>
          </View>
        </View>
      </View>

      {/* FLOATING SCANNER BUTTON (Manual) */}
      <View className="absolute top-36 left-4 right-4 z-40">
        <TouchableOpacity 
          onPress={() => router.push('/scanner')}
          activeOpacity={0.8}
          className="bg-white border border-slate-100 w-full p-4 rounded-2xl flex-row items-center justify-center gap-3"
          style={{ elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 }}
        >
          <ScanLine size={20} color="#10b981" />
          <Text className="text-slate-800 font-black text-sm tracking-widest uppercase">Buka Scanner AWB (Manual)</Text>
        </TouchableOpacity>
      </View>

      {/* MAIN CONTENT AREA */}
      <ScrollView 
        className="flex-1 z-10" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 224, paddingBottom: 128 }}
      >
        
        {radarLoading || orders.length === 0 ? (
          <View className="items-center justify-center mt-20">
            {error ? (
              <Animated.View entering={FadeInDown.springify()} className="bg-red-50 border border-red-200 p-5 rounded-3xl w-5/6 items-center shadow-sm">
                <View className="w-12 h-12 bg-red-100 rounded-full items-center justify-center mb-3">
                  <AlertTriangle size={24} color="#ef4444" />
                </View>
                <Text className="text-red-700 font-black text-sm text-center">{error}</Text>
              </Animated.View>
            ) : radarLoading ? (
              <Animated.View entering={FadeInDown.springify()} className="bg-white px-8 py-4 rounded-full border border-slate-100 flex-row items-center gap-3 shadow-sm" style={{ elevation: 4 }}>
                <ActivityIndicator size="small" color="#10b981" />
                <Text className="text-slate-800 font-black text-sm uppercase tracking-widest">Memindai...</Text>
              </Animated.View>
            ) : (
              <Animated.View entering={FadeInDown.springify()} className="bg-white px-8 py-4 rounded-full border border-slate-100 flex-row items-center gap-2 shadow-sm" style={{ elevation: 4 }}>
                <CheckCircle2 size={18} color="#94a3b8" />
                <Text className="text-slate-500 font-black text-xs uppercase tracking-widest">Area Bersih. Menunggu Order.</Text>
              </Animated.View>
            )}
          </View>
        ) : (
          <View className="space-y-5 pb-20">
            {orders.map((order, index) => {
              const originObj = typeof order.origin === 'object' && order.origin !== null ? (order.origin as LocationDetail) : null;
              const originAddr = originObj?.address || (typeof order.origin === 'string' ? order.origin : "Lokasi Tidak Diketahui");
              const destAddr = order.destinations && order.destinations.length > 0 ? order.destinations[0].address : (order.destination || "Tujuan Tidak Diketahui");
              const totalIncome = order.finalGrandTotal || order.breakdown?.grandTotal || order.totalCost || 0;

              return (
                <Animated.View 
                  key={order.id} 
                  entering={FadeInDown.delay(index * 100).springify()}
                  className="bg-white rounded-[2rem] border border-slate-100 mb-5 relative"
                  style={{ elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 }}
                >
                  {/* Ribbon */}
                  <View className="absolute top-0 right-0 bg-emerald-500 px-4 py-1.5 rounded-bl-[1.25rem] rounded-tr-[2rem] z-10 shadow-sm">
                    <Text className="text-white text-[10px] font-black uppercase tracking-widest">Baru Masuk</Text>
                  </View>

                  <View className="p-6">
                    <View className="mb-6 mt-2">
                      <View className="flex-row items-center gap-2 mb-2">
                        <View className="w-2 h-2 bg-emerald-500 rounded-full" />
                        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{order.serviceType || "Reguler"} • {order.vehicleName || order.vehicle}</Text>
                      </View>
                      <Text className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{formatRupiah(totalIncome)}</Text>
                    </View>

                    {/* Rute (Gojek Style) */}
                    <View className="relative pl-4 mb-6 mt-2">
                      <View className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-slate-200 rounded-full z-0" />
                      
                      <View className="space-y-6 relative z-10">
                        <View className="flex-row items-start gap-4">
                          <View className="mt-1 w-6 h-6 rounded-full bg-slate-100 items-center justify-center border-4 border-white shadow-sm">
                            <View className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                          </View>
                          <View className="flex-1">
                            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Penjemputan</Text>
                            <Text className="font-black text-slate-800 text-sm leading-snug" numberOfLines={2}>{originAddr}</Text>
                          </View>
                        </View>
                        <View className="flex-row items-start gap-4">
                          <View className="mt-1 w-6 h-6 rounded-full bg-emerald-100 items-center justify-center border-4 border-white shadow-sm">
                            <View className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          </View>
                          <View className="flex-1">
                            <Text className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Pengantaran</Text>
                            <Text className="font-black text-slate-800 text-sm leading-snug" numberOfLines={2}>{destAddr}</Text>
                            {order.destinations && order.destinations.length > 1 && (
                              <View className="mt-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg self-start">
                                <Text className="text-[10px] font-black uppercase tracking-widest text-amber-700">+{order.destinations.length - 1} Titik Drop Tambahan</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Spesifikasi */}
                    <View className="flex-row gap-2 mb-6">
                      <View className="flex-1 bg-white p-3 rounded-[1.25rem] border border-slate-100 items-center justify-center" style={{ elevation: 2, shadowColor: '#94a3b8', shadowOpacity: 0.1, shadowRadius: 3 }}>
                        <Weight size={18} color="#64748b" className="mb-2" />
                        <Text className="text-[11px] font-black text-slate-700">{order.totalWeight || order.weight || 0} Kg</Text>
                      </View>
                      <View className="flex-1 bg-white p-3 rounded-[1.25rem] border border-slate-100 items-center justify-center" style={{ elevation: 2, shadowColor: '#94a3b8', shadowOpacity: 0.1, shadowRadius: 3 }}>
                        <Package size={18} color="#64748b" className="mb-2" />
                        <Text className="text-[11px] font-black text-slate-700 uppercase" numberOfLines={1}>{order.vehicleName || order.vehicle}</Text>
                      </View>
                      <View className="flex-1 bg-white p-3 rounded-[1.25rem] border border-slate-100 items-center justify-center" style={{ elevation: 2, shadowColor: '#94a3b8', shadowOpacity: 0.1, shadowRadius: 3 }}>
                        <Clock size={18} color="#64748b" className="mb-2" />
                        <Text className="text-[11px] font-black text-slate-700 uppercase">Instan</Text>
                      </View>
                    </View>

                    {user?.partnerType === "Vendor" ? (
                      <TouchableOpacity 
                        activeOpacity={0.8}
                        onPress={() => onVendorClickAccept(order)}
                        disabled={isProcessing}
                        className="w-full flex-row items-center justify-center gap-2 h-14 rounded-2xl"
                        style={{ backgroundColor: '#1e293b', elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5 }}
                      >
                        <Text className="font-black text-sm text-white uppercase tracking-widest">Tarik Order & Tugaskan</Text>
                        <ArrowRight size={18} color="#fff" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity 
                        activeOpacity={0.8}
                        onPress={() => handleAcceptOrder(order)}
                        disabled={isProcessing}
                        className="w-full flex-row items-center justify-center gap-2 h-14 rounded-2xl"
                        style={{ backgroundColor: '#10b981', elevation: 4, shadowColor: '#10b981', shadowOpacity: 0.4, shadowRadius: 6 }}
                      >
                        {isProcessing ? <ActivityIndicator size="small" color="#fff" /> : <><CheckCircle2 size={20} color="#fff" /><Text className="font-black text-sm text-white uppercase tracking-widest">Ambil Pesanan</Text></>}
                      </TouchableOpacity>
                    )}
                  </View>
                </Animated.View>
              )
            })}
          </View>
        )}
      </ScrollView>

      {/* VENDOR MODAL */}
      <Modal
        visible={showVendorModal && selectedOrderForVendor !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowVendorModal(false)}
      >
        <View className="flex-1 justify-end bg-slate-900/60">
          <View className="bg-white w-full rounded-t-[2.5rem] max-h-[85vh]">
            <View className="w-full items-center pt-3 pb-1">
              <View className="w-12 h-1.5 bg-slate-300 rounded-full" />
            </View>
            
            <View className="px-6 py-4 flex-row items-center justify-between">
              <View>
                <Text className="text-xl font-black text-slate-900 tracking-tight">Tugaskan Sopir</Text>
                <Text className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">AWB #{selectedOrderForVendor?.id.substring(0,8)}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowVendorModal(false)} className="w-8 h-8 items-center justify-center bg-slate-100 rounded-full">
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView className="px-6 pb-6">
              <Text className="text-xs font-bold text-slate-500 mb-5 leading-relaxed">
                Pilih karyawan / sopir armada PT Anda yang akan mengeksekusi pengiriman <Text className="text-blue-600 font-black">{selectedOrderForVendor?.vehicleName || selectedOrderForVendor?.vehicle}</Text> ini.
              </Text>

              <View className="space-y-3 pb-6">
                {vendorDrivers.length === 0 ? (
                  <View className="bg-red-50 border border-red-100 p-5 rounded-[1.5rem] items-center">
                    <Text className="text-sm font-black text-red-600">Armada Kosong</Text>
                    <Text className="text-xs font-medium text-red-500 mt-1 text-center">Anda belum mendaftarkan sopir satupun di menu Manajemen Armada.</Text>
                  </View>
                ) : (
                  vendorDrivers.map(driver => (
                    <TouchableOpacity 
                      key={driver.id} 
                      onPress={() => setSelectedDriverId(driver.id)}
                      activeOpacity={0.8}
                      className={`flex-row items-center justify-between p-4 rounded-[1.5rem] border-2 mb-3 ${selectedDriverId === driver.id ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 bg-white'}`}
                    >
                      <View className="flex-row items-center gap-3.5">
                        <View className={`w-12 h-12 rounded-[1rem] items-center justify-center border ${selectedDriverId === driver.id ? 'bg-blue-600 border-blue-700' : 'bg-slate-50 border-slate-200'}`}>
                          <UserPlus size={20} color={selectedDriverId === driver.id ? '#FFF' : '#94a3b8'} />
                        </View>
                        <View>
                          <Text className={`text-sm font-black tracking-tight ${selectedDriverId === driver.id ? 'text-blue-900' : 'text-slate-800'}`}>{driver.name}</Text>
                          <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">ID: {driver.id.substring(0,6)}</Text>
                        </View>
                      </View>
                      <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${selectedDriverId === driver.id ? 'border-blue-600' : 'border-slate-200 bg-slate-50'}`}>
                        {selectedDriverId === driver.id && <View className="w-3 h-3 bg-blue-600 rounded-full" />}
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </ScrollView>

            <View className="p-6 bg-white border-t border-slate-100 pb-8">
              <Button 
                variant="primary"
                size="lg"
                onPress={() => {
                  const selectedD = vendorDrivers.find(d => d.id === selectedDriverId);
                  if (selectedD && selectedOrderForVendor) handleAcceptOrder(selectedOrderForVendor, selectedD.id, selectedD.name);
                }}
                disabled={isProcessing || !selectedDriverId}
                className="w-full flex-row items-center justify-center gap-2 bg-blue-600"
              >
                {isProcessing ? <ActivityIndicator size="small" color="#fff" /> : <><CheckCircle2 size={20} color="#fff" /><Text className="text-white font-bold ml-2">Konfirmasi Penugasan</Text></>}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
