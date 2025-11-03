import React, { useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    useColorScheme,
    ActivityIndicator,
    SafeAreaView
} from 'react-native';
// 1. Import Ionicons for high-quality icons
import { Ionicons } from '@expo/vector-icons'; 

export default function RecordScreen() {
    const scheme = useColorScheme(); // Detects light/dark mode
    const isDark = scheme === 'dark';

    // State for recording status and transcribed text
    const [status, setStatus] = useState<'ready' | 'recording' | 'paused'>('ready');
    const [transcriptionText, setTranscriptionText] = useState("Tap the record button to start transcribing your meeting or voice note. Real-time text will appear here.");
    
    // Timer state for demonstration (Not fully implemented, but good for UX)
    const [seconds, setSeconds] = useState(0); 

    // Use the same consistent color definitions as your DashboardScreen
    const theme = {
        bg: isDark ? '#121212' : '#F4F8FB',
        card: isDark ? '#1E1E1E' : '#FFFFFF',
        text: isDark ? '#FFFFFF' : '#000000',
        blue: isDark ? '#1976D2' : '#1976D2', // Primary Blue (for start/resume)
        red: '#E53935', // Consistent color for recording activity
        green: '#4CAF50', // For the finish button
        secondary: isDark ? '#B0BEC5' : '#444', // For the pause button
        lightCard: isDark ? '#2A2A2A' : '#F6F9FF',
    };

    // --- Functional Logic ---

    // Simple function to format time (MM:SS)
    const formatTime = (totalSeconds) => {
        const min = Math.floor(totalSeconds / 60);
        const sec = totalSeconds % 60;
        return `${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}`;
    };

    const handleRecordResume = () => {
        if (status === 'ready' || status === 'paused') {
            setStatus('recording');
            setTranscriptionText(status === 'ready' ? "Listening for speech... Transcribing..." : (prev) => prev + "\n\n--- Recording Resumed ---");
            // In a real app, you'd start the actual recording and timer here
        }
    };

    const handlePause = () => {
        if (status === 'recording') {
            setStatus('paused');
            setTranscriptionText(prev => prev + "\n\n--- Recording Paused ---");
            // In a real app, you'd pause the actual recording and timer here
        }
    };

    const handleFinish = () => {
        if (status === 'recording' || status === 'paused') {
            setStatus('ready'); // Return to ready state
            setSeconds(0); // Reset timer
            setTranscriptionText(prev => prev + "\n\n--- Recording Finished ---\n\nFinal summary generation by Gemini AI initiated. This will take a moment...");
            // In a real app, you'd stop the recording and process the final file here
        }
    };

    // --- Render Logic ---
    
    // Dynamic status text and color
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

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
            <View style={[styles.container, { backgroundColor: theme.bg }]}>
            
                {/* Transcription Area */}
                <View style={[styles.transcriptionCard, { backgroundColor: theme.card, borderColor: theme.secondary }]}>
                    <Text style={[styles.transcriptionTitle, { color: theme.blue }]}>
                    Live Transcription:
                    </Text>
                    <ScrollView style={styles.transcriptScroll}>
                    <Text style={[styles.transcriptText, { color: theme.text, opacity: status === 'ready' ? 0.7 : 1 }]}>
                        {transcriptionText}
                    </Text>
                    {/* 2. Controlled Activity Indicator for real-time feedback */}
                    {status === 'recording' && (
                        <View style={styles.liveIndicatorRow}>
                            <ActivityIndicator size="small" color={theme.red} style={{ marginRight: 5 }} />
                            <Text style={{ color: theme.red, fontWeight: '600' }}>Listening...</Text>
                        </View>
                    )}
                    </ScrollView>
                </View>

                {/* Recording Button and Controls */}
                <View style={[styles.controlArea, { backgroundColor: theme.card }]}>
                    
                    <Text style={[styles.statusText, { color: statusColor }]}>
                        • {statusText} •
                    </Text>

                    {/* Timer Display */}
                    {(status === 'recording' || status === 'paused') && (
                        <Text style={[styles.timerText, { color: theme.text }]}>
                            {formatTime(seconds)}
                        </Text>
                    )}

                    <View style={styles.buttonRow}>
                        
                        {/* LEFT: Pause Button - Visible only during recording/paused */}
                        {(status === 'recording' || status === 'paused') && (
                            <TouchableOpacity 
                                style={[styles.smallButton, { 
                                    backgroundColor: status === 'recording' ? theme.secondary : theme.blue,
                                    opacity: status === 'paused' ? 0.5 : 1 // Dim pause button when paused
                                }]} 
                                onPress={handlePause}
                                disabled={status === 'paused'} // Disable pause when already paused
                                activeOpacity={0.8}
                            >
                                {/* 1. Professional Icon for Pause */}
                                <Ionicons name="pause" size={24} color="#FFFFFF" /> 
                            </TouchableOpacity>
                        )}

                        {/* CENTER: Record/Resume Button */}
                        <TouchableOpacity 
                            style={[
                                styles.recordButton, 
                                { 
                                    // Use red for 'recording', blue for 'ready' or 'paused'
                                    backgroundColor: status === 'recording' ? theme.red : theme.blue, 
                                    shadowColor: status === 'recording' ? theme.red : theme.blue,
                                }
                            ]} 
                            onPress={handleRecordResume}
                            activeOpacity={0.8}
                        >
                            {/* 3. Dynamic Icon for Record/Resume */}
                            {status === 'recording' ? (
                                <Ionicons name="mic" size={36} color="#FFFFFF" /> // Recording: Mic
                            ) : (
                                <Ionicons name="play" size={36} color="#FFFFFF" /> // Ready/Paused: Play/Start
                            )}
                        </TouchableOpacity>

                        {/* RIGHT: Finish Button - Visible when recording or paused */}
                        {(status === 'recording' || status === 'paused') && (
                            <TouchableOpacity 
                                style={[styles.smallButton, { backgroundColor: theme.green }]} 
                                onPress={handleFinish}
                                activeOpacity={0.8}
                            >
                                {/* 1. Professional Icon for Stop/Finish */}
                                <Ionicons name="stop" size={24} color="#FFFFFF" /> 
                            </TouchableOpacity>
                        )}
                        
                    </View>
                    
                    <Text style={[styles.buttonLabel, { color: theme.text }]}>
                    {status === 'recording' ? 'Tap to Pause' : status === 'paused' ? 'Tap to Resume' : 'Start New Recording'}
                    </Text>
                </View>
            
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    container: { 
        flex: 1, 
        padding: 16,
        alignItems: 'center',
    },
    transcriptionCard: {
        flex: 1, // Takes up most of the space
        width: '100%',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    transcriptionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 10,
        paddingBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    transcriptScroll: {
        flex: 1,
    },
    transcriptText: {
        fontSize: 16,
        lineHeight: 24,
        minHeight: 150, // Minimum height for initial look
    },
    liveIndicatorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    controlArea: {
        width: '100%',
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '800', // Bolder status
        marginBottom: 8,
        letterSpacing: 1.5, // More spaced out
    },
    timerText: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 15,
        fontVariant: ['tabular-nums'], // Helps the numbers stay aligned as they change
    },
    buttonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around', // Space around to keep main button centered
        width: '100%',
        marginVertical: 10,
    },
    recordButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        // Increased margin to give space for side buttons
        marginHorizontal: 30, 
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5, // Stronger shadow
        shadowRadius: 12,
    },
    smallButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    buttonLabel: {
        fontSize: 16,
        fontWeight: '700',
        marginTop: 8,
    },
});