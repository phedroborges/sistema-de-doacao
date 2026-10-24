"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAdmin, encerrarSessaoAdmin } from "@/lib/auth";
import {
  atualizarCampo,
  atualizarEvento,
  atualizarParticipante,
  atualizarPremio,
  buscarCampo,
  buscarEventoPorId,
  buscarParticipante,
  buscarPremio,
  criarCampo,
  criarEvento,
  criarParticipante,
  criarPremio,
  dadosNovoEvento,
  definirCadastroSorteio,
  excluirCampo,
  excluirParticipante,
  excluirPremio,
  normalizarSlug,
} from "@/lib/db";
import { salvarImagem } from "@/lib/uploads";
import type { DadosCampo, DadosEvento, DadosParticipante, DadosPremio, StatusEvento, TipoCampo } from "@/lib/modelos";

const valor = (formulario: FormData, nome: string) =>
  String(formulario.get(nome) ?? "").trim();
const marcado = (formulario: FormData, nome: string) => formulario.get(nome) === "on";
const numero = (formulario: FormData, nome: string, fallback = 0) => {
  const convertido = Number(valor(formulario, nome).replace(",", "."));
  return Number.isFinite(convertido) ? convertido : fallback;
};

function dataComFuso(data: string): string {
  if (!data) return new Date().toISOString();
  if (/[zZ]|[+-]\d\d:\d\d$/.test(data)) return data;
  return `${data}:00-03:00`;
}

function listaNumerica(texto: string): number[] {
  return texto
    .split(/[,;\s]+/)
    .map((item) => Number(item.replace(",", ".")))
    .filter((item) => Number.isFinite(item) && item > 0)
    .slice(0, 8);
}

function validarCor(cor: string, fallback: string): string {
  return /^#[0-9a-f]{6}$/i.test(cor) ? cor.toUpperCase() : fallback;
}

function statusValido(status: string): StatusEvento {
  return ["rascunho", "publicado", "encerrado"].includes(status)
    ? (status as StatusEvento)
    : "rascunho";
}

async function extrairEvento(
  formulario: FormData,
  atual: Awaited<ReturnType<typeof buscarEventoPorId>>,
): Promise<DadosEvento> {
  if (!atual) throw new Error("Evento não encontrado.");
  const imagemMarca = await salvarImagem(formulario.get("logoMarcaArquivo"), "marca");
  const imagemEvento = await salvarImagem(formulario.get("logoEventoArquivo"), "evento");
  const valoresSugeridos = listaNumerica(valor(formulario, "valoresSugeridos"));
  const inicioEm = dataComFuso(valor(formulario, "inicioEm"));
  const fimEm = dataComFuso(valor(formulario, "fimEm"));
  if (new Date(fimEm).getTime() <= new Date(inicioEm).getTime()) {
    throw new Error("O encerramento precisa ser posterior ao início do evento.");
  }

  const nome = valor(formulario, "nome");
  const slug = normalizarSlug(valor(formulario, "slug") || nome);
  if (nome.length < 2 || !slug) throw new Error("Informe nome e endereço do evento.");

  return {
    slug,
    nome,
    subtitulo: valor(formulario, "subtitulo"),
    descricao: valor(formulario, "descricao"),
    beneficiario: valor(formulario, "beneficiario"),
    status: statusValido(valor(formulario, "status")),
    destaque: marcado(formulario, "destaque"),
    inicioEm,
    fimEm,
    fusoHorario: valor(formulario, "fusoHorario") || "America/Sao_Paulo",
    temParticipantes: marcado(formulario, "temParticipantes"),
    participanteSingular: valor(formulario, "participanteSingular") || "participante",
    participantePlural: valor(formulario, "participantePlural") || "participantes",
    rotuloNome: valor(formulario, "rotuloNome") || "Seu nome",
    placeholderNome: valor(formulario, "placeholderNome") || "Como te chamam?",
    pedirTelefone: marcado(formulario, "pedirTelefone"),
    telefoneObrigatorio: marcado(formulario, "telefoneObrigatorio"),
    metaKg: Math.max(0, numero(formulario, "metaKg", atual.metaKg)),
    reaisPorKg: Math.max(0.01, numero(formulario, "reaisPorKg", atual.reaisPorKg)),
    valorMinimo: Math.max(0.01, numero(formulario, "valorMinimo", atual.valorMinimo)),
    valorSaco: Math.max(0, numero(formulario, "valorSaco", atual.valorSaco)),
    pesoSacoKg: Math.max(0, numero(formulario, "pesoSacoKg", atual.pesoSacoKg)),
    valoresSugeridos: valoresSugeridos.length ? valoresSugeridos : atual.valoresSugeridos,
    segundosConfirmacao: Math.max(0, Math.round(numero(formulario, "segundosConfirmacao", 12))),
    instagram: valor(formulario, "instagram").replace(/^@/, ""),
    pixChave: valor(formulario, "pixChave"),
    pixNome: valor(formulario, "pixNome"),
    pixCidade: valor(formulario, "pixCidade"),
    pixCodigoEstatico: valor(formulario, "pixCodigoEstatico"),
    pixValorEmbutido: marcado(formulario, "pixValorEmbutido"),
    compartilhamentoAtivo: marcado(formulario, "compartilhamentoAtivo"),
    textoCompartilhamento: valor(formulario, "textoCompartilhamento"),
    chamadaCompartilhamento: valor(formulario, "chamadaCompartilhamento"),
    recompensaCompartilhamentoTitulo: valor(formulario, "recompensaCompartilhamentoTitulo"),
    recompensaCompartilhamentoDescricao: valor(formulario, "recompensaCompartilhamentoDescricao"),
    termoDados: valor(formulario, "termoDados"),
    logoMarca: imagemMarca || valor(formulario, "logoMarca") || atual.logoMarca,
    logoEvento: imagemEvento || valor(formulario, "logoEvento") || atual.logoEvento,
    corPrimaria: validarCor(valor(formulario, "corPrimaria"), atual.corPrimaria),
    corSecundaria: validarCor(valor(formulario, "corSecundaria"), atual.corSecundaria),
    corDestaque: validarCor(valor(formulario, "corDestaque"), atual.corDestaque),
    corFundoCartao: validarCor(valor(formulario, "corFundoCartao"), atual.corFundoCartao),
    premioCompeticaoTitulo: valor(formulario, "premioCompeticaoTitulo"),
    premioCompeticaoDescricao: valor(formulario, "premioCompeticaoDescricao"),
    resultadoPremios: valor(formulario, "resultadoPremios"),
  };
}

