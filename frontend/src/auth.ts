export async function logout() {
  try {
    const response = await fetch('/api/logout', {
      method: 'POST',
      credentials: 'same-origin',
    });

    if (!response.ok) {
      throw new Error('Logout failed');
    }

    window.location.replace('/login');
  } catch (error) {
    console.error('Logout error:', error);
    alert('Unable to log out. Please try again.');
  }
}
