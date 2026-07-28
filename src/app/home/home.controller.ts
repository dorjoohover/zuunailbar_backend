import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { HomeService } from './home.service';
import { FeatureDto, FeaturesDto, HomeDto, HomesDto } from './home.dto';
import { ApiParam } from '@nestjs/swagger';
import { SAP } from 'src/common/decorator/use-param.decorator';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';

@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Post('home')
  createHome(@Body() dto: HomeDto) {
    return this.homeService.create(dto);
  }
  @Post('feature')
  createFeature(@Body() dto: FeatureDto) {
    return this.homeService.createFeature(dto);
  }
  @Public()
  @Get('web/:route')
  @ApiParam({ name: 'route' })
  findAll(@Param('route') route: string) {
    if (route == 'home')
      return this.homeService.findAll({ limit: -1, skip: 0, sort: true });
    if (route == 'feature')
      return this.homeService.findFeature({ limit: -1, skip: 0, sort: false });
  }

  @Patch('home/:id')
  update(@Param('id') id: string, @Body() dto: HomeDto) {
    return this.homeService.update(id, dto);
  }
  @Patch('feature/:id')
  updateFeature(@Param('id') id: string, @Body() dto: FeatureDto) {
    return this.homeService.updateFeature(id, dto);
  }

  @Delete('/:route/:id')
  @SAP(['route', 'id'])
  remove(@Param('id') id: string, @Param('route') route: string) {
    if (route == 'home') return this.homeService.remove(id);
    if (route == 'feature') return this.homeService.removeFeature(id);
  }
}
