import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View, type TextStyle, type ViewStyle } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { AdminGate, formatBytes } from "@/components/dexus/admin";
import { Card, DexusScreen, EmptyState, ErrorState, LoadingState, PrimaryButton, formatDate } from "@/components/dexus/primitives";

type DocumentMetadata = { id: number; userId: number; filename: string; fileType: string; fileSize: number; createdAt: Date; userName: string | null; userEmail: string | null };

export default function AdminDocumentsScreen() { return <AdminGate title="Admin documents"><AdminDocuments /></AdminGate>; }

function AdminDocuments() {
  const colors = useColors();
  const utils = trpc.useUtils();
  const documents = trpc.adminDocuments.list.useQuery({ limit: 100 });
  const [pending, setPending] = useState<DocumentMetadata | null>(null);
  const [reason, setReason] = useState("");
  const remove = trpc.adminDocuments.delete.useMutation({
    onSuccess: async () => {
      setPending(null);
      setReason("");
      await Promise.all([utils.adminDocuments.list.invalidate(), utils.admin.auditLogs.invalidate(), utils.admin.storage.invalidate(), utils.admin.overview.invalidate(), utils.admin.userDetail.invalidate()]);
      Alert.alert("Document removed", "The selected document record and private stored file were removed. This action was audited.");
    },
    onError: (error) => Alert.alert("Document could not be removed", error.message || "The document was not changed."),
  });
  if (documents.isLoading) return <DexusScreen title="Admin documents"><LoadingState label="Loading document metadata…" /></DexusScreen>;
  if (documents.error) return <DexusScreen title="Admin documents"><ErrorState message={documents.error.message} onRetry={documents.refetch} /></DexusScreen>;
  const confirmDelete = () => {
    if (!pending || reason.trim().length < 10) return;
    remove.mutate({ userId: pending.userId, documentId: pending.id, reason: reason.trim() });
  };
  return <DexusScreen title="Admin documents" subtitle="Metadata-only management. Removal is permanent and audited."><FlatList data={documents.data ?? []} keyExtractor={(item) => item.id.toString()} contentContainerStyle={(documents.data?.length ?? 0) ? styles.list : styles.empty} ListEmptyComponent={<EmptyState icon="description" title="No uploaded documents" description="There are no document records to manage." />} renderItem={({ item }) => <Card><View style={styles.head}><View style={[styles.icon, { backgroundColor: `${colors.warning}16` }]}><MaterialIcons name="description" size={20} color={colors.warning} /></View><View style={styles.copy}><Text numberOfLines={1} style={[styles.filename, { color: colors.foreground }]}>{item.filename}</Text><Text style={[styles.meta, { color: colors.muted }]}>User #{item.userId} · {item.userName || item.userEmail || "Unknown user"}</Text><Text style={[styles.meta, { color: colors.muted }]}>{formatBytes(item.fileSize)} · {formatDate(item.createdAt)}</Text></View></View><Pressable accessibilityLabel={`Remove ${item.filename}`} onPress={() => { setReason(""); setPending(item); }} style={({ pressed }) => [styles.delete, { borderColor: colors.error }, pressed && styles.pressed]}><MaterialIcons name="delete-forever" color={colors.error} size={18} /><Text style={[styles.deleteText, { color: colors.error }]}>Remove document</Text></Pressable></Card>} /><Modal visible={Boolean(pending)} transparent animationType="slide" onRequestClose={() => setPending(null)}><View style={styles.overlay}><View style={[styles.sheet, { backgroundColor: colors.background }]}><Text style={[styles.title, { color: colors.foreground }]}>Confirm permanent removal</Text><Text style={[styles.description, { color: colors.muted }]}>You are removing “{pending?.filename}” for user #{pending?.userId}. The private stored file and its record will be deleted. This cannot be undone and will be audited.</Text><TextInput value={reason} onChangeText={setReason} multiline placeholder="Administrative reason (at least 10 characters)" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} textAlignVertical="top" /><View style={styles.actions}><PrimaryButton label="Cancel" tone="secondary" onPress={() => setPending(null)} /><PrimaryButton label="Permanently remove" icon="delete-forever" tone="danger" loading={remove.isPending} disabled={reason.trim().length < 10} onPress={confirmDelete} /></View></View></View></Modal></DexusScreen>;
}

const styles = { list: { gap: 10, paddingBottom: 26 } satisfies ViewStyle, empty: { flexGrow: 1, paddingVertical: 28 } satisfies ViewStyle, head: { alignItems: "center", flexDirection: "row", gap: 10 } satisfies ViewStyle, icon: { alignItems: "center", borderRadius: 13, height: 40, justifyContent: "center", width: 40 } satisfies ViewStyle, copy: { flex: 1, gap: 3 } satisfies ViewStyle, filename: { fontSize: 15, fontWeight: "700" } satisfies TextStyle, meta: { fontSize: 12, lineHeight: 16 } satisfies TextStyle, delete: { alignItems: "center", alignSelf: "flex-start", borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 6, marginTop: 8, paddingHorizontal: 10, paddingVertical: 7 } satisfies ViewStyle, deleteText: { fontSize: 12, fontWeight: "700" } satisfies TextStyle, overlay: { backgroundColor: "rgba(10,10,20,0.5)", flex: 1, justifyContent: "flex-end" } satisfies ViewStyle, sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 14, padding: 20 } satisfies ViewStyle, title: { fontSize: 20, fontWeight: "700" } satisfies TextStyle, description: { fontSize: 13, lineHeight: 19 } satisfies TextStyle, input: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, fontSize: 15, lineHeight: 20, minHeight: 92, padding: 12 } satisfies TextStyle, actions: { flexDirection: "row", gap: 8 } satisfies ViewStyle, pressed: { opacity: 0.68 } satisfies ViewStyle };
