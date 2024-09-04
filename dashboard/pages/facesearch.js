let isConfigUpdate = false;
let reader = new FileReader();
email = localStorage.getItem("email");

document.addEventListener("DOMContentLoaded", function () {
    const auth = localStorage.getItem("auth");
    if (auth != 1) {
        window.location.replace("../../login.html");
    } else {
        document.body.style.display = "";
    }
});

updateUploadedCount(email);

const sqs = new AWS.SQS({
    accessKeyId: 'AKIA52M7AXMOVM3UHUFS',
    secretAccessKey: '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',
    region: 'ap-south-1'
});
deleteAllMessages();


function displayMessageInUI(message) {
    const messageContainer = document.getElementById('message-container');
    const newMessage = document.createElement('p');
    newMessage.textContent = message;
    if (message === "Face Search Operation Complete. Refresh Page for another face search operation.") {
        hideLoader();
    }
    messageContainer.appendChild(newMessage);

    // Get the element to scroll
    const uploadedVideos = document.querySelector('.uploaded-videos');

    // Scroll to the bottom of the element
    uploadedVideos.scrollTop = uploadedVideos.scrollHeight;
}

// Set the interval for message retrieval (e.g., every 5 seconds)
const retrievalInterval = 5000; // 5 seconds

// Function to retrieve messages from the SQS queue
function retrieveMessages() {
    const receiveParams = {
        QueueUrl: 'https://sqs.ap-south-1.amazonaws.com/950058138397/frameextraction',
        MaxNumberOfMessages: 10 // Maximum number of messages to retrieve at a time
    };

    sqs.receiveMessage(receiveParams, function (err, data) {
        if (err) {
            console.log('Error retrieving messages:', err);
        } else {
            if (data.Messages && data.Messages.length > 0) {
                // Process and display the received messages
                data.Messages.forEach(function (message) {
                    console.log('Received Message:', message.Body);
                    displayMessageInUI(message.Body);

                    // Delete the message from the queue
                    const deleteParams = {
                        QueueUrl: 'https://sqs.ap-south-1.amazonaws.com/950058138397/frameextraction',
                        ReceiptHandle: message.ReceiptHandle
                    };

                    sqs.deleteMessage(deleteParams, function (err, data) {
                        if (err) {
                            console.log('Error deleting message:', err);
                        } else {
                            console.log('Message deleted successfully');
                        }
                    });
                });
            } else {
                console.log('No messages found');
            }
        }
    });
}

// Run the message retrieval function periodically
setInterval(retrieveMessages, retrievalInterval);



async function uploadToS3Bucket(stream, credential, cd) {
    try {
        if (!window.AWS) {
            return;
        }
        if (!isConfigUpdate) {
            window.AWS.config.update(({ region: credential.region }));
            isConfigUpdate = true;
        }

        let s3 = new window.AWS.S3({
            credentials: new window.AWS.Credentials({
                apiVersion: 'latest',
                accessKeyId: credential.accessKeyId,
                secretAccessKey: credential.secretAccessKey,
                signatureVersion: credential.signatureVersion,
                region: credential.region,
                Bucket: credential.Bucket
            })
        });
        let uploadItem = await s3.upload({
            Bucket: credential.Bucket,
            Key: filename, // Use the generated filename
            ContentType: document.getElementById("video-upload").files[0].type,
            Body: stream
        }).on("httpUploadProgress", function (progress) {
            const uploadProgress = getUploadingProgress(progress.loaded, progress.total);
            const progressElement = document.querySelector('.text-success.text-sm.font-weight-bolder');
            progressElement.innerText = `${uploadProgress}% Upload`;
            cd(uploadProgress);
        }).promise();
        console.log("uploadItem=>", uploadItem);
        return uploadItem;
    } catch (error) {
        console.log(error);
    }
}

function getUploadingProgress(uploadSize, totalSize) {
    let uploadProgress = (uploadSize / totalSize) * 100;
    return Number(uploadProgress.toFixed(0));
}

async function uploadMedia() {

    clearMessages()
    showLoader()
    const file = document.getElementById("video-upload").files[0];

    if (file && file.name.endsWith(".jpg") || file.name.endsWith(".jpeg")) {
        let credentialRequest = {
            accessKeyId: 'AKIA52M7AXMOVM3UHUFS',
            secretAccessKey: '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',
            signatureVersion: 'v4',
            region: 'ap-south-1',
            Bucket: 'cctv-faces'
        };

        let mediaStreamRequest = getFile(file);
        filename = file.name; // Use the original file name
        console.log('Uploading Image');
        const [mediaStream] = await Promise.all([mediaStreamRequest]);
        await uploadToS3Bucket(mediaStream, credentialRequest, (progress) => {
            console.log(progress);
        });
        updateUploadedCount(email);
    } else {
        console.log('Invalid file format. Only .jpg files are allowed.');
        alert('Invalid file format. Only .jpg files are allowed.');
    }
}


async function getFile(file) {
    return new Promise((resolve, reject) => {
        let reader = new FileReader();
        reader.onload = (e) => {
            resolve(e.target.result);
        };
        reader.onerror = (err) => {
            reject(false);
        };
        reader.readAsArrayBuffer(file);
    });
}

