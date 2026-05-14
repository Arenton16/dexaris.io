import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/colors';
import { Badge } from '@/components/ui/Badge';
import { Position, chainNames } from '@/constants/mockData';

interface PortfolioPositionProps {
  position: Position;
  onPress: () => void;
  onClaim?: () => void;
}

export function PortfolioPosition({ position, onPress, onClaim }: PortfolioPositionProps) {
  const dailyYield = (position.stakedUsd * position.apy) / 100 / 365;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoCircle}>
            <Text style={styles.emoji}>{position.logoEmoji}</Text>
          </View>
          <View>
            <Text style={styles.name}>{position.protocol}</Text>
            <Badge label={chainNames[position.chain]} variant="chain" chain={position.chain} style={styles.chainBadge} />
          </View>
        </View>
        <View style={styles.apyPill}>
          <Text style={styles.apyText}>{position.apy.toFixed(1)}% APY</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.statsRow}>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Staked</Text>
          <Text style={styles.statValue}>${position.stakedUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          <Text style={styles.statSub}>{position.staked} {position.token}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Rewards</Text>
          <Text style={[styles.statValue, { color: Colors.green }]}>
            ${position.rewardsUsd.toFixed(2)}
          </Text>
          <Text style={styles.statSub}>+${dailyYield.toFixed(2)}/day</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Since</Text>
          <Text style={styles.statValue}>{position.entryDate.split('T')[0]}</Text>
          <Text style={styles.statSub}>Entry date</Text>
        </View>
      </View>

      {position.rewardsUsd > 0 && (
        <TouchableOpacity
          style={styles.claimButton}
          onPress={(e) => { e.stopPropagation(); onClaim?.(); }}
          activeOpacity={0.8}
        >
          <Text style={styles.claimText}>Claim ${position.rewardsUsd.toFixed(2)}</Text>
        </TouchableOpacity>
      )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emoji: {
    fontSize: 20,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  chainBadge: {
    alignSelf: 'flex-start',
  },
  apyPill: {
    backgroundColor: Colors.greenBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${Colors.green}25`,
  },
  apyText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.green,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBlock: {
    flex: 1,
    gap: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statSub: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  claimButton: {
    backgroundColor: `${Colors.green}18`,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${Colors.green}30`,
  },
  claimText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.green,
  },
});
