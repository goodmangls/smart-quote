import React from 'react';
import { Building2, UserCircle, Globe2, Mail, Shield, Hash } from 'lucide-react';
import type { FreightNetwork } from '@/contexts/AuthContext';
import type { AdminUser, UpdateUserParams } from '@/api/userApi';
import { UserTableRow } from './UserTableRow';

interface Props {
  users: AdminUser[];
  currentUserId?: number;
  editingId: number | null;
  editForm: UpdateUserParams;
  saving: boolean;
  deleteConfirmId: number | null;
  columnLabels: {
    company: string;
    name: string;
    nationality: string;
    networks: string;
    email: string;
    role: string;
    actions: string;
  };
  actionLabels: { save: string; cancel: string; edit: string };
  onFormChange: (key: keyof UpdateUserParams, value: string) => void;
  onToggleNetwork: (net: FreightNetwork) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: (user: AdminUser) => void;
  onDelete: (id: number) => void;
}

export const UserTable: React.FC<Props> = ({
  users,
  currentUserId,
  editingId,
  editForm,
  saving,
  deleteConfirmId,
  columnLabels,
  actionLabels,
  onFormChange,
  onToggleNetwork,
  onSave,
  onCancel,
  onEdit,
  onDelete,
}) => (
  <div className='p-0 overflow-x-auto'>
    <table className='w-full text-sm text-left text-gray-500 dark:text-gray-400'>
      <thead className='text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300'>
        <tr>
          <th scope='col' className='px-6 py-4 font-semibold'>
            <div className='flex items-center gap-2'>
              <Building2 className='w-4 h-4 text-gray-400' />
              {columnLabels.company}
            </div>
          </th>
          <th scope='col' className='px-6 py-4 font-semibold'>
            <div className='flex items-center gap-2'>
              <UserCircle className='w-4 h-4 text-gray-400' />
              {columnLabels.name}
            </div>
          </th>
          <th scope='col' className='px-6 py-4 font-semibold'>
            <div className='flex items-center gap-2'>
              <Globe2 className='w-4 h-4 text-gray-400' />
              {columnLabels.nationality}
            </div>
          </th>
          <th scope='col' className='px-6 py-4 font-semibold'>
            <div className='flex items-center gap-2'>
              <Globe2 className='w-4 h-4 text-gray-400' />
              {columnLabels.networks}
            </div>
          </th>
          <th scope='col' className='px-6 py-4 font-semibold'>
            <div className='flex items-center gap-2'>
              <Mail className='w-4 h-4 text-gray-400' />
              {columnLabels.email}
            </div>
          </th>
          <th scope='col' className='px-6 py-4 font-semibold'>
            <div className='flex items-center gap-2'>
              <Shield className='w-4 h-4 text-gray-400' />
              {columnLabels.role}
            </div>
          </th>
          <th scope='col' className='px-6 py-4 font-semibold'>
            <div className='flex items-center gap-2'>
              <Hash className='w-4 h-4 text-gray-400' />
              Quotes
            </div>
          </th>
          <th scope='col' className='px-6 py-4 font-semibold text-right'>
            {columnLabels.actions}
          </th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <UserTableRow
            key={user.id}
            user={user}
            isEditing={editingId === user.id}
            isSelf={currentUserId === user.id}
            editForm={editForm}
            saving={saving}
            deleteConfirmId={deleteConfirmId}
            labels={actionLabels}
            onFormChange={onFormChange}
            onToggleNetwork={onToggleNetwork}
            onSave={onSave}
            onCancel={onCancel}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
        {users.length === 0 && (
          <tr>
            <td colSpan={8} className='px-6 py-8 text-center text-gray-500'>
              No registered users found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);
