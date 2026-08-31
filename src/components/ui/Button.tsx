import React from 'react';
import { TouchableOpacity, Text, TouchableOpacityProps, ActivityIndicator } from 'react-native';

export interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'gold' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  children, 
  className,
  disabled,
  ...props 
}: ButtonProps) {
  
  const baseStyle = "flex flex-row items-center justify-center rounded-2xl active:opacity-80";
  
  const variants = {
    primary: "bg-[#7A171D] shadow-md shadow-[#7A171D]/30",
    gold: "bg-[#C5A059] shadow-md shadow-[#C5A059]/30",
    outline: "bg-transparent border border-slate-200",
    ghost: "bg-transparent",
  };

  const sizes = {
    sm: "h-9 px-4",
    md: "h-12 px-6",
    lg: "h-14 px-8",
  };

  const textVariants = {
    primary: "text-white font-bold",
    gold: "text-white font-bold",
    outline: "text-slate-700 font-bold",
    ghost: "text-slate-700 font-medium",
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  return (
    <TouchableOpacity 
      disabled={disabled || isLoading}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${(disabled || isLoading) ? 'opacity-50' : ''} ${className || ''}`}
      {...props}
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
    </TouchableOpacity>
  );
}
