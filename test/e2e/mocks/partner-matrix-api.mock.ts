import { CreateTransactionBody } from '@external/partner-matrix/bodies';
import { Injectable } from '@nestjs/common';
import { vi } from 'vitest';

@Injectable()
export class PartnerMatrixApiMock {
  registerNewPlayer = vi.fn()

  getPlayerData = vi.fn()

  createTransaction = vi.fn()

  updateTransaction = vi.fn()

  createTransactionBulk = vi.fn().mockImplementation((tx: CreateTransactionBody[]) => {
    return {
      failed: {},
      success: [],
    }
  })

  updateTransactionBulk = vi.fn()
}
