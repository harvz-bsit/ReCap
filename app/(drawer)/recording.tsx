import React, { useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    useColorScheme,
    ActivityIndicator,
    SafeAreaView,
    Modal, // Import Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; 

// --- Mock Data and Types (Synchronized with data/mockData.ts) ---
import { Team, teams } from '../../data/mockData';
// ----------------------------------------------------


export default function RecordScreen() {
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';

    // Status is simplified now since 'finished' state is primarily replaced by 'showSaveModal'
    const [status, setStatus] = useState<'ready' | 'recording' | 'paused'>('ready');
    const [transcriptionText, setTranscriptionText] = useState("Tap the record button to start transcribing your meeting or voice note. Real-time text will appear here.");
    const [seconds, setSeconds] = useState(0); 
    
    // State for controlling the floating modal
    const [showSaveModal, setShowSaveModal] = useState(false); 

    const theme = {
        bg: isDark ? '#121212' : '#F4F8FB',
        card: isDark ? '#1E1E1E' : '#FFFFFF',
        text: isDark ? '#FFFFFF' : '#000000',
        blue: isDark ? '#1976D2' : '#1976D2',
        red: '#E53935',
        green: '#4CAF50', // For saving/success
        secondary: isDark ? '#B0BEC5' : '#444',
        lightCard: isDark ? '#2A2A2A' : '#F6F9FF',
        border: isDark ? '#333' : '#E0E0E0',
    };

    // --- Functional Logic ---

    const formatTime = (totalSeconds: number) => {
        const min = Math.floor(totalSeconds / 60);
        const sec = totalSeconds % 60;
        return `${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}`;
    };

    const handleRecordResume = () => {
        if (status === 'ready' || status === 'paused') {
            setStatus('recording');
            setTranscriptionText(status === 'ready' ? "Listening for speech... Transcribing..." : (prev) => prev + "\n\n--- Recording Resumed ---");
        }
    };

    const handlePause = () => {
        if (status === 'recording') {
            setStatus('paused');
            setTranscriptionText(prev => prev + "\n\n--- Recording Paused ---");
        }
    };

    // Stops recording and triggers the modal
    const handleFinish = () => {
        if (status === 'recording' || status === 'paused') {
            // NOTE: Keep the status as paused/recording until the save is complete/cancelled for clean state management
            setTranscriptionText(prev => prev + "\n\n--- Recording Finished. Summary Generated ---\n\n");
            setShowSaveModal(true); 
        }
    };

    // Handles saving the recorded meeting to a selected team
    const handleSaveToTeam = (team: Team) => {
        // --- API call to save data would go here ---
        
        // Reset state after saving
        setSeconds(0); 
        setShowSaveModal(false); // Close the modal
        setStatus('ready'); 
        
        // Provide success feedback to the user
        setTranscriptionText(`✅ Successfully saved meeting summary to **${team.name}**. Tap the record button to start a new transcription.`);
    };
    
    // Handles cancelling the save (reverts to ready state)
    const handleCancelSave = () => {
        setShowSaveModal(false);
        setSeconds(0);
        setStatus('ready');
        setTranscriptionText("Recording cancelled. Tap the record button to start a new transcription.");
    };

    // --- Render Logic ---
    
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

            {/* Timer Display */}
            {(status === 'recording' || status === 'paused') && (
                <Text style={[styles.timerText, { color: theme.text }]}>
                    {formatTime(seconds)}
                </Text>
            )}

            <View style={styles.buttonRow}>
                
                {/* LEFT: Pause Button */}
                {(status === 'recording' || status === 'paused') && (
                    <TouchableOpacity 
                        style={[styles.smallButton, { 
                            backgroundColor: status === 'recording' ? theme.secondary : theme.blue,
                            opacity: status === 'paused' ? 0.5 : 1
                        }]} 
                        onPress={handlePause}
                        disabled={status === 'paused'}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="pause" size={24} color="#FFFFFF" /> 
                    </TouchableOpacity>
                )}

                {/* CENTER: Record/Resume Button */}
                <TouchableOpacity 
                    style={[
                        styles.recordButton, 
                        { 
                            backgroundColor: status === 'recording' ? theme.red : theme.blue, 
                            shadowColor: status === 'recording' ? theme.red : theme.blue,
                        }
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

                {/* RIGHT: Finish Button (Stop/End) */}
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
                {status === 'recording' ? 'Tap to Pause' : status === 'paused' ? 'Tap to Resume' : 'Start New Recording'}
            </Text>
        </View>
    );

    // This is the content that goes inside the floating Modal
    const renderSaveInterfaceModalContent = () => (
        <View style={styles.modalOverlayCenter}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                    Save Meeting Summary
                </Text>
                <Text style={[styles.statusText, { color: theme.secondary, marginBottom: 15 }]}>
                    Select a team folder to save the summarized transcription.
                </Text>
                
                <ScrollView style={styles.teamListScroll}>
                    {teams.map((team) => (
                        <TouchableOpacity
                            key={team.id}
                            style={[styles.teamSelectButton, { 
                                backgroundColor: theme.lightCard, 
                                borderColor: theme.border 
                            }]}
                            onPress={() => handleSaveToTeam(team)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="folder-open-outline" size={24} color={theme.blue} />
                            <Text style={[styles.teamSelectText, { color: theme.text }]}>
                                {team.name}
                            </Text>
                            <Ionicons name="save-outline" size={20} color={theme.green} />
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                
                {/* Cancel Button */}
                <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={handleCancelSave} // Use the new cancel handler
                >
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
            
                {/* Transcription Area */}
                <View style={[styles.transcriptionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.transcriptionTitle, { color: theme.blue }]}>
                        Live Transcription:
                    </Text>
                    <ScrollView style={styles.transcriptScroll}>
                        <Text style={[styles.transcriptText, { color: theme.text, opacity: status === 'ready' ? 0.7 : 1 }]}>
                            {transcriptionText}
                        </Text>
                        {/* Controlled Activity Indicator for real-time feedback */}
                        {status === 'recording' && (
                            <View style={styles.liveIndicatorRow}>
                                <ActivityIndicator size="small" color={theme.red} style={{ marginRight: 5 }} />
                                <Text style={{ color: theme.red, fontWeight: '600' }}>Listening...</Text>
                            </View>
                        )}
                    </ScrollView>
                </View>

                {/* Recording Controls (always shown unless modal is visible) */}
                {renderRecordingControls()}
            
            </View>
            
            {/* The Floating Save Page Modal */}
            <Modal
                visible={showSaveModal}
                animationType="fade"
                transparent={true}
                onRequestClose={handleCancelSave}
            >
                {renderSaveInterfaceModalContent()}
            </Modal>

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
        flex: 1,
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
        minHeight: 150,
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
        fontWeight: '800',
        marginBottom: 8,
        letterSpacing: 1.5,
    },
    timerText: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 15,
        fontVariant: ['tabular-nums'],
    },
    buttonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        width: '100%',
        marginVertical: 10,
    },
    recordButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 30, 
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
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
    
    // --- Modal Styles ---
    modalOverlayCenter: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)', // Dark background overlay
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%', // Larger modal size
        maxWidth: 400, // Max width for larger screens
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 10,
    },
    teamListScroll: {
        maxHeight: 250, 
        width: '100%',
        paddingHorizontal: 5,
        marginBottom: 10,
    },
    teamSelectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
    },
    teamSelectText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 15,
    },
    cancelButton: {
        marginTop: 10,
        padding: 10,
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '600',
    }
});