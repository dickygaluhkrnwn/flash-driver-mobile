import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { Camera, CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { X, ScanLine, Flashlight } from "lucide-react-native";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from "react-native-reanimated";

const { width } = Dimensions.get("window");
const SCANNER_SIZE = width * 0.7;

export default function ScannerPage() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);

  // Animation for the scanner line
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withTiming(SCANNER_SIZE, { duration: 2000, easing: Easing.linear }),
      -1, // infinite
      true // reverse
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }]
  }));

  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-black items-center justify-center p-6">
        <Text className="text-white font-bold text-center mb-6">Kami membutuhkan izin kamera untuk memindai resi AWB.</Text>
        <TouchableOpacity 
          onPress={requestPermission}
          className="bg-emerald-500 px-6 py-3 rounded-full"
        >
          <Text className="text-white font-black">Berikan Izin Kamera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);
    // Data is assumed to be the order ID / AWB
    router.replace(`/(awb)/${data}`);
  };

  return (
    <View className="flex-1 bg-black relative">
      <CameraView 
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39"],
        }}
      />

      {/* Overlay UI */}
      <View className="absolute inset-0 z-10">
        
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pt-16 pb-4 bg-black/40 backdrop-blur-md">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-12 h-12 rounded-full bg-white/20 items-center justify-center border border-white/30 backdrop-blur-md"
          >
            <X size={24} color="#FFF" />
          </TouchableOpacity>
          <Text className="text-white font-black text-lg tracking-widest uppercase shadow-sm">Scan AWB</Text>
          <TouchableOpacity 
            onPress={() => setTorch(!torch)}
            className={`w-12 h-12 rounded-full items-center justify-center border backdrop-blur-md ${torch ? 'bg-amber-400 border-amber-300' : 'bg-white/20 border-white/30'}`}
          >
            <Flashlight size={24} color={torch ? "#000" : "#FFF"} />
          </TouchableOpacity>
        </View>

        {/* Center Scanner Frame */}
        <View className="flex-1 items-center justify-center bg-black/60">
          <View style={{ width: SCANNER_SIZE, height: SCANNER_SIZE }} className="relative">
            {/* Viewfinder border cutout effect */}
            <View style={{ width: SCANNER_SIZE, height: SCANNER_SIZE, overflow: 'hidden', borderRadius: 24, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' }}>
              
              {/* Clear center */}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]} />
              
              {/* Animated Scan Line */}
              <Animated.View style={[{ height: 2, backgroundColor: '#10b981', width: '100%', shadowColor: '#10b981', shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } }, animatedStyle]} />
            </View>

            {/* Corner Accents */}
            <View className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-3xl" />
            <View className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-3xl" />
            <View className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-3xl" />
            <View className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-3xl" />
          </View>

          <View className="mt-10 items-center">
            <View className="bg-emerald-500/20 px-4 py-2 rounded-full border border-emerald-500/50 flex-row items-center gap-2 mb-2">
              <ScanLine size={16} color="#34d399" />
              <Text className="text-emerald-400 font-bold text-xs uppercase tracking-widest">Arahkan ke Barcode / QR</Text>
            </View>
            <Text className="text-slate-400 text-xs font-medium text-center px-10">Pindai kode pada resi pengiriman untuk membuka Manifes AWB.</Text>
          </View>
        </View>

      </View>
    </View>
  );
}
