import { describe, expect, it } from "vitest";
import { whereLeadsPorPerfil } from "@/lib/permissoes";

describe("whereLeadsPorPerfil", () => {
  it("filtra colaborador por empresa e usuario", () => {
    const where = whereLeadsPorPerfil({
      id_usuario: "func-1",
      id_empresa: "emp-1",
      perfil: "COLABORADOR",
      id_pdv: "pdv-1",
    });

    expect(where).toEqual({ id_empresa: "emp-1", id_funcionario: "func-1" });
  });

  it("filtra gerente apenas por empresa", () => {
    const where = whereLeadsPorPerfil({
      id_usuario: "func-2",
      id_empresa: "emp-2",
      perfil: "GERENTE",
      id_pdv: "pdv-2",
    });

    expect(where).toEqual({ id_empresa: "emp-2" });
  });
});
