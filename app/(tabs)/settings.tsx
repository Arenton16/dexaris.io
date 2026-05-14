import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';

interface SettingsRow {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  toggle?: boolean;
  danger?: boolean;
}

const ACCOUNT_ROWS: SettingsRow[] = [
  { icon: 'wallet-outline', label: 'Connected Wallet', value: '0x3f4a...d9c2' },
  { icon: 'link-outline', label: 'Linked Networks', value: '3 active' },
  { icon: 'key-outline', label: 'Backup Passphrase', value: '' },
];

const PREF_ROWS: SettingsRow[] = [
  { icon: 'notifications-outline', label: 'Yield Alerts', toggle: true },
  { icon: 'trending-up-outline', label: 'APY Drop Alerts', toggle: true },
  { icon: 'shield-checkmark-outline', label: 'Security Alerts', toggle: true },
  { icon: 'moon-outline', label: 'Dark Mode', toggle: true },
];

const APP_ROWS: SettingsRow[] = [
  { icon: 'globe-outline', label: 'Currency', value: 'USD' },
  { icon: 'language-outline', label: 'Language', value: 'English' },
  { icon: 'time-outline', label: 'Slippage Tolerance', value: '0.5%' },
  { icon: 'speedometer-outline', label: 'Default Gas', value: 'Standard' },
];

const INFO_ROWS: SettingsRow[] = [
  { icon: 'document-text-outline', label: 'Terms of Service', value: '' },
  { icon: 'lock-closed-outline', label: 'Privacy Policy', value: '' },
  { icon: 'help-circle-outline', label: 'Help & Support', value: '' },
  { icon: 'information-circle-outline', label: 'App Version', value: '1.0.0' },
];

function SettingRow({ row, toggleState, onToggle }: { row: SettingsRow; toggleState?: boolean; onToggle?: () => void }) {
  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={row.toggle ? 1 : 0.7}
      onPress={!row.toggle ? () => {} : undefined}
    >
      <View style={[styles.rowIcon, row.danger && styles.rowIconDanger]}>
        <Ionicons name={row.icon} size={18} color={row.danger ? Colors.red : Colors.textSecondary} />
      </View>
      <Text style={[styles.rowLabel, row.danger && { color: Colors.red }]}>{row.label}</Text>
      <View style={styles.rowRight}>
        {row.value !== undefined && row.value !== '' && (
          <Text style={styles.rowValue}>{row.value}</Text>
        )}
        {row.toggle && (
          <Switch
            value={toggleState ?? true}
            onValueChange={onToggle}
            trackColor={{ false: Colors.bgElevated, true: `${Colors.primary}80` }}
            thumbColor={toggleState ? Colors.primary : Colors.textMuted}
          />
        )}
        {!row.toggle && (
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    'Yield Alerts': true,
    'APY Drop Alerts': true,
    'Security Alerts': true,
    'Dark Mode': true,
  });

  function toggle(key: string) {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Avatar card */}
        <LinearGradient
          colors={['#1A1D2E', '#12141F']}
          style={styles.profileCard}
        >
          <View style={styles.avatarGlow} />
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>👤</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>DeFi Farmer</Text>
            <Text style={styles.profileAddress}>0x3f4a...d9c2</Text>
          </View>
          <View style={styles.profileStats}>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatValue}>$17.4K</Text>
              <Text style={styles.profileStatLabel}>Staked</Text>
            </View>
            <View style={styles.profileStatDivider} />
            <View style={styles.profileStat}>
              <Text style={styles.profileStatValue}>16.7%</Text>
              <Text style={styles.profileStatLabel}>Avg APY</Text>
            </View>
            <View style={styles.profileStatDivider} />
            <View style={styles.profileStat}>
              <Text style={styles.profileStatValue}>4</Text>
              <Text style={styles.profileStatLabel}>Positions</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Sections */}
        {[
          { title: 'Account', rows: ACCOUNT_ROWS },
          { title: 'Notifications', rows: PREF_ROWS },
          { title: 'Preferences', rows: APP_ROWS },
          { title: 'About', rows: INFO_ROWS },
        ].map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.rows.map((row, i) => (
                <View key={row.label}>
                  <SettingRow
                    row={row}
                    toggleState={toggles[row.label]}
                    onToggle={() => toggle(row.label)}
                  />
                  {i < section.rows.length - 1 && <View style={styles.separator} />}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Disconnect */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.disconnectBtn}
            onPress={() => Alert.alert('Disconnect Wallet', 'Are you sure you want to disconnect?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Disconnect', style: 'destructive', onPress: () => {} },
            ])}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={18} color={Colors.red} />
            <Text style={styles.disconnectText}>Disconnect Wallet</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Dexaris v1.0.0 · Built with ❤️ for DeFi</Text>
        <View style={{ height: 100 }} />
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
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  content: {
    gap: 20,
    paddingTop: 4,
  },
  profileCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarGlow: {
    position: 'absolute',
    top: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(108,99,255,0.1)',
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: `${Colors.primary}50`,
  },
  avatarEmoji: {
    fontSize: 32,
  },
  profileInfo: {
    alignItems: 'center',
    gap: 3,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  profileAddress: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  profileStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 14,
    width: '100%',
  },
  profileStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  profileStatDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  profileStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  profileStatLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    paddingHorizontal: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingLeft: 4,
  },
  sectionCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: {
    backgroundColor: Colors.redBg,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowValue: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 60,
  },
  disconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.redBg,
    borderRadius: 14,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: `${Colors.red}30`,
  },
  disconnectText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.red,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textMuted,
    paddingBottom: 8,
  },
});