export async function criarEventoAction(formulario: FormData) {
  await exigirAdmin();
  const nome = valor(formulario, "nome");
  const slug = normalizarSlug(valor(formulario, "slug") || nome);
  if (nome.length < 2 || !slug) throw new Error("Informe um nome válido para o evento.");
  const base = dadosNovoEvento();
  const evento = await criarEvento({
    ...base,
    nome,
    slug,
    fimEm: dataComFuso(valor(formulario, "fimEm")),
  });
  revalidatePath("/");
  redirect(`/admin/eventos/${evento.id}`);
}

export async function atualizarEventoAction(id: string, formulario: FormData) {
  await exigirAdmin();
  const atual = await buscarEventoPorId(id);
  const dados = await extrairEvento(formulario, atual);
  await atualizarEvento(id, dados);
  revalidatePath("/", "layout");
  redirect(`/admin/eventos/${id}?salvo=evento`);
}

async function dadosParticipante(
  formulario: FormData,
  atual?: Awaited<ReturnType<typeof buscarParticipante>>,
): Promise<DadosParticipante> {
  const nome = valor(formulario, "nome");
  if (nome.length < 1) throw new Error("Informe o nome do participante.");
  const imagem = await salvarImagem(formulario.get("imagemArquivo"), "participante");
  const metaTexto = valor(formulario, "metaKg");
  return {
    nome,
    slug: normalizarSlug(valor(formulario, "slug") || nome),
    grupo: valor(formulario, "grupo"),
    imagem: imagem || valor(formulario, "imagem") || atual?.imagem || "",
    metaKg: metaTexto ? Math.max(0, numero(formulario, "metaKg")) : null,
    ativo: marcado(formulario, "ativo"),
    ordem: Math.round(numero(formulario, "ordem")),
  };
}

export async function criarParticipanteAction(eventoId: string, formulario: FormData) {
  await exigirAdmin();
  await criarParticipante(eventoId, await dadosParticipante(formulario));
  revalidatePath(`/admin/eventos/${eventoId}`);
  redirect(`/admin/eventos/${eventoId}?salvo=participante#participantes`);
}

export async function atualizarParticipanteAction(
  eventoId: string,
  id: string,
  formulario: FormData,
) {
  await exigirAdmin();
  const atual = await buscarParticipante(id);
  await atualizarParticipante(id, await dadosParticipante(formulario, atual));
  revalidatePath("/", "layout");
  redirect(`/admin/eventos/${eventoId}?salvo=participante#participantes`);
}

