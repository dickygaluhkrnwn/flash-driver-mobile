import React from 'react';
import { Pressable, Text, ActivityIndicator, ViewStyle, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export interface ButtonProps {
  variant?: 'primary' | 'gold' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  children, 
  className = '',
  disabled,
  onPress,
  style,
  ...props 
}: ButtonProps) {
  
  const sizes = {
    sm: "h-10 px-4",
    md: "h-12 px-6",
    lg: "h-14 px-8",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  // Determine Colors
  let gradientColors = ['transparent', 'transparent'];
  let shadowBgColor = "bg-transparent";
  let borderStyle = "border-0";
  let textStyle = "text-slate-700 font-bold tracking-wide";

  if (variant === 'primary') {
    // Merah Flash
    gradientColors = ['#dc2626', '#b91c1c'];
    shadowBgColor = "bg-red-900";
    borderStyle = "border border-red-800";
    textStyle = "text-white font-bold tracking-widest uppercase";
  } else if (variant === 'gold') {
    // Emas Premium
    gradientColors = ['#d97706', '#b45309'];
    shadowBgColor = "bg-amber-900";
    borderStyle = "border border-amber-800";
    textStyle = "text-white font-bold tracking-widest uppercase";
  } else if (variant === 'outline') {
    gradientColors = ['#ffffff', '#f8fafc'];
    shadowBgColor = "bg-slate-300";
    borderStyle = "border border-slate-300";
    textStyle = "text-slate-700 font-bold tracking-widest uppercase";
  } else if (variant === 'ghost') {
    textStyle = "text-slate-600 font-bold tracking-widest uppercase";
  }

  const isGradient = variant === 'primary' || variant === 'gold';
  const hasShadowLayer = variant !== 'ghost';

  return (
    <View style={style} className={`relative ${(disabled || isLoading) ? 'opacity-50' : ''} ${className}`}>
      {/* 3D Shadow Layer (Subtle) */}
      {hasShadowLayer && (
        <View className={`absolute inset-0 rounded-2xl ${shadowBgColor} translate-y-1`} />
      )}
      
      {/* Main Button */}
      <Pressable
        onPress={onPress}
        disabled={disabled || isLoading}
        style={({ pressed }) => [
          {
            width: '100%',
            borderRadius: 16,
            overflow: 'hidden',
          },
          pressed && hasShadowLayer ? { transform: [{ translateY: 2 }] } : undefined,
          variant === 'ghost' && pressed ? { backgroundColor: 'rgba(0,0,0,0.05)' } : undefined
        ]}
        {...props}
      >
        <LinearGradient
          colors={isGradient ? (gradientColors as [string, string]) : (['transparent', 'transparent'] as [string, string])}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }]}
          className={`${sizes[size]} ${borderStyle} rounded-2xl relative z-10`}
        >
          {isLoading ? (
            <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? '#475569' : '#ffffff'} size="small" />
          ) : (
            typeof children === 'string' ? (
              <Text className={`${textStyle} ${textSizes[size]}`}>
                {children}
              </Text>
            ) : (
              children
            )
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );
}
