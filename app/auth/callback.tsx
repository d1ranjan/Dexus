import { router } from "expo-router";
import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import * as Api from "@/lib/_core/api";
import { parseDexusCallbackUrl } from "@/lib/auth-callback";
import { setDexusSession } from "@/lib/dexus-session";

export default function DexusAuthCallback() {
  const colors = useColors();
  const incomingUrl = Linking.useURL();
  const [message, setMessage] = useState("Securing your Dexus session…");

  useEffect(() => {
    let active = true;
    const complete = async (url: string | null) => {
      try {
        if (!url) throw new Error("This verification link is incomplete. Request a new email from Dexus.");
        const params = parseDexusCallbackUrl(url);
        if (params.error) throw new Error(params.error);
        if (params.accessToken && params.refreshToken) {
          await setDexusSession({ access_token: params.accessToken, refresh_token: params.refreshToken });
        } else if (params.code) {
          throw new Error("This verification link uses an unsupported code exchange. Request a new Dexus email link.");
        }
        if (!params.accessToken) throw new Error("This verification link has expired. Request a new email from Dexus.");
        const established = await Api.establishSession(params.accessToken);
        if (!established) throw new Error("Dexus could not establish a secure session. Request a new email link.");
        if (!active) return;
        router.replace(params.type === "recovery" ? "/auth/update-password" : "/(tabs)");
      } catch (caught) {
        if (active) setMessage(caught instanceof Error ? caught.message : "Dexus could not complete this link.");
      }
    };
    // useURL receives both launch URLs and links delivered after the app is
    // already running, which is essential for mobile email confirmation flows.
    void complete(incomingUrl ?? Linking.getLinkingURL());
    return () => { active = false; };
  }, [incomingUrl]);

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.page}><ActivityIndicator color={colors.primary} size="large" /><Text style={[styles.title, { color: colors.foreground }]}>Dexus account</Text><Text style={[styles.copy, { color: colors.muted }]}>{message}</Text></View></ScreenContainer>;
}

const styles = StyleSheet.create({ page: { alignItems: "center", flex: 1, gap: 12, justifyContent: "center", padding: 28 }, title: { fontSize: 24, fontWeight: "800" }, copy: { fontSize: 15, lineHeight: 22, maxWidth: 320, textAlign: "center" } });
