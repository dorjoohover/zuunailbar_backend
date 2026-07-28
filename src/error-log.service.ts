import { Injectable, OnModuleDestroy } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as fsp from 'fs/promises';

@Injectable()
export class FileErrorLogService implements OnModuleDestroy {
  private dir = path.resolve(__dirname, '../logs/error');
  private stream: fs.WriteStream | null = null;
  private day = '';

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private async ensureStream() {
    const d = this.today();
    if (this.stream && this.day === d) return;

    await fsp.mkdir(this.dir, { recursive: true });

    if (this.stream) this.stream.end();

    const filename = path.join(this.dir, `errors-${d}.jsonl`);
    this.stream = fs.createWriteStream(filename, { flags: 'a' });
    this.day = d;
  }

  async log(entry: any): Promise<void> {
    await this.ensureStream();

    return new Promise((resolve, reject) => {
      const line = JSON.stringify(entry) + '\n';

      const ok = this.stream!.write(line);
      if (ok) return resolve();

      this.stream!.once('drain', resolve);
    });
  }

  onModuleDestroy() {
    if (this.stream) this.stream.end();
  }
}
