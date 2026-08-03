import { useEffect, useMemo, useState } from 'react';
import {
  Edit3,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import Select from '@/components/ui/Select';
import Table from '@/components/ui/Table';

import {
  ASSIGNABLE_ROLES,
  ROLES,
} from '@/constants/permissions';

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

const createEmptyForm = () => ({
  name: '',
  email: '',
  password: '',
  role: ROLES.User,
  permissions: [],
  isActive: true,
});

function getRoleBadgeVariant(role) {
  if (role === ROLES.Boss) {
    return 'success';
  }

  if (role === ROLES.Accountant) {
    return 'warning';
  }

  return 'neutral';
}

function buildPermissionSet(permissions = []) {
  return new Set(
    Array.isArray(permissions)
      ? permissions
      : [],
  );
}

function toRoleOptions(roles = []) {
  const backendRoles = Array.isArray(roles)
    ? roles.filter((role) =>
        ASSIGNABLE_ROLES.includes(role),
      )
    : [];

  const availableRoles = backendRoles.length
    ? backendRoles
    : ASSIGNABLE_ROLES;

  return availableRoles.map((role) => ({
    value: role,
    label: role,
  }));
}

function PermissionMatrix({
  modulePermissions,
  value,
  disabled,
  onChange,
}) {
  const selected = useMemo(
    () => buildPermissionSet(value),
    [value],
  );

  const modules = Object.entries(
    modulePermissions || {},
  );

  function togglePermission(permission) {
    if (!permission || disabled) {
      return;
    }

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
                <td className="px-4 py-3 text-sm font-semibold text-heading">
                  {moduleName}
                </td>

                {ACTIONS.map((action) => {
                  const permission =
                    actions?.[action.key];

                  return (
                    <td
                      key={action.key}
                      className="px-4 py-3 text-center"
                    >
                      {permission ? (
                        <input
                          type="checkbox"
                          checked={selected.has(
                            permission,
                          )}
                          disabled={disabled}
                          aria-label={`${moduleName} ${action.label}`}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                          onChange={() =>
                            togglePermission(
                              permission,
                            )
                          }
                        />
                      ) : (
                        <span className="text-sm text-body-muted">
                          -
                        </span>
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
  const toast = useToast();

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
  const [appliedSearch, setAppliedSearch] =
    useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formOpen, setFormOpen] =
    useState(false);

  const [editingUser, setEditingUser] =
    useState(null);

  const [form, setForm] = useState(
    createEmptyForm,
  );

  const [deleteTarget, setDeleteTarget] =
    useState(null);

  const [deleting, setDeleting] =
    useState(false);

  const [reloadKey, setReloadKey] =
    useState(0);

  const roleOptions = useMemo(
    () => toRoleOptions(options.roles),
    [options.roles],
  );

  const isBossForm =
    form.role === ROLES.Boss;

  const effectivePermissions = isBossForm
    ? options.rolePermissions?.[ROLES.Boss] ||
      form.permissions
    : form.permissions;

  useEffect(() => {
    let ignore = false;

    async function loadOptions() {
      try {
        const data =
          await fetchUserOptions();

        if (ignore) {
          return;
        }

        setOptions({
          roles:
            data.roles ||
            ASSIGNABLE_ROLES,
          modulePermissions:
            data.modulePermissions || {},
          rolePermissions:
            data.rolePermissions || {},
        });
      } catch (error) {
        if (!ignore) {
          toast.error(
            'Unable to load permission options',
            getApiErrorMessage(error),
          );
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
          search:
            appliedSearch || undefined,
        });

        if (!ignore) {
          setState(data);
        }
      } catch (error) {
        if (!ignore) {
          toast.error(
            'Unable to load users',
            getApiErrorMessage(error),
          );
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
  }, [
    appliedSearch,
    reloadKey,
    state.pagination.page,
    toast,
  ]);

  function refreshUsers() {
    setReloadKey(
      (current) => current + 1,
    );
  }

  function openCreateModal() {
    const defaultRole = ROLES.User;

    setEditingUser(null);

    setForm({
      ...createEmptyForm(),
      role: defaultRole,
      permissions:
        options.rolePermissions?.[
          defaultRole
        ] || [],
    });

    setFormOpen(true);
  }

  function openEditModal(user) {
    setEditingUser(user);

    setForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role:
        user.role || ROLES.User,
      permissions: Array.isArray(
        user.permissions,
      )
        ? user.permissions
        : [],
      isActive:
        user.isActive !== false,
    });

    setFormOpen(true);
  }

  function closeFormModal() {
    if (saving) {
      return;
    }

    setFormOpen(false);
    setEditingUser(null);
    setForm(createEmptyForm());
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
      permissions:
        options.rolePermissions?.[
          role
        ] || [],
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

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      permissions:
        effectivePermissions,
      isActive: form.isActive,
    };

    if (form.password) {
      payload.password =
        form.password;
    }

    setSaving(true);

    try {
      if (editingUser) {
        await updateUser(
          editingUser.id,
          payload,
        );

        toast.success(
          'User updated',
          'User role and permissions were saved.',
        );
      } else {
        await createUser(payload);

        toast.success(
          'User created',
          'The new user can sign in with the assigned access.',
        );
      }

      setFormOpen(false);
      setEditingUser(null);
      setForm(createEmptyForm());

      refreshUsers();
    } catch (error) {
      toast.error(
        'Unable to save user',
        getApiErrorMessage(error),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(user) {
    try {
      await updateUserActiveStatus(
        user.id,
        !user.isActive,
      );

      toast.success(
        user.isActive
          ? 'User deactivated'
          : 'User activated',
      );

      refreshUsers();
    } catch (error) {
      toast.error(
        'Unable to update user status',
        getApiErrorMessage(error),
      );
    }
  }

  async function handleDeleteUser() {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);

    try {
      await deleteUser(
        deleteTarget.id,
      );

      toast.success(
        'User deleted',
        'The user account was removed.',
      );

      setDeleteTarget(null);
      refreshUsers();
    } catch (error) {
      toast.error(
        'Unable to delete user',
        getApiErrorMessage(error),
      );
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
          <p className="font-semibold text-heading">
            {value}
          </p>

          <p className="mt-1 text-xs text-body">
            {row.email}
          </p>
        </div>
      ),
    },
    {
      key: 'role',
      title: 'Role',
      render: (value) => (
        <Badge
          variant={getRoleBadgeVariant(
            value,
          )}
        >
          {value}
        </Badge>
      ),
    },
    {
      key: 'permissions',
      title: 'Permissions',
      render: (value, row) => (
        <span className="text-sm text-body">
          {row.role === ROLES.Boss
            ? 'Full access'
            : `${value?.length || 0} assigned`}
        </span>
      ),
    },
    {
      key: 'isActive',
      title: 'Status',
      render: (value) => (
        <Badge
          variant={
            value
              ? 'success'
              : 'danger'
          }
        >
          {value
            ? 'Active'
            : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_, row) => (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="primary"
            title="Edit User"
            aria-label="Edit User"
            onClick={() =>
              openEditModal(row)
            }
          >
            <Edit3 className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            size="sm"
            variant="warning"
            title={
              row.isActive
                ? 'Deactivate User'
                : 'Activate User'
            }
            aria-label={
              row.isActive
                ? 'Deactivate User'
                : 'Activate User'
            }
            onClick={() =>
              handleToggleActive(row)
            }
          >
            {row.isActive ? (
              <UserX className="h-4 w-4" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
          </Button>

          <Button
            type="button"
            size="sm"
            variant="danger"
            title="Delete User"
            aria-label="Delete User"
            onClick={() =>
              setDeleteTarget(row)
            }
          >
            <Trash2 className="h-4 w-4" />
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

          <h2 className="mt-2 text-3xl font-bold text-heading">
            Users & Permissions
          </h2>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="warning"
            title="Refresh Users"
            aria-label="Refresh Users"
            onClick={refreshUsers}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="primary"
            title="Add User"
            aria-label="Add User"
            onClick={openCreateModal}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <form
        className="panel flex flex-col gap-3 p-4 sm:flex-row"
        onSubmit={handleSearchSubmit}
      >
        <Input
          leftIcon={Search}
          placeholder="Search by name, email, or role"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value,
            )
          }
        />

        <Button
          type="submit"
          className="h-12 sm:w-32"
        >
          Search
        </Button>
      </form>

      {loading ? (
        <div className="panel p-8 text-center text-sm text-body">
          Loading users...
        </div>
      ) : state.items.length ? (
        <>
          <Table
            columns={columns}
            data={state.items}
          />

          <div className="flex justify-end">
            <Pagination
              page={
                state.pagination.page
              }
              totalPages={
                state.pagination
                  .totalPages
              }
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
        open={formOpen}
        className="max-w-5xl"
        title={
          editingUser
            ? 'Edit User'
            : 'Add User'
        }
        description="Assign a role and configure module-level permissions."
        onClose={closeFormModal}
      >
        <form
          className="space-y-6"
          onSubmit={handleSaveUser}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Name"
              required
              value={form.name}
              onChange={(event) =>
                updateFormValue(
                  'name',
                  event.target.value,
                )
              }
            />

            <Input
              label="Email"
              type="email"
              required
              value={form.email}
              onChange={(event) =>
                updateFormValue(
                  'email',
                  event.target.value,
                )
              }
            />

            <Input
              label="Password"
              type="password"
              minLength={8}
              required={!editingUser}
              hint={
                editingUser
                  ? 'Leave blank to keep the current password.'
                  : undefined
              }
              value={form.password}
              onChange={(event) =>
                updateFormValue(
                  'password',
                  event.target.value,
                )
              }
            />

            <Select
              label="Role"
              required
              value={form.role}
              options={roleOptions}
              onChange={(event) =>
                handleRoleChange(
                  event.target.value,
                )
              }
            />
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3">
            <input
              type="checkbox"
              checked={form.isActive}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              onChange={(event) =>
                updateFormValue(
                  'isActive',
                  event.target.checked,
                )
              }
            />

            <span className="text-sm font-semibold text-heading">
              Active user
            </span>
          </label>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-heading">
                Permission Matrix
              </h3>

              {isBossForm ? (
                <Badge variant="success">
                  Full access by default
                </Badge>
              ) : null}
            </div>

            <PermissionMatrix
              disabled={isBossForm}
              modulePermissions={
                options.modulePermissions
              }
              value={
                effectivePermissions
              }
              onChange={(
                permissions,
              ) =>
                updateFormValue(
                  'permissions',
                  permissions,
                )
              }
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={
                closeFormModal
              }
            >
              Cancel
            </Button>

            <Button
              type="submit"
              loading={saving}
            >
              Save User
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="Delete User"
        description="This removes the login account. Existing business records remain in place."
        onClose={() => {
          if (!deleting) {
            setDeleteTarget(null);
          }
        }}
      >
        <div className="space-y-5">
          <p className="text-sm text-body">
            Delete{' '}
            <span className="font-semibold text-heading">
              {deleteTarget?.name}
            </span>
            ?
          </p>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() =>
                setDeleteTarget(null)
              }
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="danger"
              loading={deleting}
              onClick={
                handleDeleteUser
              }
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default UsersPage;