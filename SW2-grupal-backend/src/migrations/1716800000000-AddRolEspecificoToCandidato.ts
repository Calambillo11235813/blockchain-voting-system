import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRolEspecificoToCandidato1716800000000 implements MigrationInterface {
  name = 'AddRolEspecificoToCandidato1716800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "candidato" ADD "rolEspecifico" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "candidato" DROP COLUMN "rolEspecifico"`);
  }
}
