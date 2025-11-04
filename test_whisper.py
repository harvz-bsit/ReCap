import whisper

model = whisper.load_model("tiny")  # fastest for testing
result = model.transcribe("Recording.mp3")  # replace with your own file
print(result["text"])
