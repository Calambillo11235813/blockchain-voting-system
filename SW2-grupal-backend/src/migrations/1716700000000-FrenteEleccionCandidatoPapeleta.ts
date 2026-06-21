import { MigrationInterface, QueryRunner } from 'typeorm';

export class FrenteEleccionCandidatoPapeleta1716700000000 implements MigrationInterface {
  name = 'FrenteEleccionCandidatoPapeleta1716700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Frente.eleccionId ─────────────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "frente" ADD "eleccionId" uuid`);

    await queryRunner.query(`
      UPDATE "frente" f
      SET "eleccionId" = ec."eleccionId"
      FROM "eleccion_cargo" ec
      WHERE f."eleccionCargoId" = ec.id
        AND f."eleccionId" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "frente"
      ADD CONSTRAINT "FK_frente_eleccion"
      FOREIGN KEY ("eleccionId") REFERENCES "eleccion"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`ALTER TABLE "frente" ALTER COLUMN "eleccionId" SET NOT NULL`);

    // Legacy: el frente ya no requiere papeleta concreta
    await queryRunner.query(`ALTER TABLE "frente" ALTER COLUMN "eleccionCargoId" DROP NOT NULL`);

    await queryRunner.query(
      `CREATE INDEX "IDX_frente_eleccion_sigla" ON "frente" ("eleccionId", "sigla")`,
    );

    // ── Candidato.eleccionCargoId ─────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "candidato" ADD "eleccionCargoId" uuid`);

    await queryRunner.query(`
      UPDATE "candidato" c
      SET "eleccionCargoId" = f."eleccionCargoId"
      FROM "frente" f
      WHERE c."frenteId" = f.id
        AND f."eleccionCargoId" IS NOT NULL
        AND c."eleccionCargoId" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "candidato"
      ADD CONSTRAINT "FK_candidato_eleccion_cargo"
      FOREIGN KEY ("eleccionCargoId") REFERENCES "eleccion_cargo"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`ALTER TABLE "candidato" ALTER COLUMN "eleccionCargoId" SET NOT NULL`);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_candidato_papeleta_ci" ON "candidato" ("eleccionCargoId", "ci")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_candidato_papeleta_ci"`);
    await queryRunner.query(
      `ALTER TABLE "candidato" DROP CONSTRAINT "FK_candidato_eleccion_cargo"`,
    );
    await queryRunner.query(`ALTER TABLE "candidato" DROP COLUMN "eleccionCargoId"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_frente_eleccion_sigla"`);
    await queryRunner.query(`ALTER TABLE "frente" DROP CONSTRAINT "FK_frente_eleccion"`);
    await queryRunner.query(`ALTER TABLE "frente" DROP COLUMN "eleccionId"`);
    await queryRunner.query(`ALTER TABLE "frente" ALTER COLUMN "eleccionCargoId" SET NOT NULL`);
  }
}
