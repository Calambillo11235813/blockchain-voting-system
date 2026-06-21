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

  describe("votarBatch", () => {
    const rectorado = ethers.keccak256(ethers.toUtf8Bytes("papeleta-rectorado-001"));
    const decanato = ethers.keccak256(ethers.toUtf8Bytes("papeleta-decanato-001"));
    const carrera = ethers.keccak256(ethers.toUtf8Bytes("papeleta-carrera-001"));
    const candRectorado = ethers.keccak256(ethers.toUtf8Bytes("frente-rectorado-A"));
    const candDecanato = ethers.keccak256(ethers.toUtf8Bytes("frente-decanato-B"));
    const candCarrera = ethers.keccak256(ethers.toUtf8Bytes("frente-carrera-C"));

    async function activarCrucero(votacion: Votacion) {
      await votacion.configurarEleccionActiva(rectorado, true);
      await votacion.configurarEleccionActiva(decanato, true);
      await votacion.configurarEleccionActiva(carrera, true);
    }

    it("Caso 12: registra batch estudiantil en 3 papeletas concurrentes", async () => {
      const votacion = await desplegarContrato();
      await activarCrucero(votacion);

      await votacion.votarBatch(
        [rectorado, decanato, carrera],
        [candRectorado, candDecanato, candCarrera],
        elector1,
        0
      );

      expect(await votacion.obtenerVotos(rectorado, candRectorado)).to.equal(1);
      expect(await votacion.obtenerVotos(decanato, candDecanato)).to.equal(1);
      expect(await votacion.obtenerVotos(carrera, candCarrera)).to.equal(1);
      expect(await votacion.obtenerTotalVotos(rectorado)).to.equal(1);
      expect(await votacion.obtenerTotalVotos(decanato)).to.equal(1);
      expect(await votacion.obtenerTotalVotos(carrera)).to.equal(1);
      expect(await votacion.totalVotosGlobal()).to.equal(3);

      expect(await votacion.obtenerVotosEstudiantes(rectorado, candRectorado)).to.equal(1);
      expect(await votacion.obtenerVotosEstudiantes(decanato, candDecanato)).to.equal(1);
      expect(await votacion.obtenerVotosEstudiantes(carrera, candCarrera)).to.equal(1);
      expect(await votacion.obtenerVotosDocentes(rectorado, candRectorado)).to.equal(0);
    });

    it("Caso 13: registra batch docente con conteo paritario separado", async () => {
      const votacion = await desplegarContrato();
      await activarCrucero(votacion);

      await votacion.votarBatch(
        [rectorado, decanato, carrera],
        [candRectorado, candDecanato, candCarrera],
        elector2,
        1
      );

      expect(await votacion.obtenerVotosDocentes(rectorado, candRectorado)).to.equal(1);
      expect(await votacion.obtenerVotosDocentes(decanato, candDecanato)).to.equal(1);
      expect(await votacion.obtenerVotosDocentes(carrera, candCarrera)).to.equal(1);
      expect(await votacion.obtenerVotosEstudiantes(rectorado, candRectorado)).to.equal(0);

      const [estudiantes, docentes] = await votacion.obtenerVotosPorEstamento(
        rectorado,
        candRectorado
      );
      expect(estudiantes).to.equal(0);
      expect(docentes).to.equal(1);
    });

    it("Caso 14: emite VotoBatchRegistrado por cada voto del lote", async () => {
      const votacion = await desplegarContrato();
      await activarCrucero(votacion);

      await expect(
        votacion.votarBatch(
          [rectorado, decanato],
          [candRectorado, candDecanato],
          elector1,
          0
        )
      )
        .to.emit(votacion, "VotoBatchRegistrado")
        .withArgs(rectorado, candRectorado, elector1, 0, (ts: bigint) => ts > 0n)
        .and.to.emit(votacion, "VotoBatchRegistrado")
        .withArgs(decanato, candDecanato, elector1, 0, (ts: bigint) => ts > 0n);
    });

    it("Caso 15: revierte si los arreglos tienen longitudes distintas", async () => {
      const votacion = await desplegarContrato();
      await activarCrucero(votacion);

      await expect(
        votacion.votarBatch([rectorado, decanato], [candRectorado], elector1, 0)
      ).to.be.revertedWith("Error: Los arreglos deben tener la misma longitud.");
    });

    it("Caso 16: revierte si el estamento es invalido", async () => {
      const votacion = await desplegarContrato();
      await activarCrucero(votacion);

      await expect(
        votacion.votarBatch([rectorado], [candRectorado], elector1, 2)
      ).to.be.revertedWith("Error: El estamento debe ser 0 (Estudiante) o 1 (Docente).");
    });

    it("Caso 17: revierte si la eleccion no esta activa", async () => {
      const votacion = await desplegarContrato();

      await expect(
        votacion.votarBatch([rectorado], [candRectorado], elector1, 0)
      ).to.be.revertedWith("Error: La eleccion no esta activa o no existe.");
    });

    it("Caso 18: revierte si la eleccion fue cerrada", async () => {
      const votacion = await desplegarContrato();
      await votacion.configurarEleccionActiva(rectorado, true);
      await votacion.configurarEleccionActiva(rectorado, false);

      await expect(
        votacion.votarBatch([rectorado], [candRectorado], elector1, 0)
      ).to.be.revertedWith("Error: La eleccion no esta activa o no existe.");
    });

    it("Caso 19: revierte doble voto del mismo elector en la misma papeleta", async () => {
      const votacion = await desplegarContrato();
      await activarCrucero(votacion);

      await votacion.votarBatch([rectorado], [candRectorado], elector1, 0);

      await expect(
        votacion.votarBatch([rectorado], [candDecanato], elector1, 0)
      ).to.be.revertedWith("Error: El elector ya emitio su voto en esta eleccion.");
    });

    it("Caso 20: revierte y no aplica efectos parciales si hay papeleta duplicada en el lote", async () => {
      const votacion = await desplegarContrato();
      await activarCrucero(votacion);

      await expect(
        votacion.votarBatch(
          [rectorado, rectorado, decanato],
          [candRectorado, candDecanato, candDecanato],
          elector1,
          0
        )
      ).to.be.revertedWith("Error: El elector ya emitio su voto en esta eleccion.");

      expect(await votacion.obtenerVotos(rectorado, candRectorado)).to.equal(0);
      expect(await votacion.obtenerVotos(decanato, candDecanato)).to.equal(0);
      expect(await votacion.verificarVoto(rectorado, elector1)).to.equal(false);
      expect(await votacion.totalVotosGlobal()).to.equal(0);
    });

    it("Caso 21: solo el admin puede ejecutar votarBatch", async () => {
      const [, noAdmin] = await ethers.getSigners();
      const votacion = await desplegarContrato();
      await activarCrucero(votacion);

      await expect(
        votacion.connect(noAdmin).votarBatch(
          [rectorado],
          [candRectorado],
          elector1,
          0
        )
      ).to.be.revertedWith("Error: Solo el administrador puede ejecutar esta funcion.");
    });

    it("Caso 22: revierte con lote vacio", async () => {
      const votacion = await desplegarContrato();

      await expect(
        votacion.votarBatch([], [], elector1, 0)
      ).to.be.revertedWith("Error: El lote debe contener al menos un voto.");
    });
  });
});
