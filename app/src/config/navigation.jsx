import {
  BarChart3,
  Boxes,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  FileText,
  MapPin,
  Package,
  Truck,
  UserRoundCog,
  Users,
} from 'lucide-react';

export const views = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, group: 'Principal' },
  { id: 'ficha', label: 'Ficha Diária', icon: CalendarDays, group: 'Principal' },
  { id: 'clientes', label: 'Clientes', icon: Users, group: 'Operação' },
  { id: 'equipamentos', label: 'Equipamentos', icon: Truck, group: 'Operação' },
  { id: 'funcionarios', label: 'Funcionários', icon: UserRoundCog, group: 'Operação' },
  { id: 'materiais', label: 'Materiais', icon: Package, group: 'Operação' },
  { id: 'barreiros', label: 'Barreiros', icon: MapPin, group: 'Operação' },
  { id: 'orcamentos', label: 'Orçamentos', icon: CircleDollarSign, group: 'Orçamento' },
  { id: 'relatorios', label: 'Central de Relatórios', icon: FileText, group: 'Relatórios' },
  { id: 'horas', label: 'Horas Funcionários', icon: Clock3, group: 'Relatórios' },
];

export const quickCreateItems = [
  { id: 'cliente', label: 'Novo Cliente', icon: Users },
  { id: 'equipamento', label: 'Novo Equipamento', icon: Truck },
  { id: 'funcionario', label: 'Novo Funcionário', icon: UserRoundCog },
  { id: 'material', label: 'Novo Material', icon: Package },
  { id: 'barreiro', label: 'Novo Barreiro', icon: MapPin },
  { id: 'orcamento', label: 'Novo Orçamento', icon: Boxes },
];
