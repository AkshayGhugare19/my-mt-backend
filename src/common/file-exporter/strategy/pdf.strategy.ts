import { ColumnMapperType, FileExportOptions, PageableMethod } from '@common/file-exporter/types';
import { Injectable, Logger, StreamableFile } from '@nestjs/common';
import jsPDF from 'jspdf';
import autoTable, { CellDef } from 'jspdf-autotable';

@Injectable()
export class PdfStrategy {
  private createPdfDocument(): jsPDF {
    // eslint-disable-next-line new-cap
    return new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [297, 210], // A4 landscape
    });
  }

  private extractHeaders(columnMapper: ColumnMapperType): Record<string, string> {
    return Object.entries(columnMapper).reduce(
      (acc, [key, value]) => {
        acc[key] = value.name;
        return acc;
      },
      {} as Record<string, string>,
    );
  }

  private transformRowData(
    item: Record<string, string>,
    columnMapper: ColumnMapperType,
  ): Record<string, CellDef | string> {
    return Object.entries(item).reduce(
      (acc, [key, value]) => {
        if (columnMapper[key]?.cellDef) {
          const { cellDef } = columnMapper[key];
          acc[key] = {
            ...cellDef,
            content: this.formatCellValue(value, cellDef.valueFormatter),
          };
        } else {
          acc[key] = value?.toString() ?? '';
        }
        return acc;
      },
      {} as Record<string, CellDef | string>,
    );
  }

  private formatCellValue(value: any, formatter?: (value: any) => string): string {
    return formatter ? formatter(value) : value?.toString() ?? '';
  }

  private async fetchAllData<T extends Record<string, string>>(
    method: PageableMethod<T>,
    columnMapper: ColumnMapperType,
    options: FileExportOptions,
  ): Promise<{ [key: string]: CellDef | string }[]> {
    const { startPage, endPage, itemsPerPage, maxIterations } = options;
    const rows: { [key: string]: CellDef | string }[] = [];
    let currentPage = startPage ?? 1;

    try {
      while (currentPage <= (endPage ?? maxIterations)) {
        const file = await method(currentPage, itemsPerPage);
        if (!file?.length) break;

        file.forEach((item) => {
          const row = this.transformRowData(item, columnMapper);
          rows.push(row);
        });

        currentPage++;
      }
      return rows;
    } catch (error) {
      Logger.error(error);
      throw error;
    }
  }

  private generatePdfTable(
    doc: jsPDF,
    headers: Record<string, string>,
    rows: { [key: string]: CellDef | string }[],
  ): void {
    autoTable(doc, {
      head: [headers],
      body: rows,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [66, 66, 66],
        textColor: 255,
        fontStyle: 'bold',
      },
    });
  }

  async export<T extends Record<string, string>>(
    method: PageableMethod<T>,
    columnMapper: ColumnMapperType,
    options: FileExportOptions = {
      maxIterations: 1000,
      itemsPerPage: 1000,
      filename: 'export',
    },
  ): Promise<StreamableFile | null> {
    const rows = await this.fetchAllData(method, columnMapper, options);
    if (rows.length === 0) return null;

    const doc = this.createPdfDocument();
    const headers = this.extractHeaders(columnMapper);

    this.generatePdfTable(doc, headers, rows);

    return new StreamableFile(Buffer.from(doc.output('arraybuffer')), {
      type: 'application/pdf',
      disposition: `attachment; filename="${options.filename}.pdf"`,
    });
  }
}
