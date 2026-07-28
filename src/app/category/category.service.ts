import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CategoryDao } from './category.dao';
import { CategoryDto } from './category.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import { PaginationDto, SearchDto } from 'src/common/decorator/pagination.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly dao: CategoryDao) {}

  private async assertValidParent(
    id: string | null,
    parent_id?: string | null,
  ) {
    if (!parent_id) return;
    if (id && parent_id === id) {
      throw new HttpException(
        'Өөрийгөө эцэг ангилал болгож болохгүй',
        HttpStatus.BAD_REQUEST,
      );
    }
    const parent = await this.dao.getById(parent_id);
    if (!parent) {
      throw new HttpException(
        'Эцэг ангилал олдсонгүй',
        HttpStatus.BAD_REQUEST,
      );
    }
    // 2 түвшний хязгаар: эцэг өөрөө хүүхэд байж болохгүй
    if (parent.parent_id) {
      throw new HttpException(
        'Зөвхөн дээд түвшний ангилалыг эцэг болгож болно',
        HttpStatus.BAD_REQUEST,
      );
    }
    // 2 түвшний хязгаар: энэ ангилал өөрөө хүүхэдтэй бол child болж чадахгүй
    if (id) {
      const has = await this.dao.hasChildren(id);
      if (has) {
        throw new HttpException(
          'Хүүхэдтэй ангилалыг өөр ангилалын дор хийх боломжгүй',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  public async create(dto: CategoryDto, merchant: string) {
    await this.assertValidParent(null, dto.parent_id ?? null);
    await this.dao.add({
      id: AppUtils.uuid4(),
      name: dto.name,
      merchant_id: merchant,
      parent_id: dto.parent_id ?? null,
    });
  }

  public async getById(id: string) {
    return await this.dao.getById(id);
  }

  public async findAll(pg: PaginationDto, role: number) {
    const { status, ...rest } = pg as any;
    return await this.dao.list(rest);
  }
  public async search(filter: SearchDto, merchant: string) {
    return await this.dao.search({
      ...filter,
      merchant,
    });
  }

  public async update(id: string, dto: CategoryDto) {
    const hasParentKey = Object.prototype.hasOwnProperty.call(dto, 'parent_id');
    const nextParent = hasParentKey ? (dto.parent_id ?? null) : undefined;
    if (hasParentKey) {
      await this.assertValidParent(id, nextParent);
    }
    const payload: Record<string, any> = { id };
    const attrs: string[] = [];
    if (dto.name !== undefined && dto.name !== null) {
      payload.name = dto.name;
      attrs.push('name');
    }
    if (hasParentKey) {
      payload.parent_id = nextParent;
      attrs.push('parent_id');
    }
    return await this.dao.update(payload, attrs);
  }

  public async remove(id: string) {
    return await this.dao.deleteById(id);
  }
}
