const API_BASE_URL = import.meta.env.DEV ? '/api' : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000');

export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'admin' | 'user';
  }) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  getProfile: () => apiRequest('/auth/profile'),

  // User management endpoints
  getAllUsers: () => apiRequest('/auth/users'),

  createUser: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'admin' | 'user';
  }) =>
    apiRequest('/auth/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  updateUser: (userId: string, userData: {
    firstName?: string;
    lastName?: string;
    role?: 'admin' | 'user';
  }) =>
    apiRequest(`/auth/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    }),

  deleteUser: (userId: string) =>
    apiRequest(`/auth/users/${userId}`, {
      method: 'DELETE',
    }),

  updateUserRole: (userId: string, role: 'admin' | 'user') =>
    apiRequest(`/auth/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),

  deactivateUser: (userId: string) =>
    apiRequest(`/auth/users/${userId}/deactivate`, {
      method: 'PUT',
    }),
};

export const analyticsApi = {
  getKeyMetrics: () => apiRequest('/analytics/key-metrics'),

  getMonthlyTrends: (months?: number) =>
    apiRequest(`/analytics/monthly-trends${months ? `?months=${months}` : ''}`),

  getToolUsage: () => apiRequest('/analytics/tool-usage'),

  getSystemPerformance: (hours?: number) =>
    apiRequest(`/analytics/system-performance${hours ? `?hours=${hours}` : ''}`),

  getDepartmentUsage: () => apiRequest('/analytics/department-usage'),

  getAuditLogs: (params?: Record<string, string>) => {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return apiRequest(`/analytics/audit-logs${queryString}`);
  },

  getAuditLogsCount: (params?: Record<string, string>) => {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return apiRequest(`/analytics/audit-logs/count${queryString}`);
  },
};

