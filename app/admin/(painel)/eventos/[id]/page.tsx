import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoExcluir } from "@/app/admin/BotaoExcluir";
import { buscarEventoCompletoPorId, listarDoacoesPainel, resumoDoacoesEvento } from "@/lib/db";
import { formatarTelefone } from "@/lib/telefone";
import {
  atualizarCampoAction,
  atualizarEventoAction,
  atualizarParticipanteAction,
  atualizarPremioAction,
  criarCampoAction,
  criarParticipanteAction,
  criarPremioAction,
  excluirCampoAction,
  excluirParticipanteAction,
  excluirPremioAction,
} from "../../../actions";

export const dynamic = "force-dynamic";

const dataFormulario = (data: string) => {
  const valor = new Date(data);
  const emSaoPaulo = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(valor);
  return emSaoPaulo.replace(" ", "T");
};

const POR_PAGINA = 50;

const reais = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const quando = (data: string, fuso: string) =>
  new Date(data).toLocaleString("pt-BR", {
    timeZone: fuso,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

function ImagemAtual({ src, alt }: { src: string; alt: string }) {
  if (!src) return <span className="admin-sem-imagem">Sem imagem</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="admin-miniatura" src={src} alt={alt} />;
}

export default async function EditarEvento({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ salvo?: string; busca?: string; pagina?: string }>;
}) {
  const { id } = await params;
  const { salvo, busca = "", pagina } = await searchParams;
  const evento = await buscarEventoCompletoPorId(id);
  if (!evento) notFound();
  const paginaAtual = Math.max(1, Number(pagina) || 1);
  const [resumo, listagem] = await Promise.all([
    resumoDoacoesEvento(evento.id),
    listarDoacoesPainel(evento.id, { busca, pagina: paginaAtual, porPagina: POR_PAGINA }),
  ]);
  const doacoes = resumo.total;
  const naoConfirmadas = resumo.total - resumo.confirmadas;
  const nomeParticipante = new Map(evento.participantes.map((item) => [item.id, item.nome]));
  const ultimaPagina = Math.max(1, Math.ceil(listagem.total / POR_PAGINA));
  const enderecoPagina = (numero: number) =>
    `?${new URLSearchParams({ ...(busca ? { busca } : {}), ...(numero > 1 ? { pagina: String(numero) } : {}) })}`;

  return (
    <div className="admin-pagina admin-editor">
      <div className="admin-titulo-linha">
        <div>
          <Link href="/admin/eventos" className="admin-voltar">← Todos os eventos</Link>
          <span className="admin-kicker">Editando evento</span>
          <h1>{evento.nome}</h1>
          <p>{resumo.confirmadas} doações confirmadas{naoConfirmadas > 0 && ` · ${naoConfirmadas} não confirmadas`}.</p>
        </div>
        <div className="admin-acoes">
          <Link className="admin-botao" href={`/evento/${evento.slug}`} target="_blank">
            Abrir evento ↗
          </Link>
          <Link className="admin-botao" href={`/evento/${evento.slug}/ranking`} target="_blank">
            Abrir ranking ↗
          </Link>
          <a className="admin-botao" href={`/api/admin/eventos/${evento.id}/exportar`}>
            Exportar doações CSV
          </a>
          <Link className="admin-botao primario" href={`/admin/eventos/${evento.id}/cadastro-presencial`}>
            Cadastro presencial
          </Link>
        </div>
      </div>

      {salvo && <p className="admin-alerta sucesso">Alterações salvas com sucesso.</p>}

      <form action={atualizarEventoAction.bind(null, evento.id)} className="admin-card admin-form">
        <div className="admin-secao-titulo">
          <div><span className="admin-kicker">Geral</span><h2>Identificação e período</h2></div>
          <button className="admin-botao primario" type="submit">Salvar evento</button>
        </div>

        <div className="admin-grid dois">
          <label>Nome do evento<input name="nome" required defaultValue={evento.nome} /></label>
          <label>Endereço público<input name="slug" required defaultValue={evento.slug} /></label>
          <label>Subtítulo<input name="subtitulo" defaultValue={evento.subtitulo} /></label>
          <label>Beneficiário<input name="beneficiario" defaultValue={evento.beneficiario} /></label>
          <label className="admin-coluna-inteira">Descrição<textarea name="descricao" rows={3} defaultValue={evento.descricao} /></label>
          <label>Status
            <select name="status" defaultValue={evento.status}>
              <option value="rascunho">Rascunho — invisível ao público</option>
              <option value="publicado">Publicado</option>
              <option value="encerrado">Encerrado manualmente</option>
            </select>
          </label>
          <label>Fuso horário<input name="fusoHorario" defaultValue={evento.fusoHorario} /></label>
          <label>Início<input name="inicioEm" type="datetime-local" required defaultValue={dataFormulario(evento.inicioEm)} /></label>
          <label>Encerramento<input name="fimEm" type="datetime-local" required defaultValue={dataFormulario(evento.fimEm)} /></label>
        </div>
        <label className="admin-check"><input type="checkbox" name="destaque" defaultChecked={evento.destaque} /> Usar como evento principal na página inicial</label>

        <hr />
        <div className="admin-secao-titulo"><div><span className="admin-kicker">Competição</span><h2>Participantes e meta</h2></div></div>
        <label className="admin-check"><input type="checkbox" name="temParticipantes" defaultChecked={evento.temParticipantes} /> Este evento possui participantes ou equipes competindo</label>
        <div className="admin-grid quatro">
          <label>Nome no singular<input name="participanteSingular" defaultValue={evento.participanteSingular} placeholder="atlética, empresa, equipe" /></label>
          <label>Nome no plural<input name="participantePlural" defaultValue={evento.participantePlural} /></label>
          <label>Meta padrão (kg)<input name="metaKg" type="number" min="0" step="0.1" defaultValue={evento.metaKg} /></label>
          <label>R$ por quilo<input name="reaisPorKg" type="number" min="0.01" step="0.01" defaultValue={evento.reaisPorKg} /></label>
        </div>

        <hr />
        <div className="admin-secao-titulo"><div><span className="admin-kicker">Doação</span><h2>Valores e confirmação</h2></div></div>
        <div className="admin-grid quatro">
          <label>Doação mínima (R$)<input name="valorMinimo" type="number" min="0.01" step="0.01" defaultValue={evento.valorMinimo} /></label>
          <label>Valor do saco (R$)<input name="valorSaco" type="number" min="0" step="0.01" defaultValue={evento.valorSaco} /></label>
          <label>Peso do saco (kg)<input name="pesoSacoKg" type="number" min="0" step="0.1" defaultValue={evento.pesoSacoKg} /></label>
          <label>Espera do PIX (segundos)<input name="segundosConfirmacao" type="number" min="0" defaultValue={evento.segundosConfirmacao} /></label>
          <label className="admin-coluna-inteira">Valores sugeridos, separados por espaço<input name="valoresSugeridos" defaultValue={evento.valoresSugeridos.join(" ")} /></label>
        </div>

        <hr />
        <div className="admin-secao-titulo"><div><span className="admin-kicker">PIX</span><h2>Conta recebedora</h2></div></div>
        <div className="admin-grid dois">
          <label>Chave PIX<input name="pixChave" defaultValue={evento.pixChave} /></label>
          <label>Nome do recebedor<input name="pixNome" maxLength={25} defaultValue={evento.pixNome} /></label>
          <label>Cidade<input name="pixCidade" maxLength={15} defaultValue={evento.pixCidade} /></label>
          <label>Instagram<input name="instagram" defaultValue={evento.instagram} /></label>
          <label className="admin-coluna-inteira">Código PIX estático de emergência<textarea name="pixCodigoEstatico" rows={3} defaultValue={evento.pixCodigoEstatico} /></label>
        </div>
        <label className="admin-check"><input type="checkbox" name="pixValorEmbutido" defaultChecked={evento.pixValorEmbutido} /> Gerar o código PIX já com o valor escolhido</label>

        <hr />
        <div className="admin-secao-titulo"><div><span className="admin-kicker">Formulário</span><h2>Nome, telefone e consentimento</h2></div></div>
        <div className="admin-grid dois">
          <label>Rótulo do nome<input name="rotuloNome" defaultValue={evento.rotuloNome} /></label>
          <label>Exemplo do campo<input name="placeholderNome" defaultValue={evento.placeholderNome} /></label>
          <label className="admin-coluna-inteira">Termo de dados<textarea name="termoDados" rows={4} defaultValue={evento.termoDados} /></label>
        </div>
        <label className="admin-check"><input type="checkbox" name="pedirTelefone" defaultChecked={evento.pedirTelefone} /> Pedir telefone com DDD no formulário</label>
        <label className="admin-check"><input type="checkbox" name="telefoneObrigatorio" defaultChecked={evento.telefoneObrigatorio} /> Exigir o telefone para concluir a doação</label>

        <hr />
        <div className="admin-secao-titulo"><div><span className="admin-kicker">Compartilhamento</span><h2>Story automático</h2></div></div>
        <label className="admin-check"><input type="checkbox" name="compartilhamentoAtivo" defaultChecked={evento.compartilhamentoAtivo} /> Oferecer o card para compartilhar ao final</label>
        <div className="admin-grid dois">
          <label className="admin-coluna-inteira">Frase do card e do compartilhamento
            <textarea name="textoCompartilhamento" rows={3} defaultValue={evento.textoCompartilhamento} />
            <small>Use <code>{"{kg}"}</code>, <code>{"{beneficiario}"}</code> e <code>{"{evento}"}</code> para inserir os dados automaticamente.</small>
          </label>
          <label className="admin-coluna-inteira">Chamada depois da doação<input name="chamadaCompartilhamento" defaultValue={evento.chamadaCompartilhamento} /></label>
          <label>Título da recompensa por compartilhar<input name="recompensaCompartilhamentoTitulo" defaultValue={evento.recompensaCompartilhamentoTitulo} placeholder="Deixe vazio se não houver recompensa" /></label>
          <label>Instruções da recompensa<input name="recompensaCompartilhamentoDescricao" defaultValue={evento.recompensaCompartilhamentoDescricao} /></label>
        </div>

        <hr />
        <div className="admin-secao-titulo"><div><span className="admin-kicker">Identidade</span><h2>Logos e cores</h2></div></div>
        <div className="admin-grid dois">
          <div className="admin-upload">
            <ImagemAtual src={evento.logoMarca} alt="Logo da marca" />
            <label>Logo da marca<input name="logoMarcaArquivo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" /></label>
            <input name="logoMarca" type="hidden" value={evento.logoMarca} />
          </div>
          <div className="admin-upload">
            <ImagemAtual src={evento.logoEvento} alt="Logo do evento" />
            <label>Logo do evento<input name="logoEventoArquivo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" /></label>
            <input name="logoEvento" type="hidden" value={evento.logoEvento} />
          </div>
          <label>Cor principal<input name="corPrimaria" type="color" defaultValue={evento.corPrimaria} /></label>
          <label>Cor secundária<input name="corSecundaria" type="color" defaultValue={evento.corSecundaria} /></label>
          <label>Cor de destaque<input name="corDestaque" type="color" defaultValue={evento.corDestaque} /></label>
          <label>Cor dos cartões<input name="corFundoCartao" type="color" defaultValue={evento.corFundoCartao} /></label>
        </div>

        <hr />
        <div className="admin-secao-titulo"><div><span className="admin-kicker">Premiação da competição</span><h2>Prêmio da participante campeã</h2></div></div>
        <div className="admin-grid dois">
          <label>Título<input name="premioCompeticaoTitulo" defaultValue={evento.premioCompeticaoTitulo} placeholder="Deixe vazio se não houver" /></label>
          <label>Descrição<input name="premioCompeticaoDescricao" defaultValue={evento.premioCompeticaoDescricao} /></label>
          <label className="admin-coluna-inteira">Quando saem os resultados dos sorteios<input name="resultadoPremios" defaultValue={evento.resultadoPremios} /></label>
        </div>

        <div className="admin-barra-salvar"><button className="admin-botao primario" type="submit">Salvar todas as configurações</button></div>
      </form>

      <section id="participantes" className="admin-card admin-bloco">
        <div className="admin-secao-titulo">
          <div><span className="admin-kicker">Competição</span><h2>{evento.participantePlural}</h2><p>Cadastre nome, grupo, foto ou logo e, se necessário, uma meta individual.</p></div>
        </div>
        <div className="admin-lista-editavel">
          {evento.participantes.map((participante) => (
            <article className="admin-item-editavel" key={participante.id}>
              <form action={atualizarParticipanteAction.bind(null, evento.id, participante.id)} className="admin-grid item">
                <ImagemAtual src={participante.imagem} alt={participante.nome} />
                <label>Nome<input name="nome" defaultValue={participante.nome} required /></label>
                <label>Identificador<input name="slug" defaultValue={participante.slug} required /></label>
                <label>Grupo/chave<input name="grupo" defaultValue={participante.grupo} /></label>
                <label>Meta própria (kg)<input name="metaKg" type="number" min="0" step="0.1" defaultValue={participante.metaKg ?? ""} placeholder={`Padrão: ${evento.metaKg}`} /></label>
                <label>Ordem<input name="ordem" type="number" defaultValue={participante.ordem} /></label>
                <label>Trocar imagem<input name="imagemArquivo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" /><input name="imagem" type="hidden" value={participante.imagem} /></label>
                <label className="admin-check"><input type="checkbox" name="ativo" defaultChecked={participante.ativo} /> Ativo</label>
                <button className="admin-botao primario" type="submit">Salvar</button>
              </form>
              <form action={excluirParticipanteAction.bind(null, evento.id, participante.id)} className="admin-excluir"><BotaoExcluir rotulo={doacoes ? "Desativar" : "Excluir"} /></form>
            </article>
          ))}
        </div>

        <details className="admin-adicionar">
          <summary>+ Adicionar {evento.participanteSingular}</summary>
          <form action={criarParticipanteAction.bind(null, evento.id)} className="admin-grid item novo">
            <label>Nome<input name="nome" required /></label>
            <label>Identificador<input name="slug" placeholder="gerado pelo nome" /></label>
            <label>Grupo/chave<input name="grupo" /></label>
            <label>Meta própria (kg)<input name="metaKg" type="number" min="0" step="0.1" /></label>
            <label>Ordem<input name="ordem" type="number" defaultValue={evento.participantes.length} /></label>
            <label>Imagem<input name="imagemArquivo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" /></label>
            <label className="admin-check"><input type="checkbox" name="ativo" defaultChecked /> Ativo</label>
            <button className="admin-botao primario" type="submit">Adicionar</button>
          </form>
        </details>
      </section>

      <section id="formulario" className="admin-card admin-bloco">
        <div className="admin-secao-titulo"><div><span className="admin-kicker">Formulário</span><h2>Campos extras</h2><p>Nome, telefone e participante já são campos nativos. Adicione somente o que variar neste evento.</p></div></div>
        <div className="admin-lista-editavel">
          {evento.campos.map((campo) => (
            <article className="admin-item-editavel" key={campo.id}>
              <form action={atualizarCampoAction.bind(null, evento.id, campo.id)} className="admin-grid item campo-extra">
                <label>Rótulo<input name="rotulo" defaultValue={campo.rotulo} required /></label>
                <label>Chave<input name="chave" defaultValue={campo.chave} required /></label>
                <label>Tipo<select name="tipo" defaultValue={campo.tipo}><option value="texto">Texto curto</option><option value="texto_longo">Texto longo</option><option value="selecao">Lista de opções</option><option value="checkbox">Confirmação</option></select></label>
                <label>Exemplo<input name="placeholder" defaultValue={campo.placeholder} /></label>
                <label>Ordem<input name="ordem" type="number" defaultValue={campo.ordem} /></label>
                <label className="admin-coluna-inteira">Opções, uma por linha<textarea name="opcoes" rows={3} defaultValue={campo.opcoes.join("\n")} /></label>
                <label className="admin-check"><input type="checkbox" name="obrigatorio" defaultChecked={campo.obrigatorio} /> Obrigatório</label>
                <label className="admin-check"><input type="checkbox" name="ativo" defaultChecked={campo.ativo} /> Ativo</label>
                <button className="admin-botao primario" type="submit">Salvar</button>
              </form>
              <form action={excluirCampoAction.bind(null, evento.id, campo.id)} className="admin-excluir"><BotaoExcluir /></form>
            </article>
          ))}
        </div>
        <details className="admin-adicionar">
          <summary>+ Adicionar campo ao formulário</summary>
          <form action={criarCampoAction.bind(null, evento.id)} className="admin-grid item novo campo-extra">
            <label>Rótulo<input name="rotulo" required /></label>
            <label>Chave<input name="chave" placeholder="gerada pelo rótulo" /></label>
            <label>Tipo<select name="tipo" defaultValue="texto"><option value="texto">Texto curto</option><option value="texto_longo">Texto longo</option><option value="selecao">Lista de opções</option><option value="checkbox">Confirmação</option></select></label>
            <label>Exemplo<input name="placeholder" /></label>
            <label>Ordem<input name="ordem" type="number" defaultValue={evento.campos.length} /></label>
            <label className="admin-coluna-inteira">Opções, uma por linha<textarea name="opcoes" rows={3} /></label>
            <label className="admin-check"><input type="checkbox" name="obrigatorio" /> Obrigatório</label>
            <label className="admin-check"><input type="checkbox" name="ativo" defaultChecked /> Ativo</label>
            <button className="admin-botao primario" type="submit">Adicionar</button>
          </form>
        </details>
      </section>

      <section id="premios" className="admin-card admin-bloco">
        <div className="admin-secao-titulo"><div><span className="admin-kicker">Incentivos</span><h2>Prêmios e sorteios</h2><p>Esta seção pode ficar vazia quando o evento não tiver prêmios.</p></div></div>
        <div className="admin-lista-editavel">
          {evento.premios.map((premio) => (
            <article className="admin-item-editavel" key={premio.id}>
              <form action={atualizarPremioAction.bind(null, evento.id, premio.id)} className="admin-grid item premio-item-admin">
                <ImagemAtual src={premio.imagem} alt={premio.nome} />
                <label>Nome<input name="nome" defaultValue={premio.nome} required /></label>
                <label>Detalhe<input name="detalhe" defaultValue={premio.detalhe} /></label>
                <label>Doação mínima (R$)<input name="valorMinimo" type="number" min="0" step="0.01" defaultValue={premio.valorMinimo} /></label>
                <label>Regra exibida<input name="regra" defaultValue={premio.regra} /></label>
                <label>Ordem<input name="ordem" type="number" defaultValue={premio.ordem} /></label>
                <label>Trocar imagem<input name="imagemArquivo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" /><input name="imagem" type="hidden" value={premio.imagem} /></label>
                <label className="admin-check"><input type="checkbox" name="ativo" defaultChecked={premio.ativo} /> Ativo</label>
                <button className="admin-botao primario" type="submit">Salvar</button>
              </form>
              <form action={excluirPremioAction.bind(null, evento.id, premio.id)} className="admin-excluir"><BotaoExcluir /></form>
            </article>
          ))}
        </div>
        <details className="admin-adicionar">
          <summary>+ Adicionar prêmio</summary>
          <form action={criarPremioAction.bind(null, evento.id)} className="admin-grid item novo premio-item-admin">
            <label>Nome<input name="nome" required /></label>
            <label>Detalhe<input name="detalhe" /></label>
            <label>Doação mínima (R$)<input name="valorMinimo" type="number" min="0" step="0.01" defaultValue="0" /></label>
            <label>Regra exibida<input name="regra" /></label>
            <label>Ordem<input name="ordem" type="number" defaultValue={evento.premios.length} /></label>
            <label>Imagem<input name="imagemArquivo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" /></label>
            <label className="admin-check"><input type="checkbox" name="ativo" defaultChecked /> Ativo</label>
            <button className="admin-botao primario" type="submit">Adicionar</button>
          </form>
        </details>
      </section>

      <section id="doacoes" className="admin-card admin-bloco">
        <div className="admin-secao-titulo">
          <div>
            <span className="admin-kicker">Registro</span>
            <h2>Doações recebidas</h2>
            <p>
              {resumo.total} no total · {resumo.confirmadas} confirmadas
              {naoConfirmadas > 0 && ` · ${naoConfirmadas} abandonadas antes de confirmar o PIX`}.
            </p>
          </div>
          <a className="admin-botao" href={`/api/admin/eventos/${evento.id}/exportar`}>Exportar CSV</a>
        </div>

        <form className="admin-busca" method="get">
          <input type="search" name="busca" defaultValue={busca} placeholder="Buscar por nome ou telefone" aria-label="Buscar doação por nome ou telefone" />
          <button className="admin-botao primario" type="submit">Buscar</button>
          {busca && <a className="admin-botao" href="?">Limpar</a>}
        </form>

        {listagem.doacoes.length === 0 ? (
          <p className="admin-vazio">{busca ? `Nenhuma doação encontrada para “${busca}”.` : "Ainda não há doações neste evento."}</p>
        ) : (
          <>
            <div className="admin-tabela-rolagem">
              <table className="admin-tabela">
                <thead>
                  <tr>
                    <th scope="col">Quando</th>
                    <th scope="col">Nome</th>
                    <th scope="col">Telefone</th>
                    <th scope="col">{evento.participanteSingular}</th>
                    <th scope="col">Valor</th>
                    <th scope="col">Peso</th>
                    <th scope="col">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {listagem.doacoes.map((doacao) => (
                    <tr key={doacao.id} data-confirmada={Boolean(doacao.confirmadoEm)}>
                      <td>{quando(doacao.criadoEm, evento.fusoHorario)}</td>
                      <td>{doacao.nome}</td>
                      <td>{doacao.telefone ? <a href={`tel:+55${doacao.telefone}`}>{formatarTelefone(doacao.telefone)}</a> : "—"}</td>
                      <td>{doacao.participanteId ? nomeParticipante.get(doacao.participanteId) ?? "—" : "—"}</td>
                      <td>{reais(doacao.valor)}</td>
                      <td>{doacao.pesoKg} kg</td>
                      <td>
                        {doacao.confirmadoEm
                          ? <span className="admin-selo ok">Confirmada</span>
                          : <span className="admin-selo pendente">Não confirmada</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {ultimaPagina > 1 && (
              <nav className="admin-paginacao" aria-label="Páginas de doações">
                {paginaAtual > 1 && <a className="admin-botao" href={enderecoPagina(paginaAtual - 1)}>← Anteriores</a>}
                <span>Página {paginaAtual} de {ultimaPagina} · {listagem.total} {listagem.total === 1 ? "doação" : "doações"}</span>
                {paginaAtual < ultimaPagina && <a className="admin-botao" href={enderecoPagina(paginaAtual + 1)}>Próximas →</a>}
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  );
}
