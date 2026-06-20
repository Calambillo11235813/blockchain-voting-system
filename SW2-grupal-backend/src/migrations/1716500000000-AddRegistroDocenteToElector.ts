import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRegistroDocenteToElector1716500000000 implements MigrationInterface {
  name = 'AddRegistroDocenteToElector1716500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "electores" ADD "registroDocente" text`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_electores_registro_docente" ON "electores" ("registroDocente") WHERE "registroDocente" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_electores_registro_docente"`);
    await queryRunner.query(`ALTER TABLE "electores" DROP COLUMN "registroDocente"`);
  }
}
