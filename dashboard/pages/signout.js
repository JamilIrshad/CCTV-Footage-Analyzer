email = localStorage.getItem("email");

const signOutButton = document.querySelector('.signout-btn');
signOutButton.addEventListener('click', async function () {
    try {
        // Delete objects in S3 bucket
        await deleteObjectsWithPrefix('cctv-videos-upload', email);

        // Delete objects in S3 bucket Face-temp
        await deleteObjectsWithPrefix('cctv-faces-temp', email);

        // Delete objects in S3 bucket Faces
        await deleteObjectsWithPrefix('cctv-faces', email);

        // Delete Rekognition collections
        await deleteAllCollections();

        deleteAllMessages();

        alert('Logged out from email: ' + email + ' and deleted all user data.');
        localStorage.removeItem("auth");
        localStorage.removeItem("email");
        window.location.replace("../../login.html");
        window.history.replaceState(null, null, window.location.href);
    } catch (err) {
        console.error(err);
    }
});