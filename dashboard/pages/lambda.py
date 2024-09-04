import boto3
import cv2
import numpy as np
import os
import time

def create_collection(collection_id):
    rekognition = boto3.client('rekognition')

    response = rekognition.create_collection(
        CollectionId=collection_id
    )
    
    print('Face collection created. Collection ID: ' + collection_id)

def add_faces_to_collection(bucket, folder, collection_id):
    rekognition = boto3.client('rekognition')
    s3 = boto3.resource('s3')
    bucket_obj = s3.Bucket(bucket)
    
    counter=0

    for obj in bucket_obj.objects.filter(Prefix=folder):
        if obj.key.endswith('.jpg'):  # Modify the file extension if necessary
            image_name = obj.key.split('/')[-1]
            response = rekognition.detect_faces(
                Image={'S3Object': {'Bucket': bucket, 'Name': obj.key}},
                Attributes=['ALL']
            )

            if len(response['FaceDetails']) == 0:
                print('No faces detected in ' + image_name)
                continue

            print('Faces detected in ' + image_name)

            for faceDetail in response['FaceDetails']:
                counter+=1
                face_id = None

                # Check if face is already indexed in the collection
                search_response = rekognition.search_faces_by_image(
                    CollectionId=collection_id,
                    Image={'S3Object': {'Bucket': bucket, 'Name': obj.key}},
                    FaceMatchThreshold=80,
                    MaxFaces=3
                )

                if len(search_response['FaceMatches']) > 0:
                    face_id = search_response['FaceMatches'][0]['Face']['FaceId']
                    print('Face already indexed in collection. Face ID: ' + face_id)
                else:
                    counter+=1
                    # Index the face in the collection
                    index_response = rekognition.index_faces(
                        CollectionId=collection_id,
                        Image={'S3Object': {'Bucket': bucket, 'Name': obj.key}},
                        ExternalImageId=image_name,
                        DetectionAttributes=['ALL']
                    )

                    if len(index_response['FaceRecords']) > 0:
                        counter+=1
                        for faceRecord in index_response['FaceRecords']:
                            face_id = faceRecord['Face']['FaceId']
                            bounding_box = faceRecord['Face']['BoundingBox']
                            image_key = obj.key

                            # Download the image from S3
                            s3 = boto3.client('s3')
                            image_file = s3.get_object(Bucket=bucket, Key=image_key)['Body'].read()

                            # Convert the image to a numpy array
                            nparr = np.frombuffer(image_file, np.uint8)
                            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                            # Get the image dimensions
                            image_height, image_width, _ = image.shape
                            

                            # Calculate the pixel coordinates of the bounding box
                            left = int(bounding_box['Left'] * image_width)
                            top = int(bounding_box['Top'] * image_height)
                            width = int(bounding_box['Width'] * image_width)
                            height = int(bounding_box['Height'] * image_height)
                            
                             # Adjust the top coordinate if it is negative
                            if top < 0:
                                top = 0
                            

                            if width == 0 or height == 0:
                                print('Invalid face region. Skipping...')
                                continue

                            # Crop the image using the bounding box coordinates
                            cropped_folder = 'cropped'
                            counter+=1
                            cropped_image_key = f'{folder}{cropped_folder}/{counter}_{face_id}_{image_name}'
                            
                            cropped_image_path = '/tmp/' + cropped_image_key  # Path to save the cropped image locally

                            # Create the temporary directory if it doesn't exist
                            os.makedirs(os.path.dirname(cropped_image_path), exist_ok=True)

                            cropped_image = image[top:top + height, left:left + width]

                            if cropped_image.size == 0:
                                print('Empty cropped image. Skipping...')
                                continue

                            cv2.imwrite(cropped_image_path, cropped_image)

                            # Upload the cropped image to S3
                            s3.upload_file(cropped_image_path, bucket, cropped_image_key)

                            print('Cropped image uploaded:', cropped_image_key)

                    if len(index_response['FaceRecords']) > 0:
                        face_id = index_response['FaceRecords'][0]['Face']['FaceId']
                        print('Face indexed in collection. Face ID: ' + face_id)

                if face_id is not None:
                    print('Face details:')
                    print('  Bounding Box: {}'.format(faceDetail['BoundingBox']))
                    print('  Age Range: {}'.format(faceDetail['AgeRange']))
                    print('  Gender: {}'.format(faceDetail['Gender']['Value']))
                    # Add more desired face details as needed
                    print('')
                    
                counter+=1

def lambda_handler(event, context):
    bucket = event['Records'][0]['s3']['bucket']['name']
    folder = event['Records'][0]['s3']['object']['key']
    
    print(bucket)
    print(folder)
    
    collection_id = folder.rstrip('/')  # Use folder name as collection ID
    
    rekognition = boto3.client('rekognition')
    
    sqs = boto3.client('sqs', region_name='ap-south-1')
    # Send a message to the SQS queue
    queue_url = 'https://sqs.ap-south-1.amazonaws.com/950058138397/frameextraction'
    
    message = '1. Started Facial analysis on frames.'
    sqs.send_message(QueueUrl=queue_url, MessageBody=message)
    
    
    collections = rekognition.list_collections()
    collection_ids = collections['CollectionIds']

    if isinstance(collection_ids, str):
        collection_ids = [collection_ids]  # Convert the string to a list

    if collection_id not in collection_ids:
        create_collection(collection_id)

    time.sleep(5)
    message = '2. Created face collection.'
    sqs.send_message(QueueUrl=queue_url, MessageBody=message)
    
    time.sleep(5)
    message = '3. Analyzing Frames for faces.'
    sqs.send_message(QueueUrl=queue_url, MessageBody=message)
    add_faces_to_collection(bucket, folder, collection_id)
    
    message = '4. Analysis completed for the video. Now, you may upload another video. Or click on GetFaces button for results of detected faces.'
    sqs.send_message(QueueUrl=queue_url, MessageBody=message)
    
    message = '------------------------------------------------'
    sqs.send_message(QueueUrl=queue_url, MessageBody=message)
