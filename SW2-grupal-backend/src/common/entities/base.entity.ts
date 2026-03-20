import { toBoliviaTime } from 'src/common/utils/transform-time.util';
import { CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, BaseEntity } from 'typeorm';

export abstract class CustomBaseEntity extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @CreateDateColumn({
        type: 'timestamp',
        transformer: {
            to: () => toBoliviaTime(new Date()),
            from: (date) => date
        }
    })
    created_at: Date;

    @UpdateDateColumn({
        type: 'timestamp',
        transformer: {
            to: () => toBoliviaTime(new Date()),
            from: (date) => date
        }
    })
    updated_at: Date;
}