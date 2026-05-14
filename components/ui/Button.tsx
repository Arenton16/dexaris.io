import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const sizeStyles = {
    sm: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, fontSize: 13 },
    md: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14, fontSize: 15 },
    lg: { paddingVertical: 18, paddingHorizontal: 32, borderRadius: 16, fontSize: 16 },
  }[size];

  const isDisabled = disabled || loading;

  if (variant === 'primary') {
    return (
      <TouchableOpacity onPress={onPress} disabled={isDisabled} style={[{ borderRadius: sizeStyles.borderRadius }, style]} activeOpacity={0.85}>
        <LinearGradient
          colors={isDisabled ? ['#3A3760', '#2E2B50'] : ['#6C63FF', '#4F48CC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, { paddingVertical: sizeStyles.paddingVertical, paddingHorizontal: sizeStyles.paddingHorizontal, borderRadius: sizeStyles.borderRadius }]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[styles.textPrimary, { fontSize: sizeStyles.fontSize }, textStyle]}>{label}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'accent') {
    return (
      <TouchableOpacity onPress={onPress} disabled={isDisabled} style={[{ borderRadius: sizeStyles.borderRadius }, style]} activeOpacity={0.85}>
        <LinearGradient
          colors={isDisabled ? ['#008F80', '#006B60'] : ['#00E5CC', '#00B8A4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, { paddingVertical: sizeStyles.paddingVertical, paddingHorizontal: sizeStyles.paddingHorizontal, borderRadius: sizeStyles.borderRadius }]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[styles.textPrimary, { fontSize: sizeStyles.fontSize }, textStyle]}>{label}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const variantMap = {
    secondary: { bg: Colors.bgElevated, color: Colors.textPrimary, border: Colors.border },
    outline: { bg: 'transparent', color: Colors.primary, border: Colors.primary },
    ghost: { bg: 'transparent', color: Colors.textSecondary, border: 'transparent' },
  }[variant] ?? { bg: Colors.bgElevated, color: Colors.textPrimary, border: Colors.border };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        {
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          borderRadius: sizeStyles.borderRadius,
          backgroundColor: variantMap.bg,
          borderWidth: variantMap.border !== 'transparent' ? 1 : 0,
          borderColor: variantMap.border,
          opacity: isDisabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantMap.color} size="small" />
      ) : (
        <Text style={[styles.textBase, { fontSize: sizeStyles.fontSize, color: variantMap.color }, textStyle]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  textPrimary: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textBase: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
