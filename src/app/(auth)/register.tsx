import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Dimensions, TextInput } from 'react-native';
import { useRouter, Link } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Lock, Mail, User as UserIcon, Eye, EyeOff, Truck, Zap, UserPlus } from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthStore, StoreUser } from '@/store/useAuthStore';

const { width, height } = Dimensions.get('window');

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
      Alert.alert("Oops!", "Semua kolom wajib diisi ya, Calon Mitra!");
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
      if (friendlyError.includes("weak-password")) friendlyError = "Kata sandi minimal 6 karakter.";
      
      Alert.alert("Gagal Mendaftar", friendlyError.replace("Firebase: ", ""));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = () => {
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
      <View className="absolute top-10 -right-20 w-64 h-64 bg-[#c5a059] rounded-full opacity-30 blur-[100px]" />
      <View className="absolute bottom-20 -left-20 w-80 h-80 bg-red-600 rounded-full opacity-20 blur-[120px]" />

      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <View className="px-6 py-12 relative z-10 w-full max-w-[400px] mx-auto">
          
          {/* HEADER HERO */}
          <Animated.View entering={FadeInDown.duration(800).springify()} className="items-center mb-8">
            <View className="w-20 h-20 bg-[#c5a059]/20 rounded-[2rem] items-center justify-center border border-[#c5a059]/40 mb-4 shadow-xl relative overflow-hidden">
              <LinearGradient colors={['rgba(255,255,255,0.2)', 'transparent']} className="absolute inset-0" />
              <UserPlus size={36} color="#FACC15" />
            </View>
            <Text className="text-4xl font-black text-white tracking-tighter drop-shadow-md text-center leading-tight">
              Daftar<Text className="text-[#c5a059]"> Mitra</Text>
            </Text>
            <Text className="text-white/80 font-bold mt-2 text-center text-sm px-4 drop-shadow-sm">
              Ambil kendali dan mulai hasilkan cuan bersama Flash Global.
            </Text>
          </Animated.View>

          {/* MAIN CARD (Premium 3D) */}
          <Animated.View entering={FadeInUp.duration(800).delay(200).springify()} className="relative">
            {/* Soft 3D Depth */}
            <View className="absolute left-4 right-4 -bottom-3 h-10 bg-[#2a0404] rounded-[2.5rem] opacity-60" />
            
            <View className="bg-white rounded-[2.5rem] p-7 shadow-2xl relative z-10">
              
              <View className="mb-8">
                <Text className="text-2xl font-black text-slate-800 tracking-tight">Buat Akun</Text>
                <Text className="text-xs text-slate-400 font-bold mt-1">Lengkapi data diri Anda di bawah ini</Text>
              </View>

              <View className="space-y-5">
                {/* Name Input */}
                <View>
                  <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Nama Lengkap</Text>
                  <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 h-14">
                    <UserIcon size={20} color="#94a3b8" />
                    <TextInput 
                      className="flex-1 ml-3 font-bold text-slate-800 h-full"
                      placeholder="Nama sesuai KTP"
                      placeholderTextColor="#94a3b8"
                      value={name}
                      onChangeText={setName}
                    />
                  </View>
                </View>

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
                      placeholder="Minimal 6 karakter"
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

              {/* Register Button (Elegant 3D Gold) */}
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={handleRegister}
                disabled={isLoading}
                className="mt-8 relative"
              >
                <View className="absolute inset-0 bg-[#a16207] rounded-2xl translate-y-1.5" />
                <View className="bg-[#eab308] rounded-2xl h-14 items-center justify-center border border-[#ca8a04] relative z-10 flex-row gap-2">
                  {isLoading ? (
                    <Text className="text-slate-900 font-black uppercase tracking-widest">Memproses...</Text>
                  ) : (
                    <>
                      <Text className="text-slate-900 font-black uppercase tracking-widest">Daftar Sekarang</Text>
                      <Truck size={18} color="#0f172a" />
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
                onPress={handleGoogleRegister}
                disabled={isLoading}
                className="relative"
              >
                <View className="absolute inset-0 bg-slate-300 rounded-2xl translate-y-1.5" />
                <View className="bg-white rounded-2xl h-14 items-center justify-center border border-slate-200 relative z-10 flex-row gap-3">
                  <Image 
                    source={{ uri: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" }} 
                    style={{ width: 20, height: 20 }} 
                  />
                  <Text className="text-slate-700 font-bold tracking-tight">Daftar dengan Google</Text>
                </View>
              </TouchableOpacity>

            </View>
          </Animated.View>

          {/* Login Link */}
          <Animated.View entering={FadeInUp.duration(800).delay(400)} className="mt-8 items-center">
            <View className="bg-black/20 px-5 py-3 rounded-2xl border border-white/10 flex-row items-center gap-2">
              <Text className="text-xs font-bold text-white/80">Sudah bergabung menjadi mitra?</Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text className="text-[#c5a059] font-black uppercase tracking-widest text-xs underline">Masuk</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </Animated.View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
