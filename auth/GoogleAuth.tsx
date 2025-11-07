import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";

import {
  makeRedirectUri,
  useAuthRequest,
  exchangeCodeAsync,
  ResponseType,
  DiscoveryDocument,
} from "expo-auth-session";

import Constants from "expo-constants";

// Close in-app browser sessions on iOS
WebBrowser.maybeCompleteAuthSession();

// ----------------------
// Types
// ----------------------
type User = {
  name?: string;
  email?: string;
  picture?: string;
};

type AuthContextType = {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used in AuthProvider");
  return value;
};

// ----------------------
// Google OAuth Endpoints
// ----------------------
const discovery: DiscoveryDocument = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
  userInfoEndpoint: "https://www.googleapis.com/oauth2/v3/userinfo",
};

// ----------------------
// SecureStore key
// ----------------------
const SECURE_STORE_KEY = "google_auth_session_v1";

// ----------------------
// Auth Provider Component
// ----------------------
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load Web Client ID from app.json -> extra
  const GOOGLE_WEB_CLIENT_ID =
    Constants.expoConfig?.extra?.GOOGLE_WEB_CLIENT_ID ||
    Constants.manifest2?.extra?.GOOGLE_WEB_CLIENT_ID;

  // Expo Go redirect URI
  const redirectUri = useMemo(
    () =>
      makeRedirectUri(),
    []
  );

  // Build the OAuth request on component mount
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: GOOGLE_WEB_CLIENT_ID!,
      responseType: ResponseType.Code,
      redirectUri,
      scopes: ["openid", "email", "profile"],
    },
    discovery
  );

  // ----------------------
  // Load stored session on app open
  // ----------------------
  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(SECURE_STORE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setAccessToken(parsed.accessToken ?? null);
          setUser(parsed.user ?? null);
        }
      } catch (e) {
        console.warn("Error loading saved auth:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ----------------------
  // Handle OAuth response
  // ----------------------
  useEffect(() => {
    (async () => {
      if (response?.type !== "success") return;

      try {
        const { code } = response.params;

        // 1. Exchange the auth code for tokens
        const tokenResult = await exchangeCodeAsync(
          {
            clientId: GOOGLE_WEB_CLIENT_ID!,
            code,
            redirectUri,
          },
          discovery
        );

        const access_token = tokenResult.accessToken;

        // 2. Fetch user profile
        const profileRes = await fetch(discovery.userInfoEndpoint!, {
          headers: { Authorization: `Bearer ${access_token}` },
        });

        const profile = await profileRes.json();

        const userData: User = {
          name: profile.name,
          email: profile.email,
          picture: profile.picture,
        };

        setUser(userData);
        setAccessToken(access_token);

        // Save session
        await SecureStore.setItemAsync(
          SECURE_STORE_KEY,
          JSON.stringify({
            accessToken: access_token,
            user: userData,
          })
        );
      } catch (error) {
        console.warn("Google Auth error:", error);
      }
    })();
  }, [response]);

  // ----------------------
  // Sign in (open Google popuObp)
  // ----------------------
  const signInWithGoogle = async () => {
    if (!request) {
      console.warn("Google Auth Request is not ready yet.");
      return;
    }
    await promptAsync();
  };

  // ----------------------
  // Sign out
  // ----------------------
  const signOut = async () => {
    setUser(null);
    setAccessToken(null);
    await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
  };

  const value = useMemo(
    () => ({
      user,
      accessToken,
      loading,
      signInWithGoogle,
      signOut,
    }),
    [user, accessToken, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
