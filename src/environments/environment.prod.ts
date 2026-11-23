/** Producción: se espera un API Gateway / proxy inverso que publique las mismas rutas `/api/...`. */
export const environment = {
  production: true,
  api: {
    security: '/api/security',
    patient: '/api/patient',
    staff: '/api/staff',
    appointment: '/api/appointment',
    clinicalCare: '/api/clinical-care',
  },
};
