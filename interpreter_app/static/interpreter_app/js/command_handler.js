document.addEventListener('DOMContentLoaded', function() {
    const commandDisplay = document.getElementById('command-display');
    const commandTextDisplay = document.getElementById('command-text-display');
    const generatedCodeSection = document.getElementById('generated-code-section');
    const generatedCodeTextarea = document.getElementById('generated-code-textarea');
    const executeCodeBtn = document.getElementById('execute-code-btn');
    const executionResult = document.getElementById('execution-result');
    const resultContent = document.getElementById('result-content');
    const generateCodeBtn = document.getElementById('generate-code-btn');

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
                console.log('Code generated:', data.code);
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
            body: JSON.stringify({ code: code })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const result = data.result;
                displayResult(result);
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

    function displayResult(result) {
        executionResult.classList.remove('d-none');
        
        resultContent.innerHTML = "";

        // If you want consistent multi-object display:
        if (result.type === 'multi' && Array.isArray(result.data)) {
            let multiHTML = '';
            result.data.forEach(item => {
                multiHTML += renderItem(item);
            });
            resultContent.innerHTML = multiHTML;

        } else {
            // Single-object fallback
            resultContent.innerHTML = renderItem(result);
        }
    }

    function renderItem(item) {
        // Returns an HTML string for each item
        let content = '';
        switch (item.type) {
            case 'table':
                // item.data is JSON of DF with orient="split"
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
                // item.data is base64 string
                content += `<img src="data:image/png;base64,${item.data}" class="img-fluid" alt="Plot">`;
                break;
            case 'plotly':
                // item.data is the HTML snippet for the figure
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
