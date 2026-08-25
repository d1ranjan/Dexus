import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { Card, DexusScreen, EmptyState, ErrorState, IconAction, LoadingState, Pill } from "@/components/dexus/primitives";
import { EntityModal, type EntityValues } from "@/components/dexus/entity-modal";

type KnowledgeItem = { id: number; title: string; content: string; category: string | null; tags: string[] };

export default function KnowledgeScreen() {
  const colors = useColors();
  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [selected, setSelected] = useState<KnowledgeItem | null>(null);
  const knowledge = trpc.knowledge.list.useQuery({ query: query || undefined });
  const utils = trpc.useUtils();
  const refresh = () => Promise.all([utils.knowledge.list.invalidate(), utils.dexus.dashboard.invalidate(), utils.timeline.list.invalidate()]);
  const create = trpc.knowledge.create.useMutation({ onSuccess: refresh });
  const update = trpc.knowledge.update.useMutation({ onSuccess: refresh });
  const remove = trpc.knowledge.delete.useMutation({ onSuccess: refresh });
  const save = async (values: EntityValues) => { if (selected) await update.mutateAsync({ id: selected.id, title: values.title, content: values.description, category: values.category || undefined }); else await create.mutateAsync({ title: values.title, content: values.description || values.title, category: values.category || undefined, tags: [] }); };
  if (knowledge.isLoading) return <DexusScreen><LoadingState /></DexusScreen>;
  return <DexusScreen title="Knowledge" subtitle="A calm library for what you learn." action={<IconAction icon="add" label="Add knowledge" onPress={() => { setSelected(null); setEditorOpen(true); }} />}><View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}><MaterialIcons name="search" size={19} color={colors.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="Search knowledge" placeholderTextColor={colors.muted} style={[styles.searchInput, { color: colors.foreground }]} /></View>{knowledge.error ? <ErrorState message={knowledge.error.message} onRetry={knowledge.refetch} /> : <FlatList data={knowledge.data ?? []} keyExtractor={(item) => item.id.toString()} contentContainerStyle={(knowledge.data?.length ?? 0) ? styles.list : styles.empty} ListEmptyComponent={<EmptyState icon="menu-book" title="Start capturing what you learn." description="Save a fact, idea, or reference. Dexus makes it easy to retrieve later." actionLabel="Add knowledge" onAction={() => { setSelected(null); setEditorOpen(true); }} />} renderItem={({ item }) => <Pressable onPress={() => { setSelected(item as KnowledgeItem); setEditorOpen(true); }} style={({ pressed }) => [pressed && styles.pressed]}><Card><Text style={[styles.title, { color: colors.foreground }]}>{item.title}</Text><Text numberOfLines={3} style={[styles.content, { color: colors.muted }]}>{item.content}</Text><View style={styles.meta}>{item.category ? <Pill label={item.category} tone="primary" /> : null}{item.tags?.slice(0, 2).map((tag) => <Pill key={tag} label={tag} />)}</View></Card></Pressable>} />}<EntityModal visible={editorOpen} heading={selected ? "Edit knowledge" : "New knowledge"} initial={selected ? { title: selected.title, description: selected.content, category: selected.category ?? "" } : undefined} onClose={() => setEditorOpen(false)} onSave={save} onDelete={selected ? async () => remove.mutateAsync({ id: selected.id }) : undefined} saveLabel={selected ? "Save changes" : "Save knowledge"} /></DexusScreen>;
}

const styles = StyleSheet.create({ search: { alignItems: "center", borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 9, minHeight: 46, paddingHorizontal: 13 }, searchInput: { flex: 1, fontSize: 15, paddingVertical: 8 }, list: { gap: 10, paddingBottom: 22 }, empty: { flexGrow: 1, paddingVertical: 22 }, title: { fontSize: 16, fontWeight: "700", lineHeight: 21 }, content: { fontSize: 13, lineHeight: 19 }, meta: { flexDirection: "row", flexWrap: "wrap", gap: 6 }, pressed: { opacity: 0.7 } });
