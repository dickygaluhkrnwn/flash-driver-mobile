import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { X, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface OnboardingWizardProps {
  dbUser: any;
  onClose: () => void;
  onSuccess: (payload: any) => void;
  showToast: (msg: string, type: string) => void;
}

export function OnboardingWizard({ dbUser, onClose, onSuccess, showToast }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // States for form
  const [partnerType, setPartnerType] = useState('Individual');
  const [domisili, setDomisili] = useState('');
  const [vehicleType, setVehicleType] = useState('Motor');
  const [licensePlate, setLicensePlate] = useState('');

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Simulate API call for now (actual logic handled in parent or here)
      await new Promise(resolve => setTimeout(resolve, 1500));
      onSuccess({
        partnerType,
        domisili,
        vehicleType,
        licensePlate,
        status: 'Pending'
      });
    } catch (error) {
      showToast("Terjadi kesalahan.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible animationType="slide" transparent>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-slate-50 w-full h-[90%] rounded-t-3xl overflow-hidden shadow-2xl">
          {/* Header */}
          <View className="bg-white px-6 py-4 flex-row items-center justify-between border-b border-slate-100">
            <View className="flex-row items-center gap-3">
              {step > 1 && (
                <TouchableOpacity onPress={handleBack} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full">
                  <ChevronLeft size={20} color="#334155" />
                </TouchableOpacity>
              )}
              <Text className="text-xl font-black text-slate-800 tracking-tight">Verifikasi Data</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full">
              <X size={20} color="#334155" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView className="flex-1 px-6 py-6" keyboardShouldPersistTaps="handled">
            {step === 1 && (
              <View className="space-y-6">
                <Text className="text-2xl font-black text-[#7A171D]">Pilih Tipe Kemitraan</Text>
                
                <TouchableOpacity onPress={() => setPartnerType('Individual')} className={`p-4 border-2 rounded-2xl ${partnerType === 'Individual' ? 'border-[#7A171D] bg-[#7A171D]/5' : 'border-slate-200'}`}>
                  <Text className={`text-lg font-bold ${partnerType === 'Individual' ? 'text-[#7A171D]' : 'text-slate-700'}`}>Mitra Mandiri (Individual)</Text>
                  <Text className="text-xs text-slate-500 mt-1 font-medium">Bekerja sendiri dengan kendaraan pribadi.</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setPartnerType('Vendor')} className={`p-4 border-2 rounded-2xl ${partnerType === 'Vendor' ? 'border-blue-600 bg-blue-50' : 'border-slate-200'}`}>
                  <Text className={`text-lg font-bold ${partnerType === 'Vendor' ? 'text-blue-600' : 'text-slate-700'}`}>Mitra Vendor (Perusahaan)</Text>
                  <Text className="text-xs text-slate-500 mt-1 font-medium">Memiliki PT/CV dan manajemen armada sendiri.</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 2 && (
              <View className="space-y-6">
                <Text className="text-2xl font-black text-[#7A171D]">Informasi Dasar</Text>
                <View className="space-y-1.5">
                  <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Domisili Kota</Text>
                  <Input placeholder="Contoh: Jakarta Selatan" value={domisili} onChangeText={setDomisili} />
                </View>
              </View>
            )}

            {step === 3 && (
              <View className="space-y-6">
                <Text className="text-2xl font-black text-[#7A171D]">Data Kendaraan</Text>
                <View className="space-y-1.5">
                  <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Tipe Kendaraan</Text>
                  <Input placeholder="Motor / Mobil / Blindvan" value={vehicleType} onChangeText={setVehicleType} />
                </View>
                <View className="space-y-1.5">
                  <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Plat Nomor</Text>
                  <Input placeholder="Contoh: B 1234 ABC" value={licensePlate} onChangeText={setLicensePlate} />
                </View>
              </View>
            )}
            
            <View className="h-10" />
          </ScrollView>

          {/* Footer Action */}
          <View className="p-6 bg-white border-t border-slate-100 pb-safe">
            {step < 3 ? (
              <Button onPress={handleNext} variant={partnerType === 'Vendor' ? 'primary' : 'primary'} className={partnerType === 'Vendor' ? 'bg-blue-600 shadow-blue-600/30' : ''}>
                Selanjutnya
              </Button>
            ) : (
              <Button onPress={handleSubmit} isLoading={isLoading} variant={partnerType === 'Vendor' ? 'primary' : 'primary'} className={partnerType === 'Vendor' ? 'bg-blue-600 shadow-blue-600/30' : ''}>
                Kirim Verifikasi
              </Button>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
