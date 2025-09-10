import { ColumnMapperType, FileExportOptions, PageableMethod } from '@common/file-exporter/types';
import { Injectable, StreamableFile } from '@nestjs/common';
import { format } from 'fast-csv';

@Injectable()
export class CsvStrategy {
  constructor() {}

  async export<T extends Record<string, string>>(
    method: PageableMethod<T>,
    columnMapper: ColumnMapperType,
    options: FileExportOptions = {
      maxIterations: 1000,
      itemsPerPage: 1000,
      filename: 'export',
    },
  ): Promise<StreamableFile | null> {
    const { startPage, endPage, itemsPerPage, maxIterations, filename } =
      options;

    const csvStream = format({ headers: true, delimiter: ';', alwaysWriteHeaders: true });
    let isEmpty = true;
    let currentPage = startPage ?? 1;
    try {
      while (currentPage <= (endPage ?? maxIterations)) {
        const file = await method(currentPage, itemsPerPage);
        if (!file || file.length === 0) {
          break;
        }
        isEmpty = false;
        file.forEach((item) => {
          const parsed = new Map<string, string>()
          for (const [key, value] of Object.entries(item)) {
            parsed.set(columnMapper[key]?.name ?? key, value.toString());
          }

          csvStream.write(Object.fromEntries(parsed.entries()));
        });
        currentPage++;
      }

      if (isEmpty) {
        csvStream.destroy();
        return null;
      }

      csvStream.end();
    } catch (error) {
      csvStream.destroy(error);
    }

    return new StreamableFile(csvStream, {
      type: 'text/csv',
      disposition: `attachment; filename="${filename}.csv"`,
    });
  }
}
