import React from 'react';
import { Users, Loader2, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserManagement, UserTable } from './user';

export const UserManagementWidget: React.FC = () => {
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();
  const {
    users,
    loading,
    error,
    fetchUsers,
    editingId,
    editForm,
    saving,
    deleteConfirmId,
    handleEditClick,
    handleCancelClick,
    handleSaveClick,
    handleDeleteClick,
    handleFormChange,
    toggleNetwork,
  } = useUserManagement();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mt-6">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-brand-blue-100 dark:bg-brand-blue-500/20 rounded-lg">
            <Users className="w-5 h-5 text-brand-blue-600 dark:text-brand-blue-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {t('admin.userManagementTitle')}
          </h2>
        </div>
        <div className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-semibold text-gray-600 dark:text-gray-300">
          Total Users: {users.length}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-brand-blue-500" />
          <span className="ml-2 text-gray-500">Loading users...</span>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-12 text-red-500">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span>{error}</span>
          <button onClick={fetchUsers} className="ml-3 text-sm underline hover:no-underline">
            Retry
          </button>
        </div>
      ) : (
        <UserTable
          users={users}
          currentUserId={currentUser?.id}
          editingId={editingId}
          editForm={editForm}
          saving={saving}
          deleteConfirmId={deleteConfirmId}
          columnLabels={{
            company: t('admin.company'),
            name: t('admin.name'),
            nationality: t('admin.nationality'),
            networks: t('admin.networks'),
            email: t('admin.email'),
            role: t('admin.role'),
            actions: t('admin.actions'),
          }}
          actionLabels={{
            save: t('admin.save'),
            cancel: t('admin.cancel'),
            edit: t('admin.edit'),
          }}
          onFormChange={handleFormChange}
          onToggleNetwork={toggleNetwork}
          onSave={handleSaveClick}
          onCancel={handleCancelClick}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
        />
      )}
    </div>
  );
};
