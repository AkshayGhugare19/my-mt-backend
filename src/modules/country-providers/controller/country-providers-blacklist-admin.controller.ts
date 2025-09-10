import { Body, Controller, Get, Post, Put, Param, ParseIntPipe } from '@nestjs/common';
import { CountryProvidersBlacklistService } from '@modules/country-providers/service/country-providers-blacklist.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { anyOf, RequirePermissions } from '@modules/permission/decorator/require-permissions.decorator';
import { Permissions } from '@modules/permission/enum/permission.enum';
import { CountryProvidersBlacklistDto } from '@modules/country-providers/dto/country-providers-blacklist.dto';
import { CreateCountryProvidersBlacklistDto } from '@modules/country-providers/dto/create-country-providers-blacklist.dto';
import { UpdateCountryProvidersBlacklistDto } from '@modules/country-providers/dto/update-country-providers-blacklist.dto';

@Controller('admin/country-providers-blacklist')
@ApiTags('Admin Country Providers Blacklist')
export class CountryProvidersBlacklistAdminController {
  constructor(private readonly countryProvidersService: CountryProvidersBlacklistService) {}

  @Get()
  @ApiOperation({ summary: 'Get all country providers' })
  @RequirePermissions('admin', anyOf(Permissions.EDIT_GAMES))
  async findAll(): Promise<CountryProvidersBlacklistDto[]> {
    const countryProviders = await this.countryProvidersService.findAll();
    return countryProviders.map((countryProvider) => CountryProvidersBlacklistDto.from(countryProvider));
  }

  @Post()
  @RequirePermissions('admin', anyOf(Permissions.EDIT_GAMES))
  async create(@Body() body: CreateCountryProvidersBlacklistDto): Promise<CountryProvidersBlacklistDto> {
    const countryProvider = await this.countryProvidersService.create(body);
    return CountryProvidersBlacklistDto.from(countryProvider);
  }

  @Put(':id')
  @RequirePermissions('admin', anyOf(Permissions.EDIT_GAMES))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCountryProvidersBlacklistDto,
  ): Promise<CountryProvidersBlacklistDto> {
    const countryProvider = await this.countryProvidersService.update(id, body);
    return CountryProvidersBlacklistDto.from(countryProvider);
  }
}
