import Link from "next/link";
import { notFound } from "next/navigation";
import { definirCadastroSorteioAction } from "@/app/admin/actions";
import {
  buscarEventoPorId,
  listarInscricoesSorteio,
  resumoInscricoesSorteio,
} from "@/lib/db";
import { formatarTelefone } from "@/lib/telefone";

export const dynamic = "force-dynamic";

export default async function CadastroPresencial({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ busca?: string; situacao?: string }>;
}) {
  const { id } = await params;
  const { busca = "", situacao = "todos" } = await searchParams;
  const evento = await buscarEventoPorId(id);
  if (!evento) notFound();

  const filtro = ["todos", "pendentes", "cadastrados"].includes(situacao)
    ? situacao
    : "todos";
  const [inscricoes, resumo] = await Promise.all([
    listarInscricoesSorteio(evento.id, { busca, situacao: filtro }),
    resumoInscricoesSorteio(evento.id),
  ]);
  const pendentes = resumo.total - resumo.cadastrados;
  const percentual = resumo.total
    ? Math.round((resumo.cadastrados / resumo.total) * 100)
    : 0;

  return (
    <div className="admin-pagina">
      <div className="admin-titulo-linha">
        <div>
          <Link href={`/admin/eventos/${evento.id}`} className="admin-voltar">
            ← Voltar ao evento
          </Link>
          <span className="admin-kicker">Operação presencial</span>
          <h1>Cadastro dos participantes</h1>
          <p>
            {resumo.cadastrados} cadastrados · {pendentes} pendentes · {resumo.total} no total
          </p>
        </div>
      </div>

      <section className="admin-card admin-bloco">
        <div className="admin-progresso-cabecalho">
          <strong>{percentual}% concluído</strong>
          <span>{resumo.cadastrados} de {resumo.total}</span>
        </div>
        <div
          className="admin-progresso"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={resumo.total}
          aria-valuenow={resumo.cadastrados}
          aria-label="Progresso do cadastro presencial"
        >
          <span style={{ width: `${percentual}%` }} />
        </div>

        <form className="admin-busca admin-filtros-cadastro" method="get">
          <input
            type="search"
            name="busca"
            defaultValue={busca}
            placeholder="Buscar por nome ou telefone"
            aria-label="Buscar participante por nome ou telefone"
          />
          <select name="situacao" defaultValue={filtro} aria-label="Filtrar por situação">
            <option value="todos">Todos</option>
            <option value="pendentes">Pendentes</option>
            <option value="cadastrados">Já cadastrados</option>
          </select>
          <button className="admin-botao primario" type="submit">Filtrar</button>
          {busca || filtro !== "todos" ? (
            <Link className="admin-botao" href={`/admin/eventos/${evento.id}/cadastro-presencial`}>
              Limpar
            </Link>
          ) : null}
        </form>

        {inscricoes.length === 0 ? (
          <p className="admin-vazio">Nenhum participante encontrado neste filtro.</p>
        ) : (
          <div className="admin-tabela-rolagem">
            <table className="admin-tabela admin-tabela-cadastro">
              <thead>
                <tr>
                  <th scope="col">Check</th>
                  <th scope="col">Nome</th>
                  <th scope="col">Telefone</th>
                </tr>
              </thead>
              <tbody>
                {inscricoes.map((inscricao) => {
                  const cadastrado = Boolean(inscricao.cadastradoEm);
                  return (
                    <tr key={inscricao.id} data-cadastrado={cadastrado}>
                      <td>
                        <form
                          action={definirCadastroSorteioAction.bind(
                            null,
                            evento.id,
                            inscricao.id,
                            !cadastrado,
                          )}
                        >
                          <button
                            className="admin-check-cadastro"
                            type="submit"
                            aria-label={cadastrado
                              ? `Desmarcar ${inscricao.nome}`
                              : `Marcar ${inscricao.nome} como cadastrado`}
                            aria-pressed={cadastrado}
                            title={cadastrado ? "Desmarcar" : "Marcar como cadastrado"}
                          >
                            {cadastrado ? "✓" : ""}
                          </button>
                        </form>
                      </td>
                      <td>{inscricao.nome}</td>
                      <td>
                        {inscricao.telefone ? (
                          <a href={`tel:+55${inscricao.telefone}`}>
                            {formatarTelefone(inscricao.telefone)}
                          </a>
                        ) : (
                          <span className="admin-sem-telefone">Sem telefone</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
