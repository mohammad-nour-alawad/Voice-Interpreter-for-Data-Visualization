// interpreter_app\static\interpreter_app\js\audio_recorder.js

document.addEventListener('DOMContentLoaded', function() {
    let mediaRecorder;
    let audioChunks = [];
    const recordBtn = document.getElementById('record-btn');
    const audioPlayback = document.getElementById('audio-playback');
    let currentStream;

    // Start recording when the button is pressed down
    recordBtn.addEventListener('mousedown', () => {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                currentStream = stream;
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                mediaRecorder.start();
                toastr.info('Recording started...', { timeOut: 2000 });

                mediaRecorder.addEventListener("dataavailable", event => {
                    audioChunks.push(event.data);
                });

                mediaRecorder.addEventListener("stop", () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/wav;' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    audioPlayback.src = audioUrl;
                    audioPlayback.classList.remove('d-none');
                    toastr.success('Recording stopped.');

                    // Automatically trigger transcription
                    transcribeAudio(audioBlob);

                    // Stop all tracks to release the microphone
                    currentStream.getTracks().forEach(track => track.stop());
                });
            })
            .catch(error => {
                console.error("Error accessing microphone:", error);
                toastr.error('Error accessing microphone.');
            });
    });

    recordBtn.addEventListener('mouseup', () => {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
        }
    });

    function transcribeAudio(audioBlob) {
        const formData = new FormData();
        formData.append('file', audioBlob, 'recorded_audio.wav');
        toastr.info('Transcribing...', { timeOut: 2000 });

        fetch('/transcribe/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                toastr.success('Transcription successful.');
                // Dispatch custom event with the transcribed text
                const event = new CustomEvent('audioTranscribed', { detail: data.text });
                document.dispatchEvent(event);
            } else {
                toastr.error(`Transcription Error: ${data.message}`);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            toastr.error(`Error: ${error}`);
        });
    }

    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
});
