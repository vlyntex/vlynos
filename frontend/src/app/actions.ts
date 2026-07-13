'use server';

import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

async function backendDelete(path: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  const csrfToken = cookieStore.get('csrfToken');

  if (!token) throw new Error('Unauthorized');

  const cookieHeader = [
    `token=${token.value}`,
    csrfToken ? `csrfToken=${csrfToken.value}` : '',
  ].filter(Boolean).join('; ');

  const res = await fetch(`${BACKEND_URL}/api/v1${path}`, {
    method: 'DELETE',
    headers: {
      Cookie: cookieHeader,
      'x-csrf-token': csrfToken?.value || '',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Request failed (${res.status}): ${body}`);
  }

  return res.json().catch(() => ({}));
}

export async function deleteVendorAction(id: string) {
  return backendDelete(`/vendors/${id}`);
}

export async function deleteDeveloperAction(id: string) {
  return backendDelete(`/workers/${id}`);
}

export async function deleteChatAction(id: string) {
  // Your backend doesn't have a hard-delete endpoint for chats yet —
  // only an "archive" one. Wire this up once you decide archive vs.
  // delete is the right behavior. Left disabled on purpose for now
  // rather than silently doing nothing.
  throw new Error('Chat deletion is not yet available.');
}