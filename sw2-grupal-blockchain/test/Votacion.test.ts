import { expect } from "chai";
import { ethers } from "hardhat";
import { Votacion } from "../typechain-types";

describe("Votacion (Hash-Based)", () => {
  // Simular UUIDs reales hasheados
  const eleccionId = ethers.keccak256(ethers.toUtf8Bytes("eleccion-uuid-001"));
  const eleccionId2 = ethers.keccak256(ethers.toUtf8Bytes("eleccion-uuid-002"));
  const candidatoA = ethers.keccak256(ethers.toUtf8Bytes("candidato-uuid-frente-A"));
  const candidatoB = ethers.keccak256(ethers.toUtf8Bytes("candidato-uuid-frente-B"));
  const elector1 = ethers.keccak256(ethers.toUtf8Bytes("elector-uuid-001"));
  const elector2 = ethers.keccak256(ethers.toUtf8Bytes("elector-uuid-002"));
  const elector3 = ethers.keccak256(ethers.toUtf8Bytes("elector-uuid-003"));

  async function desplegarContrato(): Promise<Votacion> {
    const Votacion = await ethers.getContractFactory("Votacion");
    const votacion = await Votacion.deploy();
    await votacion.waitForDeployment();
    return votacion as unknown as Votacion;
  }

  it("Caso 1: despliega correctamente y establece admin", async () => {
    const [deployer] = await ethers.getSigners();
    const votacion = await desplegarContrato();

    expect(await votacion.admin()).to.equal(deployer.address);
    expect(await votacion.totalVotosGlobal()).to.equal(0);
  });

  it("Caso 2: permite votar y aumenta el conteo del candidato", async () => {
    const votacion = await desplegarContrato();

    await votacion.votar(eleccionId, candidatoA, elector1);

    expect(await votacion.obtenerVotos(eleccionId, candidatoA)).to.equal(1);
    expect(await votacion.obtenerTotalVotos(eleccionId)).to.equal(1);
    expect(await votacion.totalVotosGlobal()).to.equal(1);
  });

  it("Caso 3: evita el doble voto del mismo elector en la misma elección", async () => {
    const votacion = await desplegarContrato();

    await votacion.votar(eleccionId, candidatoA, elector1);

    await expect(
      votacion.votar(eleccionId, candidatoB, elector1)
    ).to.be.revertedWith("Error: El elector ya emitio su voto en esta eleccion.");
  });

  it("Caso 4: permite al mismo elector votar en diferentes elecciones", async () => {
    const votacion = await desplegarContrato();

    await votacion.votar(eleccionId, candidatoA, elector1);
    await votacion.votar(eleccionId2, candidatoB, elector1);

    expect(await votacion.obtenerVotos(eleccionId, candidatoA)).to.equal(1);
    expect(await votacion.obtenerVotos(eleccionId2, candidatoB)).to.equal(1);
    expect(await votacion.totalVotosGlobal()).to.equal(2);
  });

  it("Caso 5: emite evento VotoRegistrado con datos correctos", async () => {
    const votacion = await desplegarContrato();

    await expect(votacion.votar(eleccionId, candidatoA, elector1))
      .to.emit(votacion, "VotoRegistrado")
      .withArgs(eleccionId, candidatoA, elector1, (ts: bigint) => ts > 0n);
  });

  it("Caso 6: marca al elector como yaVoto correctamente", async () => {
    const votacion = await desplegarContrato();

    expect(await votacion.verificarVoto(eleccionId, elector1)).to.equal(false);

    await votacion.votar(eleccionId, candidatoA, elector1);

    expect(await votacion.verificarVoto(eleccionId, elector1)).to.equal(true);
    // En otra elección sigue sin haber votado
    expect(await votacion.verificarVoto(eleccionId2, elector1)).to.equal(false);
  });

  it("Caso 7: solo el admin puede registrar votos", async () => {
    const [, noAdmin] = await ethers.getSigners();
    const votacion = await desplegarContrato();

    await expect(
      votacion.connect(noAdmin).votar(eleccionId, candidatoA, elector1)
    ).to.be.revertedWith("Error: Solo el administrador puede ejecutar esta funcion.");
  });

  it("Caso 8: conteo correcto con múltiples votos a diferentes candidatos", async () => {
    const votacion = await desplegarContrato();

    await votacion.votar(eleccionId, candidatoA, elector1);
    await votacion.votar(eleccionId, candidatoA, elector2);
    await votacion.votar(eleccionId, candidatoB, elector3);

    expect(await votacion.obtenerVotos(eleccionId, candidatoA)).to.equal(2);
    expect(await votacion.obtenerVotos(eleccionId, candidatoB)).to.equal(1);
    expect(await votacion.obtenerTotalVotos(eleccionId)).to.equal(3);
    expect(await votacion.totalVotosGlobal()).to.equal(3);
  });

  it("Caso 9: retorna 0 cuando no hay votos", async () => {
    const votacion = await desplegarContrato();

    expect(await votacion.obtenerVotos(eleccionId, candidatoA)).to.equal(0);
    expect(await votacion.obtenerTotalVotos(eleccionId)).to.equal(0);
    expect(await votacion.totalVotosGlobal()).to.equal(0);
  });

  it("Caso 10: los totales por eleccion son independientes", async () => {
    const votacion = await desplegarContrato();

    await votacion.votar(eleccionId, candidatoA, elector1);
    await votacion.votar(eleccionId, candidatoB, elector2);

    expect(await votacion.obtenerTotalVotos(eleccionId)).to.equal(2);
    expect(await votacion.obtenerTotalVotos(eleccionId2)).to.equal(0);
    expect(await votacion.totalVotosGlobal()).to.equal(2);
  });

  it("Caso 11: candidato sin votos mantiene conteo en cero", async () => {
    const votacion = await desplegarContrato();

    await votacion.votar(eleccionId, candidatoA, elector1);

    expect(await votacion.obtenerVotos(eleccionId, candidatoA)).to.equal(1);
    expect(await votacion.obtenerVotos(eleccionId, candidatoB)).to.equal(0);
  });
});
