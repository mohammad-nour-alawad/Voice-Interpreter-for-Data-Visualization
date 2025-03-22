// interpreter_app\static\interpreter_app\js\file_upload.js

document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('upload-form');
    const metadataDiv = document.getElementById('metadata');
    const dtypesKeysRow = document.getElementById('dtypes-keys');
    const dtypesValuesRow = document.getElementById('dtypes-values');
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
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                toastr.success('File uploaded successfully.');
                const metadata = data.metadata;
                dtypesKeysRow.innerHTML = '';
                dtypesValuesRow.innerHTML = '';

                // Populate keys and values for data types
                metadata.dtypesKeys = Object.keys(metadata.dtypes);
                metadata.dtypesKeys.forEach(key => {
                    dtypesKeysRow.innerHTML += `<th>${key}</th>`;
                });
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
