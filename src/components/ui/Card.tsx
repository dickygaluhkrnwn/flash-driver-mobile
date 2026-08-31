import React from 'react';
import { View, ViewProps } from 'react-native';
import { cssInterop } from 'nativewind';

export function Card({ className, ...props }: ViewProps) {
  return (
    <View 
      className={`glass-card rounded-3xl p-6 ${className || ''}`} 
      {...props} 
    />
  );
}

export function CardContent({ className, ...props }: ViewProps) {
  return (
    <View 
      className={`w-full ${className || ''}`} 
      {...props} 
    />
  );
}
