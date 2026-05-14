import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';
import { PortfolioPosition } from '@/components/PortfolioPosition';
import { Button } from '@/components/ui/Button';
import { positions, portfolioStats } from '@/constants/mockData';

export default function PortfolioScreen() {
  const router = useRouter();
  const [claimedId, setClaimedId] = useState<string | null>(null);
  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [claimingPosition, setClaimingPosition] = useState<typeof positions[0] | null>(null);

  const totalRewards = positions.reduce((s, p) => s + p.rewardsUsd, 0);

  function handleClaim(position: typeof positions[0]) {
    setClaimingPosition(position);
    setClaimModalVisible(true);
  }

  function confirmClaim() {
    setClaimedId(claimingPosition?.id ?? null);
    setClaimModalVisible(false);
    setTimeout(() => setClaimedId(null), 2000);
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Portfolio</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(tabs)/explore')}>
            <Ionicons name="add" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Portfolio summary banner */}
        <LinearGradient
          colors={['#1A1D2E', '#0F1020']}
          style={styles.summaryBanner}
        >
          <View style={styles.summaryGlow} />
          <Text style={styles.summaryLabel}>Total Staked</Text>
          <Text style={styles.summaryValue}>
            ${portfolioStats.totalValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Avg APY</Text>
              <Text style={styles.summaryItemValue}>{portfolioStats.avgApy}%</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Daily Yield</Text>
              <Text style={[styles.summaryItemValue, { color: Colors.green }]}>
                +${portfolioStats.dailyYieldUsd.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Positions</Text>
              <Text style={styles.summaryItemValue}>{positions.length}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Claim all banner */}
        {totalRewards > 0 && (
          <TouchableOpacity
            style={styles.claimAllBanner}
            activeOpacity={0.85}
            onPress={() => Alert.alert('Claim All', `Claim $${totalRewards.toFixed(2)} in rewards?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Claim', onPress: () => {} },
            ])}
          >
            <View>
              <Text style={styles.claimAllTitle}>Claim All Rewards</Text>
              <Text style={styles.claimAllSub}>
                ${totalRewards.toFixed(2)} available across {positions.filter(p => p.rewardsUsd > 0).length} positions
              </Text>
            </View>
            <View style={styles.claimAllChevron}>
              <Ionicons name="chevron-forward" size={20} color={Colors.green} />
            </View>
          </TouchableOpacity>
        )}

        {/* Positions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Positions</Text>
          {positions.map((pos) => (
            <PortfolioPosition
              key={pos.id}
              position={pos}
              onPress={() => router.push(`/stake/${pos.protocolId}`)}
              onClaim={() => handleClaim(pos)}
            />
          ))}
        </View>

        {/* Performance chart placeholder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allocation</Text>
          <View style={styles.allocationCard}>
            {positions.map((pos) => {
              const pct = (pos.stakedUsd / portfolioStats.totalValueUsd) * 100;
              return (
                <View key={pos.id} style={styles.allocationRow}>
                  <View style={styles.allocationLeft}>
                    <Text style={styles.allocationEmoji}>{pos.logoEmoji}</Text>
                    <View>
                      <Text style={styles.allocationName}>{pos.protocol}</Text>
                      <Text style={styles.allocationToken}>{pos.token}</Text>
                    </View>
                  </View>
                  <View style={styles.allocationRight}>
                    <Text style={styles.allocationPct}>{pct.toFixed(1)}%</Text>
                    <View style={styles.allocationBar}>
                      <View style={[styles.allocationFill, { width: `${pct}%` }]} />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Claim modal */}
      <Modal
        visible={claimModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setClaimModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Claim Rewards</Text>
            {claimingPosition && (
              <>
                <View style={styles.modalProtocol}>
                  <Text style={styles.modalEmoji}>{claimingPosition.logoEmoji}</Text>
                  <Text style={styles.modalProtocolName}>{claimingPosition.protocol}</Text>
                </View>
                <View style={styles.modalRewardBox}>
                  <Text style={styles.modalRewardLabel}>Claimable Rewards</Text>
                  <Text style={styles.modalRewardValue}>${claimingPosition.rewardsUsd.toFixed(2)}</Text>
                  <Text style={styles.modalRewardToken}>{claimingPosition.rewards} {claimingPosition.token}</Text>
                </View>
                <View style={styles.modalButtons}>
                  <Button label="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setClaimModalVisible(false)} />
                  <Button label="Claim Now" variant="accent" style={{ flex: 1 }} onPress={confirmClaim} />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  content: {
    gap: 16,
    paddingTop: 4,
  },
  summaryBanner: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    position: 'relative',
    gap: 6,
  },
  summaryGlow: {
    position: 'absolute',
    top: -30,
    right: 40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0,229,204,0.08)',
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryValue: {
    fontSize: 38,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -1.2,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  summaryItemLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summaryItemValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  claimAllBanner: {
    marginHorizontal: 16,
    backgroundColor: Colors.greenBg,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: `${Colors.green}30`,
  },
  claimAllTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.green,
    marginBottom: 3,
  },
  claimAllSub: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  claimAllChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${Colors.green}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    paddingHorizontal: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  allocationCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  allocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  allocationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  allocationEmoji: {
    fontSize: 20,
  },
  allocationName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  allocationToken: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  allocationRight: {
    alignItems: 'flex-end',
    gap: 4,
    minWidth: 80,
  },
  allocationPct: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  allocationBar: {
    width: 80,
    height: 4,
    backgroundColor: Colors.bgElevated,
    borderRadius: 2,
    overflow: 'hidden',
  },
  allocationFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 1,
    borderColor: Colors.border,
    gap: 16,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  modalProtocol: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalEmoji: {
    fontSize: 24,
  },
  modalProtocolName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  modalRewardBox: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalRewardLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  modalRewardValue: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.green,
    letterSpacing: -1,
  },
  modalRewardToken: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
});
