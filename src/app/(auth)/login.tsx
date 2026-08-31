import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useRouter, Link } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Lock, Mail, Eye, EyeOff, Truck } from 'lucide-react-native';
import { Image } from 'expo-image';

import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthStore, StoreUser } from '@/store/useAuthStore';
import { Role } from '@/types/user';

import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

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
      Alert.alert("Error", "Email dan Password wajib diisi!");
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
        Alert.alert("Gagal Login", "Email atau kata sandi salah.");
      } else {
        Alert.alert("Error", error.message.replace("Firebase: ", ""));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    Alert.alert("Google Sign-In", "Segera hadir di versi berikutnya.");
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-50"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 relative justify-center px-6 py-12">
          
          {/* Background Glow Blobs (Absolute) */}
          <View className="absolute top-[-5%] right-[-10%] w-72 h-72 bg-[#7A171D] rounded-full opacity-10 blur-3xl" />
          <View className="absolute bottom-[10%] left-[-10%] w-64 h-64 bg-[#C5A059] rounded-full opacity-10 blur-3xl" />

          <Animated.View entering={FadeInDown.duration(600).springify()} className="w-full max-w-sm mx-auto">
            <Card className="shadow-xl shadow-slate-200/50">
              <CardContent>
                
                {/* Header Section */}
                <View className="items-center mb-8">
                  <View className="w-16 h-16 bg-[#7A171D]/10 rounded-2xl flex items-center justify-center mb-4 border border-[#7A171D]/20">
                    <Truck size={32} color="#7A171D" />
                  </View>
                  <Text className="text-2xl font-black text-slate-900 tracking-tight">Portal Mitra</Text>
                  <Text className="text-sm text-slate-500 mt-1 font-medium">Masuk untuk mulai menerima order</Text>
                </View>

                {/* Form Section */}
                <View className="space-y-5">
                  <View className="space-y-1.5">
                    <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Email</Text>
                    <Input 
                      icon={<Mail size={20} color="#94a3b8" />}
                      placeholder="email@anda.com"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View className="space-y-1.5">
                    <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Password</Text>
                    <Input 
                      icon={<Lock size={20} color="#94a3b8" />}
                      placeholder="••••••••"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      rightIcon={
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-1">
                          {showPassword ? <EyeOff size={20} color="#94a3b8" /> : <Eye size={20} color="#94a3b8" />}
                        </TouchableOpacity>
                      }
                    />
                  </View>

                  <View className="pt-2">
                    <Button 
                      variant="primary"
                      size="lg"
                      onPress={handleLogin}
                      isLoading={isLoading}
                    >
                      Mulai Narik
                    </Button>
                  </View>
                </View>

                {/* Divider */}
                <View className="flex-row items-center my-8">
                  <View className="flex-1 h-[1px] bg-slate-200" />
                  <Text className="px-3 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    Atau Lanjutkan Dengan
                  </Text>
                  <View className="flex-1 h-[1px] bg-slate-200" />
                </View>

                {/* Google Button */}
                <Button 
                  variant="outline"
                  size="lg"
                  onPress={handleGoogleLogin}
                  disabled={isLoading}
                  className="bg-white"
                >
                  <View className="flex-row items-center gap-3">
                    <Image 
                      source={{ uri: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" }} 
                      style={{ width: 18, height: 18 }} 
                    />
                    <Text className="font-bold text-slate-700">Masuk dengan Google</Text>
                  </View>
                </Button>

                {/* Register Link */}
                <View className="mt-8 items-center">
                  <Text className="text-xs font-bold text-slate-500 text-center leading-5">
                    Belum bergabung menjadi mitra?{'\n'}
                    <Link href="/(auth)/register" className="text-[#C5A059] font-bold">
                      <Text className="underline">Daftar Sekarang</Text>
                    </Link>
                  </Text>
                </View>

              </CardContent>
            </Card>
          </Animated.View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
