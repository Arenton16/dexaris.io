import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';
import { Chain, RiskLevel } from '@/constants/mockData';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'green' | 'red' | 'yellow' | 'chain' | 'risk';
  chain?: Chain;
  risk?: RiskLevel;
  style?: ViewStyle;
}

const chainColors: Record<Chain, string> = {
  ethereum: Colors.ethereum,
  bnb: Colors.bnb,
  polygon: Colors.polygon,
  avalanche: Colors.avalanche,
  arbitrum: '#96BEDC',
  optimism: Colors.optimism,
  solana: Colors.solana,
  base: Colors.base,
};

const riskConfig: Record<RiskLevel, { color: string; bg: string; label: string }> = {
  low: { color: Colors.green, bg: Colors.greenBg, label: 'Low Risk' },
  medium: { color: Colors.yellow, bg: Colors.yellowBg, label: 'Medium Risk' },
  high: { color: Colors.red, bg: Colors.redBg, label: 'High Risk' },
};

export function Badge({ label, variant = 'default', chain, risk, style }: BadgeProps) {
  if (variant === 'chain' && chain) {
    const color = chainColors[chain];
    return (
      <View style={[styles.base, { backgroundColor: `${color}20`, borderColor: `${color}40` }, style]}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={[styles.text, { color }]}>{label}</Text>
      </View>
    );
  }

  if (variant === 'risk' && risk) {
    const cfg = riskConfig[risk];
    return (
      <View style={[styles.base, { backgroundColor: cfg.bg, borderColor: `${cfg.color}30` }, style]}>
        <Text style={[styles.text, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
    );
  }

  const variantStyles: Record<string, { bg: string; color: string; border: string }> = {
    default: { bg: Colors.bgElevated, color: Colors.textSecondary, border: Colors.border },
    green: { bg: Colors.greenBg, color: Colors.green, border: `${Colors.green}30` },
    red: { bg: Colors.redBg, color: Colors.red, border: `${Colors.red}30` },
    yellow: { bg: Colors.yellowBg, color: Colors.yellow, border: `${Colors.yellow}30` },
  };

  const vs = variantStyles[variant] || variantStyles.default;
  return (
    <View style={[styles.base, { backgroundColor: vs.bg, borderColor: vs.border }, style]}>
      <Text style={[styles.text, { color: vs.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
