import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useMemo, useState } from "react";
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Card, DexusScreen, EmptyState, ErrorState, formatDate, IconAction, LoadingState, Pill, PrimaryButton, SectionHeading } from "@/components/dexus/primitives";
import { EntityModal, type EntityValues } from "@/components/dexus/entity-modal";
import { useColors } from "@/hooks/use-colors";
import { sortPeopleByOpenFollowups } from "@/lib/people-followups";
import { trpc } from "@/lib/trpc";

type PersonItem = { id: number; name: string; context: string | null; notes: string | null };
type FollowupItem = { followup: { id: number; personId: number; action: string; dueDate: Date | null; status: "open" | "completed" | "snoozed" }; person: { id: number; name: string } };

export default function PeopleScreen() {
  const colors = useColors();
  const people = trpc.people.list.useQuery();
  const followups = trpc.followups.list.useQuery();
  const utils = trpc.useUtils();
  const [selected, setSelected] = useState<PersonItem | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [followupPerson, setFollowupPerson] = useState<PersonItem | null>(null);
  const [followupAction, setFollowupAction] = useState("");
  const [followupDate, setFollowupDate] = useState("");
  const refresh = () => Promise.all([utils.people.list.invalidate(), utils.followups.list.invalidate(), utils.dexus.dashboard.invalidate(), utils.timeline.list.invalidate()]);
  const create = trpc.people.create.useMutation({ onSuccess: refresh });
  const update = trpc.people.update.useMutation({ onSuccess: refresh });
  const remove = trpc.people.delete.useMutation({ onSuccess: refresh });
  const createFollowup = trpc.followups.create.useMutation({ onSuccess: refresh });
  const completeFollowup = trpc.followups.update.useMutation({ onSuccess: refresh });

  const savePerson = async (values: EntityValues) => {
    if (selected) await update.mutateAsync({ id: selected.id, name: values.title, context: values.description || null, notes: values.category || null });
    else await create.mutateAsync({ name: values.title, context: values.description || undefined, notes: values.category || undefined });
  };

  const openFollowupSheet = (person: PersonItem) => {
    setFollowupPerson(person);
    setFollowupAction("");
    setFollowupDate("");
  };

  const saveFollowup = async () => {
    const action = followupAction.trim();
    if (!followupPerson || !action) return;
    if (followupDate && !/^\d{4}-\d{2}-\d{2}$/.test(followupDate)) {
      Alert.alert("Use a valid date", "Enter an optional due date as YYYY-MM-DD, for example 2026-09-01.");
      return;
    }
    await createFollowup.mutateAsync({ personId: followupPerson.id, action, ...(followupDate ? { dueDate: followupDate } : {}) });
    setFollowupPerson(null);
  };

  const allFollowups = (followups.data ?? []) as FollowupItem[];
  const sortedPeople = useMemo(() => sortPeopleByOpenFollowups(people.data ?? [], allFollowups.map((entry) => ({ personId: entry.person.id, status: entry.followup.status }))), [people.data, allFollowups]);
  if (people.isLoading || followups.isLoading) return <DexusScreen><LoadingState /></DexusScreen>;

  return <DexusScreen title="People" subtitle="Open follow-ups appear first, so important relationships stay visible." action={<IconAction icon="person-add" label="Add person" onPress={() => { setSelected(null); setEditorOpen(true); }} />}>
    {people.error || followups.error ? <ErrorState message={people.error?.message ?? followups.error?.message ?? "People are unavailable."} onRetry={() => { people.refetch(); followups.refetch(); }} /> : <FlatList data={sortedPeople} keyExtractor={(item) => item.id.toString()} contentContainerStyle={sortedPeople.length ? styles.list : styles.empty} ListEmptyComponent={<EmptyState icon="people-outline" title="People matter in your plans." description="Add a person and Dexus will keep relevant context and follow-ups together." actionLabel="Add a person" onAction={() => { setSelected(null); setEditorOpen(true); }} />} renderItem={({ item }) => {
      const personFollowups = allFollowups.filter((entry) => entry.person.id === item.id && entry.followup.status === "open");
      return <Card style={styles.card}><Pressable onPress={() => { setSelected(item as PersonItem); setEditorOpen(true); }} style={({ pressed }) => [styles.head, pressed && styles.pressed]}><View style={[styles.avatar, { backgroundColor: `${colors.primary}18` }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{item.name.slice(0, 1).toUpperCase()}</Text></View><View style={styles.copy}><Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>{item.context ? <Text style={[styles.context, { color: colors.muted }]}>{item.context}</Text> : null}</View>{personFollowups.length ? <Pill label={`${personFollowups.length} open`} tone="warning" /> : null}</Pressable><View style={styles.cardActions}><PrimaryButton label="Add follow-up" icon="add-task" tone="secondary" onPress={() => openFollowupSheet(item as PersonItem)} /></View>{personFollowups.length ? <View style={styles.followupArea}><SectionHeading title="Open follow-ups" />{personFollowups.map((entry) => <View key={entry.followup.id} style={styles.followup}><View style={styles.followupCopy}><Text style={[styles.followupTitle, { color: colors.foreground }]}>{entry.followup.action}</Text><View style={styles.followupMeta}><Pill label="Follow-up" tone="warning" />{entry.followup.dueDate ? <Pill label={`Due ${formatDate(entry.followup.dueDate)}`} tone="neutral" /> : null}</View></View><PrimaryButton label="Done" tone="secondary" onPress={() => completeFollowup.mutateAsync({ id: entry.followup.id, status: "completed" }).catch(() => Alert.alert("Could not update follow-up", "Please try again."))} /></View>)}</View> : <Text style={[styles.noFollowups, { color: colors.muted }]}>No open follow-ups.</Text>}</Card>;
    }} />}
    <EntityModal visible={editorOpen} heading={selected ? "Edit person" : "New person"} initial={selected ? { title: selected.name, description: selected.context ?? "", category: selected.notes ?? "" } : undefined} onClose={() => setEditorOpen(false)} onSave={savePerson} onDelete={selected ? async () => remove.mutateAsync({ id: selected.id }) : undefined} saveLabel={selected ? "Save changes" : "Add person"} />
    <Modal visible={Boolean(followupPerson)} transparent animationType="slide" onRequestClose={() => setFollowupPerson(null)}><View style={styles.overlay}><View style={[styles.sheet, { backgroundColor: colors.background }]}><Text style={[styles.sheetTitle, { color: colors.foreground }]}>Add follow-up</Text><Text style={[styles.sheetCopy, { color: colors.muted }]}>{followupPerson ? `What do you need to do with ${followupPerson.name}?` : ""}</Text><TextInput value={followupAction} onChangeText={setFollowupAction} autoFocus placeholder="For example: Send project update" placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]} /><TextInput value={followupDate} onChangeText={setFollowupDate} placeholder="Due date (optional): YYYY-MM-DD" placeholderTextColor={colors.muted} keyboardType="numbers-and-punctuation" style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]} /><View style={styles.sheetActions}><PrimaryButton label="Cancel" tone="secondary" onPress={() => setFollowupPerson(null)} /><PrimaryButton label="Save follow-up" icon="add-task" disabled={!followupAction.trim()} loading={createFollowup.isPending} onPress={() => { void saveFollowup(); }} /></View></View></View></Modal>
  </DexusScreen>;
}

