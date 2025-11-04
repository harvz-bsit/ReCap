// @ts-nocheck
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy'; // ✅ legacy import for Expo SDK 54 warning
import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, View } from 'react-native';

export default function Record() {
    const [recording, setRecording] = useState(null);
    const [status, setStatus] = useState('Idle');
    const [isProcessing, setIsProcessing] = useState(false);

    async function startRecording() {
        if (isProcessing || recording) return;
        setIsProcessing(true);

        try {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission not granted!');
                return;
            }

            const rec = new Audio.Recording();
            await rec.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
            await rec.startAsync();
            setRecording(rec);
            setStatus('Recording...');
        } catch (error) {
            console.error('Failed to start recording:', error);
            Alert.alert('Error', 'Failed to start recording.');
        } finally {
            setIsProcessing(false);
        }
    }

    async function stopRecording() {
        if (!recording || isProcessing) return;
        setIsProcessing(true);

        try {
            const status = await recording.getStatusAsync();
            if (status.isRecording) {
                await recording.stopAndUnloadAsync(); // ✅ only once
            }

            const uri = recording.getURI();
            if (!uri) throw new Error('No recording URI found.');

            const newUri = `${FileSystem.documentDirectory}recording-${Date.now()}.m4a`;
            await FileSystem.copyAsync({ from: uri, to: newUri }); // ✅ legacy-safe

            console.log('✅ Saved recording to:', newUri);
            Alert.alert('Saved!', newUri);

            setRecording(null);
            setStatus('Idle');
        } catch (error) {
            console.error('Failed to stop recording:', error);
            Alert.alert('Error', 'Failed to stop recording.');
        } finally {
            setIsProcessing(false);
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.status}>{status}</Text>
            <Button
                title={recording ? 'Stop Recording' : 'Start Recording'}
                onPress={recording ? stopRecording : startRecording}
                disabled={isProcessing}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    status: { fontSize: 18, marginBottom: 10 },
});
