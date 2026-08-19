import {
  BarChart3,
  Building2,
  CalendarDays,
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
  { id: 'ficha', label: 'Ficha Diaria', icon: CalendarDays, group: 'Principal' },
  { id: 'clientes', label: 'Clientes', icon: Users, group: 'Operacao' },
  { id: 'obras', label: 'Obras', icon: Building2, group: 'Operacao' },
  { id: 'equipamentos', label: 'Equipamentos', icon: Truck, group: 'Operacao' },
  { id: 'funcionarios', label: 'Funcionarios', icon: UserRoundCog, group: 'Operacao' },
  { id: 'materiais', label: 'Materiais', icon: Package, group: 'Operacao' },
  { id: 'barreiros', label: 'Barreiros', icon: MapPin, group: 'Operacao' },
  { id: 'relatorios', label: 'Central de Relatorios', icon: FileText, group: 'Relatorios' },
  { id: 'horas', label: 'Horas Funcionarios', icon: Clock3, group: 'Relatorios' },
];

export const quickCreateItems = [
  { id: 'cliente', label: 'Novo Cliente', icon: Users },
  { id: 'equipamento', label: 'Novo Equipamento', icon: Truck },
  { id: 'funcionario', label: 'Novo Funcionario', icon: UserRoundCog },
  { id: 'material', label: 'Novo Material', icon: Package },
  { id: 'barreiro', label: 'Novo Barreiro', icon: MapPin },
];
