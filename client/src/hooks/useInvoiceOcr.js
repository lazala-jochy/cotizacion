/**
 * Hook para procesar imágenes de facturas con OCR
 */

import { useState } from 'react';
import { api } from '../api';

export function useInvoiceOcr() {
  const [processing, setProcessing] = useState(false);
  const [ocrError, setOcrError] = useState('');

  const extractFromImage = async (imageData) => {
    setProcessing(true);
    setOcrError('');

    try {
      const result = await api.ocr.extractInvoice(imageData);

      if (result.success) {
        return {
          success: true,
          data: result.data,
          error: null,
        };
      } else {
        setOcrError(result.error || 'Error procesando imagen');
        return {
          success: false,
          data: null,
          error: result.error,
        };
      }
    } catch (err) {
      const errorMsg = err.message || 'Error desconocido en OCR';
      setOcrError(errorMsg);
      return {
        success: false,
        data: null,
        error: errorMsg,
      };
    } finally {
      setProcessing(false);
    }
  };

  return {
    extractFromImage,
    processing,
    error: ocrError,
    setError: setOcrError,
  };
}
