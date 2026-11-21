import React, { useEffect } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../components/AppText';
import { EmptyState, ScreenHeader } from '../components/JobParts';
import { IconBell } from '../components/JobIcons';
import { NotifSvg } from '../assets';
import { useNotifications } from '../hooks/useNotifications';
import { timeAgo, type AppNotification, type NotifKind } from '../services/notificationsService';
import { colors, fonts, layout } from '../theme';
import type { ScreenProps } from '../navigation/types';

const ICON: Record<NotifKind, React.ComponentType> = {
  pending: NotifSvg.Pending,
  success: NotifSvg.Success,
  error: NotifSvg.Error,
  reminder: NotifSvg.Reminder,
};

/** Notifications (Figma 196:2673). Opening the screen marks everything as seen. */
export default function NotificationsScreen({ navigation }: ScreenProps<'Notifications'>) {
  const insets = useSafeAreaInsets();
  const { items, loading, markAllSeen } = useNotifications();

  useEffect(() => {
    markAllSeen();
    return () => markAllSeen();
  }, [markAllSeen]);

  const open = (n: AppNotification) => {
    if (n.target === 'booking' && n.jobId) navigation.navigate('BookingDetail', { jobId: n.jobId });
    else if (n.target === 'earnings') navigation.navigate('Earnings');
    else if (n.target === 'account') navigation.navigate('Account');
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={{ paddingTop: insets.top + 9 }}>
        <ScreenHeader title="Notifications" onBack={() => navigation.goBack()} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.main} style={{ marginTop: 60 }} />
          ) : (
            <EmptyState
              icon={<IconBell />}
              title="No notifications yet"
              text="Updates about your bookings, shifts and payments will show up here."
            />
          )
        }
        renderItem={({ item }: { item: AppNotification }) => {
          const Icon = ICON[item.kind];
          return (
            <Pressable
              onPress={() => open(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}. ${item.body}. ${timeAgo(item.at)}`}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
            >
              <Icon />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.time}>{timeAgo(item.at)}</Text>
                </View>
                <Text style={styles.body}>{item.body}</Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: layout.gutter, paddingTop: 36, flexGrow: 1 },
  // Figma 196:2773: 390 wide, min 88 tall, radius 14, icon 32 at 12/11, gap 12
  card: {
    minHeight: 88,
    borderRadius: 14,
    backgroundColor: colors.greyBg,
    paddingLeft: 12,
    paddingRight: 14,
    paddingTop: 11,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { flex: 1, fontFamily: fonts.bold, fontSize: 14, lineHeight: 21.65, letterSpacing: -0.26, color: colors.text },
  time: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 21.65, letterSpacing: -0.26, color: colors.dark },
  body: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 21.65, letterSpacing: -0.26, color: colors.grey },
});
