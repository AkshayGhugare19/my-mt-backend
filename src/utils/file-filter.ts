import { ValidationErrorMessages } from '@common/enums/validation-error-messages.enum';
import { BadRequestException } from '@nestjs/common';

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export function fileFilter(
  filter?: string | string[],
): (req: Request, file: Express.Multer.File, callback: any) => void {
  return (req: Request, file: Express.Multer.File, callback: any): void => {
    const array = Array.isArray(filter) ? filter : [filter];
    const mimeType = file.mimetype;

    if (!array.includes(mimeType)) {
      return callback(
        new BadRequestException(ValidationErrorMessages.INVALID_FILE_FORMAT),
        false,
      );
    }
    return callback(null, true);
  };
}
