from flask import Flask, request, jsonify
import os

app = Flask(__name__)

@app.route('/transcribe', methods=['POST'])
def transcribe():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file'}), 400

    audio_file = request.files['audio']
    filepath = os.path.join('uploads', audio_file.filename)
    audio_file.save(filepath)

    # Temporary: Just confirm it worked
    return jsonify({'transcription': f'Received {audio_file.filename}'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
