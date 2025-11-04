import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';

export default function RecordScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const [status, setStatus] = useState<'ready' | 'recording' | 'paused'>('ready');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState<string>('');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const theme = {
    bg: isDark ? '#121212' : '#F4F8FB',
    card: isDark ? '#1E1E1E' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#000000',
    blue: '#1976D2',
    red: '#E53935',
    green: '#4CAF50',
    secondary: isDark ? '#B0BEC5' : '#444',
    border: isDark ? '#333' : '#E0E0E0',
  };

  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow microphone access.');
      }
    })();
  }, []);

  useEffect(() => {
    if (status === 'recording') {
      timerRef.current = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const formatTime = (totalSeconds: number) => {
    const min = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
    return `${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setStatus('recording');
      setSeconds(0);
      setTranscript('');
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Could not start recording.');
    }
  };

  const pauseRecording = async () => {
    try {
      if (recording) {
        await recording.pauseAsync();
        setStatus('paused');
      }
    } catch (err) {
      console.error('Pause failed', err);
    }
  };

  const resumeRecording = async () => {
    try {
      if (recording) {
        await recording.startAsync();
        setStatus('recording');
      }
    } catch (err) {
      console.error('Resume failed', err);
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setStatus('ready');

      if (!uri) {
        Alert.alert('Error', 'Recording URI is null.');
        return;
      }

      // Save file (optional) – using FileSystem
      const folder = (FileSystem as any).documentDirectory + 'recordings/';
      await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
      const fileName = `recording_${Date.now()}.m4a`;
      const newPath = folder + fileName;
      await FileSystem.moveAsync({ from: uri, to: newPath });

      // Send to Gemini API for transcription
      const formData = new FormData();
      formData.append('file', {
        uri: newPath,
        name: fileName,
        type: 'audio/m4a',
      } as any);
      // Example: specify model name or other parameters
      formData.append('model', 'gemini-audio-1');   // <–– adjust model name
      // Add any further parameters per Gemini's API spec
      const GEMINI_API_KEY = 'AIzaSyCgNjmI8DPSvh-ixznuqUMdO0ITpN5RDlE';  // <–– replace with your key
      const response = await fetch('https://api.generativeai.google/v1beta2/audio:recognize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GEMINI_API_KEY}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();
      if (data && data.transcript) {
        setTranscript(data.transcript);
      } else {
        setTranscript('No transcription received');
      }

    } catch (err) {
      console.error('Stop and transcribe failed', err);
      Alert.alert('Error', 'Failed to transcribe audio.');
    }
  };

  const statusText = status === 'recording'
    ? 'RECORDING'
    : status === 'paused'
    ? 'PAUSED'
    : 'READY TO START';

  const statusColor = status === 'recording'
    ? theme.red
    : status === 'paused'
    ? theme.secondary
    : theme.blue;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={[styles.transcriptionCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.transcriptionTitle, { color: theme.blue }]}>Transcription</Text>
          <ScrollView style={{ flex: 1 }}>
            <Text style={{ color: theme.text }}>{ transcript || 'Your transcription will appear here.' }</Text>
          </ScrollView>
        </View>

        <View style={[styles.controlArea, { backgroundColor: theme.card }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>• {statusText} •</Text>

          {(status === 'recording' || status === 'paused') && (
            <Text style={[styles.timerText, { color: theme.text }]}>{formatTime(seconds)}</Text>
          )}

          <View style={styles.buttonRow}>
            {(status === 'recording' || status === 'paused') && (
              <TouchableOpacity
                style={[styles.smallButton, { backgroundColor: status === 'recording' ? theme.secondary : theme.blue }]}
                onPress={ status === 'recording' ? pauseRecording : resumeRecording }
                activeOpacity={0.8}
              >
                <Ionicons name={status === 'recording' ? 'pause' : 'play'} size={24} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[ styles.recordButton, { backgroundColor: status === 'recording' ? theme.red : theme.blue } ]}
              onPress={ status === 'ready' ? startRecording : status === 'recording' ? pauseRecording : resumeRecording }
              activeOpacity={0.8}
            >
              <Ionicons name={ status === 'recording' ? 'mic' : 'mic-outline'} size={36} color="#FFFFFF" />
            </TouchableOpacity>

            {(status === 'recording' || status === 'paused') && (
              <TouchableOpacity
                style={[styles.smallButton, { backgroundColor: theme.green }]}
                onPress={ stopRecording }
                activeOpacity={0.8}
              >
                <Ionicons name="stop" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, padding: 16 },
  transcriptionCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  transcriptionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  controlArea: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  timerText: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 30,
  },
  smallButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
