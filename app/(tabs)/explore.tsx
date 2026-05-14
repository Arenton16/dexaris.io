import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { YieldCard } from '@/components/YieldCard';
import { ChainFilter } from '@/components/ChainFilter';
import { protocols, Chain, RiskLevel } from '@/constants/mockData';

type SortKey = 'apy' | 'tvl' | 'risk';
type CategoryKey = 'all' | 'Lending' | 'Liquid Staking' | 'DEX' | 'Yield Optimizer' | 'Perpetuals' | 'Bridge' | 'Derivatives' | 'Yield Trading';

const CATEGORIES: CategoryKey[] = ['all', 'Lending', 'Liquid Staking', 'DEX', 'Yield Optimizer', 'Perpetuals'];
const RISK_ORDER: RiskLevel[] = ['low', 'medium', 'high'];

export default function ExploreScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [chain, setChain] = useState<'all' | Chain>('all');
  const [category, setCategory] = useState<CategoryKey>('all');
  const [sort, setSort] = useState<SortKey>('apy');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let list = [...protocols];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.token.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    if (chain !== 'all') list = list.filter((p) => p.chain === chain);
    if (category !== 'all') list = list.filter((p) => p.category === category);

    list.sort((a, b) => {
      if (sort === 'apy') return b.apy - a.apy;
      if (sort === 'tvl') return b.tvl - a.tvl;
      if (sort === 'risk') return RISK_ORDER.indexOf(a.risk) - RISK_ORDER.indexOf(b.risk);
      return 0;
    });

    return list;
  }, [search, chain, category, sort]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Explore Yields</Text>
            <Text style={styles.subtitle}>{filtered.length} opportunities</Text>
          </View>
          <TouchableOpacity
            style={[styles.filterBtn, showFilters && styles.filterBtnActive]}
            onPress={() => setShowFilters((v) => !v)}
          >
            <Ionicons name="options" size={18} color={showFilters ? Colors.primary : Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search protocols, tokens..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>
        {/* Chain filter — sticky */}
        <View style={styles.chainSection}>
          <ChainFilter selected={chain} onChange={setChain} />
        </View>

        <View style={styles.content}>
          {/* Category pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                style={[styles.catPill, category === cat && styles.catPillActive]}
              >
                <Text style={[styles.catText, category === cat && styles.catTextActive]}>
                  {cat === 'all' ? 'All Categories' : cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Sort row */}
          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>Sort by:</Text>
            {(['apy', 'tvl', 'risk'] as SortKey[]).map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setSort(s)}
                style={[styles.sortBtn, sort === s && styles.sortBtnActive]}
              >
                <Text style={[styles.sortText, sort === s && styles.sortTextActive]}>
                  {s === 'apy' ? 'APY ↓' : s === 'tvl' ? 'TVL ↓' : 'Risk ↑'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Results */}
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyText}>No protocols found</Text>
              <Text style={styles.emptySub}>Try adjusting your filters</Text>
            </View>
          ) : (
            filtered.map((protocol) => (
              <YieldCard
                key={protocol.id}
                protocol={protocol}
                onPress={() => router.push(`/stake/${protocol.id}`)}
              />
            ))
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
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
    paddingTop: 12,
    paddingBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterBtnActive: {
    backgroundColor: `${Colors.primary}18`,
    borderColor: `${Colors.primary}50`,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgInput,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 46,
    color: Colors.textPrimary,
    fontSize: 15,
  },
  clearBtn: {
    padding: 4,
  },
  chainSection: {
    backgroundColor: Colors.bg,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  categories: {
    gap: 8,
    paddingVertical: 4,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catPillActive: {
    backgroundColor: `${Colors.primary}20`,
    borderColor: `${Colors.primary}50`,
  },
  catText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  catTextActive: {
    color: Colors.primary,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
    marginRight: 2,
  },
  sortBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sortBtnActive: {
    backgroundColor: `${Colors.primary}18`,
    borderColor: `${Colors.primary}40`,
  },
  sortText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  sortTextActive: {
    color: Colors.primary,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptySub: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
