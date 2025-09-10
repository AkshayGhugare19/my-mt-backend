import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const GeneratePresignedUrlSchema = z.object({
  fileName: z.string().regex(/^[^/]+$/),
  mimetype: z.string().regex(/^image\/(png|jpeg|jpg|webp)$/),
  size: z
    .number()
    .min(1)
    .max(1024 * 1024 * 3),
  checksum: z.string(),
});

export type GeneratePresignedUrl = z.infer<typeof GeneratePresignedUrlSchema>;

export class GeneratePresignedUrlDto extends createZodDto(
  GeneratePresignedUrlSchema,
) {
  constructor(data: GeneratePresignedUrl) {
    super();
    Object.assign(this, data);
  }
}
