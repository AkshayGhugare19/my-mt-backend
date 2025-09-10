import { CsvStrategy } from '@common/file-exporter/strategy/csv.strategy';
import { PdfStrategy } from '@common/file-exporter/strategy/pdf.strategy';
import { ColumnMapperType, PageableMethod } from '@common/file-exporter/types';
import { Injectable, StreamableFile } from '@nestjs/common';

@Injectable()
export class FileExporterService {
  constructor(
    private readonly csvStrategy: CsvStrategy,
    private readonly pdfStrategy: PdfStrategy,
  ) {}

  async export<T extends Record<string, string>>(
    method: PageableMethod<T>,
    options: {
      fileType: 'csv' | 'pdf';
      columnMapper: ColumnMapperType;
      filename?: string;
      startPage?: number;
      endPage?: number;
      itemsPerPage?: number;
      // max number of iterations to prevent infinite loops defaults to 1000
      maxIterations?: number;
    },
  ): Promise<StreamableFile | null> {
    const { fileType, filename, columnMapper, itemsPerPage, maxIterations } =
      options;

    if (fileType === 'csv') {
      return this.csvStrategy.export(method, columnMapper, {
        ...options,
        filename: filename ?? 'export',
        maxIterations: maxIterations ?? 1000,
        itemsPerPage: itemsPerPage ?? 1000,
      });
    }

    if (fileType === 'pdf') {
      return this.pdfStrategy.export(method, columnMapper, {
        ...options,
        filename: filename ?? 'export',
        maxIterations: maxIterations ?? 1000,
        itemsPerPage: itemsPerPage ?? 1000,
      });
    }

    throw new Error('File type not supported');
  }
}
