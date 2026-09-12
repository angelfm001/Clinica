/**
 * Configuración de desarrollo — UNA SOLA base de datos en Supabase.
 *
 * Toda la app (Security, Patient, Staff, Appointment y ClinicalCare) lee y
 * escribe contra el mismo proyecto Supabase vía `SupabaseClientService`.
 * Ya no hay 5 microservicios ni mock en memoria.
 *
 * Pasos:
 *  1. Crea un proyecto en https://supabase.com
 *  2. Ejecuta `supabase/schema.sql` en el SQL Editor (crea tablas + seeds)
 *  3. Pega aquí tu Project URL y anon public key (Settings > API)
 */
export const environment = {
  production: false,
  supabase: {
    url: 'https://TU-PROYECTO.supabase.co',
    anonKey: 'TU-ANON-PUBLIC-KEY',
  },
  /** Se mantiene por compatibilidad; ya no se usa (todo va a Supabase). */
  useMock: false,
  apiGateway: '',
  api: {
    security: '',
    patient: '',
    staff: '',
    appointment: '',
    clinicalCare: '',
  },
};
