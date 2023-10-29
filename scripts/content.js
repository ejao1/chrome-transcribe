// Replace with your API key. DO NOT GIT-COMMIT YOUR API KEY!
const OPENAI_API_KEY = ''; // DO NOT GIT-COMMIT YOUR API KEY!
// Safety valve to prevent excessive billing
const requestLimit = 5;

window.onload = function () {
    // Select all descendants of body
    const allElements = document.querySelectorAll('body *');
    let counter = 0;

    for (let i = 0; i < allElements.length; i++) {
        const currentElement = allElements[i];

        // Iterate only over the Node.TEXT_NODE
        for (let j = 0; j < currentElement.childNodes.length; j++) {
            const currentNode = currentElement.childNodes[j];

            if (currentNode.nodeType === Node.TEXT_NODE) {
                // If it's a text node, send it to the API and replace with the response on a best-effort basis,
                // logging API errors and continuing on.
                let currentText = currentNode.textContent;

                fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${OPENAI_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-3.5-turbo',
                        messages: [
                            {
                                role: 'system',
                                content: "Take the user's input and return it in all caps. Do not output anything else other than the capitalized input. Be prepared to handle more than just Latin letters, for example Cyrillic (which you should capitalize), katakana (which you should not because katakana doesn't distinguish letter case), numbers, whitespace, symbols etc."
                            },
                            {
                                role: 'user',
                                content: "The 2nd letter of the Russian alphabet is б.\nThe 3rd letter of the Russian alphabet is в.\n<div>"
                            },
                            {
                                role: 'assistant',
                                content: "THE 2ND LETTER OF THE RUSSIAN ALPHABET IS Б.\nTHE 3RD LETTER OF THE RUSSIAN ALPHABET IS В.\n<DIV>"
                            },
                            {
                                role: 'user',
                                content: currentText
                            }
                        ],
                    })
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.error) {
                            console.error('Error:', data.error);
                        } else {
                            currentNode.textContent = data.choices[0].message.content;
                        }
                    })
                    .catch(error => console.error('Error:', error));

                counter++;
                if (counter >= requestLimit) {
                    return;
                }
            }
        }
    }
}
