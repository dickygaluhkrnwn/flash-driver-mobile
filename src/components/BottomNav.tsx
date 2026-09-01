import React from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, Radar, Wallet, User, Truck, History } from 'lucide-react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const MAX_WIDTH = Math.min(width - 32, 400);

export function BottomNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const { isVendor, isHydrated } = useAuthStore();
  
  if (!isHydrated) return null;

  const vendorMode = isVendor();
  
  // Theme gradients defined as solid background colors or gradient substitutes in RN
  const activeGradient = vendorMode ? ['#1e40af', '#3b82f6'] : ['#450a0a', '#9A242B'];
  const radarGradient = vendorMode ? ['#1e3a8a', '#2563eb'] : ['#5A0E13', '#7A171D'];

  // Map route names to icons
  const getIconColor = (isActive: boolean) => {
    if (!isActive) return '#94a3b8'; // slate-400
    return vendorMode ? '#2563eb' : '#9A242B';
  };

  const getIcon = (routeName: string, isActive: boolean) => {
    const color = routeName === 'radar' ? '#FFFFFF' : getIconColor(isActive);
    const size = isActive ? 22 : 24; // slightly smaller when active to fit the pill, or keep it consistent

    switch (routeName) {
      case 'dashboard':
        return <Home size={22} color={color} strokeWidth={isActive ? 2.5 : 2} />;
      case 'orders':
        return <History size={22} color={color} strokeWidth={isActive ? 2.5 : 2} />;
      case 'fleet':
        return <Truck size={22} color={color} strokeWidth={isActive ? 2.5 : 2} />;
      case 'radar':
        return <Radar size={28} color="#FFFFFF" strokeWidth={2.5} />;
      case 'wallet':
        return <Wallet size={22} color={color} strokeWidth={isActive ? 2.5 : 2} />;
      case 'profile':
        return <User size={22} color={color} strokeWidth={isActive ? 2.5 : 2} />;
      default:
        return <Home size={22} color={color} />;
    }
  };

  const getLabel = (routeName: string) => {
    switch (routeName) {
      case 'dashboard': return 'Home';
      case 'orders': return 'Riwayat';
      case 'fleet': return 'Armada';
      case 'radar': return 'Radar';
      case 'wallet': return 'Dompet';
      case 'profile': return 'Profil';
      default: return routeName;
    }
  };

  return (
    <View className="absolute bottom-5 left-0 right-0 items-center justify-center pointer-events-box-none z-50">
      <View 
        className="flex-row items-center justify-between px-2 bg-white rounded-[2rem] border border-slate-100"
        style={{ width: MAX_WIDTH, height: 72, elevation: 8, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 }}
      >
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const isCenter = route.name === 'radar';

          // Hide fleet for individual, hide orders for vendor
          if (route.name === 'fleet' && !vendorMode) return null;
          if (route.name === 'orders' && vendorMode) return null;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (isCenter) {
            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                activeOpacity={0.8}
                className="relative flex items-center justify-center w-16 h-full"
              >
                <View 
                  className="absolute -top-6 items-center justify-center bg-white"
                  style={{ 
                    width: 64, 
                    height: 64, 
                    borderRadius: 32,
                    elevation: 6, // Pure Android elevation, guarantees circular shadow
                    shadowColor: vendorMode ? '#2563eb' : '#9A242B', 
                    shadowOffset: { width: 0, height: 4 }, 
                    shadowOpacity: 0.3, 
                    shadowRadius: 6
                  }}
                >
                  <View 
                    className="items-center justify-center"
                    style={{ 
                      width: 54, 
                      height: 54, 
                      borderRadius: 27,
                      backgroundColor: vendorMode ? '#2563eb' : '#9A242B' 
                    }}
                  >
                    {getIcon(route.name, true)}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }

          const activeBg = vendorMode ? 'bg-blue-50' : 'bg-[#7A171D]/10';
          const activeTextColor = vendorMode ? 'text-blue-700' : 'text-[#9A242B]';

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              className="flex-1 items-center justify-center h-full"
            >
              <View 
                className={`items-center justify-center ${isFocused ? 'flex-row py-2.5 px-4 rounded-full ' + activeBg : 'bg-transparent'}`}
              >
                {getIcon(route.name, isFocused)}
                {isFocused && (
                  <Text 
                    className={`text-[11px] font-black ml-1.5 tracking-tight ${activeTextColor}`}
                  >
                    {getLabel(route.name)}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
