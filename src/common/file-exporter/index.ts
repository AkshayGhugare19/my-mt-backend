import { FileExporterService } from '@common/file-exporter/exporter';
import { CsvStrategy } from '@common/file-exporter/strategy/csv.strategy';
import { PdfStrategy } from '@common/file-exporter/strategy/pdf.strategy';
import { Module } from '@nestjs/common';

export * from './types';

@Module({
  providers: [FileExporterService, CsvStrategy, PdfStrategy],
  exports: [FileExporterService],
})
export class FileExporterModule {}
