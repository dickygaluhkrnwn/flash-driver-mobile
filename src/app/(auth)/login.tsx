import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Dimensions, TextInput } from 'react-native';
import { useRouter, Link } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Lock, Mail, Eye, EyeOff, Truck, Zap } from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthStore, StoreUser } from '@/store/useAuthStore';
import { Role } from '@/types/user';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuthStore();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const verifyDriverRole = async (uid: string, fallbackEmail: string, fallbackName: string, photoURL?: string) => {
    try {
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userRole = (userData?.role || "") as Role;
        
        if (userRole === "driver") {
          if (userData.isSuspended) {
            await signOut(auth);
            Alert.alert("Akses Ditolak", "Akun Anda ditangguhkan. Silakan hubungi pusat bantuan.");
            return false;
          }

          login({
            uid,
            email: userData.email || fallbackEmail,
            displayName: userData.displayName || userData.name || fallbackName,
            photoURL: userData.photoURL || photoURL || undefined,
            role: "driver",
            regional: userData.regional || undefined,
            createdAt: userData.createdAt || new Date(),
            updatedAt: userData.updatedAt || new Date(),
            partnerType: userData.partnerType || "Individual"
          } as StoreUser);

          router.replace('/(tabs)/dashboard'); 
          return true;
        } else {
          await signOut(auth);
          Alert.alert("Akses Ditolak", "Portal ini khusus Mitra Pengemudi.");
          return false;
        }
      } else {
        await signOut(auth);
        Alert.alert("Gagal Login", "Akun tidak ditemukan. Silakan mendaftar terlebih dahulu.");
        return false;
      }
    } catch (error) {
      console.error("ERROR Fatal saat verifikasi Firestore:", error);
      Alert.alert("Error", "Koneksi ke database gagal.");
      await signOut(auth);
      return false;
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Oops!", "Email dan Password wajib diisi ya, Mitra!");
      return;
    }
    
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await verifyDriverRole(
        userCredential.user.uid, 
        userCredential.user.email || email, 
        userCredential.user.displayName || "Mitra Pengemudi"
      );
    } catch (error: any) {
      if (error?.message?.includes("auth/invalid-credential")) {
        Alert.alert("Gagal Login", "Email atau kata sandi salah nih, coba cek lagi.");
      } else {
        Alert.alert("Error", error.message.replace("Firebase: ", ""));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    Alert.alert("Google Sign-In", "Segera hadir di versi berikutnya! 🚀");
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-black"
    >
      {/* Dynamic Background */}
      <LinearGradient
        colors={['#450a0a', '#7a171d', '#9a242b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', width, height }}
      />
      
      {/* Decorative Orbs */}
      <View className="absolute top-10 -left-20 w-64 h-64 bg-[#c5a059] rounded-full opacity-30 blur-[100px]" />
      <View className="absolute bottom-20 -right-20 w-80 h-80 bg-red-600 rounded-full opacity-20 blur-[120px]" />

      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <View className="px-6 py-12 relative z-10 w-full max-w-[400px] mx-auto">
          
          {/* HEADER HERO */}
          <Animated.View entering={FadeInDown.duration(800).springify()} className="items-center mb-8">
            <View className="w-20 h-20 bg-white/10 rounded-[2rem] items-center justify-center border border-white/20 mb-4 shadow-xl relative overflow-hidden">
              <LinearGradient colors={['rgba(255,255,255,0.2)', 'transparent']} className="absolute inset-0" />
              <Zap size={36} color="#FFF" fill="#FACC15" />
            </View>
            <Text className="text-4xl font-black text-white tracking-tighter drop-shadow-md">
              Flash<Text className="text-[#c5a059]">Driver</Text>
            </Text>
            <Text className="text-white/80 font-bold mt-2 text-center text-sm px-4 drop-shadow-sm">
              Portal super app khusus Mitra Pengemudi Flash Global.
            </Text>
          </Animated.View>

          {/* MAIN CARD (Premium 3D) */}
          <Animated.View entering={FadeInUp.duration(800).delay(200).springify()} className="relative">
            {/* Soft 3D Depth Layer */}
            <View className="absolute left-4 right-4 -bottom-3 h-10 bg-[#2a0404] rounded-[2.5rem] opacity-60" />
            
            <View className="bg-white rounded-[2.5rem] p-7 shadow-2xl relative z-10">
              
              <View className="mb-8">
                <Text className="text-2xl font-black text-slate-800 tracking-tight">Masuk Akun</Text>
                <Text className="text-xs text-slate-400 font-bold mt-1">Siap kejar target hari ini?</Text>
              </View>

              <View className="space-y-5">
                {/* Email Input */}
                <View>
                  <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Alamat Email</Text>
                  <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 h-14">
                    <Mail size={20} color="#94a3b8" />
                    <TextInput 
                      className="flex-1 ml-3 font-bold text-slate-800 h-full"
                      placeholder="email@mitra.com"
                      placeholderTextColor="#94a3b8"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View>
                  <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Kata Sandi</Text>
                  <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 h-14">
                    <Lock size={20} color="#94a3b8" />
                    <TextInput 
                      className="flex-1 ml-3 font-bold text-slate-800 h-full"
                      placeholder="••••••••"
                      placeholderTextColor="#94a3b8"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-2">
                      {showPassword ? <EyeOff size={20} color="#64748b" /> : <Eye size={20} color="#94a3b8" />}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Login Button (Elegant 3D) */}
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={handleLogin}
                disabled={isLoading}
                className="mt-8 relative"
              >
                <View className="absolute inset-0 bg-[#450a0a] rounded-2xl translate-y-1.5" />
                <View className="bg-[#7a171d] rounded-2xl h-14 items-center justify-center border border-[#9a242b] relative z-10 flex-row gap-2">
                  {isLoading ? (
                    <Text className="text-white font-black uppercase tracking-widest">Memproses...</Text>
                  ) : (
                    <>
                      <Text className="text-white font-black uppercase tracking-widest">Gass Sekarang!</Text>
                      <Truck size={18} color="#FFF" />
                    </>
                  )}
                </View>
              </TouchableOpacity>

              {/* Divider */}
              <View className="flex-row items-center my-6">
                <View className="flex-1 h-[1px] bg-slate-200" />
                <Text className="px-4 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                  Atau
                </Text>
                <View className="flex-1 h-[1px] bg-slate-200" />
              </View>

              {/* Google Button */}
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={handleGoogleLogin}
                disabled={isLoading}
                className="relative"
              >
                <View className="absolute inset-0 bg-slate-300 rounded-2xl translate-y-1.5" />
                <View className="bg-white rounded-2xl h-14 items-center justify-center border border-slate-200 relative z-10 flex-row gap-3">
                  <Image 
                    source={{ uri: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" }} 
                    style={{ width: 20, height: 20 }} 
                  />
                  <Text className="text-slate-700 font-bold tracking-tight">Masuk dengan Google</Text>
                </View>
              </TouchableOpacity>

            </View>
          </Animated.View>

          {/* Register Link */}
          <Animated.View entering={FadeInUp.duration(800).delay(400)} className="mt-8 items-center">
            <View className="bg-black/20 px-5 py-3 rounded-2xl border border-white/10 flex-row items-center gap-2">
              <Text className="text-xs font-bold text-white/80">Belum punya akun mitra?</Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <Text className="text-[#c5a059] font-black uppercase tracking-widest text-xs underline">Daftar</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </Animated.View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
