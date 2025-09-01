import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { firebaseConfiguration } from 'src/config/firebase';

@Injectable()
export class FirebaseService {
  constructor() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(
          firebaseConfiguration as admin.ServiceAccount,
        ),
      });
    }
  }

  async sendPushNotification(token: string, title: string, body: string) {
    const message = {
      token,
      notification: {
        title: 'Сайн байна уу!',
        body: 'Push мэдэгдэл амжилттай илгээгдлээ!',
      },
      webpush: {
        notification: {
          icon: 'https://scontent.fuln1-2.fna.fbcdn.net/v/t39.30808-6/329249612_915317212947321_5128254729477973543_n.jpg?_nc_cat=100&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=zmO-666qg_oQ7kNvwFdQQwn&_nc_oc=AdmZ4_6RL6DtUkJyD5tossk9BFCvuvg2D8FT_MOIqMLCOkGJOeQsu8LGH-t743-koxnuutEifdcqjVvHuFfBEcGf&_nc_zt=23&_nc_ht=scontent.fuln1-2.fna&_nc_gid=E_PVHPsZtLviruvLXLVBFg&oh=00_AfRupFFP35Dni7nd5N7WIhYeRHRUdLaQwXSZhYFsUhOdsw&oe=6892A9F0', // optional
        },
      },
    };

    try {
      const response = await admin.messaging().send(message);
      return response;
    } catch (error) {
      console.error('Push error:', error);
      throw error;
    }
  }
}