const styles = StyleSheet.create({ list: { gap: 10, paddingBottom: 22 }, empty: { flexGrow: 1, paddingVertical: 22 }, card: { gap: 12 }, head: { alignItems: "center", flexDirection: "row", gap: 12 }, avatar: { alignItems: "center", borderRadius: 18, height: 42, justifyContent: "center", width: 42 }, avatarText: { fontSize: 17, fontWeight: "800" }, copy: { flex: 1, gap: 3 }, name: { fontSize: 16, fontWeight: "700" }, context: { fontSize: 13 }, cardActions: { alignSelf: "flex-start" }, followupArea: { gap: 8 }, followup: { alignItems: "center", flexDirection: "row", gap: 10 }, followupCopy: { flex: 1, gap: 6 }, followupTitle: { fontSize: 14, fontWeight: "700" }, followupMeta: { flexDirection: "row", flexWrap: "wrap", gap: 6 }, noFollowups: { fontSize: 13 }, overlay: { backgroundColor: "rgba(10,10,20,0.5)", flex: 1, justifyContent: "flex-end" }, sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 14, padding: 20 }, sheetTitle: { fontSize: 20, fontWeight: "700" }, sheetCopy: { fontSize: 13, lineHeight: 19 }, input: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, fontSize: 15, minHeight: 48, paddingHorizontal: 12 }, sheetActions: { flexDirection: "row", gap: 8 }, pressed: { opacity: 0.7 } });
