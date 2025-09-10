/* eslint-disable sonarjs/no-duplicate-string */
import { extendApi } from '@anatine/zod-openapi';
import { UserBetReportKeysMapper } from '@modules/admin/exports/bet-export';
import { DepositsReportKeysMapper } from '@modules/admin/exports/deposit-export';
import { WithdrawalsReportKeysMapper } from '@modules/admin/exports/withdrawal-export';
import { z } from 'zod';

export const UserBetReportKeys = z
  .enum(Object.keys(UserBetReportKeysMapper) as [string, ...string[]])
  .describe(
    'Columns to export. Possible values: ' +
      Object.keys(UserBetReportKeysMapper).join(', '),
  );

export const BetReportSelectColumnsSchema = extendApi(
  z.object({
    fileType: z.enum(['csv', 'pdf']),
    columns: extendApi(
      z
        .union([
          z.string().transform((str, ctx) => {
            if (!str) {
              return undefined;
            }
            try {
              const values = JSON.parse(str);
              if (!Array.isArray(values)) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: 'Invalid Array',
                });
                return z.NEVER;
              }
              return values;
            } catch (e) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Invalid value',
              });
              return z.NEVER;
            }
          }),
          z.array(UserBetReportKeys).optional(),
        ])
        .pipe(z.array(UserBetReportKeys).optional()),
    ),
  }),
);

export const WithdrawalsReportKeys = z
  .enum(Object.keys(WithdrawalsReportKeysMapper) as [string, ...string[]])
  .describe(
    'Columns to export. Possible values: ' +
      Object.keys(WithdrawalsReportKeysMapper).join(', '),
  );

export const WithdrawalsReportSelectColumnsSchema = extendApi(
  z.object({
    fileType: z.enum(['csv', 'pdf']),
    columns: extendApi(
      z
        .union([
          z.string().transform((str, ctx) => {
            if (!str) {
              return undefined;
            }
            try {
              const values = JSON.parse(str);
              if (!Array.isArray(values)) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: 'Invalid Array',
                });
                return z.NEVER;
              }
              return values;
            } catch (e) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Invalid value',
              });
              return z.NEVER;
            }
          }),
          z.array(WithdrawalsReportKeys).optional(),
        ])
        .pipe(z.array(WithdrawalsReportKeys).optional()),
    ),
  }),
);

export const DepositsReportKeys = z
  .enum(Object.keys(DepositsReportKeysMapper) as [string, ...string[]])
  .describe(
    'Columns to export. Possible values: ' +
      Object.keys(DepositsReportKeysMapper).join(', '),
  );

export const DepositsReportSelectColumnsSchema = extendApi(
  z.object({
    fileType: z.enum(['csv', 'pdf']),
    columns: extendApi(z.array(DepositsReportKeys).optional()),
  }),
);
