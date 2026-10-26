import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { criarClienteSupabaseServidor } from "./supabase/server";
import type {
  CampoFormulario,
  ConciliacaoEvento,
  DadosCampo,
  DadosEvento,
  DadosParticipante,
  DadosPremio,
  Doacao,
  InscricaoSorteio,
  Evento,
  EventoPublico,
  Participante,
  Premio,
  Ranking,
  StatusEvento,
  TipoCampo,
} from "./modelos";

type Linha = Record<string, unknown>;

const agoraIso = () => new Date().toISOString();
const booleano = (valor: unknown) => valor === true || Number(valor) === 1;
const numero = (valor: unknown, fallback = 0) => {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : fallback;
};
const texto = (valor: unknown, fallback = "") =>
  typeof valor === "string" ? valor : fallback;

function json<T>(valor: unknown, fallback: T): T {
  if (valor && typeof valor === "object") return valor as T;
  try {
    return typeof valor === "string" ? (JSON.parse(valor) as T) : fallback;
  } catch {
    return fallback;
  }
}

function exigirSemErro(erro: { message: string } | null, contexto: string): void {
  if (erro) throw new Error(`${contexto}: ${erro.message}`);
}

const CONFIGURACAO_PADRAO = {
  temParticipantes: true,
  participanteSingular: "atlética",
  participantePlural: "atléticas",
  rotuloNome: "Seu nome",
  placeholderNome: "Como te chamam?",
  pedirTelefone: true,
  telefoneObrigatorio: true,
  metaKg: 100,
  reaisPorKg: 5,
  valorMinimo: 5,
  valorSaco: 125,
  pesoSacoKg: 25,
  valoresSugeridos: [10, 25, 50, 125],
  segundosConfirmacao: 12,
  instagram: "casacaramelo.myn",
  pixChave: "ea6bb940-294b-4730-9d90-0aa5eb08e0fc",
  pixNome: "F C LUCIANO  LTDA",
  pixCidade: "RIO DE JANEIRO",
  pixCodigoEstatico:
    "00020126580014br.gov.bcb.pix0136ea6bb940-294b-4730-9d90-0aa5eb08e0fc5204000053039865802BR5917F C LUCIANO  LTDA6014RIO DE JANEIRO62070503***63044A75",
  pixValorEmbutido: true,
  compartilhamentoAtivo: true,
  textoCompartilhamento:
    "Eu acabei de doar {kg} de ração para {beneficiario} e te convido a doar também.",
  chamadaCompartilhamento: "Compartilhe e convide mais gente para doar",
  recompensaCompartilhamentoTitulo: "Compartilhe e ganhe um bombom",
  recompensaCompartilhamentoDescricao:
    "Marque a Casa Caramelo e mostre o Story no stand para retirar.",
  termoDados:
    "Seus dados serão usados apenas para registrar a doação, organizar o ranking e prestar contas do evento.",
  logoMarca: "/marca/logo/casa-caramelo-amarelo.png",
  logoEvento: "/marca/laf-branco.png",
  corPrimaria: "#FF0197",
  corSecundaria: "#9100E5",
  corDestaque: "#FECB00",
  corFundoCartao: "#FFF4DC",
  premioCompeticaoTitulo: "Prêmio surpresa",
  premioCompeticaoDescricao: "A participante campeã leva um prêmio especial.",
  resultadoPremios: "24 de outubro, às 21h",
} satisfies Omit<
  Evento,
  | "id"
  | "slug"
  | "nome"
  | "subtitulo"
  | "descricao"
  | "beneficiario"
  | "status"
  | "destaque"
  | "inicioEm"
  | "fimEm"
  | "fusoHorario"
  | "criadoEm"
  | "atualizadoEm"
>;

