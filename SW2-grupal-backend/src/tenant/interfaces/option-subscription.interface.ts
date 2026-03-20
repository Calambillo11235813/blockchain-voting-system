import { FindOptionsOrder, FindOptionsRelations, FindOptionsSelect, FindOptionsWhere } from 'typeorm';
import { Subscription } from '../entities/subscription.entity';

export interface IOptionSubscription {
    skip?: number,
    take?: number,
    where?: FindOptionsWhere<Subscription[]>,
    select?: FindOptionsSelect<Subscription>,
    order?: FindOptionsOrder<Subscription>,
    relations?: FindOptionsRelations<Subscription>
}