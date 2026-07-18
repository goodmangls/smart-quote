import React from 'react';
import { Edit2, Check, X, Trash2, Loader2 } from 'lucide-react';
import type { FreightNetwork } from '@/contexts/AuthContext';
import type { AdminUser, UpdateUserParams } from '@/api/userApi';
import { NATIONALITY_OPTIONS, getCountryDisplayName } from '@/config/options';
import { NETWORK_OPTIONS, NETWORK_STYLES } from './userConstants';

interface Props {
  user: AdminUser;
  isEditing: boolean;
  isSelf: boolean;
  editForm: UpdateUserParams;
  saving: boolean;
  deleteConfirmId: number | null;
  labels: { save: string; cancel: string; edit: string };
  onFormChange: (key: keyof UpdateUserParams, value: string) => void;
  onToggleNetwork: (net: FreightNetwork) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: (user: AdminUser) => void;
  onDelete: (id: number) => void;
}

export const UserTableRow: React.FC<Props> = ({
  user,
  isEditing,
  isSelf,
  editForm,
  saving,
  deleteConfirmId,
  labels,
  onFormChange,
  onToggleNetwork,
  onSave,
  onCancel,
  onEdit,
  onDelete,
}) => (
  <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
      {isEditing ? (
        <input
          className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand-blue-500 focus:border-brand-blue-500 block p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
          value={editForm.company || ''}
          onChange={(e) => onFormChange('company', e.target.value)}
        />
      ) : (
        user.company || '-'
      )}
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      {isEditing ? (
        <input
          className="w-[100px] bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand-blue-500 focus:border-brand-blue-500 block p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
          value={editForm.name || ''}
          onChange={(e) => onFormChange('name', e.target.value)}
        />
      ) : (
        user.name || '-'
      )}
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      {isEditing ? (
        <select
          className="w-[140px] bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand-blue-500 focus:border-brand-blue-500 block p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
          value={editForm.nationality || ''}
          onChange={(e) => onFormChange('nationality', e.target.value)}
        >
          <option value="" className="bg-white dark:bg-gray-800">
            -
          </option>
          {NATIONALITY_OPTIONS.map((country, idx) => (
            <React.Fragment key={country.code}>
              {idx === 7 && (
                <option disabled className="bg-white dark:bg-gray-800">
                  {'─'.repeat(20)}
                </option>
              )}
              <option value={country.code} className="bg-white dark:bg-gray-800">
                {country.name}
              </option>
            </React.Fragment>
          ))}
        </select>
      ) : (
        getCountryDisplayName(user.nationality || '')
      )}
    </td>
    <td className="px-6 py-4">
      {isEditing ? (
        <div className="flex flex-wrap gap-1.5">
          {NETWORK_OPTIONS.map((net) => {
            const selected = (editForm.networks || []).includes(net);
            const style = NETWORK_STYLES[net];
            return (
              <button
                key={net}
                type="button"
                onClick={() => onToggleNetwork(net)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                  selected
                    ? `${style.bg} ${style.text} ${style.border}`
                    : 'bg-gray-100 text-gray-400 border-gray-200 dark:bg-gray-700 dark:text-gray-500 dark:border-gray-600'
                }`}
              >
                {net}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {user.networks && user.networks.length > 0 ? (
            user.networks.map((net) => {
              const style = NETWORK_STYLES[net] || NETWORK_STYLES.WCA;
              return (
                <span
                  key={net}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}
                >
                  {net}
                </span>
              );
            })
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      )}
    </td>
    <td className="px-6 py-4">
      <a
        href={`mailto:${user.email}`}
        className="text-brand-blue-600 dark:text-brand-blue-400 hover:underline"
      >
        {user.email}
      </a>
    </td>
    <td className="px-6 py-4">
      {isEditing ? (
        <select
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand-blue-500 focus:border-brand-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
          value={editForm.role || 'user'}
          onChange={(e) => onFormChange('role', e.target.value)}
        >
          <option value="user">User</option>
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      ) : (
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
            user.role === 'admin'
              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
              : user.role === 'member'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
          }`}
        >
          {user.role}
        </span>
      )}
    </td>
    <td className="px-6 py-4 text-center">
      <span className="text-gray-700 dark:text-gray-300 font-medium">{user.quoteCount}</span>
    </td>
    <td className="px-6 py-4 text-right">
      {isEditing ? (
        <div className="flex items-center justify-end space-x-2">
          <button
            onClick={onSave}
            disabled={saving}
            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg dark:text-green-400 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            aria-label={labels.save}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          </button>
          <button
            onClick={onCancel}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
            aria-label={labels.cancel}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-end space-x-2">
          <button
            onClick={() => onEdit(user)}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
            aria-label={labels.edit}
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {!isSelf && (
            <button
              onClick={() => onDelete(user.id)}
              className={`p-1.5 rounded-lg transition-colors ${
                deleteConfirmId === user.id
                  ? 'text-white bg-red-500 hover:bg-red-600'
                  : 'text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-gray-700'
              }`}
              aria-label={deleteConfirmId === user.id ? 'Click again to confirm' : 'Delete user'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </td>
  </tr>
);
