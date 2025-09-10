import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { CountryProvidersBlacklist } from '@prisma/client';
import { CreateCountryProvidersBlacklistDto } from '../dto/create-country-providers-blacklist.dto';
import { UpdateCountryProvidersBlacklistDto } from '../dto/update-country-providers-blacklist.dto';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { CountryConfigAlreadyExistsError } from '@modules/country-providers/error/country-config-already-exists.error';
import { NotFoundError } from '@common/error/not-found.error';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ENV } from '@common/env';

@Injectable()
export class CountryProvidersBlacklistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async findAll(): Promise<CountryProvidersBlacklist[]> {
    return this.prisma.countryProvidersBlacklist.findMany();
  }

  async create(data: CreateCountryProvidersBlacklistDto): Promise<CountryProvidersBlacklist> {
    const existingCountry = await this.prisma.countryProvidersBlacklist.findUnique({
      where: { country: data.country },
    });
    if (existingCountry) {
      throw new CountryConfigAlreadyExistsError(ErrorMessages.COUNTRY_ALREADY_EXISTS);
    }
    const savedData = await this.prisma.countryProvidersBlacklist.create({ data });
    await this.notifyChange();
    return savedData;
  }

  async update(id: number, data: UpdateCountryProvidersBlacklistDto): Promise<CountryProvidersBlacklist> {
    const existingCountry = await this.prisma.countryProvidersBlacklist.findUnique({ where: { id } });
    if (!existingCountry) {
      throw new NotFoundError(ErrorMessages.NOT_FOUND, 'CountryProvidersBlacklist', id.toString());
    }
    const savedData = await this.prisma.countryProvidersBlacklist.update({ where: { id }, data });
    await this.notifyChange();
    return savedData;
  }

  async notifyChange(): Promise<void> {
    const url = `${this.configService.getOrThrow(ENV.WEB_APP_BASE_URL)}/api/games/cache`;
    const basicAuth = this.configService.get(ENV.CLIENT_BASIC_AUTH);
    await this.httpService.axiosRef.delete(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: basicAuth ? `Basic ${basicAuth}` : undefined,
        'x-api-key': this.configService.getOrThrow(ENV.SYNC_TOKEN),
      },
    });
  }
}
