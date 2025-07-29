import { DashUser } from 'src/auth/extentions';
import { BaseService } from './base.service';

export class BaseController {
  constructor(private readonly baseService: BaseService) {}

  public mapResult(result: any = {}) {
    if (result.meta) {
      return {
        meta: result.meta,
        items: result.data,
      };
    } else {
      return result;
    }
  }

  public async actionWithActivityLog({
    entityId,
    merchantId,
    action,
    fields,
    user,
    entity,
    payload,
    updateFn,
    finallyFn,
    fillEntityId,
    isSettings,
  }: {
    entityId?: string;
    merchantId?: string;
    udid?: string;
    action: string;
    fields: string[];
    user: DashUser;
    entity?: any;
    payload: any;
    updateFn: Function;
    finallyFn?: Function;
    fillEntityId?: boolean;
    isSettings?: boolean;
  }) {
    let result = '';
    const isModerator = this.baseService.isModerator(user);

    entity = entity || (await this.baseService.getEntity(payload));

    const originalId = payload?.id;

    if (!originalId || isModerator) {
      result = await updateFn(payload);
      if (!isSettings) {
        if (fillEntityId) {
          entityId = result;
        } else if (!merchantId) {
          merchantId = result;
        }
      }
    }

    if (finallyFn) {
      await finallyFn(entity, payload);
    }

    return result;
  }
}
