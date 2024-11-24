// interpreter_app/static/interpreter_app/js/audio_recorder.js

document.addEventListener('DOMContentLoaded', function() {
    // Handle input method selection
    const inputMethods = document.getElementsByName('input-method');
    const textInputSection = document.getElementById('text-input');
    const voiceInputSection = document.getElementById('voice-input');

    inputMethods.forEach((method) => {
        method.addEventListener('change', () => {
            if (method.value === 'text') {
                textInputSection.classList.remove('d-none');
                voiceInputSection.classList.add('d-none');
            } else {
                textInputSection.classList.add('d-none');
                voiceInputSection.classList.remove('d-none');
            }
        });
    });

    // Handle file upload
    const uploadForm = document.getElementById('upload-form');
    const metadataDiv = document.getElementById('metadata');
    const columnsDiv = document.getElementById('columns');
    const dtypesKeysRow = document.getElementById('dtypes-keys'); // First row for keys
    const dtypesValuesRow = document.getElementById('dtypes-values'); // Second row for values
    const sampleRowsDiv = document.getElementById('sample-rows');

    uploadForm.addEventListener('submit', function(e) {
        console.log("File upload initiated.");
        e.preventDefault();
        const fileInput = document.getElementById('file-input');
        const file = fileInput.files[0];
        if (!file) {
            toastr.error('Please select a file to upload.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        toastr.info('Uploading...', { timeOut: 2000 });

        fetch('/upload_data/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken') // Include CSRF token here
            },
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                toastr.success('File uploaded successfully.');
                // Display metadata
                const metadata = data.metadata;

                // // Display Columns as badges
                // columnsDiv.innerHTML = '';
                // metadata.columns.forEach(col => {
                //     columnsDiv.innerHTML += `<span class="badge bg-primary badge-column">${col}</span>`;
                // });

                // Display Data Types in table
                dtypesKeysRow.innerHTML = '';
                dtypesValuesRow.innerHTML = '';

                // Populate keys in first row
                metadata.dtypesKeys = Object.keys(metadata.dtypes);
                metadata.dtypesKeys.forEach(key => {
                    dtypesKeysRow.innerHTML += `<th>${key}</th>`;
                });

                // Populate values in second row
                metadata.dtypesKeys.forEach(key => {
                    const value = metadata.dtypes[key];
                    dtypesValuesRow.innerHTML += `<td>${value}</td>`;
                });


                // Display Sample Rows
                const sampleRows = metadata.sample_rows;
                let tableHTML = '<table class="table table-striped"><thead><tr>';
                if (sampleRows.length > 0) {
                    Object.keys(sampleRows[0]).forEach(col => {
                        tableHTML += `<th>${col}</th>`;
                    });
                    tableHTML += '</tr></thead><tbody>';
                    sampleRows.forEach(row => {
                        tableHTML += '<tr>';
                        Object.values(row).forEach(value => {
                            tableHTML += `<td>${value}</td>`;
                        });
                        tableHTML += '</tr>';
                    });
                    tableHTML += '</tbody></table>';
                    sampleRowsDiv.innerHTML = tableHTML;
                    metadataDiv.classList.remove('d-none');
                }
            } else {
                toastr.error(`Error uploading file: ${data.message}`);
            }
        })
        .catch(error => {
            console.error("Error:", error);
            toastr.error(`Error: ${error}`);
        });
    });

    // Audio Recorder Variables
    let mediaRecorder;
    let audioChunks = [];

    const startRecordBtn = document.getElementById('start-record-btn');
    const stopRecordBtn = document.getElementById('stop-record-btn');
    const audioPlayback = document.getElementById('audio-playback');
    const transcribeBtn = document.getElementById('transcribe-btn');

    startRecordBtn.addEventListener('click', () => {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.start();
                toastr.info('Recording started...', { timeOut: 2000 });
                audioChunks = [];

                mediaRecorder.addEventListener("dataavailable", event => {
                    audioChunks.push(event.data);
                });

                mediaRecorder.addEventListener("stop", () => {
                    const audioBlob = new Blob(audioChunks, { 'type' : 'audio/wav;' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    audioPlayback.src = audioUrl;
                    audioPlayback.classList.remove('d-none');
                    transcribeBtn.classList.remove('d-none');
                    stream.getTracks().forEach(track => track.stop());
                    toastr.success('Recording stopped.');
                });

                startRecordBtn.disabled = true;
                stopRecordBtn.disabled = false;
            })
            .catch(error => {
                console.error("Error accessing microphone:", error);
                toastr.error('Error accessing microphone.');
            });
    });

    stopRecordBtn.addEventListener('click', () => {
        mediaRecorder.stop();
        startRecordBtn.disabled = false;
        stopRecordBtn.disabled = true;
    });

    transcribeBtn.addEventListener('click', () => {
        const audioSrc = audioPlayback.src;
        if (!audioSrc) {
            toastr.error('No audio recorded.');
            return;
        }

        fetch(audioSrc)
            .then(response => response.blob())
            .then(blob => {
                const formData = new FormData();
                formData.append('file', blob, 'recorded_audio.wav');

                toastr.info('Transcribing...', { timeOut: 2000 });

                fetch('/transcribe/', {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken') // Include CSRF token here if required
                    },
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        toastr.success('Transcription successful.');
                        displayCommand(data.text);
                    } else {
                        toastr.error(`Transcription Error: ${data.message}`);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    toastr.error(`Error: ${error}`);
                });
            });
    });

    // Handle Command Display and Code Generation
    const commandDisplay = document.getElementById('command-display');
    const commandTextDisplay = document.getElementById('command-text-display');
    const generatedCodeSection = document.getElementById('generated-code-section');
    const generatedCodeTextarea = document.getElementById('generated-code-textarea');
    const executeCodeBtn = document.getElementById('execute-code-btn');
    const executionResult = document.getElementById('execution-result');
    const resultContent = document.getElementById('result-content');
    const generateCodeBtn = document.getElementById('generate-code-btn');

    generateCodeBtn.addEventListener('click', () => {
        const command = document.getElementById('command-text').value.trim();
        if (!command) {
            toastr.error('Please enter a command.');
            return;
        }

        // Display the command in the "command-display" section
        document.getElementById('command-text-display').textContent = command;
        document.getElementById('command-display').classList.remove('d-none');

        // Call the generateCode function
        generateCode(command);
    });


    function displayCommand(command) {
        commandTextDisplay.textContent = command;
        commandDisplay.classList.remove('d-none');
        generateCode(command);
    }

    function generateCode(command) {
        console.log(`Generating code for command: ${command}`); // Debugging
        fetch('/generate_code/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ 'command': command })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                console.log('Code generated:', data.code); // Debugging
                generatedCodeTextarea.value = data.code;
                generatedCodeSection.classList.remove('d-none');
            } else {
                toastr.error(`Code Generation Error: ${data.message}`);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            toastr.error(`Error: ${error}`);
        });
    }
    

    executeCodeBtn.addEventListener('click', () => {
        const code = generatedCodeTextarea.value.trim();
        if (!code) {
            toastr.error('No code to execute. Please generate code first.');
            return;
        }
    
        console.log('Executing Code:', code);
    
        fetch('/execute_code/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ 'code': code })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const result = data.result;
                displayResult(result);
                addToHistory(commandTextDisplay.textContent, code);
            } else {
                toastr.error(`Execution Error: ${data.message}`);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            toastr.error(`Error: ${error}`);
        });
    });   

    function displayResult(result) {
        executionResult.classList.remove('d-none');
        if (result.type === 'table') {
            const df = JSON.parse(result.data);
            let tableHTML = '<table class="table table-bordered table-hover"><thead><tr>';
            const columns = df.columns;
            columns.forEach(col => {
                tableHTML += `<th>${col}</th>`;
            });
            tableHTML += '</tr></thead><tbody>';
            df.data.forEach(row => {
                tableHTML += '<tr>';
                row.forEach(cell => {
                    tableHTML += `<td>${cell}</td>`;
                });
                tableHTML += '</tr>';
            });
            tableHTML += '</tbody></table>';
            resultContent.innerHTML = tableHTML;
        } else if (result.type === 'plot') {
            const imgData = result.data;
            resultContent.innerHTML = `<img src="data:image/png;base64,${imgData}" class="img-fluid" alt="Plot">`;
        } else if (result.type === 'text') {
            resultContent.innerHTML = `<p>${result.data}</p>`;
        } else if (result.type === 'error') {
            resultContent.innerHTML = `<p class="text-danger">${result.data}</p>`;
        }
    }

    // Handle History
    const historySection = document.getElementById('history-section');
    const historyList = document.getElementById('history-list');
    const deleteHistoryBtn = document.getElementById('delete-history-btn'); // New Delete History Button

    function addToHistory(command, code) {
        fetch('/add_history/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ 'command': command, 'code': code })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                loadHistory();
                toastr.success('Added to history.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            toastr.error('Error adding to history.');
        });
    }

    function loadHistory() {
        fetch('/get_history/')
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    const history = data.history;
                    if (history.length > 0) {
                        historySection.classList.remove('d-none');
                        historyList.innerHTML = '';
                        // Display history in reverse order
                        for (let i = history.length - 1; i >= 0; i--) {
                            const item = history[i];
                            historyList.innerHTML += `<div class="history-item">
                                <h4>Command ${i + 1}:</h4>
                                <p>${item.command}</p>
                                <pre>${item.code}</pre>
                            </div>`;
                        }
                    } else {
                        historySection.classList.add('d-none');
                        historyList.innerHTML = '';
                    }
                }
            })
            .catch(error => {
                console.error('Error:', error);
                toastr.error('Error loading history.');
            });
    }

    // Delete History Functionality
    deleteHistoryBtn.addEventListener('click', () => {
        if (!confirm('Are you sure you want to delete all history? This action cannot be undone.')) {
            return;
        }

        fetch('/delete_history/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                loadHistory();
                toastr.success('History deleted successfully.');
            } else {
                toastr.error(`Error deleting history: ${data.message}`);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            toastr.error('Error deleting history.');
        });
    });

    // Utility function to get CSRF token
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    // Initial load of history
    loadHistory();
});
