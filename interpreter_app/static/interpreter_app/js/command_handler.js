document.addEventListener('DOMContentLoaded', function() {
    const commandDisplay = document.getElementById('command-display');
    const commandTextDisplay = document.getElementById('command-text-display');
    const generatedCodeSection = document.getElementById('generated-code-section');
    const generatedCodeTextarea = document.getElementById('generated-code-textarea');
    const executeCodeBtn = document.getElementById('execute-code-btn');
    const responseMessageSection = document.getElementById('response-message'); // new response message section
    const generateCodeBtn = document.getElementById('generate-code-btn');
    
    const dtypesKeysRow = document.getElementById('dtypes-keys');
    const dtypesValuesRow = document.getElementById('dtypes-values');
    const sampleRowsDiv = document.getElementById('sample-rows');
    const metadataDiv = document.getElementById('metadata');

    
    // Input method selection
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

    generateCodeBtn.addEventListener('click', () => {
        const command = document.getElementById('command-text').value.trim();
        if (!command) {
            toastr.error('Please enter a command.');
            return;
        }
        commandTextDisplay.textContent = command;
        commandDisplay.classList.remove('d-none');
        generateCode(command);
    });
    

    // Listen for transcribed command from audio recorder
    document.addEventListener('audioTranscribed', function(e) {
        const transcribedText = e.detail;
        commandTextDisplay.textContent = transcribedText;
        commandDisplay.classList.remove('d-none');
        generateCode(transcribedText);
    });

    function generateCode(command) {
        console.log(`Generating code for command: ${command}`);
        fetch('/generate_code/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ command: command })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                console.log('Response received:', data);
                if (data.code) {
                    generatedCodeTextarea.value = data.code;
                    generatedCodeSection.classList.remove('d-none');
                    
                    executeCodeBtn.click();
                }
                if (data.message) {
                    responseMessageSection.textContent = data.message;
                    responseMessageSection.classList.remove('d-none');
                }
                // Play the audio automatically if available
                if (data.audio) {
                    const audioSrc = "data:audio/mpeg;base64," + data.audio;
                    const audio = new Audio(audioSrc);
                    audio.playbackRate = 1.3;
                    audio.play().catch(error => console.error("Audio playback failed:", error));
                }
                
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
    
        fetch('/execute_code/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ code: code })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const result = data.result;
                displayResult(result);
                if (data.metadata) {
                    updateMetadataDisplay(data.metadata);
                }
                const event = new CustomEvent('codeExecuted', { detail: { command: commandTextDisplay.textContent, code: code } });
                document.dispatchEvent(event);
            } else {
                toastr.error(`Execution Error: ${data.message}`);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            toastr.error(`Error: ${error}`);
        });
    });
    
    function updateMetadataDisplay(metadata) {
        // Update data types table
        dtypesKeysRow.innerHTML = '';
        dtypesValuesRow.innerHTML = '';
        Object.keys(metadata.dtypes).forEach(key => {
            dtypesKeysRow.innerHTML += `<th>${key}</th>`;
        });
        Object.values(metadata.dtypes).forEach(value => {
            dtypesValuesRow.innerHTML += `<td>${value}</td>`;
        });
    
        // Update sample rows table
        let tableHTML = '<table class="table table-striped"><thead><tr>';
        if (metadata.sample_rows.length > 0) {
            Object.keys(metadata.sample_rows[0]).forEach(col => {
                tableHTML += `<th>${col}</th>`;
            });
            tableHTML += '</tr></thead><tbody>';
            metadata.sample_rows.forEach(row => {
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
    }
    

    function displayResult(result) {
        const executionResult = document.getElementById('execution-result');
        const resultContent = document.getElementById('result-content');
        executionResult.classList.remove('d-none');
        resultContent.innerHTML = "";
        if (result.type === 'multi' && Array.isArray(result.data)) {
            let multiHTML = '';
            result.data.forEach(item => {
                multiHTML += renderItem(item);
            });
            resultContent.innerHTML = multiHTML;
        } else {
            resultContent.innerHTML = renderItem(result);
        }
    }

    function renderItem(item) {
        let content = '';
        switch (item.type) {
            case 'table':
                const df = JSON.parse(item.data);
                content += '<table class="table table-bordered table-hover"><thead><tr>';
                df.columns.forEach(col => {
                    content += `<th>${col}</th>`;
                });
                content += '</tr></thead><tbody>';
                df.data.forEach(row => {
                    content += '<tr>';
                    row.forEach(cell => {
                        content += `<td>${cell}</td>`;
                    });
                    content += '</tr>';
                });
                content += '</tbody></table>';
                break;
            case 'plot':
                content += `<img src="data:image/png;base64,${item.data}" class="img-fluid" alt="Plot">`;
                break;
            case 'plotly':
                content += `<div>${item.data}</div>`;
                break;
            case 'text':
                content += `<p>${item.data}</p>`;
                break;
            default:
                content += `<p class="text-danger">Unknown result type: ${item.type}</p>`;
        }
        return content;
    }

    // Utility function to get CSRF token
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
