export type EntityStatus = 'ativo' | 'inativo' | 'em_servico' | 'manutencao' | string;

export interface BaseRecord {
  id?: number | string;
  created_at?: string;
  updated_at?: string;
}

export interface Cliente extends BaseRecord {
  razao_social?: string;
  nome_fantasia?: string;
  cnpj?: string;
  cpf_cnpj?: string;
  cidade?: string;
  obra?: string;
  telefone?: string;
  status?: EntityStatus;
}

export interface Equipamento extends BaseRecord {
  nome?: string;
  modelo?: string;
  placa?: string;
  operador?: string;
  status?: EntityStatus;
  icone?: string;
}

export interface Funcionario extends BaseRecord {
  nome?: string;
  cargo?: string;
  telefone?: string;
  maquina?: string;
  status?: EntityStatus;
  dias?: number;
}

export interface Material extends BaseRecord {
  nome?: string;
  unidade?: string;
  unidades?: string[] | string;
  status?: EntityStatus;
}

export interface Barreiro extends BaseRecord {
  nome?: string;
  cidade?: string;
  status?: EntityStatus;
}

export interface Orcamento extends BaseRecord {
  cliente?: string;
  tipo?: string;
  equipamento?: string;
  valor?: number | string;
  status?: EntityStatus;
}

export interface Ficha extends BaseRecord {
  codigo?: string | number;
  data?: string;
  operador?: string;
  maquina?: string;
  placa?: string;
  turno?: string;
  status?: EntityStatus;
}

export interface FichaServico extends BaseRecord {
  ficha_id?: string | number;
  cliente?: string;
  obra?: string;
  nota_pedido?: string;
  tipo?: string;
  material?: string;
  barreiro?: string;
  descricao?: string;
  unidade?: string;
  quantidade?: number | string;
  valor?: number | string;
  pago?: boolean;
}

export interface CoreData {
  clientes: Cliente[];
  equipamentos: Equipamento[];
  funcionarios: Funcionario[];
  materiais: Material[];
  barreiros: Barreiro[];
  orcamentos: Orcamento[];
  fichas: Ficha[];
  ficha_servicos: FichaServico[];
}
