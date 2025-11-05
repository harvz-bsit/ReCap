import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  SafeAreaView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Team, teams } from '../../data/mockData';

export default function RecordScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const [status, setStatus] = useState<'ready' | 'recording' | 'paused'>('ready');
  const [transcriptionText, setTranscriptionText] = useState(
    'Tap the record button to start transcribing your meeting or voice note. Real-time text will appear here.'
  );
  const [seconds, setSeconds] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const theme = {
    bg: isDark ? '#121212' : '#F4F8FB',
    card: isDark ? '#1E1E1E' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#000000',
    blue: '#1976D2',
    red: '#E53935',
    green: '#4CAF50',
    secondary: isDark ? '#B0BEC5' : '#444',
    lightCard: isDark ? '#2A2A2A' : '#F6F9FF',
    border: isDark ? '#333' : '#E0E0E0',
  };

  // ✅ Timer effect (keeps counting when resumed)
  useEffect(() => {
    if (status === 'recording') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status]);

  const formatTime = (totalSeconds: number) => {
    const min = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
    return `${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const handleRecordResume = () => {
    if (status === 'ready') {
      setSeconds(0);
      setTranscriptionText('Listening for speech... Transcribing...');
    } else if (status === 'paused') {
      setTranscriptionText((prev) => prev + '\n\n--- Recording Resumed ---');
    }
    setStatus('recording');
  };

  const handlePause = () => {
    if (status === 'recording') {
      setStatus('paused');
      setTranscriptionText((prev) => prev + '\n\n--- Recording Paused ---');
    }
  };

  const handleFinish = () => {
    if (status === 'recording' || status === 'paused') {
      setStatus('paused'); // freeze timer
      setTranscriptionText(
        (prev) => prev + '\n\n--- Recording Finished. Summary Generated ---\n\n'
      );
      setShowSaveModal(true);
    }
  };

  const handleSaveToTeam = (team: Team) => {
    setShowSaveModal(false);
    setSeconds(0);
    setStatus('ready');
    setTranscriptionText(
      `✅ Successfully saved meeting summary to **${team.name}**. Tap the record button to start a new transcription.`
    );
  };

  const handleCancelSave = () => {
    setShowSaveModal(false);
    setSeconds(0);
    setStatus('ready');
    setTranscriptionText(
      'Recording cancelled. Tap the record button to start a new transcription.'
    );
  };

  const statusText =
    status === 'recording'
      ? 'LIVE RECORDING'
      : status === 'paused'
      ? 'PAUSED'
      : 'READY TO START';

  const statusColor =
    status === 'recording'
      ? theme.red
      : status === 'paused'
      ? theme.secondary
      : theme.blue;

  const renderRecordingControls = () => (
    <View style={[styles.controlArea, { backgroundColor: theme.card }]}>
      <Text style={[styles.statusText, { color: statusColor }]}>
        • {statusText} •
      </Text>

      {(status === 'recording' || status === 'paused') && (
        <Text style={[styles.timerText, { color: theme.text }]}>
          {formatTime(seconds)}
        </Text>
      )}

      <View style={styles.buttonRow}>
        {(status === 'recording' || status === 'paused') && (
          <TouchableOpacity
            style={[
              styles.smallButton,
              {
                backgroundColor:
                  status === 'recording' ? theme.secondary : theme.blue,
                opacity: status === 'paused' ? 0.5 : 1,
              },
            ]}
            onPress={handlePause}
            disabled={status === 'paused'}
            activeOpacity={0.8}
          >
            <Ionicons name="pause" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.recordButton,
            {
              backgroundColor:
                status === 'recording' ? theme.red : theme.blue,
              shadowColor: status === 'recording' ? theme.red : theme.blue,
            },
          ]}
          onPress={handleRecordResume}
          activeOpacity={0.8}
        >
          {status === 'recording' ? (
            <Ionicons name="mic" size={36} color="#FFFFFF" />
          ) : (
            <Ionicons name="play" size={36} color="#FFFFFF" />
          )}
        </TouchableOpacity>

        {(status === 'recording' || status === 'paused') && (
          <TouchableOpacity
            style={[styles.smallButton, { backgroundColor: theme.green }]}
            onPress={handleFinish}
            activeOpacity={0.8}
          >
            <Ionicons name="stop" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.buttonLabel, { color: theme.text }]}>
        {status === 'recording'
          ? 'Tap to Pause'
          : status === 'paused'
          ? 'Tap to Resume'
          : 'Start New Recording'}
      </Text>
    </View>
  );

  const renderSaveInterfaceModalContent = () => (
    <View style={styles.modalOverlayCenter}>
      <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
        <Text style={[styles.modalTitle, { color: theme.text }]}>
          Save Meeting Summary
        </Text>
        <Text
          style={[
            styles.statusText,
            { color: theme.secondary, marginBottom: 15 },
          ]}
        >
          Select a team folder to save the summarized transcription.
        </Text>

        <ScrollView style={styles.teamListScroll}>
          {teams.map((team) => (
            <TouchableOpacity
              key={team.id}
              style={[
                styles.teamSelectButton,
                {
                  backgroundColor: theme.lightCard,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => handleSaveToTeam(team)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="folder-open-outline"
                size={24}
                color={theme.blue}
              />
              <Text style={[styles.teamSelectText, { color: theme.text }]}>
                {team.name}
              </Text>
              <Ionicons
                name="save-outline"
                size={20}
                color={theme.green}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.cancelButton} onPress={handleCancelSave}>
          <Text style={[styles.cancelButtonText, { color: theme.secondary }]}>
            Cancel & Discard
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View
          style={[
            styles.transcriptionCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.transcriptionTitle, { color: theme.blue }]}>
            Live Transcription:
          </Text>
          <ScrollView style={styles.transcriptScroll}>
            <Text
              style={[
                styles.transcriptText,
                { color: theme.text, opacity: status === 'ready' ? 0.7 : 1 },
              ]}
            >
              {transcriptionText}
            </Text>
            {status === 'recording' && (
              <View style={styles.liveIndicatorRow}>
                <ActivityIndicator
                  size="small"
                  color={theme.red}
                  style={{ marginRight: 5 }}
                />
                <Text style={{ color: theme.red, fontWeight: '600' }}>
                  Listening...
                </Text>
              </View>
            )}
          </ScrollView>
        </View>

        {renderRecordingControls()}
      </View>

      <Modal
        visible={showSaveModal}
        animationType="fade"
        transparent
        onRequestClose={handleCancelSave}
      >
        {renderSaveInterfaceModalContent()}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, padding: 16, alignItems: 'center' },
  transcriptionCard: {
    flex: 1,
    width: '100%',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  transcriptionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  transcriptScroll: { flex: 1 },
  transcriptText: { fontSize: 16, lineHeight: 24, minHeight: 150 },
  liveIndicatorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  controlArea: { width: '100%', padding: 20, borderRadius: 16, alignItems: 'center' },
  statusText: { fontSize: 14, fontWeight: '800', marginBottom: 8, letterSpacing: 1.5 },
  timerText: { fontSize: 20, fontWeight: '700', marginBottom: 15 },
  buttonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', width: '100%', marginVertical: 10 },
  recordButton: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginHorizontal: 30 },
  smallButton: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  buttonLabel: { fontSize: 16, fontWeight: '700', marginTop: 8 },
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 400, padding: 20, borderRadius: 20, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: '800', marginBottom: 10 },
  teamListScroll: { maxHeight: 250, width: '100%', paddingHorizontal: 5, marginBottom: 10 },
  teamSelectButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderRadius: 12, marginBottom: 8, borderWidth: 1 },
  teamSelectText: { flex: 1, fontSize: 16, fontWeight: '600', marginLeft: 15 },
  cancelButton: { marginTop: 10, padding: 10 },
  cancelButtonText: { fontSize: 15, fontWeight: '600' },
});
