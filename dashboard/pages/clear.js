email = localStorage.getItem("email");

const clearButton = document.querySelector('.clear-btn');
clearButton.addEventListener('click', async function () {
    try {
        console.log("Clear Button Clicked.")

        //Clears the messages from the message container
        clearMessages();

        // Delete objects in S3 bucket Videos
        await deleteObjectsWithPrefix('cctv-videos-upload', email);

        // Delete objects in S3 bucket Face-temp
        await deleteObjectsWithPrefix('cctv-faces-temp', email);

        // Delete objects in S3 bucket Faces
        await deleteObjectsWithPrefix('cctv-faces', email);

        // Delete Rekognition collections
        await deleteAllCollections();

        deleteAllMessages();
        alert('Deleted all user data.');
    } catch (err) {
        console.error(err);
    }

    location.reload();
});

function clearMessages() {
    const messageContainer = document.getElementById('message-container');
    while (messageContainer.firstChild) {
        messageContainer.removeChild(messageContainer.firstChild);
    }
}
