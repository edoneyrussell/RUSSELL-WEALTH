import { t } from './i18n/language.ts';
export async function logout() {
  try {
    const response = await fetch('/api/logout', {
      method: 'POST',
      credentials: 'same-origin',
    });

    if (!response.ok) {
      throw new Error('Logout failed');
    }

    window.location.replace('/');
  } catch (error) {
    console.error('Logout error:', error);
    alert(t('Unable to log out. Please try again.'));
  }
}
