import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type TextStyle, type ViewStyle } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { Card, DexusScreen, ErrorState, LoadingState, Pill } from "./primitives";

export function formatBytes(value: number) { if (!value) return "0 B"; const units = ["B", "KB", "MB", "GB"]; const unit = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1); return `${(value / 1024 ** unit).toFixed(unit ? 1 : 0)} ${units[unit]}`; }

export function AdminGate({ children, title = "Dexus Admin" }: { children: ReactNode; title?: string }) {
  const identity = trpc.auth.me.useQuery();
  if (identity.isLoading) return <DexusScreen title={title}><LoadingState label="Checking administrative access…" /></DexusScreen>;
  if (identity.data?.role !== "admin") return <DexusScreen title={title} subtitle="Restricted system workspace."><ErrorState message="Administrative access is required. Dexus does not expose admin information or actions to ordinary accounts." /></DexusScreen>;
  return <>{children}</>;
}

export function AdminMetric({ label, value, icon, tone = "primary" }: { label: string; value: string | number; icon: React.ComponentProps<typeof MaterialIcons>["name"]; tone?: "primary" | "success" | "warning" | "danger" }) { const colors = useColors(); const color = tone === "success" ? colors.success : tone === "warning" ? colors.warning : tone === "danger" ? colors.error : colors.primary; return <Card style={styles.metric}><View style={[styles.metricIcon, { backgroundColor: `${color}18` }]}><MaterialIcons name={icon} size={20} color={color} /></View><Text style={[styles.metricValue, { color: colors.foreground }]}>{value}</Text><Text style={[styles.metricLabel, { color: colors.muted }]}>{label}</Text></Card>; }

export function AdminNavRow({ label, detail, icon, href, warning }: { label: string; detail: string; icon: React.ComponentProps<typeof MaterialIcons>["name"]; href: string; warning?: boolean }) { const colors = useColors(); return <Pressable onPress={() => router.push(href as never)} style={({ pressed }) => [pressed && styles.pressed]}><Card style={styles.row}><View style={[styles.rowIcon, { backgroundColor: warning ? `${colors.warning}18` : `${colors.primary}14` }]}><MaterialIcons name={icon} size={21} color={warning ? colors.warning : colors.primary} /></View><View style={styles.copy}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{label}</Text><Text style={[styles.rowDetail, { color: colors.muted }]}>{detail}</Text></View><MaterialIcons name="chevron-right" size={22} color={colors.muted} /></Card></Pressable>; }

export function HealthPill({ label, value }: { label: string; value: string }) { const tone = value === "healthy" || value === "configured" ? "success" : value === "unavailable" ? "danger" : "warning"; return <View style={styles.health}><Text style={styles.healthLabel}>{label}</Text><Pill label={value} tone={tone} /></View>; }

const styles = { metric: { flex: 1, minWidth: 142, padding: 14 } satisfies ViewStyle, metricIcon: { alignItems: "center", borderRadius: 11, height: 34, justifyContent: "center", width: 34 } satisfies ViewStyle, metricValue: { fontSize: 25, fontWeight: "700", letterSpacing: -0.5 } satisfies TextStyle, metricLabel: { fontSize: 12, lineHeight: 16 } satisfies TextStyle, row: { alignItems: "center", flexDirection: "row", gap: 12 } satisfies ViewStyle, rowIcon: { alignItems: "center", borderRadius: 14, height: 42, justifyContent: "center", width: 42 } satisfies ViewStyle, copy: { flex: 1, gap: 3 } satisfies ViewStyle, rowTitle: { fontSize: 15, fontWeight: "700" } satisfies TextStyle, rowDetail: { fontSize: 12, lineHeight: 17 } satisfies TextStyle, pressed: { opacity: 0.68 } satisfies ViewStyle, health: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" } satisfies ViewStyle, healthLabel: { fontSize: 14, fontWeight: "600" } satisfies TextStyle };
