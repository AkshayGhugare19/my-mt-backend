import { CellDef } from 'jspdf-autotable';

export type FileExport = {
  id: string;
  name: string;
};

export type PageableMethod<T extends Record<string, string>> = (
  page: number,
  limit: number,
) => Promise<T[] | null>;

export type ColumnMapperType = Record<
  string,
  {
    name: string;
    cellDef?: CellDef & { valueFormatter?: (value: any) => string };
  }
>;

export type FileExportOptions = {
  startPage?: number;
  endPage?: number;
  itemsPerPage: number;
  // max number of iterations to prevent infinite loops defaults to 1000
  maxIterations: number;
  filename: string;
};
