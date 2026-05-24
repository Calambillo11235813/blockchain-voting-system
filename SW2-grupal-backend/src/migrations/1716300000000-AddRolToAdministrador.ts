import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRolToAdministrador1716300000000 implements MigrationInterface {
    name = 'AddRolToAdministrador1716300000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."administradores_rol_enum" AS ENUM('SISTEMAS', 'ELECTORAL')`);
        await queryRunner.query(`ALTER TABLE "administradores" ADD "rol" "public"."administradores_rol_enum" NOT NULL DEFAULT 'ELECTORAL'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "administradores" DROP COLUMN "rol"`);
        await queryRunner.query(`DROP TYPE "public"."administradores_rol_enum"`);
    }
}
