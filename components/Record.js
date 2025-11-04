import { Audio } from 'expo-av';
import React, { useEffect, useState } from 'react';
import { Alert, Button, Text, View } from 'react-native';

export default function Record() {
    const [recording, setRecording] = useState(null);
    const [status, setStatus] = useState('Tap "Start Recording" to begin');
    const [transcription, setTranscription] = useState('');

    const SERVER_URL = 'http://192.168.100.139:5000/transcribe'; // 👈 your Flask IP

    useEffect(() => {
        (async () => {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission required', 'Please allow microphone access.');
            }
        })();
    }, []);

    const startRecording = async () => {
        try {
            console.log('Requesting permissions...');
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            console.log('Starting recording...');
            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            setRecording(recording);
            setStatus('Recording...');
        } catch (err) {
            console.error('Failed to start recording', err);
            setStatus('Recording failed to start.');
        }
    };

    const stopRecording = async () => {
        console.log('Stopping recording...');
        setStatus('Stopping...');
        try {
            await recording.stopAndUnloadAsync();
        } catch (e) {
            console.error('Stop failed', e);
            return;
        }

        const uri = recording.getURI();
        setRecording(null);
        setStatus('Uploading...');
        console.log('Recorded file:', uri);

        const formData = new FormData();
        formData.append('audio', {
            uri,
            name: 'recording.mp3',
            type: 'audio/mpeg',
        });

        try {
            const response = await fetch(SERVER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'multipart/form-data' },
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Server error ${response.status}`);
            }

            const data = await response.json();
            console.log('Server response:', data);
            setTranscription(data.transcription);
            setStatus('Done!');
        } catch (err) {
            console.error(err);
            Alert.alert('Upload failed', err.message);
            setStatus('Upload failed');
        }
    };

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 }}>
            <Button
                title={recording ? 'Stop Recording' : 'Start Recording'}
                onPress={recording ? stopRecording : startRecording}
            />
            <Text>{status}</Text>
            {transcription ? (
                <Text style={{ marginTop: 20, padding: 10, textAlign: 'center' }}>
                    Transcription: {transcription}
                </Text>
            ) : null}
        </View>
    );
}
