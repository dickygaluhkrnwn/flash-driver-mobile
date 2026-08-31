import React, { useRef } from 'react';
import { Pressable, Text, ActivityIndicator, Animated, ViewStyle } from 'react-native';
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
  
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10,
    }).start();
  };

  const sizes = {
    sm: "h-10 px-4",
    md: "h-14 px-6", // Taller for Gen Z chunky feel
    lg: "h-16 px-8",
  };

  const textVariants = {
    primary: "text-white font-black tracking-wide",
    gold: "text-white font-black tracking-wide",
    outline: "text-slate-800 font-bold",
    ghost: "text-slate-700 font-bold",
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  // Determine Gradient Colors
  let gradientColors = ['transparent', 'transparent'];
  let shadowStyle = {};
  let borderStyle = "border-0";
  let highlightStyle = {};

  if (variant === 'primary') {
    gradientColors = ['#9A242B', '#7A171D']; // Merah Marun Gradient
    shadowStyle = { elevation: 8, shadowColor: '#7A171D', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10 };
    highlightStyle = { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' }; // 3D highlight
  } else if (variant === 'gold') {
    gradientColors = ['#D4B371', '#C5A059'];
    shadowStyle = { elevation: 8, shadowColor: '#C5A059', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10 };
    highlightStyle = { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.3)' };
  } else if (variant === 'outline') {
    gradientColors = ['#ffffff', '#f8fafc'];
    shadowStyle = { elevation: 2, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 };
    borderStyle = "border-2 border-slate-200";
  }

  const isGradient = variant === 'primary' || variant === 'gold';

  return (
    <Animated.View 
      style={[{ transform: [{ scale: scaleValue }] }, style]} 
      className={`rounded-[1.25rem] overflow-visible ${(disabled || isLoading) ? 'opacity-50' : ''} ${className}`}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || isLoading}
        style={({ pressed }) => [
          {
            width: '100%',
            borderRadius: 20,
            overflow: 'hidden',
          },
          shadowStyle,
          variant === 'ghost' && pressed && { backgroundColor: 'rgba(0,0,0,0.05)' }
        ]}
        {...props}
      >
        <LinearGradient
          colors={isGradient ? gradientColors : ['transparent', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
            highlightStyle
          ]}
          className={`${sizes[size]} ${borderStyle}`}
        >
          {isLoading ? (
            <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? '#64748b' : '#ffffff'} />
          ) : (
            typeof children === 'string' ? (
              <Text className={`${textVariants[variant]} ${textSizes[size]}`}>
                {children}
              </Text>
            ) : (
              children
            )
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}
