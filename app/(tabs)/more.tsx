import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { Card, DexusScreen } from "@/components/dexus/primitives";

const items: Array<{ label: string; detail: string; icon: React.ComponentProps<typeof MaterialIcons>["name"]; href: string }> = [
  { label: "Goals", detail: "Keep meaningful work moving", icon: "flag", href: "/goals" },
  { label: "People & follow-ups", detail: "Remember context and commitments", icon: "people", href: "/people" },
  { label: "Memory timeline", detail: "See your story take shape", icon: "history", href: "/timeline" },
  { label: "Insights", detail: "Ask your private Dexus assistant", icon: "auto-awesome", href: "/insights" },
  { label: "Search", detail: "Find across your whole workspace", icon: "search", href: "/search" },
  { label: "Documents", detail: "Bring PDFs, TXT, and DOCX into memory", icon: "description", href: "/documents" },
  { label: "Brain Dump history", detail: "Revisit how Dexus understood past thoughts", icon: "article", href: "/brain-dump-history" },
  { label: "Settings", detail: "Profile, appearance, and privacy", icon: "settings", href: "/settings" },
  { label: "About Dexus", detail: "Product identity and creator information", icon: "info", href: "/about" },
];

export default function MoreScreen() { const colors = useColors(); const identity = trpc.auth.me.useQuery(); const visibleItems = identity.data?.role === "admin" ? [...items, { label: "Dexus Admin", detail: "Secure system management and auditable support access", icon: "admin-panel-settings" as const, href: "/admin" }] : items; return <DexusScreen title="More" subtitle="The rest of your connected workspace."><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>{visibleItems.map((item) => <Pressable key={item.label} onPress={() => router.push(item.href as never)} style={({ pressed }) => [pressed && styles.pressed]}><Card style={styles.item}><View style={[styles.icon, { backgroundColor: `${colors.primary}14` }]}><MaterialIcons name={item.icon} size={22} color={colors.primary} /></View><View style={styles.copy}><Text style={[styles.label, { color: colors.foreground }]}>{item.label}</Text><Text style={[styles.detail, { color: colors.muted }]}>{item.detail}</Text></View><MaterialIcons name="chevron-right" size={22} color={colors.muted} /></Card></Pressable>)}</ScrollView></DexusScreen>; }
const styles = StyleSheet.create({ list: { gap: 10, paddingBottom: 24 }, item: { alignItems: "center", flexDirection: "row", gap: 12 }, icon: { alignItems: "center", borderRadius: 14, height: 42, justifyContent: "center", width: 42 }, copy: { flex: 1, gap: 3 }, label: { fontSize: 15, fontWeight: "700" }, detail: { fontSize: 12, lineHeight: 17 }, pressed: { opacity: 0.7 } });
