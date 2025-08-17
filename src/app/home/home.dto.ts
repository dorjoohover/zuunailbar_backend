import { ApiProperty } from '@nestjs/swagger';

export class HomeDto {
  @ApiProperty()
  image: string;
  @ApiProperty()
  artist_name: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  index: number;
}

export class HomesDto {
  @ApiProperty({ isArray: true })
  items: HomeDto[];
}

export class FeatureDto {
  @ApiProperty()
  icon: number;
  @ApiProperty()
  title: string;
  @ApiProperty()
  description: string;
}

export class FeaturesDto {
  @ApiProperty({ isArray: true })
  items: FeatureDto[];
}
