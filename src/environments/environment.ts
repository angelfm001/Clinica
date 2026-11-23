/**
 * Configuración de desarrollo.
 *
 * La interfaz consume los 5 microservicios reales de MedicalAppointments
 * (Security, Patient, Staff, Appointment y ClinicalCare). Las URLs son
 * relativas: `ng serve` las reenvía a cada API con `proxy.conf.json`
 * (por ejemplo `/api/staff/doctors` → `http://localhost:5250/doctors`), así el
 * navegador ve un solo origen y no hace falta habilitar CORS en el backend.
 *
 * Puertos (perfil "http" de cada launchSettings.json):
 *   Security 5248 · Patient 5244 · Staff 5250 · Appointment 5246 · ClinicalCare 5252
 */
export const environment = {
  production: false,
  api: {
    security: '/api/security',
    patient: '/api/patient',
    staff: '/api/staff',
    appointment: '/api/appointment',
    clinicalCare: '/api/clinical-care',
  },
};
