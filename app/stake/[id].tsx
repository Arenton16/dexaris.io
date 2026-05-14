import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { protocols, positions, chainNames } from '@/constants/mockData';

type TabKey = 'stake' | 'unstake';

const QUICK_AMOUNTS = ['25%', '50%', '75%', 'Max'];

function formatTVL(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  return `$${value.toLocaleString()}`;
}

export default function StakeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const protocol = protocols.find((p) => p.id === id);
  const activePosition = positions.find((pos) => pos.protocolId === id);

  const [tab, setTab] = useState<TabKey>('stake');
  const [amount, setAmount] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [txPending, setTxPending] = useState(false);
  const [txSuccess, setTxSuccess] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  if (!protocol) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ color: Colors.textSecondary }}>Protocol not found</Text>
        <Button label="Go Back" onPress={() => router.back()} style={{ marginTop: 16 }} />
      </View>
    );
  }

  const parsedAmount = parseFloat(amount) || 0;
  const estimatedUsd = parsedAmount * (protocol.token.includes('ETH') ? 3388 : protocol.token.includes('SOL') ? 148 : 1);
  const estimatedAnnual = (estimatedUsd * protocol.apy) / 100;
  const estimatedDaily = estimatedAnnual / 365;

  function handleQuickAmount(pct: string) {
    const wallet = 10.0;
    const multiplier = pct === 'Max' ? 1 : parseInt(pct) / 100;
    setAmount((wallet * multiplier).toFixed(4));
  }

  function handleSubmit() {
    if (!protocol) return;
    if (!parsedAmount || parsedAmount < protocol.minStake) {
      Alert.alert('Invalid Amount', `Minimum stake is ${protocol.minStake} ${protocol.token}`);
      return;
    }
    setModalVisible(true);
  }

  function confirmTransaction() {
    setTxPending(true);
    setTimeout(() => {
      setTxPending(false);
      setTxSuccess(true);
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        setTxSuccess(false);
        setModalVisible(false);
        setAmount('');
      });
    }, 2200);
  }

  const riskColors = { low: Colors.green, medium: Colors.yellow, high: Colors.red };
  const riskColor = riskColors[protocol.risk];

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>{protocol.name}</Text>
          <TouchableOpacity style={styles.shareBtn}>
            <Ionicons name="share-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Header */}
        <LinearGradient colors={['#1A1D2E', '#12141F']} style={styles.protocolHeader}>
          <View style={styles.protocolGlow} />
          <View style={styles.protocolLogoCircle}>
            <Text style={styles.protocolEmoji}>{protocol.logoEmoji}</Text>
          </View>
          <Text style={styles.protocolName}>{protocol.name}</Text>
          <Text style={styles.protocolCategory}>{protocol.category} · {protocol.token}</Text>

          <View style={styles.apyHighlight}>
            <Text style={styles.apyHighlightValue}>{protocol.apy.toFixed(1)}%</Text>
            <Text style={styles.apyHighlightLabel}>Annual Percentage Yield</Text>
          </View>

          <View style={styles.badgeRow}>
            <Badge label={chainNames[protocol.chain]} variant="chain" chain={protocol.chain} />
            <Badge label="" variant="risk" risk={protocol.risk} />
            {protocol.audited && <Badge label="✓ Audited" variant="green" />}
            {protocol.trending && <Badge label="🔥 Trending" variant="yellow" />}
          </View>
        </LinearGradient>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>TVL</Text>
            <Text style={styles.statValue}>{formatTVL(protocol.tvl)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Min Stake</Text>
            <Text style={styles.statValue}>{protocol.minStake}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Risk</Text>
            <Text style={[styles.statValue, { color: riskColor }]}>{protocol.risk.charAt(0).toUpperCase() + protocol.risk.slice(1)}</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.descCard}>
          <Text style={styles.descTitle}>About</Text>
          <Text style={styles.descText}>{protocol.description}</Text>
        </View>

        {/* Rewards */}
        <View style={styles.descCard}>
          <Text style={styles.descTitle}>Rewards</Text>
          <View style={styles.rewardsRow}>
            {protocol.rewards.map((r) => (
              <View key={r} style={styles.rewardPill}>
                <Text style={styles.rewardText}>{r}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Active position (if any) */}
        {activePosition && (
          <View style={styles.activePositionCard}>
            <View style={styles.activeHeader}>
              <View style={styles.activeDot} />
              <Text style={styles.activeTitle}>Your Active Position</Text>
            </View>
            <View style={styles.activeStats}>
              <View style={styles.activeStatBlock}>
                <Text style={styles.activeStatLabel}>Staked</Text>
                <Text style={styles.activeStatValue}>${activePosition.stakedUsd.toLocaleString()}</Text>
              </View>
              <View style={styles.activeStatBlock}>
                <Text style={styles.activeStatLabel}>Rewards</Text>
                <Text style={[styles.activeStatValue, { color: Colors.green }]}>${activePosition.rewardsUsd.toFixed(2)}</Text>
              </View>
              <View style={styles.activeStatBlock}>
                <Text style={styles.activeStatLabel}>P&L</Text>
                <Text style={[styles.activeStatValue, { color: Colors.green }]}>+{(activePosition.rewardsUsd / activePosition.stakedUsd * 100).toFixed(2)}%</Text>
              </View>
            </View>
          </View>
        )}

        {/* Stake / Unstake panel */}
        <View style={styles.actionPanel}>
          <View style={styles.tabRow}>
            {(['stake', 'unstake'] as TabKey[]).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => { setTab(t); setAmount(''); }}
                style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputSection}>
            <View style={styles.inputHeader}>
              <Text style={styles.inputLabel}>Amount ({protocol.token.split('/')[0]})</Text>
              <Text style={styles.inputBalance}>
                Balance: {tab === 'stake' ? '10.0000' : activePosition ? activePosition.staked.toFixed(4) : '0.0000'} {protocol.token.split('/')[0]}
              </Text>
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
              />
              <View style={styles.inputRight}>
                <View style={styles.tokenPill}>
                  <Text style={styles.tokenPillText}>{protocol.token.split('/')[0]}</Text>
                </View>
              </View>
            </View>

            {/* Quick amount buttons */}
            <View style={styles.quickRow}>
              {QUICK_AMOUNTS.map((q) => (
                <TouchableOpacity key={q} style={styles.quickBtn} onPress={() => handleQuickAmount(q)}>
                  <Text style={styles.quickText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Estimates */}
          {parsedAmount > 0 && (
            <View style={styles.estimates}>
              <View style={styles.estimateRow}>
                <Text style={styles.estimateLabel}>≈ USD Value</Text>
                <Text style={styles.estimateValue}>${estimatedUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}</Text>
              </View>
              {tab === 'stake' && (
                <>
                  <View style={styles.estimateRow}>
                    <Text style={styles.estimateLabel}>Est. Daily Yield</Text>
                    <Text style={[styles.estimateValue, { color: Colors.green }]}>+${estimatedDaily.toFixed(4)}</Text>
                  </View>
                  <View style={styles.estimateRow}>
                    <Text style={styles.estimateLabel}>Est. Annual Yield</Text>
                    <Text style={[styles.estimateValue, { color: Colors.green }]}>+${estimatedAnnual.toFixed(2)}</Text>
                  </View>
                </>
              )}
              <View style={styles.estimateRow}>
                <Text style={styles.estimateLabel}>Network Fee</Text>
                <Text style={styles.estimateValue}>~$2.40</Text>
              </View>
            </View>
          )}

          <Button
            label={tab === 'stake' ? `Stake ${protocol.token.split('/')[0]}` : `Unstake ${protocol.token.split('/')[0]}`}
            variant={tab === 'stake' ? 'primary' : 'outline'}
            size="lg"
            onPress={handleSubmit}
            style={styles.actionButton}
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !txPending && setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            {txSuccess ? (
              <Animated.View style={[styles.successContainer, { opacity: fadeAnim }]}>
                <Text style={styles.successIcon}>✅</Text>
                <Text style={styles.successTitle}>Transaction Submitted!</Text>
                <Text style={styles.successSub}>Your {tab} of {amount} {protocol.token.split('/')[0]} is being processed.</Text>
              </Animated.View>
            ) : (
              <>
                <Text style={styles.modalTitle}>Confirm {tab === 'stake' ? 'Stake' : 'Unstake'}</Text>
                <Text style={styles.modalSub}>Review your transaction before confirming</Text>

                <View style={styles.confirmCard}>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Protocol</Text>
                    <View style={styles.confirmProtocol}>
                      <Text style={styles.confirmEmoji}>{protocol.logoEmoji}</Text>
                      <Text style={styles.confirmValue}>{protocol.name}</Text>
                    </View>
                  </View>
                  <View style={styles.confirmDivider} />
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Action</Text>
                    <Text style={[styles.confirmValue, { color: tab === 'stake' ? Colors.green : Colors.yellow }]}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Text>
                  </View>
                  <View style={styles.confirmDivider} />
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Amount</Text>
                    <Text style={styles.confirmValue}>{amount} {protocol.token.split('/')[0]}</Text>
                  </View>
                  <View style={styles.confirmDivider} />
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>USD Value</Text>
                    <Text style={styles.confirmValue}>${estimatedUsd.toFixed(2)}</Text>
                  </View>
                  <View style={styles.confirmDivider} />
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Network Fee</Text>
                    <Text style={styles.confirmValue}>~$2.40</Text>
                  </View>
                  {tab === 'stake' && (
                    <>
                      <View style={styles.confirmDivider} />
                      <View style={styles.confirmRow}>
                        <Text style={styles.confirmLabel}>Est. APY</Text>
                        <Text style={[styles.confirmValue, { color: Colors.green }]}>{protocol.apy.toFixed(1)}%</Text>
                      </View>
                    </>
                  )}
                </View>

                <View style={styles.modalButtons}>
                  <Button
                    label="Cancel"
                    variant="secondary"
                    style={{ flex: 1 }}
                    onPress={() => setModalVisible(false)}
                    disabled={txPending}
                  />
                  <Button
                    label={txPending ? 'Confirming...' : 'Confirm'}
                    variant="primary"
                    style={{ flex: 1 }}
                    loading={txPending}
                    onPress={confirmTransaction}
                  />
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  shareBtn: {
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
    gap: 14,
    paddingBottom: 20,
  },
  protocolHeader: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  protocolGlow: {
    position: 'absolute',
    top: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(108,99,255,0.1)',
  },
  protocolLogoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: `${Colors.primary}40`,
    marginBottom: 4,
  },
  protocolEmoji: {
    fontSize: 30,
  },
  protocolName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  protocolCategory: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  apyHighlight: {
    backgroundColor: Colors.greenBg,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${Colors.green}30`,
    marginVertical: 4,
  },
  apyHighlightValue: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.green,
    letterSpacing: -0.8,
  },
  apyHighlightLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  descCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  descTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  descText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  rewardsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  rewardPill: {
    backgroundColor: `${Colors.primary}18`,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  rewardText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primaryLight,
  },
  activePositionCard: {
    marginHorizontal: 16,
    backgroundColor: `${Colors.green}0C`,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: `${Colors.green}25`,
    gap: 12,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.green,
  },
  activeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.green,
  },
  activeStats: {
    flexDirection: 'row',
  },
  activeStatBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  activeStatLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activeStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  actionPanel: {
    marginHorizontal: 16,
    backgroundColor: Colors.bgCard,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 16,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.bgElevated,
    borderRadius: 12,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: Colors.bgCard,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.textPrimary,
  },
  inputSection: {
    gap: 10,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  inputBalance: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgInput,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    gap: 8,
  },
  amountInput: {
    flex: 1,
    height: 52,
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  inputRight: {},
  tokenPill: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tokenPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    backgroundColor: Colors.bgElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  estimates: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  estimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  estimateLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  estimateValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  actionButton: {
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  modalSheet: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
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
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  modalSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: -8,
  },
  confirmCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 2,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  confirmLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  confirmValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  confirmProtocol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  confirmEmoji: {
    fontSize: 16,
  },
  confirmDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 4,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  successSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
