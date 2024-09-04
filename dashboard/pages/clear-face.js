email = localStorage.getItem("email");

const clearButton = document.querySelector('.clear-btn');
clearButton.addEventListener('click', async function () {
    try {
        console.log("Clear Button Clicked.")

        // Delete objects in S3 bucket Videos
        await deleteObjectsWithPrefix('cctv-videos-upload', email);

        // Delete objects in S3 bucket Face-temp
        await deleteObjectsWithPrefix('cctv-faces-temp', email);

        // Delete objects in S3 bucket Faces
        await deleteObjectsWithPrefix('cctv-faces', email);

        // Delete Rekognition collections
        await deleteAllCollections();

        alert('Deleted all user data.');
    } catch (err) {
        console.error(err);
    }
    location.reload();
});

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