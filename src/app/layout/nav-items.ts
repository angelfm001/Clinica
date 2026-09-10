import { RolNombre } from '../core/models/security.model';

export interface NavItem {
  label: string;
  icon: string;
  route: string;
  /** Vacío = visible para todos los roles autenticados. */
  roles?: RolNombre[];
}

/** Navegación principal, armada dinámicamente en el sidebar según el rol activo. */
export const NAV_PRINCIPAL: NavItem[] = [
  { label: 'Inicio', icon: 'home', route: '/inicio' },
  { label: 'Pacientes', icon: 'users', route: '/pacientes' },
  { label: 'Citas', icon: 'calendar', route: '/agenda' },
  { label: 'Clínica', icon: 'stethoscope', route: '/clinica', roles: ['Medico', 'Administrador'] },
  { label: 'Tratamientos', icon: 'pill', route: '/tratamientos', roles: ['Medico', 'Administrador'] },
  { label: 'Personal', icon: 'clipboard', route: '/staff', roles: ['Administrador', 'Recepcion'] },
  { label: 'Reportes', icon: 'chart', route: '/reportes' },
];

/** Navegación administrativa: solo rol Administrador. */
export const NAV_ADMIN: NavItem[] = [
  { label: 'Usuarios y Roles', icon: 'shield', route: '/admin/usuarios', roles: ['Administrador'] },
  { label: 'Configuración', icon: 'settings', route: '/admin/configuracion', roles: ['Administrador'] },
];
