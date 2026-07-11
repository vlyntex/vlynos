export let BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';



const getCsrfToken = () => {
  const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]+)/);
  return match ? match[1] : null;
};

const initializeCsrf = async () => {
  if (!getCsrfToken() && typeof window !== 'undefined') {
    await fetch(`${BASE_URL}/auth/csrf`, { credentials: 'include' }).catch(() => {});
  }
};

const defaultHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers['x-csrf-token'] = csrfToken;
  }
  return headers;
};

export const api = {
  post: async (endpoint: string, data: any) => {
    await initializeCsrf();
    const isFormData = data instanceof FormData;
    const headers = defaultHeaders();
    if (isFormData) delete headers['Content-Type'];
    
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: isFormData ? data : JSON.stringify(data),
      credentials: 'include'
    });
    
    let json;
    const text = await res.text();
    if (res.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login';
      return new Promise(() => {});
    }
    try {
      json = text ? JSON.parse(text) : {};
    } catch (e) {
      console.error(`API POST ${BASE_URL}${endpoint} returned invalid format. Status: ${res.status}. Body:`, text.substring(0, 500));
      throw new Error(`API returned invalid format (not JSON). Status: ${res.status}`);
    }
    if (!res.ok) {
      throw new Error(json.message || 'Something went wrong');
    }
    return json;
  },
  put: async (endpoint: string, data: any) => {
    await initializeCsrf();
    const isFormData = data instanceof FormData;
    const headers = defaultHeaders();
    if (isFormData) delete headers['Content-Type'];
    
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: isFormData ? data : JSON.stringify(data),
      credentials: 'include'
    });
    if (res.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login';
      return new Promise(() => {});
    }
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Something went wrong');
    }
    return json;
  },
  patch: async (endpoint: string, data: any) => {
    await initializeCsrf();
    const isFormData = data instanceof FormData;
    const headers = defaultHeaders();
    if (isFormData) delete headers['Content-Type'];
    
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: isFormData ? data : JSON.stringify(data),
      credentials: 'include'
    });
    if (res.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login';
      return new Promise(() => {});
    }
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'Something went wrong');
    }
    return json;
  },
  delete: async (endpoint: string) => {
    await initializeCsrf();
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: defaultHeaders(),
      credentials: 'include'
    });
    const text = await res.text();
    if (res.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login';
      return new Promise(() => {});
    }
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON response. Status:', res.status, 'Body:', text.substring(0, 200));
      throw new Error(`API returned invalid format (not JSON). Status: ${res.status}. Check API URL: ${BASE_URL}${endpoint}`);
    }
    if (!res.ok) {
      throw new Error(json.message || 'Something went wrong');
    }
    return json;
  },
  get: async (endpoint: string) => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    const text = await res.text();
    if (res.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login';
      return new Promise(() => {});
    }
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON response. Status:', res.status, 'Body:', text.substring(0, 200));
      throw new Error(`API returned invalid format (not JSON). Status: ${res.status}. Check API URL: ${BASE_URL}${endpoint}`);
    }
    
    if (!res.ok) {
      const error: any = new Error(json.message || 'Something went wrong');
      error.status = res.status;
      throw error;
    }
    return json;
  }
};
