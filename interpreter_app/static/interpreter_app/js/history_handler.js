// interpreter_app\static\interpreter_app\js\history_handler.js

document.addEventListener('DOMContentLoaded', function() {
    const historySection = document.getElementById('history-section');
    const historyList = document.getElementById('history-list');
    const deleteHistoryBtn = document.getElementById('delete-history-btn');

    document.addEventListener('codeExecuted', function(e) {
        const { command, code } = e.detail;
        addToHistory(command, code);
    });

    function addToHistory(command, code) {
        fetch('/add_history/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ command: command, code: code })
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
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    // Load history on page load
    loadHistory();
});
