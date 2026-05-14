import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/colors';
import { Badge } from '@/components/ui/Badge';
import { Protocol, chainNames } from '@/constants/mockData';

interface YieldCardProps {
  protocol: Protocol;
  onPress: () => void;
  compact?: boolean;
}

function formatTVL(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  return `$${value.toLocaleString()}`;
}

export function YieldCard({ protocol, onPress, compact }: YieldCardProps) {
  if (compact) {
    return (
      <TouchableOpacity style={styles.compactCard} onPress={onPress} activeOpacity={0.75}>
        <Text style={styles.emoji}>{protocol.logoEmoji}</Text>
        <View style={styles.compactInfo}>
          <Text style={styles.compactName}>{protocol.name}</Text>
          <Text style={styles.compactToken}>{protocol.token}</Text>
        </View>
        <View style={styles.compactRight}>
          <Text style={styles.apyBig}>{protocol.apy.toFixed(1)}%</Text>
          <Text style={styles.apyLabel}>APY</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoCircle}>
            <Text style={styles.emoji}>{protocol.logoEmoji}</Text>
          </View>
          <View>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{protocol.name}</Text>
              {protocol.trending && (
                <View style={styles.trendingBadge}>
                  <Text style={styles.trendingText}>🔥 Hot</Text>
                </View>
              )}
            </View>
            <Text style={styles.category}>{protocol.category}</Text>
          </View>
        </View>
        <View style={styles.apyContainer}>
          <Text style={styles.apyValue}>{protocol.apy.toFixed(1)}%</Text>
          <Text style={styles.apyUnit}>APY</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>TVL</Text>
          <Text style={styles.metaValue}>{formatTVL(protocol.tvl)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Token</Text>
          <Text style={styles.metaValue}>{protocol.token}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Min Stake</Text>
          <Text style={styles.metaValue}>{protocol.minStake} {protocol.token.split('/')[0]}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Badge label={chainNames[protocol.chain]} variant="chain" chain={protocol.chain} />
        <Badge label="" variant="risk" risk={protocol.risk} />
        {protocol.audited && (
          <Badge label="✓ Audited" variant="green" />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
    gap: 12,
  },
  compactCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emoji: {
    fontSize: 22,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  trendingBadge: {
    backgroundColor: 'rgba(255,181,71,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trendingText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.yellow,
  },
  category: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  apyContainer: {
    alignItems: 'flex-end',
  },
  apyValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.green,
    letterSpacing: -0.5,
  },
  apyUnit: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaItem: {
    gap: 2,
  },
  metaLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  metaValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  compactInfo: {
    flex: 1,
  },
  compactName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  compactToken: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  compactRight: {
    alignItems: 'flex-end',
  },
  apyBig: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.green,
    letterSpacing: -0.5,
  },
  apyLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
