/**
 * Configuración de desarrollo — UNA SOLA base de datos en Supabase.
 *
 * Toda la app (Security, Patient, Staff, Appointment y ClinicalCare) lee y
 * escribe contra el mismo proyecto Supabase vía `SupabaseClientService`.
 * Ya no hay 5 microservicios ni mock en memoria.
 *
 * Proyecto: clinicadb
 * URL: https://zhpjysqufzvhxtkklxst.supabase.co
 */
export const environment = {
  production: false,
  supabase: {
    url: 'https://zhpjysqufzvhxtkklxst.supabase.co',
    anonKey: 'sb_publishable_NNI4JVkPHAs5yPAKM_jfOg_Qok9iWUi',
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
