const API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-3.5-turbo';
// Safety valve to prevent excessive billing. Note that OpenAI charges per token and we don't look at the length of texts yet
const requestLimit = 10;
// Number of text nodes to batch together per API request
const batchSize = 25;

const TRANSFORM_CAPITALIZE = {
    PROMPT: 'The user will provide a JSON array of strings. Output a JSON array of strings where' +
        ' each output string is the input string capitalized. Do not output anything else other than the' +
        ' capitalized input. Be prepared to handle more than just Latin letters, for example Cyrillic' +
        ' (which you should capitalize), katakana (which you should not because katakana doesn\'t' +
        ' distinguish letter case), numbers, whitespace, symbols etc. Any JSON reserved characters will' +
        ' be properly escaped in the input and you must escape them accordingly in the output. The input' +
        ' will be a valid JSON array, but do not make assumptions about whether it\'s pretty-printed or not.' +
        ' If the inner input strings themselves happen to contain JSON, however, you should maintain any whitespace' +
        ' found inside the input strings, just like numbers/symbols/punctuation, but any such JSON found inside an' +
        ' inner input string should be capitalized like everything else in the inner input strings even if that' +
        ' changes the meaning of said JSON.',
    SAMPLE_INPUT: [
        'The 2nd letter of the Russian alphabet is б.\nThe 3rd letter of the Russian alphabet is в.\n<div>',
        'asdfasdfasdf',
        '{"foo": \n"ba\\nr"}',
        'def foo:\n\tpass'
    ],
    SAMPLE_OUTPUT: [
        'THE 2ND LETTER OF THE RUSSIAN ALPHABET IS Б.\nTHE 3RD LETTER OF THE RUSSIAN ALPHABET IS В.\n<DIV>',
        'ASDFASDFASDF',
        '{"FOO": \n"BA\\NR"}',
        'DEF FOO:\n\tPASS'
    ]
};

const TRANSFORM_TRANSCRIBE_INTO_KATAKANA = {
    PROMPT: 'The user will provide a JSON array of strings. Output a JSON array of strings where' +
        ' each output string is the input string phonetically transcribed (not transliterated) into katakana. Do not output' +
        ' anything else other than the transcribed input. Maintain spaces, punctuation, special characters, etc. in the input,' +
        ' as well as any letters found in scripts other than Latin ones. Also maintain Latin characters that wouldn\'t make sense' +
        ' to transcribe, for example most acronyms, code snippets, etc. Any JSON reserved characters will be properly escaped in' +
        ' the input and you must escape them accordingly in the output. The input will be a valid JSON array, but do not make' +
        ' assumptions about whether it\'s pretty-printed or not.\nYou\'ll have to make some arbitrary choices, given the' +
        ' inherent differences in phonemes between the English and Japanese languages. Pick something reasonable and apply them' +
        ' consistently.',
    SAMPLE_INPUT: [
        'A Tesla coil is a radio frequency oscillator that drives an air-core double-tuned resonant transformer to' +
            ' produce high voltages at low currents. Tesla\'s original circuits as well as most modern coils use a simple spark gap' +
            ' to excite oscillations in the tuned transformer.',
        'The 2nd letter of the Russian alphabet is б.',
        'asdfasdfasdf',
        'Python function definitions look like this:\n\ndef foo():\n\tpass'
    ],
    SAMPLE_OUTPUT: [
        'ア テスラ コイル イズ ア ラディオ フリークェンシー オシレーター ザット ドライブズ アン エアーコア ダブルツーンド レゾナント' +
            ' トランスフォーマー トゥ プロデュース ハイ ヴォルテージズ アット ロウ カレンツ. テスラズ オリジナル サーキツ アズ ウェル アズ モスト モダン' +
            ' コイルズ ユーズ ア シンプル スパーク ギャップ トゥ エクサイト オシレーションズ イン ザ トゥーンド トランスフォーマー.',
        'ザ 2nd レター オブ ザ ラシアン アルファベット イズ б.',
        'asdfasdfasdf',
        'Python ファンクション デフィニションズ ルック ライク ディス:\n\ndef foo():\n\tpass'
    ]
};

let openaiApiKey = '';

// Given a nonempty array of strings, package them into an API request and return a promise
function fetchCompletions(texts) {
    const chatMessages = [
        {
            role: 'system',
            content: TRANSFORM_TRANSCRIBE_INTO_KATAKANA.PROMPT
        },
        {
            role: 'user',
            content: JSON.stringify(TRANSFORM_TRANSCRIBE_INTO_KATAKANA.SAMPLE_INPUT)
        },
        {
            role: 'assistant',
            content: JSON.stringify(TRANSFORM_TRANSCRIBE_INTO_KATAKANA.SAMPLE_OUTPUT)
        },
        {
            role: 'user',
            content: JSON.stringify(texts)
        }
    ];
    return fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
            model: MODEL,
            messages: chatMessages,
        })
    });
}

// Given an array of text nodes, package them into an API request and asynchronously update their text content
// from the API response
function processNodeBatch(nodes) {
    if (nodes.length === 0) {
        return;
    }

    const texts = nodes.map(node => node.textContent);
    fetchCompletions(texts)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Error:', data.error);
            } else {
                const transformedTexts = JSON.parse(data.choices[0].message.content)

                // Update the text content of each node with the corresponding response
                nodes.forEach((node, index) => {
                    node.textContent = transformedTexts[index];
                });
            }
        })
        .catch(error => console.error('Error:', error));
}

function main() {
    // Select all descendants of body
    const allElements = document.querySelectorAll('body *');
    let requestCounter = 0;
    let nodeCounter = 0;
    let nodes = [];

    for (let i = 0; i < allElements.length; i++) {
        const currentElement = allElements[i];

        // Iterate only over the Node.TEXT_NODE
        for (let j = 0; j < currentElement.childNodes.length; j++) {
            const currentNode = currentElement.childNodes[j];

            if (currentNode.nodeType !== Node.TEXT_NODE) {
                continue;
            }

            // If it's a text node, add it to the batch
            nodes.push(currentNode);
            nodeCounter++;
            if (nodeCounter >= batchSize) {
                // If we've reached the batch size, process the batch and reset the counter and batch. Replacements
                // are done best-effort; any API errors are logged and that batch is skipped.
                processNodeBatch(nodes);
                nodeCounter = 0;
                nodes = [];

                requestCounter++;
                if (requestCounter >= requestLimit) {
                    return;
                }
            }
        }
    }

    // Process the final batch
    processNodeBatch(nodes);
}

window.onload = function () {
    chrome.storage.sync.get('apiKey', function (data) {
        openaiApiKey = data.apiKey;
        main();
    })
};
