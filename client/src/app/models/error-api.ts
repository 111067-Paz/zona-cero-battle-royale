/** Espejo de {@code ErrorApi} (PLAN §12): formato unico de error de toda la API. */
export interface ErrorApi {
  timestamp: string;
  status: number;
  error: string;
  message: string;
}
