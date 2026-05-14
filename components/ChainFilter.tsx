import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { Chain } from '@/constants/mockData';

const ALL_CHAINS: { key: 'all' | Chain; label: string; emoji: string }[] = [
  { key: 'all', label: 'All', emoji: '🌐' },
  { key: 'ethereum', label: 'Ethereum', emoji: '⟠' },
  { key: 'arbitrum', label: 'Arbitrum', emoji: '🔵' },
  { key: 'base', label: 'Base', emoji: '🔷' },
  { key: 'optimism', label: 'Optimism', emoji: '🔴' },
  { key: 'polygon', label: 'Polygon', emoji: '🟣' },
  { key: 'bnb', label: 'BNB', emoji: '🟡' },
  { key: 'avalanche', label: 'Avalanche', emoji: '🔺' },
  { key: 'solana', label: 'Solana', emoji: '◎' },
];

const chainAccent: Record<string, string> = {
  all: Colors.primary,
  ethereum: Colors.ethereum,
  arbitrum: '#96BEDC',
  base: Colors.base,
  optimism: Colors.optimism,
  polygon: Colors.polygon,
  bnb: Colors.bnb,
  avalanche: Colors.avalanche,
  solana: Colors.solana,
};

interface ChainFilterProps {
  selected: 'all' | Chain;
  onChange: (chain: 'all' | Chain) => void;
}

export function ChainFilter({ selected, onChange }: ChainFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {ALL_CHAINS.map((chain) => {
        const isActive = selected === chain.key;
        const color = chainAccent[chain.key];
        return (
          <TouchableOpacity
            key={chain.key}
            onPress={() => onChange(chain.key)}
            activeOpacity={0.75}
            style={[
              styles.chip,
              isActive && { backgroundColor: `${color}20`, borderColor: `${color}60` },
            ]}
          >
            <Text style={styles.emoji}>{chain.emoji}</Text>
            <Text style={[styles.label, { color: isActive ? color : Colors.textSecondary }]}>
              {chain.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 5,
  },
  emoji: {
    fontSize: 13,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
