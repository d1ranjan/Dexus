import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { Card, DexusScreen, EmptyState, ErrorState, IconAction, LoadingState, Pill } from "@/components/dexus/primitives";

const supported = ["application/pdf", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"] as const;
type SupportedMime = (typeof supported)[number];

export default function DocumentsScreen() {
  const colors = useColors();
  const documents = trpc.documents.list.useQuery();
  const utils = trpc.useUtils();
  const upload = trpc.documents.upload.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.documents.list.invalidate(), utils.timeline.list.invalidate()]);
      Alert.alert("Document saved", "Dexus extracted readable text and created a private AI summary.");
    },
    onError: (error) => Alert.alert("Document upload failed", error.message || "Please try a smaller PDF, TXT, or DOCX file."),
  });
  const regenerateSummary = trpc.documents.regenerateSummary.useMutation({
    onSuccess: async () => {
      await utils.documents.list.invalidate();
      Alert.alert("Summary created", "Dexus generated a new private AI summary for this document.");
    },
    onError: (error) => Alert.alert("Summary could not be generated", error.message || "Please try again."),
  });
  const removeDocument = trpc.documents.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.documents.list.invalidate(), utils.timeline.list.invalidate()]);
      Alert.alert("File deleted", "The document and its private stored copy were removed.");
    },
    onError: (error) => Alert.alert("File could not be deleted", error.message || "Please try again."),
  });

  const confirmDelete = (id: number, filename: string) => Alert.alert(
    "Delete this file?",
    `Delete “${filename}” and its private stored copy? This cannot be undone.`,
    [
      { text: "Cancel", style: "cancel" },
      { text: "Delete file", style: "destructive", onPress: () => removeDocument.mutate({ id }) },
    ],
  );

  const pick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: [...supported], copyToCacheDirectory: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset || !supported.includes(asset.mimeType as SupportedMime)) {
        Alert.alert("Unsupported document", "Choose a PDF, TXT, or DOCX file.");
        return;
      }
      if (asset.size && asset.size > 5 * 1024 * 1024) {
        Alert.alert("Document too large", "Choose a file under 5 MB.");
        return;
      }
      const file = new File(asset.uri);
      const base64 = await file.base64();
      upload.mutate({ filename: asset.name, fileType: asset.mimeType as SupportedMime, base64 });
    } catch (error) {
      Alert.alert("Could not pick document", error instanceof Error ? error.message : "Please try again.");
    }
  };

  if (documents.isLoading) return <DexusScreen><LoadingState /></DexusScreen>;

  return <DexusScreen title="Documents" subtitle="Turn documents into useful private memory." action={<IconAction icon="upload-file" label="Upload document" onPress={pick} />}>
    <Text style={[styles.helper, { color: colors.muted }]}>PDF, TXT, and DOCX files up to 5 MB. Dexus extracts text, produces an AI summary, and keeps the original private to your workspace.</Text>
    {documents.error ? <ErrorState message={documents.error.message} onRetry={documents.refetch} /> : <FlatList
      data={documents.data ?? []}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={(documents.data?.length ?? 0) ? styles.list : styles.empty}
      ListEmptyComponent={<EmptyState icon="description" title="Bring your materials together." description="Upload a syllabus, meeting note, or reference document. Dexus will preserve a searchable memory." actionLabel="Upload document" onAction={pick} />}
      renderItem={({ item }) => {
        const needsSummary = !item.summary || item.summary.trim() === "{}";
        const hasReadableText = (item.extractedText ?? "").replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "").replace(/\s+/g, " ").trim().length >= 40;
        return <Card>
        <View style={styles.head}>
          <View style={[styles.fileIcon, { backgroundColor: `${colors.primary}14` }]}><MaterialIcons name="description" size={21} color={colors.primary} /></View>
          <View style={styles.copy}><Text style={[styles.filename, { color: colors.foreground }]}>{item.filename}</Text><Pill label={item.fileType === "application/pdf" ? "PDF" : item.fileType === "text/plain" ? "TXT" : "DOCX"} tone="primary" /></View>
        </View>
        <Text numberOfLines={5} style={[styles.summary, { color: colors.muted }]}>{needsSummary ? hasReadableText ? "Text extracted; summary needs to be generated." : "Dexus could not read enough selectable text in this document to summarize it. Upload an OCR or text-selectable copy." : item.summary}</Text>
        {needsSummary && hasReadableText ? <View style={styles.retry}><IconAction icon="auto-awesome" label={regenerateSummary.isPending ? "Generating summary…" : "Generate summary"} onPress={() => { if (!regenerateSummary.isPending) regenerateSummary.mutate({ id: item.id }); }} /></View> : null}
        <Pressable accessibilityLabel={`Delete ${item.filename}`} disabled={removeDocument.isPending} onPress={() => confirmDelete(item.id, item.filename)} style={({ pressed }) => [styles.deleteAction, { borderColor: colors.border }, pressed && !removeDocument.isPending && styles.pressed]}><MaterialIcons name="delete-outline" color={colors.error} size={18} /><Text style={[styles.deleteText, { color: colors.error }]}>{removeDocument.isPending ? "Deleting…" : "Delete file"}</Text></Pressable>
      </Card>;
      }}
    />}
  </DexusScreen>;
}

const styles = StyleSheet.create({ helper: { fontSize: 13, lineHeight: 19 }, list: { gap: 10, paddingBottom: 22 }, empty: { flexGrow: 1, paddingVertical: 22 }, head: { alignItems: "center", flexDirection: "row", gap: 11 }, fileIcon: { alignItems: "center", borderRadius: 14, height: 42, justifyContent: "center", width: 42 }, copy: { flex: 1, gap: 5 }, filename: { fontSize: 15, fontWeight: "700" }, summary: { fontSize: 13, lineHeight: 19 }, retry: { alignSelf: "flex-start", marginTop: 4 }, deleteAction: { alignItems: "center", alignSelf: "flex-start", borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 6, marginTop: 6, paddingHorizontal: 10, paddingVertical: 7 }, deleteText: { fontSize: 12, fontWeight: "700" }, pressed: { opacity: 0.65 } });
