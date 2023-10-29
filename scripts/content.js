window.onload = function () {
    // Select all descendants of body
    const allElements = document.querySelectorAll('body *');

    for (let i = 0; i < allElements.length; i++) {
        const currentElement = allElements[i];

        // iterate only over the Node.TEXT_NODE
        for (let j = 0; j < currentElement.childNodes.length; j++) {
            const currentNode = currentElement.childNodes[j];

            if (currentNode.nodeType === Node.TEXT_NODE) {
                // if it's a text node, remove space characters
                currentNode.textContent = currentNode.textContent.replace(/\s/g, '');
            }
        }
    }
}
