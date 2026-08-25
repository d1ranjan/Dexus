import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { getSupabaseRedirectUrl } from "@/constants/oauth";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import * as Api from "@/lib/_core/api";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const send = async () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) { setError("Enter the email address for your Dexus account."); return; }
    setPending(true); setError(null); setNotice(null);
    try {
      await Api.requestPasswordReset({ email: normalized, redirectTo: getSupabaseRedirectUrl() });
      setNotice("If that email belongs to a Dexus account, a reset link is on its way.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Dexus could not send that reset link."); }
    finally { setPending(false); }
  };
  return <ScreenContainer className="px-6" edges={["top", "bottom", "left", "right"]}><View style={styles.page}><Pressable onPress={() => router.replace("/welcome")}><Text style={[styles.back, { color: colors.primary }]}>‹ Back to sign in</Text></Pressable><View style={styles.copy}><Text style={[styles.title, { color: colors.foreground }]}>Reset your password</Text><Text style={[styles.body, { color: colors.muted }]}>Enter your email and we will send a secure link to choose a new password.</Text></View><TextInput value={email} onChangeText={setEmail} placeholder="Email address" placeholderTextColor={colors.muted} style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />{error && <Text style={[styles.message, { color: colors.error }]}>{error}</Text>}{notice && <Text style={[styles.message, { color: colors.success }]}>{notice}</Text>}<Pressable disabled={pending} onPress={send} style={({ pressed }) => [styles.button, { backgroundColor: colors.primary }, (pressed || pending) && styles.pressed]}>{pending ? <ActivityIndicator color={colors.background} /> : <Text style={[styles.buttonLabel, { color: colors.background }]}>Send reset link</Text>}</Pressable></View></ScreenContainer>;
}

const styles = StyleSheet.create({ page: { flex: 1, gap: 20, justifyContent: "center" }, back: { fontSize: 14, fontWeight: "700" }, copy: { gap: 8 }, title: { fontSize: 30, fontWeight: "800", letterSpacing: -0.8 }, body: { fontSize: 15, lineHeight: 23 }, input: { borderRadius: 12, borderWidth: 1, fontSize: 16, height: 52, paddingHorizontal: 14 }, message: { fontSize: 13, lineHeight: 19 }, button: { alignItems: "center", borderRadius: 13, height: 52, justifyContent: "center" }, buttonLabel: { fontSize: 15, fontWeight: "700" }, pressed: { opacity: 0.86, transform: [{ scale: 0.985 }] } });
