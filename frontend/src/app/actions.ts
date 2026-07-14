'use server';

import { cookies, headers } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

async function backendDelete(path: string): Promise<{ success: boolean; message: string }> {
  try {
    const cookieStore = await cookies();
    const headerList = await headers();
    const token = cookieStore.get('token');
    const csrfToken = cookieStore.get('csrfToken');
    const originalUserAgent = headerList.get('user-agent') || '';

    if (!token) {
      return { success: false, message: 'Unauthorized — please log in again.' };
    }

    const cookieHeader = [
      `token=${token.value}`,
      csrfToken ? `csrfToken=${csrfToken.value}` : '',
    ].filter(Boolean).join('; ');

    const res = await fetch(`${BACKEND_URL}/api/v1${path}`, {
      method: 'DELETE',
      headers: {
        Cookie: cookieHeader,
        'x-csrf-token': csrfToken?.value || '',
        'User-Agent': originalUserAgent,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      let message = `Request failed (${res.status})`;
      try {
        const parsed = JSON.parse(body);
        if (parsed?.message) message = parsed.message;
      } catch {
        if (body) message = body.slice(0, 300);
      }
      return { success: false, message };
    }

    return { success: true, message: 'Deleted successfully.' };
  } catch (err: any) {
    return { success: false, message: `Server error: ${err?.message || 'unknown error'}` };
  }
}

export async function deleteVendorAction(id: string) {
  return backendDelete(`/vendors/${id}`);
}

export async function deleteDeveloperAction(id: string) {
  return backendDelete(`/workers/${id}`);
}

export async function deleteChatAction(id: string) {
  return backendDelete(`/chat/${id}`);
}