function configuracaoDoEvento(evento: DadosEvento | Evento) {
  return {
    temParticipantes: evento.temParticipantes,
    participanteSingular: evento.participanteSingular,
    participantePlural: evento.participantePlural,
    rotuloNome: evento.rotuloNome,
    placeholderNome: evento.placeholderNome,
    pedirTelefone: evento.pedirTelefone,
    telefoneObrigatorio: evento.telefoneObrigatorio,
    metaKg: evento.metaKg,
    reaisPorKg: evento.reaisPorKg,
    valorMinimo: evento.valorMinimo,
    valorSaco: evento.valorSaco,
    pesoSacoKg: evento.pesoSacoKg,
    valoresSugeridos: evento.valoresSugeridos,
    segundosConfirmacao: evento.segundosConfirmacao,
    instagram: evento.instagram,
    pixChave: evento.pixChave,
    pixNome: evento.pixNome,
    pixCidade: evento.pixCidade,
    pixCodigoEstatico: evento.pixCodigoEstatico,
    pixValorEmbutido: evento.pixValorEmbutido,
    compartilhamentoAtivo: evento.compartilhamentoAtivo,
    textoCompartilhamento: evento.textoCompartilhamento,
    chamadaCompartilhamento: evento.chamadaCompartilhamento,
    recompensaCompartilhamentoTitulo: evento.recompensaCompartilhamentoTitulo,
    recompensaCompartilhamentoDescricao: evento.recompensaCompartilhamentoDescricao,
    termoDados: evento.termoDados,
    logoMarca: evento.logoMarca,
    logoEvento: evento.logoEvento,
    corPrimaria: evento.corPrimaria,
    corSecundaria: evento.corSecundaria,
    corDestaque: evento.corDestaque,
    corFundoCartao: evento.corFundoCartao,
    premioCompeticaoTitulo: evento.premioCompeticaoTitulo,
    premioCompeticaoDescricao: evento.premioCompeticaoDescricao,
    resultadoPremios: evento.resultadoPremios,
  };
}

function mapearEvento(linha: Linha): Evento {
  const configuracao = {
    ...CONFIGURACAO_PADRAO,
    ...json<Partial<typeof CONFIGURACAO_PADRAO>>(linha.config_json, {}),
  };
  return {
    id: texto(linha.id),
    slug: texto(linha.slug),
    nome: texto(linha.name),
    subtitulo: texto(linha.subtitle),
    descricao: texto(linha.description),
    beneficiario: texto(linha.beneficiary),
    status: texto(linha.status, "rascunho") as StatusEvento,
    destaque: booleano(linha.featured),
    inicioEm: texto(linha.starts_at),
    fimEm: texto(linha.ends_at),
    fusoHorario: texto(linha.timezone, "America/Sao_Paulo"),
    ...configuracao,
    criadoEm: texto(linha.created_at),
    atualizadoEm: texto(linha.updated_at),
  };
}

function mapearParticipante(linha: Linha): Participante {
  return {
    id: texto(linha.id),
    eventoId: texto(linha.event_id),
    nome: texto(linha.name),
    slug: texto(linha.slug),
    grupo: texto(linha.group_name),
    imagem: texto(linha.image_url),
    metaKg: linha.goal_kg === null ? null : numero(linha.goal_kg),
    ativo: booleano(linha.active),
    ordem: numero(linha.sort_order),
  };
}

function mapearPremio(linha: Linha): Premio {
  return {
    id: texto(linha.id),
    eventoId: texto(linha.event_id),
    nome: texto(linha.name),
    detalhe: texto(linha.detail),
    imagem: texto(linha.image_url),
    regra: texto(linha.rule_text),
    valorMinimo: numero(linha.minimum_amount),
    ativo: booleano(linha.active),
    ordem: numero(linha.sort_order),
  };
}

function mapearCampo(linha: Linha): CampoFormulario {
  return {
    id: texto(linha.id),
    eventoId: texto(linha.event_id),
    chave: texto(linha.field_key),
    rotulo: texto(linha.label),
    tipo: texto(linha.field_type, "texto") as TipoCampo,
    obrigatorio: booleano(linha.required),
    placeholder: texto(linha.placeholder),
    opcoes: json<string[]>(linha.options_json, []),
    ativo: booleano(linha.active),
    ordem: numero(linha.sort_order),
  };
}

function mapearDoacao(linha: Linha): Doacao {
  return {
    id: texto(linha.id),
    eventoId: texto(linha.event_id),
    participanteId: linha.participant_id ? texto(linha.participant_id) : null,
    nome: texto(linha.donor_name),
    telefone: texto(linha.donor_phone),
    valor: numero(linha.amount),
    pesoKg: numero(linha.weight_kg),
    respostas: json<Record<string, string | boolean>>(linha.answers_json, {}),
    criadoEm: texto(linha.created_at),
    confirmadoEm: linha.confirmed_at ? texto(linha.confirmed_at) : null,
    compartilhadoEm: linha.shared_at ? texto(linha.shared_at) : null,
  };
}

