import {
  DeleteObjectCommand,
  DeleteObjectCommandInput,
  DeleteObjectCommandOutput,
  GetObjectCommand,
  GetObjectCommandInput,
  GetObjectCommandOutput,
  ListObjectsCommand,
  ListObjectsCommandInput,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { ENV } from '@common/env';
import { Injectable, Logger, StreamableFile } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ONE_DAY_IN_SECONDS, ONE_MINUTE_IN_SECONDS } from '@common/constants';

@Injectable()
export class BucketService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly cdnEndpoint: string;

  constructor(private readonly config: ConfigService) {
    this.bucketName = config.getOrThrow<string>(ENV.SPACE_BUCKET_NAME);
    this.cdnEndpoint = config.getOrThrow<string>(ENV.SPACES_CDN_ENDPOINT);
    this.s3Client = new S3Client({
      forcePathStyle: config.getOrThrow<boolean>(ENV.SPACES_FORCE_PATH_STYLE),
      endpoint: config.getOrThrow<string>(ENV.SPACES_ENDPOINT),
      region: config.getOrThrow<string>(ENV.SPACES_REGION),
      credentials: {
        accessKeyId: config.getOrThrow<string>(ENV.SPACES_KEY_ID),
        secretAccessKey: config.getOrThrow<string>(ENV.SPACES_ACCESS_KEY),
      },
    });
  }

  private async getFile(
    filePath: string,
    options?: Omit<GetObjectCommandInput, 'Bucket' | 'Key'>,
  ): Promise<GetObjectCommandOutput | null> {
    if (!filePath) return null;

    const getCommand = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: filePath,
      ...options,
    });

    try {
      return this.s3Client.send(getCommand);
    } catch (error) {
      Logger.warn(error, 'FileService: getFile');
      throw error;
    }
  }

  async getPresignedUrl(filePath: string): Promise<string> {
    const getCommand = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: filePath,
    });

    return getSignedUrl(this.s3Client as any, getCommand as any, {
      expiresIn: ONE_DAY_IN_SECONDS,
    });
  }

  async uploadWithPresignedUrl(
    filePath: string,
    checksum: string,
    contentType: string,
    contentLength: number,
    options?: Omit<
      PutObjectCommandInput,
      'Bucket' | 'Key' | 'Body' | 'ContentMD5' | 'ContentType' | 'ContentLength'
    >,
  ): Promise<string> {
    const putCommand = new PutObjectCommand({
      Bucket: this.bucketName,
      ContentType: contentType,
      ContentLength: contentLength,
      Key: filePath,
      ChecksumSHA256: checksum + '123',
      ChecksumAlgorithm: 'SHA256',
      ...options,
    });

    return getSignedUrl(this.s3Client, putCommand, {
      expiresIn: 10 * ONE_MINUTE_IN_SECONDS,
      signableHeaders: new Set([
        'content-type',
        'content-length',
        'if-none-match',
        'x-amz-checksum-sha256',
      ]),
    });
  }

  async uploadToPath(
    path: string,
    body: Buffer,
    options?: Omit<PutObjectCommandInput, 'Bucket' | 'Key' | 'Body'>,
  ): Promise<string> {
    try {
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: path,
          Body: body,
          ...options,
        },
      });

      await upload.done();

      return `${this.cdnEndpoint}/${path}`;
    } catch (error) {
      Logger.warn(error, 'FileService: uploadFile');
      throw error;
    }
  }

  async uploadFile(
    resource: string,
    body: StreamableFile,
    options?: Omit<PutObjectCommandInput, 'Bucket' | 'Key' | 'Body'>,
  ): Promise<string> {
    const headers = body.getHeaders();
    const filename = headers.disposition
      .split('filename=')[1]
      .replace(/"/g, '');
    const fullPath = `${resource}/${Math.random().toString(36).substring(2, 15)}_${filename}`;

    try {
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: fullPath,
          Body: body.getStream(),
          ...options,
        },
      });

      await upload.done();

      return `${this.cdnEndpoint}/${fullPath}`;
    } catch (error) {
      Logger.warn(error, 'FileService: uploadFile');
      throw error;
    }
  }

  async deleteFile(
    filePath: string,
    options?: Omit<DeleteObjectCommandInput, 'Bucket' | 'Key' | 'Body'>,
  ): Promise<DeleteObjectCommandOutput> {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: filePath,
      ...options,
    });
    try {
      return await this.s3Client.send(deleteCommand);
    } catch (error) {
      Logger.warn(error, 'FileService: deleteFile');
      throw error;
    }
  }

  async listFiles(
    prefix: string,
    options?: Omit<ListObjectsCommandInput, 'Bucket' | 'Prefix'>,
  ): Promise<string[]> {
    const listCommand = new ListObjectsCommand({
      Bucket: this.bucketName,
      Prefix: prefix,
      ...options,
    });

    try {
      const response = await this.s3Client.send(listCommand);
      return (response.Contents || [])
        .map((object) => object.Key)
        .filter((key) => key !== undefined);
    } catch (error) {
      Logger.warn(error, 'FileService: listFiles');
      throw error;
    }
  }
}
