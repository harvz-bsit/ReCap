import { ThemedText, ThemedView } from '@/components/themed-view';

export default function Settings() {
  return (
    <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ThemedText type="title">Settings</ThemedText>
    </ThemedView>
  );
}
