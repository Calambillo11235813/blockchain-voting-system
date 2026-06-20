import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPadronMetadataColumns1716400000000 implements MigrationInterface {
  name = 'AddPadronMetadataColumns1716400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "electores" ADD "facultad" text NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "electores" ADD "codFacultad" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "electores" ADD "codCarrera" text`,
    );

    await queryRunner.query(
      `ALTER TABLE "padron_electoral" ADD "codLugar" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "padron_electoral" ADD "lugarVotacion" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "padron_electoral" ADD "habilitadoRector" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "padron_electoral" DROP COLUMN "habilitadoRector"`,
    );
    await queryRunner.query(
      `ALTER TABLE "padron_electoral" DROP COLUMN "lugarVotacion"`,
    );
    await queryRunner.query(
      `ALTER TABLE "padron_electoral" DROP COLUMN "codLugar"`,
    );

    await queryRunner.query(`ALTER TABLE "electores" DROP COLUMN "codCarrera"`);
    await queryRunner.query(`ALTER TABLE "electores" DROP COLUMN "codFacultad"`);
    await queryRunner.query(`ALTER TABLE "electores" DROP COLUMN "facultad"`);
  }
}
