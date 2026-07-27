import { useEffect, useMemo, useState } from 'react';
import { Edit3, Plus, RefreshCw, Search, ShieldCheck, Trash2, UserCheck, UserX } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import Select from '@/components/ui/Select';
import Table from '@/components/ui/Table';
import { ASSIGNABLE_ROLES, ROLES } from '@/constants/permissions';
import { useToast } from '@/hooks/useToast';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';
import {
  createUser,
  deleteUser,
  fetchUserOptions,
  fetchUsers,
  updateUser,
  updateUserActiveStatus,
} from '@/features/users/services/userService';

const ACTIONS = [
  { key: 'view', label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
];

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: ROLES.user,
  permissions: [],
  isActive: true,
};

function getRoleBadgeVariant(role) {
  if (role === ROLES.boss) return 'success';
  if (role === ROLES.accountant) return 'warning';
  return 'neutral';
}

function buildPermissionSet(permissions = []) {
  return new Set(permissions);
}

function toRoleOptions(roles = []) {
  const backendRoles = roles.filter((role) => ASSIGNABLE_ROLES.includes(role));
  const values = backendRoles.length ? backendRoles : ASSIGNABLE_ROLES;

  return values.map((role) => ({
    value: role,
    label: role,
  }));
}

function PermissionMatrix({ modulePermissions, value, disabled, onChange }) {
  const selected = useMemo(() => buildPermissionSet(value), [value]);
  const modules = Object.entries(modulePermissions || {});

  function togglePermission(permission) {
    if (!permission || disabled) return;

    const next = new Set(selected);

    if (next.has(permission)) {
      next.delete(permission);
    } else {
      next.add(permission);
    }

    onChange([...next]);
  }

  if (!modules.length) {
    return (
      <div className="rounded-2xl border border-border bg-background px-4 py-6 text-center text-sm text-body">
        Permission options are unavailable.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-background">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-body">
                Module
              </th>
              {ACTIONS.map((action) => (
                <th
                  key={action.key}
                  className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-body"
                >
                  {action.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {modules.map(([moduleName, actions]) => (
              <tr key={moduleName}>
                <td className="px-4 py-3 text-sm font-semibold text-heading">{moduleName}</td>
                {ACTIONS.map((action) => {
                  const permission = actions[action.key];

                  return (
                    <td key={action.key} className="px-4 py-3 text-center">
                      {permission ? (
                        <input
                          checked={selected.has(permission)}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                          disabled={disabled}
                          onChange={() => togglePermission(permission)}
                          type="checkbox"
                        />
                      ) : (
                        <span className="text-sm text-body-muted">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersPage() {
  const [state, setState] = useState({
    items: [],
    pagination: {
      page: 1,
      totalPages: 1,
      totalItems: 0,
      limit: 20,
    },
  });
  const [options, setOptions] = useState({
    roles: ASSIGNABLE_ROLES,
    modulePermissions: {},
    rolePermissions: {},
  });
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const toast = useToast();

  const roleOptions = useMemo(() => toRoleOptions(options.roles), [options.roles]);
  const isBossForm = form.role === ROLES.boss;
  const effectivePermissions = isBossForm
    ? options.rolePermissions?.[ROLES.boss] || form.permissions
    : form.permissions;

  useEffect(() => {
    let ignore = false;

    async function loadOptions() {
      try {
        const data = await fetchUserOptions();

        if (!ignore) {
          setOptions({
            roles: data.roles || ASSIGNABLE_ROLES,
            modulePermissions: data.modulePermissions || {},
            rolePermissions: data.rolePermissions || {},
          });
        }
      } catch (error) {
        if (!ignore) {
          toast.error('Unable to load permission options', getApiErrorMessage(error));
        }
      }
    }

    loadOptions();

    return () => {
      ignore = true;
    };
  }, [toast]);

  useEffect(() => {
    let ignore = false;

    async function loadUsers() {
      setLoading(true);

      try {
        const data = await fetchUsers({
          page: state.pagination.page,
          search: appliedSearch || undefined,
        });

        if (!ignore) {
          setState(data);
        }
      } catch (error) {
        if (!ignore) {
          toast.error('Unable to load users', getApiErrorMessage(error));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadUsers();

    return () => {
      ignore = true;
    };
  }, [appliedSearch, reloadKey, state.pagination.page, toast]);

  function refreshUsers() {
    setReloadKey((current) => current + 1);
  }

  function openCreateModal() {
    setEditingUser(null);
    setForm({
      ...emptyForm,
      permissions: options.rolePermissions?.[ROLES.user] || [],
    });
    setFormOpen(true);
  }

  function openEditModal(user) {
    setEditingUser(user);
    setForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || ROLES.user,
      permissions: user.permissions || [],
      isActive: Boolean(user.isActive),
    });
    setFormOpen(true);
  }

  function closeFormModal() {
    setFormOpen(false);
    setEditingUser(null);
    setForm(emptyForm);
  }

  function updateFormValue(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleRoleChange(role) {
    setForm((current) => ({
      ...current,
      role,
      permissions: options.rolePermissions?.[role] || [],
    }));
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    setState((current) => ({
      ...current,
      pagination: {
        ...current.pagination,
        page: 1,
      },
    }));
    setAppliedSearch(search.trim());
  }

  async function handleSaveUser(event) {
    event.preventDefault();
    setSaving(true);

    const payload = {
      name: form.name,
      email: form.email,
      role: form.role,
      permissions: effectivePermissions,
      isActive: form.isActive,
    };

    if (form.password) {
      payload.password = form.password;
    }

    try {
      if (editingUser) {
        await updateUser(editingUser.id, payload);
        toast.success('User updated', 'User permissions were saved.');
      } else {
        await createUser(payload);
        toast.success('User created', 'The new user can sign in with assigned access.');
      }

      closeFormModal();
      refreshUsers();
    } catch (error) {
      toast.error('Unable to save user', getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(user) {
    try {
      await updateUserActiveStatus(user.id, !user.isActive);
      toast.success(user.isActive ? 'User deactivated' : 'User activated');
      refreshUsers();
    } catch (error) {
      toast.error('Unable to update user status', getApiErrorMessage(error));
    }
  }

  async function handleDeleteUser() {
    if (!deleteTarget) return;

    setDeleting(true);

    try {
      await deleteUser(deleteTarget.id);
      toast.success('User deleted', 'The user account was removed.');
      setDeleteTarget(null);
      refreshUsers();
    } catch (error) {
      toast.error('Unable to delete user', getApiErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  }

  const columns = [
    {
      key: 'name',
      title: 'User',
      render: (value, row) => (
        <div>
          <p className="font-semibold text-heading">{value}</p>
          <p className="mt-1 text-xs text-body">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      title: 'Role',
      render: (value) => <Badge variant={getRoleBadgeVariant(value)}>{value}</Badge>,
    },
    {
      key: 'permissions',
      title: 'Permissions',
      render: (value, row) => (
        <span className="text-sm text-body">
          {row.role === ROLES.boss ? 'Full access' : `${value?.length || 0} assigned`}
        </span>
      ),
    },
    {
      key: 'isActive',
      title: 'Status',
      render: (value) => (
        <Badge variant={value ? 'success' : 'danger'}>{value ? 'Active' : 'Inactive'}</Badge>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_, row) => (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => openEditModal(row)} type="button">
            <Edit3 className="h-4 w-4" />
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleToggleActive(row)} type="button">
            {row.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
            {row.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteTarget(row)} type="button">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Access Control
          </p>
          <h2 className="mt-2 text-3xl font-bold text-heading">Users & Permissions</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={refreshUsers} type="button">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={openCreateModal} type="button">
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      <form className="panel flex flex-col gap-3 p-4 sm:flex-row" onSubmit={handleSearchSubmit}>
        <Input
          leftIcon={Search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, email, or role"
          value={search}
        />
        <Button className="h-12 sm:w-32" type="submit">
          Search
        </Button>
      </form>

      {loading ? (
        <div className="panel p-8 text-center text-sm text-body">Loading users...</div>
      ) : state.items.length ? (
        <>
          <Table columns={columns} data={state.items} />
          <div className="flex justify-end">
            <Pagination
              page={state.pagination.page}
              totalPages={state.pagination.totalPages}
              onPageChange={(page) =>
                setState((current) => ({
                  ...current,
                  pagination: {
                    ...current.pagination,
                    page,
                  },
                }))
              }
            />
          </div>
        </>
      ) : (
        <EmptyState
          title="No users found"
          description="Create a user or adjust the search filters."
          icon={ShieldCheck}
        />
      )}

      <Modal
        className="max-w-5xl"
        description="Assign a role and configure module-level actions."
        onClose={closeFormModal}
        open={formOpen}
        title={editingUser ? 'Edit User' : 'Add User'}
      >
        <form className="space-y-6" onSubmit={handleSaveUser}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Name"
              onChange={(event) => updateFormValue('name', event.target.value)}
              required
              value={form.name}
            />
            <Input
              label="Email"
              onChange={(event) => updateFormValue('email', event.target.value)}
              required
              type="email"
              value={form.email}
            />
            <Input
              hint={editingUser ? 'Leave blank to keep the current password.' : undefined}
              label="Password"
              minLength={8}
              onChange={(event) => updateFormValue('password', event.target.value)}
              required={!editingUser}
              type="password"
              value={form.password}
            />
            <Select
              label="Role"
              onChange={(event) => handleRoleChange(event.target.value)}
              options={roleOptions}
              required
              value={form.role}
            />
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3">
            <input
              checked={form.isActive}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              onChange={(event) => updateFormValue('isActive', event.target.checked)}
              type="checkbox"
            />
            <span className="text-sm font-semibold text-heading">Active user</span>
          </label>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-heading">Permission Matrix</h3>
              {isBossForm ? <Badge variant="success">Full access by default</Badge> : null}
            </div>
            <PermissionMatrix
              disabled={isBossForm}
              modulePermissions={options.modulePermissions}
              onChange={(permissions) => updateFormValue('permissions', permissions)}
              value={effectivePermissions}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button disabled={saving} onClick={closeFormModal} type="button" variant="outline">
              Cancel
            </Button>
            <Button loading={saving} type="submit">
              Save User
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        description="This removes the login account. Existing business records remain in place."
        onClose={() => setDeleteTarget(null)}
        open={Boolean(deleteTarget)}
        title="Delete User"
      >
        <div className="space-y-5">
          <p className="text-sm text-body">
            Delete <span className="font-semibold text-heading">{deleteTarget?.name}</span>?
          </p>
          <div className="flex justify-end gap-3">
            <Button disabled={deleting} onClick={() => setDeleteTarget(null)} type="button" variant="outline">
              Cancel
            </Button>
            <Button loading={deleting} onClick={handleDeleteUser} type="button" variant="danger">
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default UsersPage;
