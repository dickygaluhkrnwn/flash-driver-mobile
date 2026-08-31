import React from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, Radar, Wallet, User, Truck, History } from 'lucide-react-native';
import { useAuthStore } from '@/store/useAuthStore';

const { width } = Dimensions.get('window');
const MAX_WIDTH = Math.min(width - 32, 400);

export function BottomNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const { isVendor, isHydrated } = useAuthStore();
  
  if (!isHydrated) return null;

  const vendorMode = isVendor();
  
  // Theme gradients defined as solid background colors or gradient substitutes in RN
  const activeBgColor = vendorMode ? 'bg-blue-600' : 'bg-[#7A171D]';
  const radarBgColor = vendorMode ? 'bg-blue-600' : 'bg-[#9A242B]';

  // Map route names to icons
  const getIcon = (routeName: string, isActive: boolean) => {
    const color = isActive ? '#FFFFFF' : '#94a3b8'; // white vs slate-400
    const size = isActive ? 24 : 20;

    switch (routeName) {
      case 'dashboard':
        return <Home size={size} color={color} strokeWidth={isActive ? 2.5 : 2} />;
      case 'orders':
        return <History size={size} color={color} strokeWidth={isActive ? 2.5 : 2} />;
      case 'fleet':
        return <Truck size={size} color={color} strokeWidth={isActive ? 2.5 : 2} />;
      case 'radar':
        return <Radar size={28} color="#FFFFFF" strokeWidth={2.5} />;
      case 'wallet':
        return <Wallet size={size} color={color} strokeWidth={isActive ? 2.5 : 2} />;
      case 'profile':
        return <User size={size} color={color} strokeWidth={isActive ? 2.5 : 2} />;
      default:
        return <Home size={size} color={color} />;
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
        className="flex-row items-center justify-between px-2 bg-white/90 backdrop-blur-xl rounded-[2.5rem] border border-white"
        style={{ width: MAX_WIDTH, height: 76, elevation: 15, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 }}
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
                className="relative flex items-center justify-center w-[60px] h-[60px]"
              >
                <View 
                  className="absolute -top-10 w-16 h-16 bg-white rounded-full flex items-center justify-center p-1.5 border-t border-white"
                  style={{ elevation: 10, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 10 }}
                >
                  <View className={`w-full h-full rounded-full flex items-center justify-center ${radarBgColor}`}>
                    {getIcon(route.name, isFocused)}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              className="relative flex-1 items-center justify-center h-[60px]"
            >
              {isFocused && (
                <View
                  className={`absolute inset-0 rounded-[2rem] ${activeBgColor}`}
                />
              )}
              <View className="relative z-10 flex-col items-center justify-center space-y-1">
                {getIcon(route.name, isFocused)}
                <Text 
                  className={`text-[9px] tracking-wide mt-1 ${isFocused ? 'text-white font-black' : 'text-slate-400 font-bold'}`}
                >
                  {getLabel(route.name)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