// Add event listener to the "Upload" button
const uploadButton = document.querySelector('.upload-button');
uploadButton.addEventListener('click', uploadMedia);

function updateFileSize() {
    const fileInput = document.getElementById("video-upload");
    const fileSizeElement = document.getElementById("file-size");

    if (fileInput.files.length > 0) {
        const fileSize = fileInput.files[0].size;
        const fileSizeInMB = (fileSize / (1024 * 1024)).toFixed(2);
        fileSizeElement.textContent = `${fileSizeInMB} MB`;
    } else {
        fileSizeElement.textContent = "0 MB";
    }
}

// Add event listener to the file input
const fileInput = document.getElementById("video-upload");
fileInput.addEventListener("change", updateFileSize);

function updateUploadedCount(email) {
    const s3 = new AWS.S3({
        // Configure your AWS SDK with the necessary credentials and region
        accessKeyId: 'AKIA52M7AXMOVM3UHUFS',
        secretAccessKey: 'g7rqrJmG/mPlTGEfSIxNFw4zzOFa0f7QELPam5iT',
        region: 'ap-south-1'
    });

    const params = {
        Bucket: 'cctv-faces',
    };

    s3.listObjectsV2(params, function (err, data) {
        if (err) {
            console.error(err);
            return;
        }

        const uploadedCount = data.Contents.length;
        const uploadedCountElement = document.getElementById('uploaded-count');
        uploadedCountElement.textContent = uploadedCount.toString();
    });
}

function deleteObjectsWithPrefix(bucketName, prefix) {
    const s3 = new AWS.S3({
        // Configure your AWS SDK with the necessary credentials and region
        accessKeyId: 'AKIA52M7AXMOVM3UHUFS',
        secretAccessKey: 'g7rqrJmG/mPlTGEfSIxNFw4zzOFa0f7QELPam5iT',
        region: 'ap-south-1',
    });

    const params = {
        Bucket: bucketName,
    };

    return new Promise((resolve, reject) => {
        s3.listObjects(params, function (err, data) {
            if (err) {
                reject(err);
                return;
            }

            if (data.Contents.length === 0) {
                console.log('No objects found with the specified prefix.');
                resolve();
                return;
            }

            const objects = data.Contents.map(function (object) {
                return { Key: object.Key };
            });

            const deleteParams = {
                Bucket: bucketName,
                Delete: {
                    Objects: objects,
                    Quiet: false
                }
            };

            s3.deleteObjects(deleteParams, function (err, data) {
                if (err) {
                    reject(err);
                    return;
                }

                console.log('Deleted objects:', data.Deleted);
                resolve();
            });
        });
    });
}

//To Clear all the responses

// Function to delete all messages in the queue
async function deleteAllMessages() {
    try {
        // Receive and delete messages until the queue is empty
        while (true) {
            const { Messages } = await sqs.receiveMessage({
                QueueUrl: 'https://sqs.ap-south-1.amazonaws.com/950058138397/frameextraction',
                MaxNumberOfMessages: 10 // Adjust the batch size as per your requirements
            }).promise();

            if (!Messages || Messages.length === 0) {
                break; // No more messages in the queue
            }

            // Delete each message in the batch
            const deleteParams = {
                QueueUrl: 'https://sqs.ap-south-1.amazonaws.com/950058138397/frameextraction',
                Entries: Messages.map((message) => ({
                    Id: message.MessageId,
                    ReceiptHandle: message.ReceiptHandle
                }))
            };

            await sqs.deleteMessageBatch(deleteParams).promise();
        }

        console.log('All messages deleted successfully!');
    } catch (error) {
        console.error('Error deleting messages:', error);
    }
}

function deleteAllCollections() {
    const rekognition = new AWS.Rekognition({
        // Configure your AWS SDK with the necessary credentials and region
        accessKeyId: 'AKIA52M7AXMOVM3UHUFS',
        secretAccessKey: 'g7rqrJmG/mPlTGEfSIxNFw4zzOFa0f7QELPam5iT',
        region: 'ap-south-1',
    });

    return new Promise((resolve, reject) => {
        rekognition.listCollections({}, function (err, data) {
            if (err) {
                reject(err);
                return;
            }

            if (data.CollectionIds.length === 0) {
                console.log('No collections found.');
                resolve();
                return;
            }

            const collectionIds = data.CollectionIds;
            const deletionPromises = [];

            collectionIds.forEach(function (collectionId) {
                const deleteParams = {
                    CollectionId: collectionId
                };

                const deletionPromise = new Promise((resolve, reject) => {
                    rekognition.deleteCollection(deleteParams, function (err, data) {
                        if (err) {
                            reject(err);
                            return;
                        }

                        console.log('Deleted collection:', collectionId);
                        resolve();
                    });
                });

                deletionPromises.push(deletionPromise);
            });

            Promise.all(deletionPromises)
                .then(() => {
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
    });
}

function showLoader() {
    document.getElementById("loader-overlay").classList.add("show");
}

function hideLoader() {
    document.getElementById("loader-overlay").classList.remove("show");
}