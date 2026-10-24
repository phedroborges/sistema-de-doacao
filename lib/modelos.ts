export type StatusEvento = "rascunho" | "publicado" | "encerrado";
export type TipoCampo = "texto" | "texto_longo" | "selecao" | "checkbox";

export type Evento = {
  id: string;
  slug: string;
  nome: string;
  subtitulo: string;
  descricao: string;
  beneficiario: string;
  status: StatusEvento;
  destaque: boolean;
  inicioEm: string;
  fimEm: string;
  fusoHorario: string;
  temParticipantes: boolean;
  participanteSingular: string;
  participantePlural: string;
  rotuloNome: string;
  placeholderNome: string;
  pedirTelefone: boolean;
  telefoneObrigatorio: boolean;
  metaKg: number;
  reaisPorKg: number;
  valorMinimo: number;
  valorSaco: number;
  pesoSacoKg: number;
  valoresSugeridos: number[];
  segundosConfirmacao: number;
  instagram: string;
  pixChave: string;
  pixNome: string;
  pixCidade: string;
  pixCodigoEstatico: string;
  pixValorEmbutido: boolean;
  compartilhamentoAtivo: boolean;
  textoCompartilhamento: string;
  chamadaCompartilhamento: string;
  recompensaCompartilhamentoTitulo: string;
  recompensaCompartilhamentoDescricao: string;
  termoDados: string;
  logoMarca: string;
  logoEvento: string;
  corPrimaria: string;
  corSecundaria: string;
  corDestaque: string;
  corFundoCartao: string;
  premioCompeticaoTitulo: string;
  premioCompeticaoDescricao: string;
  resultadoPremios: string;
  criadoEm: string;
  atualizadoEm: string;
};

export type Participante = {
  id: string;
  eventoId: string;
  nome: string;
  slug: string;
  grupo: string;
  imagem: string;
  metaKg: number | null;
  ativo: boolean;
  ordem: number;
};

export type Premio = {
  id: string;
  eventoId: string;
  nome: string;
  detalhe: string;
  imagem: string;
  regra: string;
  valorMinimo: number;
  ativo: boolean;
  ordem: number;
};

export type CampoFormulario = {
  id: string;
  eventoId: string;
  chave: string;
  rotulo: string;
  tipo: TipoCampo;
  obrigatorio: boolean;
  placeholder: string;
  opcoes: string[];
  ativo: boolean;
  ordem: number;
};

export type EventoPublico = Evento & {
  participantes: Participante[];
  premios: Premio[];
  campos: CampoFormulario[];
  aberto: boolean;
};

export type Doacao = {
  id: string;
  eventoId: string;
  participanteId: string | null;
  nome: string;
  telefone: string;
  valor: number;
  pesoKg: number;
  respostas: Record<string, string | boolean>;
  criadoEm: string;
  confirmadoEm: string | null;
  compartilhadoEm: string | null;
};

export type InscricaoSorteio = {
  id: string;
  eventoId: string;
  nome: string;
  telefone: string;
  cadastradoEm: string | null;
};

export type LinhaRanking = {
  participanteId: string;
  nome: string;
  grupo: string;
  imagem: string;
  metaKg: number;
  pesoKg: number;
  percentual: number;
  bateuMeta: boolean;
  reais: number;
  doacoes: number;
};

export type Ranking = {
  evento: Pick<
    Evento,
    | "id"
    | "slug"
    | "nome"
    | "subtitulo"
    | "participanteSingular"
    | "participantePlural"
    | "logoMarca"
    | "logoEvento"
    | "premioCompeticaoTitulo"
    | "premioCompeticaoDescricao"
    | "corPrimaria"
    | "corSecundaria"
    | "corDestaque"
    | "corFundoCartao"
  >;
  linhas: LinhaRanking[];
  metaKg: number;
  totalKg: number;
  totalReais: number;
  doacoes: number;
  participantesNaMeta: number;
  atualizadoEm: string;
};

export type DadosEvento = Omit<Evento, "id" | "criadoEm" | "atualizadoEm">;
export type DadosParticipante = Omit<Participante, "id" | "eventoId">;
export type DadosPremio = Omit<Premio, "id" | "eventoId">;
export type DadosCampo = Omit<CampoFormulario, "id" | "eventoId">;
