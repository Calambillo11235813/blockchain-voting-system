import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropUniqueHashTransaccion1717000000000 implements MigrationInterface {
  name = 'DropUniqueHashTransaccion1717000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'UQ_registro_sufragio_hashTransaccion'
        ) THEN
          ALTER TABLE "registro_sufragio" DROP CONSTRAINT "UQ_registro_sufragio_hashTransaccion";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      DECLARE
        constraint_name text;
      BEGIN
        SELECT con.conname INTO constraint_name
        FROM pg_constraint con
        INNER JOIN pg_class rel ON rel.oid = con.conrelid
        INNER JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
        WHERE rel.relname = 'registro_sufragio'
          AND att.attname = 'hashTransaccion'
          AND con.contype = 'u'
        LIMIT 1;

        IF constraint_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE "registro_sufragio" DROP CONSTRAINT %I', constraint_name);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_registro_sufragio_hashTransaccion"
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_registro_sufragio_hashTransaccion"
      ON "registro_sufragio" ("hashTransaccion")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_registro_sufragio_hashTransaccion"
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_registro_sufragio_hashTransaccion"
      ON "registro_sufragio" ("hashTransaccion")
    `);
  }
}
