import React, { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Alert, Modal } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import { doc, getDoc, updateDoc, arrayUnion, onSnapshot, increment, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { OrderDetail, LocationDetail, DeliveryItem } from "@/types/order";
import { 
  Package, MapPin, Truck, Scale, 
  CheckCircle2, AlertTriangle, ArrowLeft, Navigation, ShieldCheck, Focus,
  Camera, X, UploadCloud, ChevronUp, ChevronDown
} from "lucide-react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, FadeInDown } from "react-native-reanimated";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Image } from "expo-image";

const { height, width } = Dimensions.get("window");
const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

export default function AWBExecutionPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const orderId = Array.isArray(id) ? id[0] : id;
  const { user, isHydrated } = useAuthStore();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Map & Location State
  const mapRef = useRef<MapView>(null);
  const [driverLocation, setDriverLocation] = useState<{lat: number, lng: number} | null>(null);

  // Bottom Sheet State
  const [isExpanded, setIsExpanded] = useState(true);
  const sheetHeight = useSharedValue(height * 0.85);

  // PoP / PoD Form State
  const [showForm, setShowForm] = useState<"pickup" | "delivery" | null>(null);
  const [note, setNote] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);

  const animatedSheetStyle = useAnimatedStyle(() => ({
    height: withSpring(sheetHeight.value, { damping: 20, stiffness: 150 })
  }));

  // Route Guard & Realtime Listener
  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      router.replace("/(auth)/login");
      return;
    }

    if (!orderId) {
      router.replace("/(tabs)/dashboard");
      return;
    }

    const unsub = onSnapshot(doc(db, "orders", orderId), (docSnap) => {
      if (docSnap.exists()) {
        setOrder({ id: docSnap.id, ...docSnap.data() } as OrderDetail);
      } else {
        Alert.alert("Error", "Manifes pengiriman tidak ditemukan.");
        router.replace("/(tabs)/dashboard");
      }
      setIsLoading(false);
    }, (error) => {
      console.error(error);
      setIsLoading(false);
    });

    return () => unsub();
  }, [orderId, user, isHydrated, router]);

  // Request Location & Live Tracking
  useEffect(() => {
    let watchSub: Location.LocationSubscription | null = null;

    const startTracking = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Izin Akses", "Izin akses lokasi dibutuhkan untuk live tracking.");
        return;
      }

      const initialLoc = await Location.getCurrentPositionAsync({});
      setDriverLocation({ lat: initialLoc.coords.latitude, lng: initialLoc.coords.longitude });

      if (order?.status === "Dikirim") {
        watchSub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
          async (loc) => {
            const { latitude, longitude } = loc.coords;
            setDriverLocation({ lat: latitude, lng: longitude });

            try {
              await updateDoc(doc(db, "orders", orderId), {
                driverCoords: { lat: latitude, lng: longitude }
              });
            } catch (err) {
              // silent error
            }
          }
        );
      }
    };

    if (order) {
      startTracking();
    }

    return () => {
      if (watchSub) watchSub.remove();
    };
  }, [order?.status, orderId]);

  const toggleSheet = () => {
    setIsExpanded(!isExpanded);
    sheetHeight.value = isExpanded ? height * 0.4 : height * 0.85;
  };

  const centerMap = () => {
    if (mapRef.current && driverLocation) {
      mapRef.current.animateToRegion({
        latitude: driverLocation.lat,
        longitude: driverLocation.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      }, 1000);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Izin Kamera", "Kami membutuhkan izin kamera untuk mengambil bukti foto.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.5, // compress for speed
    });

    if (!result.canceled && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleUpdateStatus = async (
    nextStatus: string, 
    desc: string, 
    locationLabel: string, 
    proofType?: "pickup" | "delivery"
  ) => {
    if (!order || !user) return;

    if (proofType && (!imageUri || !note.trim())) {
      Alert.alert("Peringatan", "Foto bukti dan catatan wajib diisi!");
      return;
    }

    setIsUpdating(true);
    try {
      let finalLocationLabel = locationLabel;
      let finalCoords = driverLocation;

      // Ensure we have coords
      if (!finalCoords) {
        const loc = await Location.getCurrentPositionAsync({}).catch(() => null);
        if (loc) {
          finalCoords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          setDriverLocation(finalCoords);
        }
      }

      // Reverse Geocoding via Nominatim / Google API if needed, for now use default label
      if (finalCoords) {
        try {
          const rev = await Location.reverseGeocodeAsync({ latitude: finalCoords.lat, longitude: finalCoords.lng });
          if (rev && rev.length > 0) {
            finalLocationLabel = `${rev[0].name || rev[0].street || rev[0].city} (Geotagged)`;
          }
        } catch(e) {}
      }

      let proofUrl = "";
      if (proofType && imageUri) {
        proofUrl = await uploadToCloudinary(imageUri);
      }

      const orderRef = doc(db, "orders", orderId);
      const logDate = new Date().toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const uniqueId = Date.now().toString();

      const trackingLog: any = {
        id: uniqueId,
        status: nextStatus,
        date: logDate,
        description: desc,
        location: finalLocationLabel
      };

      if (proofUrl) trackingLog.proofUrl = proofUrl;
      if (note) trackingLog.note = note;

      const payload: any = {
        status: nextStatus,
        trackingHistory: arrayUnion(trackingLog)
      };

      if (proofType === "pickup") {
        payload.pickupProofUrl = proofUrl;
        payload.pickupNote = note;
      } else if (proofType === "delivery") {
        payload.deliveryProofUrl = proofUrl;
        payload.deliveryNote = note;
      }

      if (finalCoords) payload.driverCoords = finalCoords;

      if (nextStatus === "Selesai") {
        if (order.paymentStatus !== "Piutang B2B" && order.paymentStatus !== "Menunggu Verifikasi Finance") {
          payload.paymentStatus = "Lunas";
        }

        const totalTagihan = order.finalGrandTotal || order.breakdown?.grandTotal || order.totalCost || 0;
        let appCommissionPercent = 20;

        try {
          const pricingSnap = await getDoc(doc(db, "settings", "pricing"));
          if (pricingSnap.exists()) {
            const config = pricingSnap.data();
            if (config.customVehicles && Array.isArray(config.customVehicles)) {
              const vehicleMatch = config.customVehicles.find((v: any) => v.name === order.vehicleName);
              if (vehicleMatch && vehicleMatch.appCommission !== undefined) {
                appCommissionPercent = Number(vehicleMatch.appCommission);
              }
            }
          }
        } catch (err) {}

        const driverSharePercent = 100 - appCommissionPercent;
        const appShareNominal = (totalTagihan * appCommissionPercent) / 100;
        const driverShareNominal = (totalTagihan * driverSharePercent) / 100;

        let targetWalletId = order.driverId || user.uid;
        const paymentMethodStr = String(order.paymentMethod || "Transfer Bank");
        const isCOD = paymentMethodStr.toLowerCase().includes("tunai") || paymentMethodStr.toLowerCase().includes("cod");

        let mutationAmount = 0;
        let logDescription = "";
        let logType = "deposit";

        if (isCOD) {
          mutationAmount = -Math.abs(appShareNominal);
          logDescription = `Potongan Komisi Order #${order.resi || order.id.substring(0,8)} (Tunai/COD)`;
          logType = "deduction";
        } else {
          mutationAmount = Math.abs(driverShareNominal);
          logDescription = `Pendapatan Order #${order.resi || order.id.substring(0,8)} (${order.paymentMethod})`;
          logType = "deposit";
        }

        if (mutationAmount !== 0) {
          const walletRef = doc(db, "driver_wallets", targetWalletId);
          await updateDoc(walletRef, { 
            balance: increment(mutationAmount),
            lastMutasi: serverTimestamp() 
          });

          await addDoc(collection(db, "wallet_logs"), {
            userId: targetWalletId,
            amount: Math.abs(mutationAmount), 
            type: logType,
            description: logDescription,
            recordedBy: "System Auto-Settle",
            createdAt: serverTimestamp()
          });
        }
      }

      await updateDoc(orderRef, payload);
      
      setShowForm(null);
      setImageUri(null);
      setNote("");

      if (nextStatus === "Selesai") {
        Alert.alert("Sukses", "Pengiriman berhasil diselesaikan!");
        router.replace("/(tabs)/radar");
      }

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal memperbarui status pengiriman.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading || !order) {
    return (
      <View className="flex-1 bg-slate-100 items-center justify-center">
        <ActivityIndicator size="large" color="#7a171d" />
        <Text className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400">Memuat Manifes AWB...</Text>
      </View>
    );
  }

  const originObj = typeof order.origin === 'object' && order.origin !== null ? (order.origin as LocationDetail) : null;
  const originAddr: string = originObj?.address || (typeof order.origin === 'string' ? order.origin : "-");
  
  const destObj = order.destinations && order.destinations.length > 0 ? order.destinations[0] : null;
  const destAddr: string = destObj?.address || (typeof order.destination === 'string' ? order.destination : "-");
  const receiverName = destObj?.receiverName || "Penerima";
  const receiverPhone = destObj?.receiverPhone || "-";

  const originCoords = originObj?.lat && originObj?.lng ? { latitude: originObj.lat, longitude: originObj.lng } : null;
  const destCoords = destObj?.lat && destObj?.lng ? { latitude: destObj.lat, longitude: destObj.lng } : null;

  const initialRegion = {
    latitude: driverLocation?.lat || originCoords?.latitude || destCoords?.latitude || -6.200000,
    longitude: driverLocation?.lng || originCoords?.longitude || destCoords?.longitude || 106.816666,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View className="flex-1 bg-slate-100 relative">
      
      {/* MAP BACKGROUND */}
      <View style={{ width, height: height * 0.6 }} className="absolute top-0 left-0">
        <MapView 
          ref={mapRef}
          provider={PROVIDER_DEFAULT}
          style={{ width: '100%', height: '100%' }}
          initialRegion={initialRegion}
          showsUserLocation={true}
          showsMyLocationButton={false}
        >
          {originCoords && (
            <Marker coordinate={originCoords}>
              <View className="w-8 h-8 bg-blue-500 rounded-full border-2 border-white shadow-lg items-center justify-center">
                <Text className="text-white font-black text-xs">P</Text>
              </View>
            </Marker>
          )}
          {destCoords && (
            <Marker coordinate={destCoords}>
              <View className="w-8 h-8 bg-red-500 rounded-full border-2 border-white shadow-lg items-center justify-center">
                <Text className="text-white font-black text-xs">D</Text>
              </View>
            </Marker>
          )}
          {originCoords && destCoords && (
            <Polyline coordinates={[originCoords, destCoords]} strokeColor="#3b82f6" strokeWidth={3} lineDashPattern={[5,5]} />
          )}
        </MapView>
      </View>

      {/* HEADER OVERLAYS */}
      <View className="absolute top-12 left-4 right-4 flex-row items-center justify-between z-10 pointer-events-box-none">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-12 h-12 flex items-center justify-center bg-white/90 rounded-2xl shadow-sm pointer-events-auto"
        >
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>

        <View className="bg-white/90 px-4 py-2 rounded-2xl shadow-sm pointer-events-auto flex-row items-center gap-2">
          <View className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
          <Text className="font-black text-slate-800 text-xs uppercase tracking-widest">{order.status}</Text>
        </View>
      </View>

      <View className="absolute top-28 right-4 z-10 pointer-events-box-none">
        <TouchableOpacity 
          onPress={centerMap}
          className="w-12 h-12 flex items-center justify-center bg-white/90 rounded-2xl shadow-sm pointer-events-auto"
        >
          <Focus size={24} color="#7a171d" />
        </TouchableOpacity>
      </View>

      {/* BOTTOM SHEET */}
      <Animated.View 
        style={[animatedSheetStyle, { width, elevation: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.15, shadowRadius: 20 }]}
        className="absolute bottom-0 left-0 bg-white rounded-t-[2.5rem] flex-col"
      >
        <TouchableOpacity activeOpacity={0.8} onPress={toggleSheet} className="w-full py-4 items-center shrink-0">
          <View className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </TouchableOpacity>
        
        <TouchableOpacity activeOpacity={0.8} onPress={toggleSheet} className="absolute top-4 right-5 p-1.5 bg-slate-100 rounded-full">
          {isExpanded ? <ChevronDown size={18} color="#64748b" /> : <ChevronUp size={18} color="#64748b" />}
        </TouchableOpacity>

        <View className="px-6 pb-4 border-b border-slate-100 shrink-0">
          <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resi Pengiriman (AWB)</Text>
          <View className="flex-row justify-between items-end mt-1">
            <Text className="text-xl font-black font-mono tracking-tight text-slate-900">#{order.id.substring(0,10)}</Text>
            <Text className="text-lg font-black text-emerald-600">{formatRupiah(order.finalGrandTotal || order.breakdown?.grandTotal || order.totalCost || 0)}</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-6 py-6" contentContainerStyle={{ paddingBottom: 100 }}>
          
          {/* TRACKING TIMELINE / LOCATIONS */}
          <Animated.View entering={FadeInDown.delay(100).springify()} className="relative pl-4 mb-8">
            {/* SOLID LINE */}
            <View className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-slate-200 rounded-full z-0" />
            
            <View className="space-y-6 relative z-10">
              <View className="flex-row items-start gap-4">
                <View className="mt-1 w-6 h-6 rounded-full bg-slate-100 items-center justify-center border-4 border-white shadow-sm">
                  <View className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Penjemputan (Pickup)</Text>
                  <Text className="font-black text-slate-800 text-sm leading-snug">{originAddr}</Text>
                </View>
              </View>
              <View className="flex-row items-start gap-4">
                <View className="mt-1 w-6 h-6 rounded-full bg-emerald-100 items-center justify-center border-4 border-white shadow-sm">
                  <View className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Tujuan (Drop)</Text>
                  <Text className="font-black text-slate-800 text-sm leading-snug">{destAddr}</Text>
                  <View className="mt-3 bg-white p-3 rounded-2xl border border-slate-100 flex-row items-center gap-3" style={{ elevation: 2, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}>
                    <View className="w-10 h-10 bg-emerald-50 rounded-xl items-center justify-center">
                      <Text className="text-sm font-black text-emerald-600 uppercase">{receiverName.substring(0,2)}</Text>
                    </View>
                    <View>
                      <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Penerima</Text>
                      <Text className="text-sm font-black text-slate-800">{receiverName}</Text>
                      <Text className="text-xs font-bold text-slate-500">{receiverPhone}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* DETAIL BARANG */}
          <Animated.View entering={FadeInDown.delay(200).springify()} className="mb-8">
            <View className="flex-row items-center gap-2 mb-4">
              <Package size={16} color="#64748b" />
              <Text className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Detail Muatan</Text>
            </View>
            
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 items-center justify-center" style={{ elevation: 2, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}>
                <Scale size={24} color="#94a3b8" className="mb-2" />
                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Berat</Text>
                <Text className="text-xl font-black text-slate-800 tracking-tight">{order.totalWeight || order.weight || 0} Kg</Text>
              </View>
              <View className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 items-center justify-center" style={{ elevation: 2, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}>
                <Truck size={24} color="#94a3b8" className="mb-2" />
                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Layanan</Text>
                <Text className="text-sm font-black text-slate-800 tracking-tight" numberOfLines={1}>{order.vehicleName || order.vehicle}</Text>
              </View>
            </View>

            {destObj?.items && destObj.items.length > 0 && (
              <View className="space-y-3">
                {destObj.items.map((item: DeliveryItem, idx: number) => (
                  <View key={idx} className="flex-row justify-between items-center bg-white px-5 py-4 rounded-2xl border border-slate-100" style={{ elevation: 2, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 }}>
                    <Text className="font-black text-slate-800 text-sm tracking-tight">{item.name || "-"}</Text>
                    <View className="bg-slate-100 px-3 py-1 rounded-lg">
                      <Text className="font-mono text-slate-600 font-bold text-xs">x{item.value || 1}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>

          {/* FORM POP / POD (INLINE) */}
          {showForm === "pickup" && (
            <Animated.View entering={FadeInDown.delay(300).springify()} className="bg-white p-5 rounded-3xl border border-slate-100 mb-6" style={{ elevation: 3, shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 }}>
              <View className="flex-row justify-between items-center mb-5">
                <View className="flex-row items-center gap-2">
                  <View className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center">
                    <Navigation size={14} color="#3b82f6" />
                  </View>
                  <Text className="text-[15px] font-black text-slate-800 tracking-tight">Bukti Penjemputan</Text>
                </View>
                <TouchableOpacity onPress={() => setShowForm(null)} className="w-8 h-8 bg-slate-100 rounded-full items-center justify-center"><X size={16} color="#64748b"/></TouchableOpacity>
              </View>
              
              <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Catatan Kurir (Wajib)</Text>
              <Input value={note} onChangeText={setNote} placeholder="Cth: Packing rapi, aman" className="bg-slate-50 mb-5 border border-slate-200" />
              
              <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Foto Barang (Wajib)</Text>
              <TouchableOpacity onPress={handlePickImage} className="border-2 border-blue-200 border-dashed rounded-2xl h-32 flex items-center justify-center bg-blue-50/50 overflow-hidden mb-5">
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : (
                  <View className="items-center">
                    <View className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-sm mb-2">
                      <Camera size={24} color="#3b82f6" />
                    </View>
                    <Text className="text-xs font-black text-blue-600">Ambil Foto</Text>
                  </View>
                )}
              </TouchableOpacity>
              
              <Button 
                variant="primary" 
                className="w-full flex-row justify-center gap-2 h-14 rounded-2xl items-center" 
                style={{ backgroundColor: '#2563eb', elevation: 4, shadowColor: '#2563eb', shadowOpacity: 0.3, shadowRadius: 6 }}
                onPress={() => handleUpdateStatus("Sedang Diproses", `Barang di-pickup: ${note}`, originAddr, "pickup")}
                disabled={isUpdating || !note || !imageUri}
              >
                {isUpdating ? <ActivityIndicator size="small" color="#fff" /> : <><UploadCloud size={20} color="#fff" /><Text className="text-white font-black text-sm ml-2">Mulai Pengiriman</Text></>}
              </Button>
            </Animated.View>
          )}

          {showForm === "delivery" && (
            <Animated.View entering={FadeInDown.delay(300).springify()} className="bg-white p-5 rounded-3xl border border-slate-100 mb-6" style={{ elevation: 3, shadowColor: '#10b981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 }}>
              <View className="flex-row justify-between items-center mb-5">
                <View className="flex-row items-center gap-2">
                  <View className="w-8 h-8 rounded-full bg-emerald-50 items-center justify-center">
                    <ShieldCheck size={14} color="#10b981" />
                  </View>
                  <Text className="text-[15px] font-black text-slate-800 tracking-tight">Bukti Pengiriman</Text>
                </View>
                <TouchableOpacity onPress={() => setShowForm(null)} className="w-8 h-8 bg-slate-100 rounded-full items-center justify-center"><X size={16} color="#64748b"/></TouchableOpacity>
              </View>
              
              <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nama Penerima / Catatan (Wajib)</Text>
              <Input value={note} onChangeText={setNote} placeholder="Cth: Diterima oleh Bapak Budi" className="bg-slate-50 mb-5 border border-slate-200" />
              
              <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Foto Barang Diterima (Wajib)</Text>
              <TouchableOpacity onPress={handlePickImage} className="border-2 border-emerald-200 border-dashed rounded-2xl h-32 flex items-center justify-center bg-emerald-50/50 overflow-hidden mb-5">
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : (
                  <View className="items-center">
                    <View className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-sm mb-2">
                      <Camera size={24} color="#10b981" />
                    </View>
                    <Text className="text-xs font-black text-emerald-600">Ambil Foto</Text>
                  </View>
                )}
              </TouchableOpacity>
              
              <Button 
                variant="primary" 
                className="w-full flex-row justify-center gap-2 h-14 rounded-2xl items-center" 
                style={{ backgroundColor: '#059669', elevation: 4, shadowColor: '#059669', shadowOpacity: 0.3, shadowRadius: 6 }}
                onPress={() => handleUpdateStatus("Selesai", `Paket diterima: ${note}`, destAddr, "delivery")}
                disabled={isUpdating || !note || !imageUri}
              >
                {isUpdating ? <ActivityIndicator size="small" color="#fff" /> : <><CheckCircle2 size={20} color="#fff" /><Text className="text-white font-black text-sm ml-2">Selesai Transaksi</Text></>}
              </Button>
            </Animated.View>
          )}

          {order.status === "Selesai" && (
            <Animated.View entering={FadeInDown.delay(300).springify()} className="bg-white border border-emerald-100 p-6 rounded-3xl text-center items-center mb-6" style={{ elevation: 2, shadowColor: '#10b981', shadowOpacity: 0.1, shadowRadius: 4 }}>
              <View className="w-16 h-16 bg-emerald-50 rounded-full items-center justify-center mb-3">
                <CheckCircle2 size={32} color="#059669" />
              </View>
              <Text className="text-base font-black text-slate-800 tracking-tight">Pengiriman Sukses</Text>
              <Text className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest text-center">Transaksi telah dicatat ke dompet Anda.</Text>
            </Animated.View>
          )}

        </ScrollView>

        {/* BOTTOM ACTION BAR */}
        {!showForm && (
          <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-6 pt-5 pb-8" style={{ elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.05, shadowRadius: 15 }}>
            
            {order.status === "Menuju Lokasi Jemput" && (
              <Button size="lg" variant="primary" className="w-full h-14 rounded-2xl flex-row gap-2 items-center justify-center" style={{ backgroundColor: '#3b82f6', elevation: 4, shadowColor: '#3b82f6', shadowOpacity: 0.3, shadowRadius: 6 }} onPress={() => setShowForm("pickup")}>
                <Navigation size={20} color="#fff" />
                <Text className="font-black text-sm text-white ml-2">Tiba di Lokasi (Pickup)</Text>
              </Button>
            )}

            {order.status === "Sedang Diproses" && (
              <Button 
                size="lg" 
                variant="primary" 
                className="w-full h-14 rounded-2xl flex-row gap-2 items-center justify-center" 
                style={{ backgroundColor: '#f59e0b', elevation: 4, shadowColor: '#f59e0b', shadowOpacity: 0.3, shadowRadius: 6 }}
                disabled={isUpdating}
                onPress={() => handleUpdateStatus("Dikirim", "Paket telah dimuat (In Transit)", "Dalam Perjalanan")}
              >
                {isUpdating ? <ActivityIndicator size="small" color="#fff" /> : <><Truck size={20} color="#fff" /><Text className="font-black text-sm text-white ml-2">Mulai Pengiriman (In Transit)</Text></>}
              </Button>
            )}

            {order.status === "Dikirim" && (
              <Button size="lg" variant="primary" className="w-full h-14 rounded-2xl flex-row gap-2 items-center justify-center" style={{ backgroundColor: '#10b981', elevation: 4, shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 6 }} onPress={() => setShowForm("delivery")}>
                <ShieldCheck size={20} color="#fff" />
                <Text className="font-black text-sm text-white ml-2">Selesaikan Pengiriman (Drop)</Text>
              </Button>
            )}

            {order.status === "Selesai" && (
              <Button size="lg" variant="outline" className="w-full h-14 rounded-2xl flex-row items-center justify-center border-slate-200 bg-slate-50" onPress={() => router.replace("/(tabs)/radar")}>
                <Text className="font-black text-sm text-slate-800">Kembali ke Radar</Text>
              </Button>
            )}

          </View>
        )}
      </Animated.View>
    </View>
  );
}
