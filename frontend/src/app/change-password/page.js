'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '../../lib/api';
import { KeyRound } from 'lucide-react';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState(null);

  // Grab the user data from the cookie when the page loads
  useEffect(() => {
    const userCookie = Cookies.get('stip_user');
    if (!userCookie) {
      router.push('/'); // Kick them back to login if no active session
      return;
    }
    const user = JSON.parse(userCookie);
    setUserRole(user.role);
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.newPassword !== formData.confirmPassword) {
      return setError('New passwords do not match.');
    }
    if (formData.newPassword.length < 8) {
      return setError('New password must be at least 8 characters long.');
    }

    setLoading(true);

    try {
      // Call our secure backend route
      await api.patch('/auth/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      // Update the cookie so the frontend knows they are no longer on their first login
      const userCookie = JSON.parse(Cookies.get('stip_user'));
      userCookie.isFirstLogin = false;
      Cookies.set('stip_user', JSON.stringify(userCookie));

      // Route them to their actual dashboard!
      if (userRole === 'HR_ADMIN') router.push('/dashboard/hr');
      else if (userRole === 'CEO') router.push('/dashboard/ceo');
      else router.push('/dashboard/manager');
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-blue-600">
          <KeyRound size={48} />
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-slate-900">
          Secure Your Account
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 px-4">
          Because this is your first time logging in, you must change your default password to continue.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700">Current Password</label>
              <input
                type="password"
                required
                className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md py-2 px-3 border"
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">New Password</label>
              <input
                type="password"
                required
                className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md py-2 px-3 border"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Confirm New Password</label>
              <input
                type="password"
                required
                className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md py-2 px-3 border"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:bg-slate-400"
            >
              {loading ? 'Updating...' : 'Update Password & Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}