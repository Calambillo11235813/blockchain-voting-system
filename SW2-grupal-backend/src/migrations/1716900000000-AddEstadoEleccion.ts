import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEstadoEleccion1716900000000 implements MigrationInterface {
  name = 'AddEstadoEleccion1716900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "eleccion"
      ADD "estado" text NOT NULL DEFAULT 'EN_CONFIGURACION'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "eleccion" DROP COLUMN "estado"`);
  }
}
