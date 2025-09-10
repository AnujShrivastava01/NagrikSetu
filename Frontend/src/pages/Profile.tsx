import React from 'react';
import { useAuth } from '../hooks/useAuth';
import AdminProfile from '../components/AdminProfile';
import UserProfile from '../components/UserProfile';

const Profile = () => {
  const { user, role } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-300">Please sign in to view your profile.</p>
        </div>
      </div>
    );
  }

  // Render different profile components based on user role
  if (role === 'admin') {
    return <AdminProfile />;
  } else {
    return <UserProfile />;
  }
};

export default Profile; 