/**
 * Configuración de desarrollo.
 *
 * `useMock` en true intercepta las peticiones HTTP y las responde con datos en
 * memoria (ver core/mock). Los servicios, endpoints y modelos son los reales:
 * al levantar los microservicios basta con poner `useMock: false` y ajustar las
 * URLs de cada API (o apuntar todas al API Gateway).
 *
 * 5 microservicios (planificación reducida): Security, Patient, Staff,
 * Appointment y ClinicalCare (fusiona MedicalRecord + Treatment).
 */
export const environment = {
  production: false,
  useMock: true,
  /** API Gateway. Si se usa, todas las rutas cuelgan de aquí. */
  apiGateway: 'http://localhost:5000',
  api: {
    security: 'http://localhost:5100',
    patient: 'http://localhost:5268',
    staff: 'http://localhost:5200',
    appointment: 'http://localhost:5300',
    clinicalCare: 'http://localhost:5400',
  },
};
