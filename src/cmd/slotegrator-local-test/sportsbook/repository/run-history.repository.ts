import { Injectable } from '@nestjs/common';
import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';

@Injectable()
export class RunHistoryRepository {
  private readonly fileName =
    '.local_data/slotegrator-sportsbook-test-data.json';

  async getFileData(): Promise<Record<string, any>> {
    if (!existsSync(this.fileName)) {
      await writeFile(this.fileName, '{}');
    }

    return JSON.parse(await readFile(this.fileName, 'utf-8'));
  }

  async saveFileData(data: Record<string, any>): Promise<void> {
    await writeFile(this.fileName, JSON.stringify(data));
  }

  async getBetByTransactionId(betTransactionId: string): Promise<any> {
    const data = await this.getFileData();
    return data[betTransactionId];
  }

  async findLastCommandByRunId(runId: string): Promise<any> {
    const data = await this.getFileData();
    const keys = Object.keys(data);
    for (let i = keys.length - 1; i >= 0; i--) {
      if (data[keys[i]].runId === runId) {
        return data[keys[i]];
      }
    }
    return null;
  }

  async getLastOpenBetTransactionId(): Promise<string | null> {
    const data = await this.getFileData();

    const openBets = data.openBets ?? [];

    const lastBet = openBets[openBets.length - 1];

    if (!lastBet) {
      return null;
    }

    const keys = Object.keys(data);

    for (let i = keys.length - 1; i >= 0; i--) {
      if (data[keys[i]].bet && data[keys[i]].runId === lastBet) {
        return keys[i];
      }
    }

    return null;
  }
}