function mapearInscricaoSorteio(linha: Linha): InscricaoSorteio {
  return {
    id: texto(linha.id),
    eventoId: texto(linha.event_id),
    nome: texto(linha.name),
    telefone: texto(linha.phone),
    cadastradoEm: linha.registered_at ? texto(linha.registered_at) : null,
  };
}

export function normalizarSlug(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

export function dadosNovoEvento(): DadosEvento {
  const inicio = new Date();
  const fim = new Date(inicio.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    slug: "novo-evento",
    nome: "Novo evento",
    subtitulo: "Campanha Casa Caramelo",
    descricao: "Ajude esta campanha e acompanhe o impacto da sua doação.",
    beneficiario: "os aumigos que precisam",
    status: "rascunho",
    destaque: false,
    inicioEm: inicio.toISOString(),
    fimEm: fim.toISOString(),
    fusoHorario: "America/Sao_Paulo",
    ...CONFIGURACAO_PADRAO,
    logoEvento: "",
    premioCompeticaoTitulo: "",
    premioCompeticaoDescricao: "",
    resultadoPremios: "",
  };
}

export async function verificarPersistencia(): Promise<void> {
  const supabase = await criarClienteSupabaseServidor();
  const { error } = await supabase.from("events").select("id", { head: true, count: "exact" });
  exigirSemErro(error, "Supabase indisponível");
}

export async function listarEventosAdmin(): Promise<Evento[]> {
  const supabase = await criarClienteSupabaseServidor();
  const { data, error } = await supabase.from("events").select("*").order("starts_at", { ascending: false });
  exigirSemErro(error, "Não foi possível listar os eventos");
  return ((data ?? []) as Linha[]).map(mapearEvento);
}

export async function listarEventosPublicos(): Promise<EventoPublico[]> {
  const supabase = await criarClienteSupabaseServidor();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .neq("status", "rascunho")
    .order("featured", { ascending: false })
    .order("starts_at", { ascending: false });
  exigirSemErro(error, "Não foi possível listar os eventos");
  return Promise.all(((data ?? []) as Linha[]).map((linha) => completarEvento(mapearEvento(linha), true)));
}

export async function buscarEventoPorId(id: string): Promise<Evento | null> {
  const supabase = await criarClienteSupabaseServidor();
  const { data, error } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  exigirSemErro(error, "Não foi possível buscar o evento");
  return data ? mapearEvento(data as Linha) : null;
}

export async function buscarEventoPorSlug(slug: string): Promise<Evento | null> {
  const supabase = await criarClienteSupabaseServidor();
  const { data, error } = await supabase.from("events").select("*").eq("slug", slug).maybeSingle();
  exigirSemErro(error, "Não foi possível buscar o evento");
  return data ? mapearEvento(data as Linha) : null;
}

export async function buscarEventoDestaque(): Promise<EventoPublico | null> {
  const supabase = await criarClienteSupabaseServidor();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .neq("status", "rascunho")
    .order("featured", { ascending: false })
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  exigirSemErro(error, "Não foi possível buscar o evento principal");
  return data ? completarEvento(mapearEvento(data as Linha), true) : null;
}

export async function buscarEventoPublicoPorSlug(slug: string): Promise<EventoPublico | null> {
  const evento = await buscarEventoPorSlug(slug);
  if (!evento || evento.status === "rascunho") return null;
  return completarEvento(evento, true);
}

export async function buscarEventoCompletoPorId(id: string): Promise<EventoPublico | null> {
  const evento = await buscarEventoPorId(id);
  return evento ? completarEvento(evento, false) : null;
}

async function completarEvento(evento: Evento, apenasAtivos: boolean): Promise<EventoPublico> {
  const [participantes, premios, campos] = await Promise.all([
    listarParticipantes(evento.id, apenasAtivos),
    listarPremios(evento.id, apenasAtivos),
    listarCampos(evento.id, apenasAtivos),
  ]);
  return { ...evento, participantes, premios, campos, aberto: eventoEstaAberto(evento) };
}

export function eventoEstaAberto(evento: Evento, instante = new Date()): boolean {
  if (evento.status !== "publicado") return false;
  const agora = instante.getTime();
  return agora >= new Date(evento.inicioEm).getTime() && agora <= new Date(evento.fimEm).getTime();
}

export async function criarEvento(dados: DadosEvento): Promise<Evento> {
  const supabase = await criarClienteSupabaseServidor();
  if (dados.destaque) {
    const { error } = await supabase.from("events").update({ featured: false }).eq("featured", true);
    exigirSemErro(error, "Não foi possível alterar o evento principal");
  }
  const { data, error } = await supabase
    .from("events")
    .insert({
      id: randomUUID(), slug: dados.slug, name: dados.nome, subtitle: dados.subtitulo,
      description: dados.descricao, beneficiary: dados.beneficiario, status: dados.status,
      featured: dados.destaque, starts_at: dados.inicioEm, ends_at: dados.fimEm,
      timezone: dados.fusoHorario, config_json: configuracaoDoEvento(dados),
    })
    .select("*")
    .single();
  exigirSemErro(error, "Não foi possível criar o evento");
  return mapearEvento(data as Linha);
}

export async function atualizarEvento(id: string, dados: DadosEvento): Promise<Evento> {
  const supabase = await criarClienteSupabaseServidor();
  if (dados.destaque) {
    const { error } = await supabase.from("events").update({ featured: false }).neq("id", id);
    exigirSemErro(error, "Não foi possível alterar o evento principal");
  }
  const { data, error } = await supabase
    .from("events")
    .update({
      slug: dados.slug, name: dados.nome, subtitle: dados.subtitulo,
      description: dados.descricao, beneficiary: dados.beneficiario, status: dados.status,
      featured: dados.destaque, starts_at: dados.inicioEm, ends_at: dados.fimEm,
      timezone: dados.fusoHorario, config_json: configuracaoDoEvento(dados),
    })
    .eq("id", id)
    .select("*")
    .single();
  exigirSemErro(error, "Não foi possível atualizar o evento");
  return mapearEvento(data as Linha);
}

export async function excluirEvento(id: string): Promise<void> {
  const supabase = await criarClienteSupabaseServidor();
  const { error } = await supabase.from("events").delete().eq("id", id);
  exigirSemErro(error, "Não foi possível excluir o evento");
}

export async function listarParticipantes(eventoId: string, apenasAtivos = false): Promise<Participante[]> {
  const supabase = await criarClienteSupabaseServidor();
  let consulta = supabase.from("participants").select("*").eq("event_id", eventoId);
  if (apenasAtivos) consulta = consulta.eq("active", true);
  const { data, error } = await consulta.order("sort_order").order("name");
  exigirSemErro(error, "Não foi possível listar os participantes");
  return ((data ?? []) as Linha[]).map(mapearParticipante);
}

export async function buscarParticipante(id: string): Promise<Participante | null> {
  const supabase = await criarClienteSupabaseServidor();
  const { data, error } = await supabase.from("participants").select("*").eq("id", id).maybeSingle();
  exigirSemErro(error, "Não foi possível buscar o participante");
  return data ? mapearParticipante(data as Linha) : null;
}

export async function criarParticipante(eventoId: string, dados: DadosParticipante): Promise<Participante> {
  const supabase = await criarClienteSupabaseServidor();
  const { data, error } = await supabase.from("participants").insert({
    id: randomUUID(), event_id: eventoId, name: dados.nome, slug: dados.slug,
    group_name: dados.grupo, image_url: dados.imagem, goal_kg: dados.metaKg,
    active: dados.ativo, sort_order: dados.ordem,
  }).select("*").single();
  exigirSemErro(error, "Não foi possível criar o participante");
  return mapearParticipante(data as Linha);
}

export async function atualizarParticipante(id: string, dados: DadosParticipante): Promise<Participante> {
  const supabase = await criarClienteSupabaseServidor();
  const { data, error } = await supabase.from("participants").update({
    name: dados.nome, slug: dados.slug, group_name: dados.grupo, image_url: dados.imagem,
    goal_kg: dados.metaKg, active: dados.ativo, sort_order: dados.ordem,
  }).eq("id", id).select("*").single();
  exigirSemErro(error, "Não foi possível atualizar o participante");
  return mapearParticipante(data as Linha);
}

export async function excluirParticipante(id: string): Promise<void> {
  const supabase = await criarClienteSupabaseServidor();
  const { count, error: erroContagem } = await supabase
    .from("donations").select("id", { head: true, count: "exact" }).eq("participant_id", id);
  exigirSemErro(erroContagem, "Não foi possível verificar as doações");
  const operacao = count
    ? supabase.from("participants").update({ active: false }).eq("id", id)
    : supabase.from("participants").delete().eq("id", id);
  const { error } = await operacao;
  exigirSemErro(error, "Não foi possível remover o participante");
}

export async function listarPremios(eventoId: string, apenasAtivos = false): Promise<Premio[]> {
  const supabase = await criarClienteSupabaseServidor();
  let consulta = supabase.from("prizes").select("*").eq("event_id", eventoId);
  if (apenasAtivos) consulta = consulta.eq("active", true);
  const { data, error } = await consulta.order("sort_order").order("name");
  exigirSemErro(error, "Não foi possível listar os prêmios");
  return ((data ?? []) as Linha[]).map(mapearPremio);
}

export async function buscarPremio(id: string): Promise<Premio | null> {
  const supabase = await criarClienteSupabaseServidor();
  const { data, error } = await supabase.from("prizes").select("*").eq("id", id).maybeSingle();
  exigirSemErro(error, "Não foi possível buscar o prêmio");
  return data ? mapearPremio(data as Linha) : null;
}

export async function criarPremio(eventoId: string, dados: DadosPremio): Promise<Premio> {
  const supabase = await criarClienteSupabaseServidor();
  const { data, error } = await supabase.from("prizes").insert({
    id: randomUUID(), event_id: eventoId, name: dados.nome, detail: dados.detalhe,
    image_url: dados.imagem, rule_text: dados.regra, minimum_amount: dados.valorMinimo,
    active: dados.ativo, sort_order: dados.ordem,
  }).select("*").single();
  exigirSemErro(error, "Não foi possível criar o prêmio");
  return mapearPremio(data as Linha);
}

export async function atualizarPremio(id: string, dados: DadosPremio): Promise<Premio> {
  const supabase = await criarClienteSupabaseServidor();
  const { data, error } = await supabase.from("prizes").update({
    name: dados.nome, detail: dados.detalhe, image_url: dados.imagem, rule_text: dados.regra,
    minimum_amount: dados.valorMinimo, active: dados.ativo, sort_order: dados.ordem,
  }).eq("id", id).select("*").single();
  exigirSemErro(error, "Não foi possível atualizar o prêmio");
  return mapearPremio(data as Linha);
}

export async function excluirPremio(id: string): Promise<void> {
  const supabase = await criarClienteSupabaseServidor();
  const { error } = await supabase.from("prizes").delete().eq("id", id);
  exigirSemErro(error, "Não foi possível excluir o prêmio");
}

export async function listarCampos(eventoId: string, apenasAtivos = false): Promise<CampoFormulario[]> {
  const supabase = await criarClienteSupabaseServidor();
  let consulta = supabase.from("form_fields").select("*").eq("event_id", eventoId);
  if (apenasAtivos) consulta = consulta.eq("active", true);
  const { data, error } = await consulta.order("sort_order").order("label");
  exigirSemErro(error, "Não foi possível listar os campos");
  return ((data ?? []) as Linha[]).map(mapearCampo);
}

export async function buscarCampo(id: string): Promise<CampoFormulario | null> {
  const supabase = await criarClienteSupabaseServidor();
  const { data, error } = await supabase.from("form_fields").select("*").eq("id", id).maybeSingle();
  exigirSemErro(error, "Não foi possível buscar o campo");
  return data ? mapearCampo(data as Linha) : null;
}

export async function criarCampo(eventoId: string, dados: DadosCampo): Promise<CampoFormulario> {
  const supabase = await criarClienteSupabaseServidor();
  const { data, error } = await supabase.from("form_fields").insert({
    id: randomUUID(), event_id: eventoId, field_key: dados.chave, label: dados.rotulo,
    field_type: dados.tipo, required: dados.obrigatorio, placeholder: dados.placeholder,
    options_json: dados.opcoes, active: dados.ativo, sort_order: dados.ordem,
  }).select("*").single();
  exigirSemErro(error, "Não foi possível criar o campo");
  return mapearCampo(data as Linha);
}

export async function atualizarCampo(id: string, dados: DadosCampo): Promise<CampoFormulario> {
  const supabase = await criarClienteSupabaseServidor();
  const { data, error } = await supabase.from("form_fields").update({
    field_key: dados.chave, label: dados.rotulo, field_type: dados.tipo,
    required: dados.obrigatorio, placeholder: dados.placeholder, options_json: dados.opcoes,
    active: dados.ativo, sort_order: dados.ordem,
  }).eq("id", id).select("*").single();
  exigirSemErro(error, "Não foi possível atualizar o campo");
  return mapearCampo(data as Linha);
}

export async function excluirCampo(id: string): Promise<void> {
  const supabase = await criarClienteSupabaseServidor();
  const { error } = await supabase.from("form_fields").delete().eq("id", id);
  exigirSemErro(error, "Não foi possível excluir o campo");
}

export async function criarDoacao(dados: {
  eventoId: string;
  participanteId: string | null;
  nome: string;
  telefone: string;
  valor: number;
  pesoKg: number;
  respostas: Record<string, string | boolean>;
}): Promise<{ doacao: Doacao; tokenConfirmacao: string }> {
  const supabase = await criarClienteSupabaseServidor();
  const id = randomUUID();
  const criadoEm = agoraIso();
  const tokenConfirmacao = randomBytes(32).toString("hex");
  const claimTokenHash = createHash("sha256").update(tokenConfirmacao).digest("hex");
  const { error } = await supabase.from("donations").insert({
    id, event_id: dados.eventoId, participant_id: dados.participanteId,
    donor_name: dados.nome, donor_phone: dados.telefone,
    amount: dados.valor, weight_kg: dados.pesoKg,
    answers_json: dados.respostas, claim_token_hash: claimTokenHash,
  });
  exigirSemErro(error, "Não foi possível registrar a doação");
  return {
    tokenConfirmacao,
    doacao: {
      id, eventoId: dados.eventoId, participanteId: dados.participanteId,
      nome: dados.nome, telefone: dados.telefone,
      valor: dados.valor, pesoKg: dados.pesoKg,
      respostas: dados.respostas, criadoEm, confirmadoEm: null, compartilhadoEm: null,
    },
  };
}

export async function confirmarDoacao(id: string, token: string): Promise<Doacao | null> {
  const supabase = await criarClienteSupabaseServidor();
  const { data, error } = await supabase.rpc("confirm_donation", { p_id: id, p_token: token });
  exigirSemErro(error, "Não foi possível confirmar a doação");
  return data ? mapearDoacao(data as Linha) : null;
}

export async function registrarCompartilhamento(id: string, token: string): Promise<boolean> {
  const supabase = await criarClienteSupabaseServidor();
  const { data, error } = await supabase.rpc("register_donation_share", { p_id: id, p_token: token });
  exigirSemErro(error, "Não foi possível registrar o compartilhamento");
  return data === true;
}

export async function listarDoacoesEvento(eventoId: string): Promise<Doacao[]> {
  const supabase = await criarClienteSupabaseServidor();
  const { data, error } = await supabase.from("donations").select("*").eq("event_id", eventoId).order("created_at", { ascending: false });
  exigirSemErro(error, "Não foi possível listar as doações");
  return ((data ?? []) as Linha[]).map(mapearDoacao);
}

/* A lista do painel é operacional: durante o evento a pergunta é "fulano
   doou?", não "quantos quilos no total". Por isso busca por nome ou telefone e
   páginas curtas, em vez de despejar tudo de uma vez. */
export async function listarDoacoesPainel(
  eventoId: string,
  { busca = "", pagina = 1, porPagina = 50 }: { busca?: string; pagina?: number; porPagina?: number } = {},
): Promise<{ doacoes: Doacao[]; total: number }> {
  const supabase = await criarClienteSupabaseServidor();
  const inicio = Math.max(0, (pagina - 1) * porPagina);
  let consulta = supabase.from("donations").select("*", { count: "exact" }).eq("event_id", eventoId);

  const termo = busca.trim();
  if (termo) {
    /* Vírgula, parêntese e asterisco são a sintaxe do filtro do PostgREST: sem
       limpá-los, um nome com vírgula viraria outro filtro. */
    const texto = termo.replace(/[,()*\\%]/g, " ").trim();
    const digitos = termo.replace(/\D/g, "");
    const filtros: string[] = [];
    if (texto) filtros.push(`donor_name.ilike.%${texto}%`);
    if (digitos.length >= 3) filtros.push(`donor_phone.ilike.%${digitos}%`);
    if (filtros.length) consulta = consulta.or(filtros.join(","));
  }

  const { data, error, count } = await consulta
    .order("created_at", { ascending: false })
    .range(inicio, inicio + porPagina - 1);
  exigirSemErro(error, "Não foi possível listar as doações");
  return { doacoes: ((data ?? []) as Linha[]).map(mapearDoacao), total: count ?? 0 };
}

/* Duas contagens porque elas contam coisas diferentes: quem confirmou o PIX e
   quem preencheu o formulário e desistiu no meio. A diferença é informação. */
export async function resumoDoacoesEvento(eventoId: string): Promise<{ total: number; confirmadas: number }> {
  const supabase = await criarClienteSupabaseServidor();
  const base = () => supabase.from("donations").select("id", { head: true, count: "exact" }).eq("event_id", eventoId);
  const [todas, confirmadas] = await Promise.all([base(), base().not("confirmed_at", "is", null)]);
  exigirSemErro(todas.error, "Não foi possível contar as doações");
  exigirSemErro(confirmadas.error, "Não foi possível contar as doações confirmadas");
  return { total: todas.count ?? 0, confirmadas: confirmadas.count ?? 0 };
}

export async function buscarConciliacaoEvento(
  eventoId: string,
  participanteIds: string[],
): Promise<ConciliacaoEvento | null> {
  const supabase = await criarClienteSupabaseServidor();
  const [financeiro, resultados] = await Promise.all([
    supabase
      .from("event_financial_reconciliations")
      .select("*")
      .eq("event_id", eventoId)
      .maybeSingle(),
    participanteIds.length
      ? supabase
          .from("participant_reconciliations")
          .select("participant_id,amount,weight_kg,donation_count")
          .in("participant_id", participanteIds)
          .order("amount", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);
  exigirSemErro(financeiro.error, "Não foi possível buscar a conciliação financeira");
  exigirSemErro(resultados.error, "Não foi possível buscar o ranking conciliado");
  if (!financeiro.data) return null;

  const linha = financeiro.data as Linha;
  return {
    eventoId: texto(linha.event_id),
    transferenciasVerificadas: numero(linha.verified_transfers),
    totalAtleticas: numero(linha.athletics_total),
    transferenciasSemAtletica: numero(linha.unattributed_transfers),
    clientesLoja: numero(linha.store_clients),
    vizantu: numero(linha.vizantu),
    emporioVint3: numero(linha.emporio_vint3),
    totalGeral: numero(linha.official_total),
    observacoes: texto(linha.notes),
    atualizadoEm: texto(linha.updated_at),
    ranking: ((resultados.data ?? []) as Linha[]).map((resultado) => ({
      participanteId: texto(resultado.participant_id),
      valor: numero(resultado.amount),
      pesoKg: numero(resultado.weight_kg),
      doacoes: numero(resultado.donation_count),
    })),
  };
}

export async function listarInscricoesSorteio(
  eventoId: string,
  { busca = "", situacao = "todos" }: { busca?: string; situacao?: string } = {},
): Promise<InscricaoSorteio[]> {
  const supabase = await criarClienteSupabaseServidor();
  let consulta = supabase
    .from("raffle_entries")
    .select("id,event_id,source_key,name,phone,registered_at")
    .eq("event_id", eventoId);

  const termo = busca.trim();
  if (termo) {
    const nome = termo.replace(/[,()*\\%]/g, " ").trim();
    const telefone = termo.replace(/\D/g, "");
    const filtros: string[] = [];
    if (nome) filtros.push(`name.ilike.%${nome}%`);
    if (telefone.length >= 3) filtros.push(`phone.ilike.%${telefone}%`);
    if (filtros.length) consulta = consulta.or(filtros.join(","));
  }
  if (situacao === "pendentes") consulta = consulta.is("registered_at", null);
  if (situacao === "cadastrados") consulta = consulta.not("registered_at", "is", null);

  const { data, error } = await consulta.order("name").order("source_key");
  exigirSemErro(error, "Não foi possível listar o cadastro presencial");
  return ((data ?? []) as Linha[]).map(mapearInscricaoSorteio);
}

export async function resumoInscricoesSorteio(
  eventoId: string,
): Promise<{ total: number; cadastrados: number }> {
  const supabase = await criarClienteSupabaseServidor();
  const base = () => supabase
    .from("raffle_entries")
    .select("id", { head: true, count: "exact" })
    .eq("event_id", eventoId);
  const [todas, cadastradas] = await Promise.all([
    base(),
    base().not("registered_at", "is", null),
  ]);
  exigirSemErro(todas.error, "Não foi possível contar a lista presencial");
  exigirSemErro(cadastradas.error, "Não foi possível contar os cadastros presenciais");
  return { total: todas.count ?? 0, cadastrados: cadastradas.count ?? 0 };
}

export async function definirCadastroSorteio(
  eventoId: string,
  id: string,
  cadastrado: boolean,
): Promise<void> {
  const supabase = await criarClienteSupabaseServidor();
  const { error } = await supabase
    .from("raffle_entries")
    .update({ registered_at: cadastrado ? agoraIso() : null })
    .eq("id", id)
    .eq("event_id", eventoId);
  exigirSemErro(error, "Não foi possível atualizar o cadastro presencial");
}

export async function contarDoacoesEvento(eventoId: string): Promise<number> {
  const supabase = await criarClienteSupabaseServidor();
  const { count, error } = await supabase.from("donations").select("id", { head: true, count: "exact" }).eq("event_id", eventoId).not("confirmed_at", "is", null);
  exigirSemErro(error, "Não foi possível contar as doações");
  return count ?? 0;
}

export async function calcularRanking(eventoId?: string): Promise<Ranking | null> {
  const evento = eventoId ? await buscarEventoPorId(eventoId) : await buscarEventoDestaque();
  if (!evento) return null;
  const eventoBase = "participantes" in evento ? evento : await completarEvento(evento, true);
  const supabase = await criarClienteSupabaseServidor();
  const [{ data, error }, resumoFinanceiro] = await Promise.all([
    supabase.rpc("get_event_ranking", { p_event_id: eventoBase.id }),
    supabase
      .from("event_financial_reconciliations")
      .select("verified_transfers,athletics_total,unattributed_transfers,store_clients,vizantu,emporio_vint3,official_total")
      .eq("event_id", eventoBase.id)
      .maybeSingle(),
  ]);
  exigirSemErro(error, "Não foi possível calcular o ranking");
  exigirSemErro(resumoFinanceiro.error, "Não foi possível buscar o resumo geral");
  if (!data) return null;
  const resultado = data as { rows?: Linha[]; donations?: unknown; weight_kg?: unknown; amount?: unknown };
  const linhas = (resultado.rows ?? []).map((linha) => {
    const metaKg = linha.goal_kg === null ? eventoBase.metaKg : numero(linha.goal_kg);
    const pesoKg = Math.round(numero(linha.weight_kg) * 100) / 100;
    return {
      participanteId: texto(linha.id), nome: texto(linha.name), grupo: texto(linha.group_name),
      imagem: texto(linha.image_url), metaKg, pesoKg,
      percentual: metaKg > 0 ? Math.round((pesoKg / metaKg) * 1000) / 10 : 0,
      bateuMeta: metaKg > 0 && pesoKg >= metaKg,
      reais: Math.round(numero(linha.amount) * 100) / 100,
      doacoes: numero(linha.donations),
    };
  });
  return {
    evento: {
      id: eventoBase.id, slug: eventoBase.slug, nome: eventoBase.nome,
      subtitulo: eventoBase.subtitulo, participanteSingular: eventoBase.participanteSingular,
      participantePlural: eventoBase.participantePlural, logoMarca: eventoBase.logoMarca,
      logoEvento: eventoBase.logoEvento, premioCompeticaoTitulo: eventoBase.premioCompeticaoTitulo,
      premioCompeticaoDescricao: eventoBase.premioCompeticaoDescricao,
      corPrimaria: eventoBase.corPrimaria, corSecundaria: eventoBase.corSecundaria,
      corDestaque: eventoBase.corDestaque, corFundoCartao: eventoBase.corFundoCartao,
    },
    linhas,
    metaKg: eventoBase.metaKg,
    totalKg: Math.round(numero(resultado.weight_kg) * 100) / 100,
    totalReais: Math.round(numero(resultado.amount) * 100) / 100,
    doacoes: numero(resultado.donations),
    participantesNaMeta: linhas.filter((linha) => linha.bateuMeta).length,
    resumoGeral: resumoFinanceiro.data ? {
      transferenciasVerificadas: numero(resumoFinanceiro.data.verified_transfers),
      totalAtleticas: numero(resumoFinanceiro.data.athletics_total),
      transferenciasSemAtletica: numero(resumoFinanceiro.data.unattributed_transfers),
      clientesLoja: numero(resumoFinanceiro.data.store_clients),
      vizantu: numero(resumoFinanceiro.data.vizantu),
      emporioVint3: numero(resumoFinanceiro.data.emporio_vint3),
      totalGeral: numero(resumoFinanceiro.data.official_total),
    } : null,
    atualizadoEm: agoraIso(),
  };
}
