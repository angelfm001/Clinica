/**
 * MedicalAppointments.Security — versión reducida (5 módulos).
 * Solo Usuarios y Roles; el control de acceso se resuelve con el rol incluido
 * en el JWT. No existen Permisos, Rol_Permiso, Sesiones_Usuario ni Auditoría
 * en este prototipo.
 */

export type RolNombre = 'Administrador' | 'Medico' | 'Recepcion';

export interface LoginRequest {
  nombreUsuario: string;
  contrasena: string;
}

export interface LoginResponse {
  token: string;
  expiraEn: string;
  usuario: UsuarioSesion;
}

export interface UsuarioSesion {
  usuarioId: number;
  nombreUsuario: string;
  nombreCompleto: string;
  email: string;
  rol: RolNombre;
  /** Presente solo cuando el usuario está vinculado a un perfil médico (Staff). */
  medicoId?: number | null;
}

export interface Usuario {
  usuarioId: number;
  nombreUsuario: string;
  nombreCompleto: string;
  email: string;
  rolId: number;
  rol: RolNombre;
  /** Vincula la cuenta a un registro de MedicalAppointments.Staff cuando el rol es Médico. */
  medicoId?: number | null;
  activo: boolean;
  ultimoAcceso?: string | null;
  fechaCreacion: string;
}

export interface UsuarioInput {
  nombreUsuario: string;
  nombreCompleto: string;
  email: string;
  contrasena?: string;
  rolId: number;
  medicoId?: number | null;
  activo: boolean;
}

export interface Rol {
  rolId: number;
  nombre: RolNombre | string;
  activo: boolean;
  usuariosAsignados?: number;
}
