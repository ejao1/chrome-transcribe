document.addEventListener('DOMContentLoaded', function () {
    let input = document.getElementById('apiKey');
    let saveButton = document.getElementById('saveButton');

    // Initialize the form with the saved value
    chrome.storage.sync.get(['apiKey'], function (data) {
        if (data.apiKey) {
            input.value = data.apiKey;
        }
    });

    saveButton.addEventListener('click', function () {
        chrome.storage.sync.set({apiKey: input.value});
    });
});
