// src/logs/system-logger.service.ts
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';

@Injectable()
export class SystemLogger implements OnModuleDestroy {
  private dir = path.resolve(process.cwd(), '../logs/system');
  private stream: fs.WriteStream | null = null;
  private day = '';

  private today(): string {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  }

  private async ensureStream() {
    const d = this.today();

    // Хэрвээ өнөөдрийн файл ажиллаж байвал шууд буцаана
    if (this.stream && this.day === d) return;

    // Logs directory үүсгэх
    await fsp.mkdir(this.dir, { recursive: true });

    // Хуучин stream-ээ хаах
    if (this.stream) this.stream.end();

    // Шинэ файл нээх
    const filename = path.join(this.dir, `requests-${d}.jsonl`);
    this.stream = fs.createWriteStream(filename, { flags: 'a' });
    this.day = d;
  }

  async log(data: any): Promise<void> {
    await this.ensureStream();
    const line = JSON.stringify(data) + '\n';

    await new Promise<void>((resolve, reject) => {
      const ok = this.stream!.write(line, (err) =>
        err ? reject(err) : resolve(),
      );
      if (!ok) this.stream!.once('drain', resolve);
    });
  }

  onModuleDestroy() {
    if (this.stream) this.stream.end();
  }
}
