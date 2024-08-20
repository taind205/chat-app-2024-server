import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {
  private serviceAccount:admin.ServiceAccount = {
    "projectId": process.env.FIREBASE_PROJECT_ID,
    "privateKey": process.env.FIREBASE_PRIVATE_KEY,
    "clientEmail": process.env.FIREBASE_CLIENT_EMAIL,
  };
  private app: admin.app.App;

  constructor() {  }

  async configureBucketCors(app:admin.app.App) {
    await app.storage().bucket().setCorsConfiguration([
      {
        maxAgeSeconds:3600,
        method: ['GET'],
        origin: [process.env.CLIENT_DOMAIN],
        responseHeader: ['Content-Type'],
      },
    ]);
    // to allow Get requests from React App sharing Content-Type responses across origins`
  }

  getApp(){
    if (!this.app) {
      this.app = admin.initializeApp({
        credential: admin.credential.cert(this.serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      },'chatApp');
      this.configureBucketCors(this.app);
    }
    return this.app;
  }

  getStorage() {
    const app = this.getApp();
    return app.storage();
  }

  uploadImage(inputImgFiles:string[]){
    return new Promise<string[]>((resolve,reject) => {
      let fileBuffers:Buffer[] = [];
      for(const file of inputImgFiles) {
        const fileBuffer = Buffer.from(file,'base64');
        if(fileBuffer.byteLength>250000) reject({msgCode:'limitSizeReached'});  
        else fileBuffers.push(fileBuffer);
      }

      let imgLinks:string[] = [];

      const storage = this.getStorage();
      const bucket = storage.bucket();

      for(const fileBuffer of fileBuffers) {
        const fileName= crypto.randomUUID()+'.jpg';
        const blob = bucket.file(fileName);
        const blobStream = blob.createWriteStream();
        blobStream.on('error', (err) => {
          // Handle upload error
          reject(new Error("Upload failed"));  
            });

        blobStream.on('finish', async () => {
          const url = await blob.makePublic();
          // Return the download URL or other response
          imgLinks.push(blob.publicUrl());
          if(imgLinks.length==fileBuffers.length) {
            resolve(imgLinks);  
          }
        });
        blobStream.end(fileBuffer);
      }
    })
  }
}