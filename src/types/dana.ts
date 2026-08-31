/**
 * Interface standar untuk menangkap error yang berasal dari SDK DANA (Axios/OpenAPI/SNAP).
 * DANA mengembalikan pesan error dalam beberapa format bersarang di object `response`.
 */
export interface DanaSdkError extends Error {
  response?: {
    data?: {
      responseCode?: string;
      responseMessage?: string;
      // Format alternatif untuk response Open API (contoh: FinishNotify)
      response?: {
        body?: {
          resultInfo?: {
            resultMsg?: string;
            resultCode?: string;
          };
        };
      };
    };
  };
}

/**
 * Type Guard untuk memastikan bahwa error yang ditangkap (tipe: unknown)
 * memiliki properti `response` seperti yang biasa dikembalikan oleh axios / DANA SDK.
 */
export function isDanaSdkError(error: unknown): error is DanaSdkError {
  return typeof error === 'object' && error !== null && 'response' in error;
}

/**
 * Fungsi pembantu (helper) untuk mengekstrak pesan error DANA secara aman,
 * tanpa melanggar aturan ESLint (tanpa 'any').
 * 
 * @param error Error object dari blok catch
 * @param fallback Pesan default jika error tidak dikenali
 * @returns String pesan error yang siap dikirim ke user
 */
export function getDanaErrorMessage(error: unknown, fallback: string = "Terjadi kesalahan internal."): string {
  if (isDanaSdkError(error)) {
    // Mencoba mengambil pesan error dari layer terluar SNAP
    if (error.response?.data?.responseMessage) {
      return error.response.data.responseMessage;
    }
    // Mencoba mengambil pesan error dari layer dalam Open API
    if (error.response?.data?.response?.body?.resultInfo?.resultMsg) {
      return error.response.data.response.body.resultInfo.resultMsg;
    }
    // Jatuh ke pesan error bawaan JS jika ada
    if (error.message) {
      return error.message;
    }
  }

  // Jika error biasa (bukan dari DANA SDK)
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}


