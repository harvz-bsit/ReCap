import { Slot } from "expo-router";
import { AuthProvider } from "../auth/GoogleAuth";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Slot />
    </AuthProvider>
  );
}
