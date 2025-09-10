import { RequestSnapshotInterceptor } from '@common/interceptors/request-snapshot.interceptor';
import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';

export function SnapshotRequests(key: string): any {
  if (process.env.ENABLE_REQUEST_SNAPSHOT !== 'true') {
    return applyDecorators();
  }
  return applyDecorators(
    SetMetadata('snapshot-requests-key', key),
    UseInterceptors(RequestSnapshotInterceptor),
  );
}
