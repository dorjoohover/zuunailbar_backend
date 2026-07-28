import {
  Injectable,
  StreamableFile,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { createReadStream, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import * as mime from 'mime-types';
import { PassThrough } from 'stream';

@Injectable()
export class FileService {
  private readonly localPath = './uploads';

  constructor() {}

  async upload(key: string, ct: string, body) {
    try {
      // Optional: Save locally
      const localFilePath = join(this.localPath, key);
      writeFileSync(localFilePath, body);

      // Add public S3 URL
      const fileUrl = `${key}`;
      return fileUrl;
    } catch (error) {
      console.log(error);
    }
  }
  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: any[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
  async processMultipleImages(
    files: Express.Multer.File[],
    pt?: PassThrough,
    key?: string,
    ct?: string,
  ): Promise<string[]> {
    try {
      const results: string[] = [];
      if (files.length == 0) {
        const buffer = await this.streamToBuffer(pt);
        const res = await this.upload(key, ct, buffer);
        results.push(res);
      }
      for (const file of files) {
        const key = `${Date.now()}_${file.originalname}`;
        const fileUrl = await this.upload(key, file.mimetype, file.buffer);

        results.push(fileUrl);
      }
      return results;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  async getFile(filename: string): Promise<StreamableFile> {
    try {
      const filePath = join(this.localPath, filename);

      if (!existsSync(filePath)) {
        throw new NotFoundException('File not found in S3');
      }

      const stream = createReadStream(filePath);
      const mimeType = mime.lookup(filename) || 'application/octet-stream';

      return new StreamableFile(stream, {
        type: mimeType,
        disposition: `inline; filename="${filename}"`,
      });
    } catch (error) {
      throw error;
    }
  }
}