export const eSignatureApi = {
  // Signature management
  createSignature: (data: { name: string; style: string; signatureData?: string }) =>
    apiRequest('/e-signature/signatures', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getSignatures: () => apiRequest('/e-signature/signatures'),

  updateSignature: (signatureId: string, data: { name?: string; style?: string; signatureData?: string }) =>
    apiRequest(`/e-signature/signatures/${signatureId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteSignature: (signatureId: string) =>
    apiRequest(`/e-signature/signatures/${signatureId}`, {
      method: 'DELETE',
    }),

  // Document management
  sendForSignature: (formData: FormData) =>
    fetch(`${API_BASE_URL}/e-signature/send`, {
      method: 'POST',
      headers: {
        ...(localStorage.getItem('token') && { Authorization: `Bearer ${localStorage.getItem('token')}` }),
      },
      body: formData,
    }).then(async (response) => {
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to send document' }));
        throw new Error(error.message);
      }
      return response.json();
    }),

  signDocument: (documentId: string, data: { signatureId: string }) =>
    apiRequest(`/e-signature/sign/${documentId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getDocuments: () => apiRequest('/e-signature/documents'),

  getDocument: (documentId: string) => apiRequest(`/e-signature/documents/${documentId}`),

  downloadDocument: (documentId: string) =>
    fetch(`${API_BASE_URL}/e-signature/documents/${documentId}/download`, {
      headers: {
        ...(localStorage.getItem('token') && { Authorization: `Bearer ${localStorage.getItem('token')}` }),
      },
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error('Failed to download document');
      }
      return response.blob();
    }),
};

interface Annotation {
  type: 'text' | 'highlight' | 'rectangle' | 'circle' | 'arrow' | 'comment';
  page: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color?: string;
  opacity?: number;
  author?: string;
}

interface Redaction {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Watermark {
  type: 'text' | 'image';
  text?: string;
  imageUrl?: string;
  x: number;
  y: number;
  opacity?: number;
  fontSize?: number;
}

export const pdfEditorApi = {
  uploadPdf: (formData: FormData): Promise<any> =>
    fetch(`${API_BASE_URL}/pdf-editor/upload`, {
      method: 'POST',
      headers: {
        ...(localStorage.getItem('token') && { Authorization: `Bearer ${localStorage.getItem('token')}` }),
      },
      body: formData,
    }).then(async (response) => {
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to upload PDF' }));
        throw new Error(error.message);
      }
      return response.json();
    }),

  getDocumentInfo: (documentId: string): Promise<any> =>
    apiRequest(`/pdf-editor/${documentId}/info`),

  // Annotation management
  addAnnotation: (documentId: string, annotation: Annotation): Promise<any> =>
    apiRequest(`/pdf-editor/${documentId}/annotations`, {
      method: 'POST',
      body: JSON.stringify(annotation),
    }),

  getAnnotations: (documentId: string): Promise<any> =>
    apiRequest(`/pdf-editor/${documentId}/annotations`),

  updateAnnotation: (documentId: string, annotationId: string, updates: Partial<Annotation>): Promise<any> =>
    apiRequest(`/pdf-editor/${documentId}/annotations/${annotationId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deleteAnnotation: (documentId: string, annotationId: string): Promise<any> =>
    apiRequest(`/pdf-editor/${documentId}/annotations/${annotationId}`, {
      method: 'DELETE',
    }),

  // Redaction and watermark
  redactContent: (documentId: string, redaction: Redaction): Promise<any> =>
    apiRequest(`/pdf-editor/${documentId}/redact`, {
      method: 'POST',
      body: JSON.stringify(redaction),
    }),

  addWatermark: (documentId: string, watermark: Watermark): Promise<any> =>
    apiRequest(`/pdf-editor/${documentId}/watermark`, {
      method: 'POST',
      body: JSON.stringify(watermark),
    }),

  // Save and export
  saveDocument: (documentId: string): Promise<any> =>
    apiRequest(`/pdf-editor/${documentId}/save`, {
      method: 'POST',
    }),

  exportDocument: (documentId: string): Promise<Blob> =>
    fetch(`${API_BASE_URL}/pdf-editor/${documentId}/export`, {
      headers: {
        ...(localStorage.getItem('token') && { Authorization: `Bearer ${localStorage.getItem('token')}` }),
      },
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error('Failed to export document');
      }
      return response.blob();
    }),
};

export const dashboardApi = {
  getStats: (): Promise<{
    documentsProcessedToday: number;
    activeUsers: number;
    queueLength: number;
    successRate: number;
  }> => apiRequest('/dashboard/stats'),

  getRecentJobs: (limit?: number): Promise<Array<{
    id: string;
    name: string;
    type: string;
    status: 'completed' | 'processing' | 'queued' | 'failed';
    user: string;
    createdAt: string;
  }>> =>
    apiRequest(`/dashboard/recent-jobs${limit ? `?limit=${limit}` : ''}`),

  getSystemUsage: (): Promise<{
    cpuUsage: number;
    memoryUsage: number;
    storageUsage: number;
    activeJobs: number;
    maxJobs: number;
  }> => apiRequest('/dashboard/system-usage'),
};

export const pdfToWordApi = {
  convert: (formData: FormData): Promise<any> =>
    fetch(`${API_BASE_URL}/pdf-to-word/convert`, {
      method: 'POST',
      headers: {
        ...(localStorage.getItem('token') && { Authorization: `Bearer ${localStorage.getItem('token')}` }),
      },
      body: formData,
    }).then(async (response) => {
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Conversion failed' }));
        throw new Error(error.message);
      }
      return response.json();
    }),

  getConversionHistory: (): Promise<Array<{
    id: string;
    originalFilename: string;
    convertedFilename: string;
    originalSize: number;
    convertedSize: number;
    processingTime: number;
    status: 'completed' | 'failed' | 'processing';
    errorMessage?: string;
    createdAt: string;
  }>> => apiRequest('/pdf-to-word/history'),

  getSettings: (): Promise<{
    outputFormat: 'docx' | 'doc' | 'rtf';
    quality: 'high' | 'medium' | 'fast';
    language: string;
    preserveFormatting: boolean;
    extractImages: boolean;
    ocrEnabled: boolean;
    batchProcessing: boolean;
  }> => apiRequest('/pdf-to-word/settings'),

  updateSettings: (settings: {
    outputFormat?: 'docx' | 'doc' | 'rtf';
    quality?: 'high' | 'medium' | 'fast';
    language?: string;
    preserveFormatting?: boolean;
    extractImages?: boolean;
    ocrEnabled?: boolean;
    batchProcessing?: boolean;
  }): Promise<any> =>
    apiRequest('/pdf-to-word/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
};
