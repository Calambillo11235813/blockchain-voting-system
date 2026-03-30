import { User } from 'src/auth/entities/user.entity';
import { FindOptionsWhere, FindOptionsSelect, FindOptionsOrder, FindOptionsRelations } from "typeorm";

export interface IOptionUser {
    skip?: number,
    take?: number,
    where?: FindOptionsWhere<User[]>,
    select?: FindOptionsSelect<User>,
    order?: FindOptionsOrder<User>,
    relations?: FindOptionsRelations<User>
}