import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  negative?: boolean;
  accent?: boolean;
  style?: ViewStyle;
}

export function StatCard({ label, value, sub, positive, negative, accent, style }: StatCardProps) {
  const valueColor = positive ? Colors.green : negative ? Colors.red : accent ? Colors.accent : Colors.textPrimary;

  return (
    <View style={[styles.card, style]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      {sub && <Text style={styles.sub}>{sub}</Text>}
    </View>
  );
}

interface HeroStatProps {
  totalValue: string;
  change: string;
  isPositive: boolean;
}

export function HeroStat({ totalValue, change, isPositive }: HeroStatProps) {
  return (
    <LinearGradient
      colors={['#1A1D2E', '#12141F']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={styles.heroGlow} />
      <Text style={styles.heroLabel}>Total Portfolio Value</Text>
      <Text style={styles.heroValue}>{totalValue}</Text>
      <View style={styles.heroBadge}>
        <Text style={[styles.heroBadgeText, { color: isPositive ? Colors.green : Colors.red }]}>
          {isPositive ? '▲' : '▼'} {change} 24h
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  label: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  hero: {
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    left: '50%',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(108,99,255,0.12)',
    transform: [{ translateX: -90 }],
  },
  heroLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroValue: {
    fontSize: 42,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -1.5,
    marginBottom: 10,
  },
  heroBadge: {
    backgroundColor: Colors.greenBg,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${Colors.green}30`,
  },
  heroBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
