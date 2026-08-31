import React from 'react';
import { TextInput, TextInputProps, View } from 'react-native';

export interface InputProps extends TextInputProps {
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({ className, icon, rightIcon, ...props }: InputProps) {
  return (
    <View className="relative w-full justify-center">
      {icon && (
        <View className="absolute left-4 z-10">
          {icon}
        </View>
      )}
      
      <TextInput
        placeholderTextColor="#94a3b8" // slate-400
        className={`w-full h-12 bg-white/50 border border-slate-200/60 rounded-2xl px-4 text-slate-800 font-medium ${
          icon ? 'pl-11' : ''
        } ${rightIcon ? 'pr-11' : ''} ${className || ''}`}
        {...props}
      />

      {rightIcon && (
        <View className="absolute right-4 z-10">
          {rightIcon}
        </View>
      )}
    </View>
  );
}
