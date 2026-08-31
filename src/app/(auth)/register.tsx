import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useRouter, Link } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Lock, Mail, User as UserIcon, Eye, EyeOff, Truck } from 'lucide-react-native';
import { Image } from 'expo-image';

import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthStore, StoreUser } from '@/store/useAuthStore';

import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuthStore();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert("Error", "Semua kolom wajib diisi!");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Buat Akun di Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // 2. Update Profil Auth
      await updateProfile(userCredential.user, {
        displayName: name
      });

      // 3. Simpan ke Firestore dengan status 'Pending'
      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: userCredential.user.email || email,
        displayName: name,
        role: "driver",
        status: "Pending",
        createdAt: serverTimestamp()
      });

      // 4. Masukkan ke State Global (Zustand)
      login({
        uid: userCredential.user.uid,
        email: userCredential.user.email || email,
        displayName: name,
        role: "driver",
        status: "Pending",
        createdAt: new Date(),
      } as StoreUser);

      // 5. Arahkan ke Dashboard
      router.replace('/(tabs)/dashboard');

    } catch (error: any) {
      let friendlyError = error.message;
      if (friendlyError.includes("email-already-in-use")) friendlyError = "Email sudah terdaftar. Silakan login.";
      if (friendlyError.includes("weak-password")) friendlyError = "Password minimal 6 karakter.";
      
      Alert.alert("Gagal Mendaftar", friendlyError.replace("Firebase: ", ""));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    Alert.alert("Google Sign-In", "Segera hadir di versi berikutnya.");
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-50"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 relative justify-center px-6 py-12">
          
          {/* Background Glow Blobs (Dibalik dari Login, ini dominan Gold) */}
          <View className="absolute top-[-5%] left-[-10%] w-72 h-72 bg-[#C5A059] rounded-full opacity-10 blur-3xl" />
          <View className="absolute bottom-[10%] right-[-10%] w-64 h-64 bg-[#7A171D] rounded-full opacity-10 blur-3xl" />

          <Animated.View entering={FadeInDown.duration(600).springify()} className="w-full max-w-sm mx-auto">
            <Card className="shadow-xl shadow-slate-200/50">
              <CardContent>
                
                {/* Header Section */}
                <View className="items-center mb-8">
                  <View className="w-16 h-16 bg-[#C5A059]/15 rounded-2xl flex items-center justify-center mb-4 border border-[#C5A059]/30">
                    <Truck size={32} color="#A68345" />
                  </View>
                  <Text className="text-2xl font-black text-slate-900 tracking-tight">Daftar Mitra</Text>
                  <Text className="text-sm text-slate-500 mt-1 font-medium">Buat akun untuk bergabung bersama kami</Text>
                </View>

                {/* Form Section */}
                <View className="space-y-5">
                  <View className="space-y-1.5">
                    <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Nama Lengkap</Text>
                    <Input 
                      icon={<UserIcon size={20} color="#94a3b8" />}
                      placeholder="Nama sesuai KTP"
                      value={name}
                      onChangeText={setName}
                    />
                  </View>

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
                      placeholder="Minimal 6 karakter"
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
                      variant="gold"
                      size="lg"
                      onPress={handleRegister}
                      isLoading={isLoading}
                    >
                      Daftar Sekarang
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
                  onPress={handleGoogleRegister}
                  disabled={isLoading}
                  className="bg-white"
                >
                  <View className="flex-row items-center gap-3">
                    <Image 
                      source={{ uri: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" }} 
                      style={{ width: 18, height: 18 }} 
                    />
                    <Text className="font-bold text-slate-700">Daftar dengan Google</Text>
                  </View>
                </Button>

                {/* Login Link */}
                <View className="mt-8 items-center">
                  <Text className="text-xs font-bold text-slate-500 text-center leading-5">
                    Sudah bergabung menjadi mitra?{'\n'}
                    <Link href="/(auth)/login" className="text-[#7A171D] font-bold">
                      <Text className="underline">Masuk di sini</Text>
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
