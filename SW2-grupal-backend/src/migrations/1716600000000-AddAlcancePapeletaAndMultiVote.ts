import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAlcancePapeletaAndMultiVote1716600000000 implements MigrationInterface {
  name = 'AddAlcancePapeletaAndMultiVote1716600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."cargo_tipocargo_enum" AS ENUM('RECTOR', 'DECANO', 'DIRECTOR_CARRERA', 'OTRO')`,
    );
    await queryRunner.query(
      `ALTER TABLE "cargo" ADD "tipoCargo" "public"."cargo_tipocargo_enum" NOT NULL DEFAULT 'OTRO'`,
    );
    await queryRunner.query(`ALTER TABLE "cargo" ALTER COLUMN "facultad" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "cargo" ALTER COLUMN "facultad" SET DEFAULT ''`);

    await queryRunner.query(
      `CREATE TYPE "public"."eleccion_cargo_alcance_enum" AS ENUM('GLOBAL', 'FACULTAD', 'CARRERA')`,
    );
    await queryRunner.query(
      `ALTER TABLE "eleccion_cargo" ADD "alcance" "public"."eleccion_cargo_alcance_enum" NOT NULL DEFAULT 'GLOBAL'`,
    );
    await queryRunner.query(`ALTER TABLE "eleccion_cargo" ADD "codFacultad" text`);
    await queryRunner.query(`ALTER TABLE "eleccion_cargo" ADD "facultadNombre" text`);
    await queryRunner.query(`ALTER TABLE "eleccion_cargo" ADD "codCarrera" text`);
    await queryRunner.query(`ALTER TABLE "eleccion_cargo" ADD "carreraNombre" text`);
    await queryRunner.query(
      `ALTER TABLE "eleccion_cargo" ADD "orden" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "eleccion_cargo" ADD "estaActiva" boolean NOT NULL DEFAULT true`,
    );

    await queryRunner.query(
      `UPDATE "cargo" SET "tipoCargo" = 'RECTOR' WHERE UPPER(TRIM("nombre")) LIKE '%RECTOR%'`,
    );
    await queryRunner.query(
      `UPDATE "cargo" SET "tipoCargo" = 'DECANO' WHERE UPPER(TRIM("nombre")) LIKE '%DECANO%'`,
    );
    await queryRunner.query(
      `UPDATE "cargo" SET "tipoCargo" = 'DIRECTOR_CARRERA' WHERE UPPER(TRIM("nombre")) LIKE '%DIRECTOR%'`,
    );

    await queryRunner.query(`ALTER TABLE "registro_sufragio" ADD "eleccionCargoId" uuid`);

    await queryRunner.query(`
      UPDATE "registro_sufragio" rs
      SET "eleccionCargoId" = sub.id
      FROM (
        SELECT DISTINCT ON (rs2.id) rs2.id AS sufragio_id, ec.id
        FROM "registro_sufragio" rs2
        INNER JOIN "eleccion_cargo" ec ON ec."eleccionId" = rs2."eleccionId"
        ORDER BY rs2.id, ec."orden" ASC, ec.id ASC
      ) sub
      WHERE rs.id = sub.sufragio_id
    `);

    await queryRunner.query(
      `ALTER TABLE "registro_sufragio" DROP CONSTRAINT IF EXISTS "UQ_registro_sufragio_eleccion_elector"`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_sufragio" DROP CONSTRAINT IF EXISTS "UQ_7a8b0d0e5f1c2d3e4f5a6b7c8d"`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'registro_sufragio_eleccionId_electorId_key'
        ) THEN
          ALTER TABLE "registro_sufragio" DROP CONSTRAINT "registro_sufragio_eleccionId_electorId_key";
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `ALTER TABLE "registro_sufragio" ALTER COLUMN "eleccionCargoId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_sufragio" ADD CONSTRAINT "FK_registro_sufragio_eleccion_cargo" FOREIGN KEY ("eleccionCargoId") REFERENCES "eleccion_cargo"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_sufragio" ADD CONSTRAINT "UQ_registro_sufragio_papeleta_elector" UNIQUE ("eleccionCargoId", "electorId")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_eleccion_cargo_alcance" ON "eleccion_cargo" ("eleccionId", "alcance", "codFacultad", "codCarrera", "cargoId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_eleccion_cargo_alcance"`);
    await queryRunner.query(
      `ALTER TABLE "registro_sufragio" DROP CONSTRAINT "UQ_registro_sufragio_papeleta_elector"`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_sufragio" DROP CONSTRAINT "FK_registro_sufragio_eleccion_cargo"`,
    );
    await queryRunner.query(`ALTER TABLE "registro_sufragio" DROP COLUMN "eleccionCargoId"`);
    await queryRunner.query(
      `ALTER TABLE "registro_sufragio" ADD CONSTRAINT "UQ_registro_sufragio_eleccion_elector" UNIQUE ("eleccionId", "electorId")`,
    );

    await queryRunner.query(`ALTER TABLE "eleccion_cargo" DROP COLUMN "estaActiva"`);
    await queryRunner.query(`ALTER TABLE "eleccion_cargo" DROP COLUMN "orden"`);
    await queryRunner.query(`ALTER TABLE "eleccion_cargo" DROP COLUMN "carreraNombre"`);
    await queryRunner.query(`ALTER TABLE "eleccion_cargo" DROP COLUMN "codCarrera"`);
    await queryRunner.query(`ALTER TABLE "eleccion_cargo" DROP COLUMN "facultadNombre"`);
    await queryRunner.query(`ALTER TABLE "eleccion_cargo" DROP COLUMN "codFacultad"`);
    await queryRunner.query(`ALTER TABLE "eleccion_cargo" DROP COLUMN "alcance"`);
    await queryRunner.query(`DROP TYPE "public"."eleccion_cargo_alcance_enum"`);

    await queryRunner.query(`ALTER TABLE "cargo" DROP COLUMN "tipoCargo"`);
    await queryRunner.query(`DROP TYPE "public"."cargo_tipocargo_enum"`);
  }
}
