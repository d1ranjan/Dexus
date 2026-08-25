import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { getSupabaseRedirectUrl } from "@/constants/oauth";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import * as Api from "@/lib/_core/api";
import { setDexusSession } from "@/lib/dexus-session";

type Mode = "signIn" | "signUp";

function formatAuthError(message: string) {
  if (/invalid login credentials/i.test(message)) return "Your email or password is incorrect.";
  if (/email not confirmed/i.test(message)) return "Please verify your email before signing in.";
  if (/password should be at least/i.test(message)) return "Use a password with at least 8 characters.";
  return message;
}

export default function WelcomeScreen() {
  const colors = useColors();
  const { isAuthenticated, loading, refresh } = useAuth();
  const [mode, setMode] = useState<Mode>("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) router.replace("/(tabs)");
  }, [isAuthenticated]);

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    setError(null);
    setNotice(null);
    if (!normalizedEmail || !password) {
      setError("Enter your email address and password.");
      return;
    }
    if (mode === "signUp" && password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "signUp") {
        const result = await Api.signUp({
          email: normalizedEmail,
          password,
          name: name.trim() || undefined,
          redirectTo: getSupabaseRedirectUrl(),
        });
        if (result.needsEmailVerification) {
          setNotice("Check your inbox to verify your email, then return to Dexus to sign in.");
          return;
        }
        throw new Error("Dexus requires email verification before the first sign-in.");
      } else {
        const session = await Api.signIn({
          email: normalizedEmail,
          password,
        });
        await setDexusSession(session);
        await Api.establishSession(session.access_token);
      }
      await refresh();
      router.replace("/(tabs)");
    } catch (caught) {
      setError(formatAuthError(caught instanceof Error ? caught.message : "Dexus could not sign you in."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.page}>
          <View style={[styles.symbol, { backgroundColor: colors.primary }]}>
            <View style={styles.nodeCenter} />
            <View style={[styles.nodeSmall, styles.nodeOne]} />
            <View style={[styles.nodeSmall, styles.nodeTwo]} />
            <View style={[styles.orbit, { borderColor: "#A89DFF" }]} />
          </View>
          <View style={styles.copy}>
            <Text style={[styles.title, { color: colors.foreground }]}>Dexus</Text>
            <Text style={[styles.tagline, { color: colors.foreground }]}>Connect your thoughts.</Text>
            <Text style={[styles.description, { color: colors.muted }]}>A private space to turn thoughts into focused action, knowledge, and momentum.</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.modeSwitch, { borderColor: colors.border }]}>
              {(["signIn", "signUp"] as Mode[]).map((item) => (
                <Pressable key={item} onPress={() => { setMode(item); setError(null); setNotice(null); }} style={[styles.modeButton, mode === item && { backgroundColor: colors.background }]}>
                  <Text style={[styles.modeLabel, { color: mode === item ? colors.foreground : colors.muted }]}>{item === "signIn" ? "Sign in" : "Create account"}</Text>
                </Pressable>
              ))}
            </View>
            {mode === "signUp" && <TextInput value={name} onChangeText={setName} placeholder="Your name (optional)" placeholderTextColor={colors.muted} style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} autoCapitalize="words" />}
            <TextInput value={email} onChangeText={setEmail} placeholder="Email address" placeholderTextColor={colors.muted} style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
            <TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={colors.muted} style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} secureTextEntry autoComplete={mode === "signIn" ? "current-password" : "new-password"} textContentType={mode === "signIn" ? "password" : "newPassword"} />
            {error && <Text style={[styles.message, { color: colors.error }]}>{error}</Text>}
            {notice && <Text style={[styles.message, { color: colors.success }]}>{notice}</Text>}
            <Pressable disabled={submitting || loading} onPress={submit} style={({ pressed }) => [styles.primaryAction, { backgroundColor: colors.primary }, (pressed || submitting) && styles.pressed]}>
              {submitting || loading ? <ActivityIndicator color={colors.background} /> : <><Text style={[styles.primaryLabel, { color: colors.background }]}>{mode === "signIn" ? "Sign in to Dexus" : "Create Dexus account"}</Text><MaterialIcons name="arrow-forward" color={colors.background} size={20} /></>}
            </Pressable>
            <Pressable onPress={() => router.push("/auth/forgot-password")} style={styles.forgotButton}>
              <Text style={[styles.forgotLabel, { color: colors.primary }]}>Forgot your password?</Text>
            </Pressable>
          </View>

          <View style={styles.footerBlock}>
            <Text style={[styles.privacy, { color: colors.muted }]}>Your workspace is private to your account.</Text>
            <View style={styles.legalLinks}><Pressable onPress={() => router.push("/privacy")}><Text style={[styles.legalLink, { color: colors.primary }]}>Privacy Policy</Text></Pressable><Text style={[styles.legalDivider, { color: colors.muted }]}>·</Text><Pressable onPress={() => router.push("/terms")}><Text style={[styles.legalLink, { color: colors.primary }]}>Terms of Service</Text></Pressable></View>
            <Text style={[styles.footer, { color: colors.muted }]}>Created by Dipanshu Ranjan · Dexus © 2026</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 }, page: { flex: 1, gap: 22, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 28 }, symbol: { alignItems: "center", alignSelf: "center", borderRadius: 32, height: 112, justifyContent: "center", overflow: "hidden", width: 112 }, nodeCenter: { backgroundColor: "#FFFDF8", borderRadius: 18, height: 36, width: 36, zIndex: 2 }, nodeSmall: { backgroundColor: "#FFFDF8", borderRadius: 8, height: 16, position: "absolute", width: 16, zIndex: 2 }, nodeOne: { right: 22, top: 27 }, nodeTwo: { bottom: 24, left: 22 }, orbit: { borderRadius: 44, borderWidth: 3, height: 88, position: "absolute", transform: [{ rotate: "-31deg" }], width: 74 }, copy: { alignItems: "center", gap: 8 }, title: { fontSize: 36, fontWeight: "800", letterSpacing: -1.2 }, tagline: { fontSize: 21, fontWeight: "700", letterSpacing: -0.4 }, description: { fontSize: 14, lineHeight: 21, maxWidth: 330, textAlign: "center" }, card: { borderRadius: 22, borderWidth: 1, gap: 12, padding: 16 }, modeSwitch: { borderRadius: 12, borderWidth: 1, flexDirection: "row", padding: 3 }, modeButton: { alignItems: "center", borderRadius: 9, flex: 1, paddingVertical: 9 }, modeLabel: { fontSize: 13, fontWeight: "700" }, input: { borderRadius: 12, borderWidth: 1, fontSize: 16, height: 50, paddingHorizontal: 14 }, message: { fontSize: 13, lineHeight: 19 }, primaryAction: { alignItems: "center", borderRadius: 13, flexDirection: "row", gap: 9, height: 52, justifyContent: "center", marginTop: 2 }, primaryLabel: { fontSize: 15, fontWeight: "700" }, forgotButton: { alignItems: "center", paddingTop: 4, paddingVertical: 6 }, forgotLabel: { fontSize: 13, fontWeight: "700" }, footerBlock: { alignItems: "center", gap: 10 }, privacy: { fontSize: 12, textAlign: "center" }, legalLinks: { alignItems: "center", flexDirection: "row", gap: 7, justifyContent: "center" }, legalLink: { fontSize: 12, fontWeight: "700" }, legalDivider: { fontSize: 13 }, footer: { fontSize: 11, textAlign: "center" }, pressed: { opacity: 0.86, transform: [{ scale: 0.985 }] },
});
