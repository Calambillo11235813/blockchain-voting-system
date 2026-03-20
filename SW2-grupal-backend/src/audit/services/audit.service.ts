import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { ActionType, AuditLog } from '../entities/audit.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) { }

  async logAction(
    action: ActionType,
    entity: string,
    entityId: string | null,
    userId: string,
    tenantId: string | null,
    oldValues: Record<string, any> | null,
    newValues: Record<string, any> | null,
    request?: Request,
  ): Promise<void> {
    const log = this.auditLogRepository.create({
      action,
      entity,
      entity_id: entityId,
      user_id: userId,
      tenant_id: tenantId,
      old_values: oldValues,
      new_values: newValues,
      ip_address: request?.ip,
      user_agent: request?.headers['user-agent'],
    });

    await this.auditLogRepository.save(log);
  }
}