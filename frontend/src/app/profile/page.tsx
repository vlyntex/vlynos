'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string;

const urlB64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer | null) => {
  if (!buffer) return '';
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [vendor, setVendor] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    api.get('/auth/me').then(data => {
      setProfile(data.user);
      setSettings({
        notifyTasks: data.user.notifyTasks,
        notifyGroups: data.user.notifyGroups,
        notifyAnnouncements: data.user.notifyAnnouncements,
        notifyBrowser: data.user.notifyBrowser,
        notifySounds: data.user.notifySounds,
        quietHoursStart: data.user.quietHoursStart,
        quietHoursEnd: data.user.quietHoursEnd,
      });
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (profile?.role === 'VENDOR') {
      api.get('/vendors/me').then(data => setVendor(data.vendor)).catch(console.error);
    }
  }, [profile]);

  const updateSetting = async (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await api.patch('/auth/settings/notifications', { [key]: value });
  };

  const enablePushNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push notifications are not supported by your browser.');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      alert('Permission denied');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      }

      await api.post('/notifications/push/subscribe', {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64(subscription.getKey('auth'))
        },
        browser: navigator.userAgent
      });

      updateSetting('notifyBrowser', true);
      alert('Push notifications enabled successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to enable push notifications.');
    }
  };

  if (!profile || !settings) return <div style={{ color: '#111' }}>Loading...</div>;

  return (
    <div style={{ color: '#111' }}>
      <h1>My Profile</h1>
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <p><strong>Name:</strong> {profile.firstName} {profile.lastName}</p>
        <p><strong>Email:</strong> {profile.email}</p>
        <p><strong>Role:</strong> {profile.role}</p>
        {profile.employeeId && <p><strong>Employee ID:</strong> {profile.employeeId}</p>}
      </div>

      <h2>Notification Settings</h2>
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" checked={settings.notifyTasks} onChange={e => updateSetting('notifyTasks', e.target.checked)} />
          Task Notifications
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" checked={settings.notifyGroups} onChange={e => updateSetting('notifyGroups', e.target.checked)} />
          Group Invitations
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" checked={settings.notifyAnnouncements} onChange={e => updateSetting('notifyAnnouncements', e.target.checked)} />
          Announcements
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" checked={settings.notifySounds} onChange={e => updateSetting('notifySounds', e.target.checked)} />
          Play Sounds
        </label>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
          Quiet Hours Start:
          <input type="time" value={settings.quietHoursStart || ''} onChange={e => updateSetting('quietHoursStart', e.target.value)} style={{ marginLeft: 'auto', padding: '0.25rem' }} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Quiet Hours End:
          <input type="time" value={settings.quietHoursEnd || ''} onChange={e => updateSetting('quietHoursEnd', e.target.value)} style={{ marginLeft: 'auto', padding: '0.25rem' }} />
        </label>

        <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '0.5rem 0' }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" checked={settings.notifyBrowser} onChange={e => updateSetting('notifyBrowser', e.target.checked)} />
          Enable Browser Push Notifications
        </label>
        {!settings.notifyBrowser && (
          <button onClick={enablePushNotifications} style={{ alignSelf: 'flex-start', padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Setup Push Notifications on this Device
          </button>
        )}
      </div>

      {vendor && (
        <>
          <h2>My Vendor Profile</h2>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px' }}>
            <p><strong>Company:</strong> {vendor.name}</p>
            <p><strong>Code:</strong> {vendor.code}</p>
            <p><strong>Status:</strong> {vendor.status}</p>
          </div>
        </>
      )}
    </div>
  );
}
