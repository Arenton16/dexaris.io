import React, { useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';
import { StatCard, HeroStat } from '@/components/ui/StatCard';
import { YieldCard } from '@/components/YieldCard';
import { protocols, positions, portfolioStats } from '@/constants/mockData';

const TRENDING = protocols.filter((p) => p.trending).slice(0, 4);

export default function HomeScreen() {
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Floating header bg */}
      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
        <View style={styles.stickyHeaderInner} />
      </Animated.View>

      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>Good morning 👋</Text>
            <Text style={styles.walletAddress}>0x3f4a...d9c2</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color={Colors.textSecondary} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero stat */}
        <HeroStat
          totalValue={`$${portfolioStats.totalValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          change={`${portfolioStats.change24h}%`}
          isPositive={portfolioStats.change24h > 0}
        />

        {/* Quick stats */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Total Rewards"
            value={`$${portfolioStats.totalRewardsUsd.toFixed(2)}`}
            sub="All-time claimable"
            positive
            style={styles.statFlex}
          />
          <StatCard
            label="Daily Yield"
            value={`$${portfolioStats.dailyYieldUsd.toFixed(2)}`}
            sub="Est. per day"
            accent
            style={styles.statFlex}
          />
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            label="Avg APY"
            value={`${portfolioStats.avgApy}%`}
            sub="Weighted average"
            style={styles.statFlex}
          />
          <StatCard
            label="Weekly Yield"
            value={`$${portfolioStats.weeklyYieldUsd.toFixed(2)}`}
            sub="Est. per week"
            style={styles.statFlex}
          />
        </View>

        {/* Active Positions summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Positions</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/portfolio')}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>

          {positions.slice(0, 2).map((pos) => (
            <TouchableOpacity
              key={pos.id}
              style={styles.positionRow}
              onPress={() => router.push(`/stake/${pos.protocolId}`)}
              activeOpacity={0.75}
            >
              <View style={styles.posLogoCircle}>
                <Text style={styles.posEmoji}>{pos.logoEmoji}</Text>
              </View>
              <View style={styles.posInfo}>
                <Text style={styles.posName}>{pos.protocol}</Text>
                <Text style={styles.posToken}>{pos.token}</Text>
              </View>
              <View style={styles.posRight}>
                <Text style={styles.posValue}>
                  ${pos.stakedUsd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </Text>
                <Text style={styles.posApy}>{pos.apy}% APY</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Trending opportunities */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔥 Trending Yields</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
              <Text style={styles.seeAll}>Explore all →</Text>
            </TouchableOpacity>
          </View>

          {TRENDING.map((protocol) => (
            <YieldCard
              key={protocol.id}
              protocol={protocol}
              onPress={() => router.push(`/stake/${protocol.id}`)}
            />
          ))}
        </View>

        {/* CTA Banner */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/explore')}
          activeOpacity={0.85}
          style={styles.ctaWrapper}
        >
          <LinearGradient
            colors={['#6C63FF', '#4F48CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaBanner}
          >
            <View>
              <Text style={styles.ctaTitle}>Find Better Yields</Text>
              <Text style={styles.ctaSub}>12 new opportunities this week</Text>
            </View>
            <Ionicons name="arrow-forward-circle" size={36} color="rgba(255,255,255,0.9)" />
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 10,
  },
  stickyHeaderInner: {
    flex: 1,
    backgroundColor: `${Colors.bg}E0`,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  safeTop: {
    zIndex: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  walletAddress: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    borderWidth: 1.5,
    borderColor: Colors.bg,
  },
  content: {
    paddingTop: 12,
    gap: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
  },
  statFlex: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  seeAll: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  positionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  posLogoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  posEmoji: {
    fontSize: 18,
  },
  posInfo: {
    flex: 1,
  },
  posName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  posToken: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  posRight: {
    alignItems: 'flex-end',
  },
  posValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  posApy: {
    fontSize: 12,
    color: Colors.green,
    fontWeight: '600',
    marginTop: 2,
  },
  ctaWrapper: {
    marginHorizontal: 16,
    borderRadius: 18,
    overflow: 'hidden',
  },
  ctaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  ctaSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
});