export async function excluirParticipanteAction(eventoId: string, id: string) {
  await exigirAdmin();
  await excluirParticipante(id);
  revalidatePath("/", "layout");
  redirect(`/admin/eventos/${eventoId}?salvo=participante#participantes`);
}

async function dadosPremio(
  formulario: FormData,
  atual?: Awaited<ReturnType<typeof buscarPremio>>,
): Promise<DadosPremio> {
  const nome = valor(formulario, "nome");
  if (!nome) throw new Error("Informe o nome do prêmio.");
  const imagem = await salvarImagem(formulario.get("imagemArquivo"), "premio");
  return {
    nome,
    detalhe: valor(formulario, "detalhe"),
    imagem: imagem || valor(formulario, "imagem") || atual?.imagem || "",
    regra: valor(formulario, "regra"),
    valorMinimo: Math.max(0, numero(formulario, "valorMinimo")),
    ativo: marcado(formulario, "ativo"),
    ordem: Math.round(numero(formulario, "ordem")),
  };
}

export async function criarPremioAction(eventoId: string, formulario: FormData) {
  await exigirAdmin();
  await criarPremio(eventoId, await dadosPremio(formulario));
  revalidatePath("/", "layout");
  redirect(`/admin/eventos/${eventoId}?salvo=premio#premios`);
}

export async function atualizarPremioAction(eventoId: string, id: string, formulario: FormData) {
  await exigirAdmin();
  const atual = await buscarPremio(id);
  await atualizarPremio(id, await dadosPremio(formulario, atual));
  revalidatePath("/", "layout");
  redirect(`/admin/eventos/${eventoId}?salvo=premio#premios`);
}

export async function excluirPremioAction(eventoId: string, id: string) {
  await exigirAdmin();
  await excluirPremio(id);
  revalidatePath("/", "layout");
  redirect(`/admin/eventos/${eventoId}?salvo=premio#premios`);
}

function dadosCampo(formulario: FormData): DadosCampo {
  const rotulo = valor(formulario, "rotulo");
  if (!rotulo) throw new Error("Informe o rótulo do campo.");
  const tipoRecebido = valor(formulario, "tipo");
  const tipo = ["texto", "texto_longo", "selecao", "checkbox"].includes(tipoRecebido)
    ? (tipoRecebido as TipoCampo)
    : "texto";
  const opcoes = valor(formulario, "opcoes")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  if (tipo === "selecao" && !opcoes.length) {
    throw new Error("Campos de seleção precisam ter ao menos uma opção.");
  }
  return {
    chave: normalizarSlug(valor(formulario, "chave") || rotulo).replace(/-/g, "_"),
    rotulo,
    tipo,
    obrigatorio: marcado(formulario, "obrigatorio"),
    placeholder: valor(formulario, "placeholder"),
    opcoes,
    ativo: marcado(formulario, "ativo"),
    ordem: Math.round(numero(formulario, "ordem")),
  };
}

export async function criarCampoAction(eventoId: string, formulario: FormData) {
  await exigirAdmin();
  await criarCampo(eventoId, dadosCampo(formulario));
  revalidatePath(`/admin/eventos/${eventoId}`);
  redirect(`/admin/eventos/${eventoId}?salvo=campo#formulario`);
}

export async function atualizarCampoAction(eventoId: string, id: string, formulario: FormData) {
  await exigirAdmin();
  if (!(await buscarCampo(id))) throw new Error("Campo não encontrado.");
  await atualizarCampo(id, dadosCampo(formulario));
  revalidatePath(`/admin/eventos/${eventoId}`);
  redirect(`/admin/eventos/${eventoId}?salvo=campo#formulario`);
}

export async function excluirCampoAction(eventoId: string, id: string) {
  await exigirAdmin();
  await excluirCampo(id);
  revalidatePath(`/admin/eventos/${eventoId}`);
  redirect(`/admin/eventos/${eventoId}?salvo=campo#formulario`);
}

export async function definirCadastroSorteioAction(
  eventoId: string,
  id: string,
  cadastrado: boolean,
) {
  await exigirAdmin();
  await definirCadastroSorteio(eventoId, id, cadastrado);
  revalidatePath(`/admin/eventos/${eventoId}/cadastro-presencial`);
}

export async function sairAction() {
  await encerrarSessaoAdmin();
  redirect("/admin/login");
}
