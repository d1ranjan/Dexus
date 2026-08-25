// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

// Bundle IDs use a reverse-domain format and contain only letters, numbers, and dots.
// Bundle ID can only contain letters, numbers, and dots
// Android requires each dot-separated segment to start with a letter
const rawBundleId = "com.app.dexusmobilev2";
const bundleId =
  rawBundleId
    .replace(/[-_]/g, ".") // Replace hyphens/underscores with dots
    .replace(/[^a-zA-Z0-9.]/g, "") // Remove invalid chars
    .replace(/\.+/g, ".") // Collapse consecutive dots
    .replace(/^\.+|\.+$/g, "") // Trim leading/trailing dots
    .toLowerCase()
    .split(".")
    .map((segment) => {
      // Android requires each segment to start with a letter
      // Prefix with 'x' if segment starts with a digit
      return /^[a-zA-Z]/.test(segment) ? segment : "x" + segment;
    })
    .join(".") || "com.app.dexus";
// Derive a stable Dexus deep-link scheme from the bundle identifier.
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `dexus${timestamp}`;

const env = {
  // App branding - update these values directly (do not use env vars)
  appName: "Dexus",
  appSlug: "dexus-mobile-v2",
  // S3 URL of the app logo - set this to the URL returned by generate_image when creating custom logo
  // Leave empty to use the default icon from assets/images/icon.png
  logoUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663909841228/ItmFDTQMsaSThKpD.png",
  scheme: schemeFromBundleId,
  iosBundleId: bundleId,
  androidPackage: bundleId,
};

// GitHub Pages project sites are served below the repository path. Keep this
// build-only so native clients and the managed preview retain root routing.
const githubPagesBuild = process.env.DEXUS_DEPLOY_TARGET === "github-pages";
const webBasePath = githubPagesBuild ? "/Dexus" : "";
// The Pages bundle must never fall back to its static github.io origin for
// server requests. Update this alongside the production Render service URL.
const githubPagesApiBaseUrl = "https://dexus-api.onrender.com";

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  description: "AI-powered personal knowledge and productivity platform.",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "automatic",
  extra: {
    creator: "Dipanshu Ranjan",
    copyright: "© 2026 Dipanshu Ranjan",
    tagline: "Connect your thoughts.",
    apiBaseUrl: githubPagesBuild
      ? process.env.EXPO_PUBLIC_API_BASE_URL ?? githubPagesApiBaseUrl
      : process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
    webBasePath,
    // Supabase’s project URL and publishable key are safe to ship to the client.
    // No service-role credential is included in the Expo bundle.
    supabaseUrl: process.env.SUPABASE_URL ?? "",
    supabasePublishableKey: process.env.SUPABASE_KEY ?? "",
  },
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
    "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#000000",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: env.androidPackage,
    permissions: ["POST_NOTIFICATIONS"],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: env.scheme,
            host: "*",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-asset",
    "expo-font",
    [
      "expo-secure-store",
      {
        configureAndroidBackup: true,
      },
    ],
    "expo-web-browser",
    [
      "expo-audio",
      {
        microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone.",
      },
    ],
    [
      "expo-video",
      {
        supportsBackgroundPlayback: true,
        supportsPictureInPicture: true,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
    ...(githubPagesBuild ? { baseUrl: webBasePath } : {}),
  },
};

export default config;
