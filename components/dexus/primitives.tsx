import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Network from "expo-network";
import { type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

export function DexusScreen({ children, title, subtitle, action }: { children: ReactNode; title?: string; subtitle?: string; action?: ReactNode }) {
  const colors = useColors();
  const network = Network.useNetworkState();
  const offline = network.isInternetReachable === false;
  return <ScreenContainer className="px-5" containerClassName="bg-background"><View style={styles.screen}>{offline ? <View style={[styles.offlineNotice, { backgroundColor: `${colors.warning}1A`, borderColor: `${colors.warning}55` }]}><MaterialIcons name="cloud-off" color={colors.warning} size={18} /><Text style={[styles.offlineText, { color: colors.foreground }]}>You’re offline. Dexus will preserve what’s on screen, but cloud actions need a connection.</Text></View> : null}{title ? <View style={styles.heading}><View style={styles.headingCopy}><Text style={[styles.screenTitle, { color: colors.foreground }]}>{title}</Text>{subtitle ? <Text style={[styles.screenSubtitle, { color: colors.muted }]}>{subtitle}</Text> : null}</View>{action}</View> : null}{children}</View></ScreenContainer>;
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  const colors = useColors();
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>{children}</View>;
}

export function SectionHeading({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  const colors = useColors();
  return <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>{action ? <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => [pressed && styles.pressed]}><Text style={[styles.sectionAction, { color: colors.primary }]}>{action}</Text></Pressable> : null}</View>;
}

export function PrimaryButton({ label, onPress, icon, loading, disabled, tone = "primary" }: { label: string; onPress: () => void; icon?: React.ComponentProps<typeof MaterialIcons>["name"]; loading?: boolean; disabled?: boolean; tone?: "primary" | "secondary" | "danger" }) {
  const colors = useColors();
  const color = tone === "danger" ? colors.error : tone === "secondary" ? colors.surface : colors.background;
  const backgroundColor = tone === "danger" ? colors.error : tone === "secondary" ? colors.surface : colors.primary;
  const borderColor = tone === "secondary" ? colors.border : backgroundColor;
  return <Pressable disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.button, { backgroundColor, borderColor, opacity: disabled || loading ? 0.55 : 1 }, pressed && styles.buttonPressed]}>{loading ? <ActivityIndicator color={color} /> : <>{icon ? <MaterialIcons color={color} size={19} name={icon} /> : null}<Text style={[styles.buttonLabel, { color }]}>{label}</Text></>}</Pressable>;
}

export function IconAction({ icon, label, onPress, selected }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; label: string; onPress: () => void; selected?: boolean }) {
  const colors = useColors();
  return <Pressable accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconAction, { backgroundColor: selected ? colors.primary : colors.surface, borderColor: selected ? colors.primary : colors.border }, pressed && styles.buttonPressed]}><MaterialIcons name={icon} size={20} color={selected ? colors.background : colors.foreground} /></Pressable>;
}

export function Pill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "primary" | "success" | "warning" | "danger" }) {
  const colors = useColors();
  const palette = tone === "primary" ? { bg: colors.primary, fg: colors.background } : tone === "success" ? { bg: `${colors.success}1A`, fg: colors.success } : tone === "warning" ? { bg: `${colors.warning}1A`, fg: colors.warning } : tone === "danger" ? { bg: `${colors.error}1A`, fg: colors.error } : { bg: `${colors.muted}16`, fg: colors.muted };
  return <View style={[styles.pill, { backgroundColor: palette.bg }]}><Text style={[styles.pillLabel, { color: palette.fg }]}>{label}</Text></View>;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; title: string; description: string; actionLabel?: string; onAction?: () => void }) {
  const colors = useColors();
  return <Card style={styles.emptyCard}><View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}16` }]}><MaterialIcons name={icon} size={26} color={colors.primary} /></View><Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.emptyCopy, { color: colors.muted }]}>{description}</Text>{actionLabel && onAction ? <View style={styles.emptyButton}><PrimaryButton label={actionLabel} onPress={onAction} icon="add" /></View> : null}</Card>;
}

export function LoadingState({ label = "Loading your Dexus…" }: { label?: string }) {
  const colors = useColors();
  return <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={[styles.loadingLabel, { color: colors.muted }]}>{label}</Text></View>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const colors = useColors();
  return <Card style={styles.errorCard}><MaterialIcons name="error-outline" color={colors.error} size={24} /><View style={styles.errorText}><Text style={[styles.errorTitle, { color: colors.foreground }]}>Something needs attention</Text><Text style={[styles.errorCopy, { color: colors.muted }]}>{message}</Text>{onRetry ? <View style={styles.retry}><PrimaryButton label="Try again" onPress={onRetry} tone="secondary" /></View> : null}</View></Card>;
}

export function formatDate(value?: Date | string | null) { if (!value) return null; const date = new Date(value); if (Number.isNaN(date.getTime())) return null; return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date); }

const styles = StyleSheet.create({
  screen: { flex: 1, gap: 18, paddingTop: 12, paddingBottom: 8 }, offlineNotice: { alignItems: "center", borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 8, paddingHorizontal: 11, paddingVertical: 9 }, offlineText: { flex: 1, fontSize: 12, lineHeight: 17 }, heading: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", gap: 12 }, headingCopy: { flex: 1, gap: 4 }, screenTitle: { fontSize: 32, fontWeight: "700", letterSpacing: -0.8, lineHeight: 40 }, screenSubtitle: { fontSize: 14, lineHeight: 20 }, card: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 12 }, sectionHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 4 }, sectionTitle: { fontSize: 18, fontWeight: "700", letterSpacing: -0.2 }, sectionAction: { fontSize: 14, fontWeight: "700" }, button: { alignItems: "center", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 46, paddingHorizontal: 16 }, buttonPressed: { opacity: 0.82, transform: [{ scale: 0.98 }] }, buttonLabel: { fontSize: 15, fontWeight: "700" }, pressed: { opacity: 0.65 }, iconAction: { alignItems: "center", borderRadius: 15, borderWidth: StyleSheet.hairlineWidth, height: 44, justifyContent: "center", width: 44 }, pill: { alignSelf: "flex-start", borderRadius: 100, paddingHorizontal: 9, paddingVertical: 4 }, pillLabel: { fontSize: 11, fontWeight: "700" }, emptyCard: { alignItems: "center", paddingVertical: 28 }, emptyIcon: { alignItems: "center", borderRadius: 18, height: 52, justifyContent: "center", width: 52 }, emptyTitle: { fontSize: 17, fontWeight: "700", marginTop: 2 }, emptyCopy: { fontSize: 14, lineHeight: 20, maxWidth: 280, textAlign: "center" }, emptyButton: { alignSelf: "stretch", marginTop: 4 }, loading: { alignItems: "center", flex: 1, gap: 12, justifyContent: "center", minHeight: 220 }, loadingLabel: { fontSize: 14 }, errorCard: { alignItems: "flex-start", flexDirection: "row", gap: 12 }, errorText: { flex: 1, gap: 4 }, errorTitle: { fontSize: 15, fontWeight: "700" }, errorCopy: { fontSize: 13, lineHeight: 18 }, retry: { marginTop: 6, maxWidth: 130 },
});
