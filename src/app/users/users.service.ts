import { Injectable } from '@nestjs/common';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/schema/user.schema';
import { Model } from 'mongoose';
import { Meta } from 'src/base/base.interface';
import { PgArgs } from 'src/common/pagination.input';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly model: Model<UserDocument>,
  ) {}
  public async create(dto: CreateUserInput) {
    const res = (await this.model.create(dto)).toObject();
    return {
      id: res._id.toString(),
      name: res.name,
      username: res.username,
      password: res.password,
    };
  }

  public async findAll() {
    return await this.model.find().lean().exec();
  }

  public async findOne(username: string) {
    return await this.model.findOne({ username }).lean().exec();
  }
  public async find(pg: PgArgs): Promise<Meta> {
    try {
      const { page, limit, sort } = pg;
      const skip = (page - 1) * limit;
      const [items, total] = await Promise.all([
        this.model
          .find()
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: sort ? 1 : -1 })
          .lean(),
        this.model.countDocuments(),
      ]);

      return {
        items,
        total,
        count: Math.ceil(total / limit),
        page,
        limit,
      };
    } catch (error) {
      // this.logger.error(error);
      throw error;
    }
  }
  update(id: number, updateUserInput: UpdateUserInput) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
