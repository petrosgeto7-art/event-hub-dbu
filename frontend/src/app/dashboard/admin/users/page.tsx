'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Search, Users, Mail, Shield, Calendar, Building2, MoreHorizontal,
  UserCheck, UserX, Loader2, Pencil, Trash2, Ban, CheckCircle, Banknote
} from 'lucide-react';
import { format } from 'date-fns';

interface EditUserData {
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  phone: string;
  role: string;
  cbeAccount: string;
  telebirrAccount: string;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [editUser, setEditUser] = useState<any>(null);
  const [deleteUser, setDeleteUser] = useState<any>(null);
  const [editData, setEditData] = useState<EditUserData>({
    firstName: '', lastName: '', email: '', department: '', phone: '', role: '',
    cbeAccount: '', telebirrAccount: '',
  });

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-all-users'],
    queryFn: async () => {
      const res = await api.get('/users?limit=200');
      return res.data;
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EditUserData> }) => {
      const res = await api.put(`/users/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      toast.success('User updated successfully!');
      setEditUser(null);
    },
    onError: () => {
      toast.error('Failed to update user');
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const res = await api.patch(`/users/${id}/role`, { role });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      toast.success('User role updated!');
      setEditUser(null);
    },
    onError: () => {
      toast.error('Failed to update role');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/users/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      toast.success('User deleted successfully!');
      setDeleteUser(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    },
  });

  const suspendUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/users/${id}/suspend`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      toast.success('User suspended');
    },
    onError: () => {
      toast.error('Failed to suspend user');
    },
  });

  const activateUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/users/${id}/activate`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      toast.success('User activated');
    },
    onError: () => {
      toast.error('Failed to activate user');
    },
  });

  const users = usersData?.data || [];
  const filteredUsers = users.filter((u: any) => {
    const matchesSearch =
      u.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-primary/20 text-primary border-primary/30';
      case 'ADMIN': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'ORGANIZER': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'STUDENT': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const roleCounts = {
    all: users.length,
    STUDENT: users.filter((u: any) => u.role === 'STUDENT').length,
    ORGANIZER: users.filter((u: any) => u.role === 'ORGANIZER').length,
    ADMIN: users.filter((u: any) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length,
  };

  const openEditModal = (user: any) => {
    setEditData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      department: user.department || '',
      phone: user.phone || '',
      role: user.role || 'STUDENT',
      cbeAccount: user.cbeAccount || '',
      telebirrAccount: user.telebirrAccount || '',
    });
    setEditUser(user);
  };

  const handleSaveEdit = () => {
    if (!editUser) return;
    
    // Update profile data
    const { role, email, ...profileData } = editData;
    updateUserMutation.mutate({ id: editUser.id, data: profileData });
    
    // Update role separately if changed
    if (role !== editUser.role) {
      changeRoleMutation.mutate({ id: editUser.id, role });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Users Management</h1>
          <p className="text-muted-foreground text-sm mt-1">View, edit, and manage all platform users</p>
        </div>
      </div>

      {/* Role Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: 'All Users', icon: Users },
          { key: 'STUDENT', label: 'Students', icon: UserCheck },
          { key: 'ORGANIZER', label: 'Organizers', icon: Building2 },
          { key: 'ADMIN', label: 'Admins', icon: Shield },
        ].map((tab) => (
          <Button
            key={tab.key}
            variant={roleFilter === tab.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRoleFilter(tab.key)}
            className={`gap-2 rounded-full ${roleFilter === tab.key ? 'bg-primary text-primary-foreground' : 'bg-card border-border text-foreground'}`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-white/10">
              {roleCounts[tab.key as keyof typeof roleCounts]}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          className="pl-10 bg-card border-border"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Users List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No users found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map((user: any) => (
            <Card key={user.id} className="bg-card border-border hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </div>
                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground text-sm truncate">
                        {user.firstName} {user.lastName}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          {user.email}
                        </span>
                        {user.department && (
                          <span className="hidden sm:flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {user.department}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Side */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Badge className={`text-xs ${getRoleBadge(user.role)}`}>
                      {user.role}
                    </Badge>
                    {user.isVerified ? (
                      <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">
                        <UserCheck className="w-3 h-3 mr-1" /> Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-400">
                        <UserX className="w-3 h-3 mr-1" /> Pending
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground hidden md:block">
                      {user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : ''}
                    </span>

                    {/* Actions Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-8 w-8 p-0 flex items-center justify-center rounded-md hover:bg-white/10 outline-none transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-card border-border">
                        <DropdownMenuItem onClick={() => openEditModal(user)} className="gap-2 cursor-pointer">
                          <Pencil className="w-3.5 h-3.5" /> Edit User
                        </DropdownMenuItem>
                        {user.isActive ? (
                          <DropdownMenuItem onClick={() => suspendUserMutation.mutate(user.id)} className="gap-2 cursor-pointer text-yellow-400">
                            <Ban className="w-3.5 h-3.5" /> Suspend
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => activateUserMutation.mutate(user.id)} className="gap-2 cursor-pointer text-green-400">
                            <CheckCircle className="w-3.5 h-3.5" /> Activate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem onClick={() => setDeleteUser(user)} className="gap-2 cursor-pointer text-destructive">
                          <Trash2 className="w-3.5 h-3.5" /> Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit User Modal */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogTitle className="text-xl font-bold">Edit User</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update user profile details, role, and bank accounts.
          </DialogDescription>
          <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">First Name</Label>
                <Input id="edit-firstName" value={editData.firstName}
                  onChange={(e) => setEditData(d => ({ ...d, firstName: e.target.value }))}
                  className="bg-white/5 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">Last Name</Label>
                <Input id="edit-lastName" value={editData.lastName}
                  onChange={(e) => setEditData(d => ({ ...d, lastName: e.target.value }))}
                  className="bg-white/5 border-white/10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-department">Department</Label>
              <Input id="edit-department" value={editData.department}
                onChange={(e) => setEditData(d => ({ ...d, department: e.target.value }))}
                className="bg-white/5 border-white/10" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input id="edit-phone" value={editData.phone}
                onChange={(e) => setEditData(d => ({ ...d, phone: e.target.value }))}
                className="bg-white/5 border-white/10" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editData.role} onValueChange={(val) => setEditData(d => ({ ...d, role: val as string }))}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="STUDENT">Student</SelectItem>
                  <SelectItem value="ORGANIZER">Organizer</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bank Account Section */}
            <div className="pt-4 border-t border-white/10">
              <h4 className="font-bold text-sm flex items-center gap-2 mb-3">
                <Banknote className="w-4 h-4 text-green-400" /> Bank Account Details
              </h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-cbe">Commercial Bank of Ethiopia (CBE)</Label>
                  <Input id="edit-cbe" value={editData.cbeAccount}
                    onChange={(e) => setEditData(d => ({ ...d, cbeAccount: e.target.value }))}
                    placeholder="e.g. 1000422094327"
                    className="bg-white/5 border-white/10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-telebirr">Telebirr</Label>
                  <Input id="edit-telebirr" value={editData.telebirrAccount}
                    onChange={(e) => setEditData(d => ({ ...d, telebirrAccount: e.target.value }))}
                    placeholder="e.g. 0903433857"
                    className="bg-white/5 border-white/10" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-4">
            <Button variant="outline" onClick={() => setEditUser(null)} className="border-white/20">
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateUserMutation.isPending || changeRoleMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {(updateUserMutation.isPending || changeRoleMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogTitle className="text-xl font-bold text-destructive">Delete User</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Are you sure you want to permanently delete this user? This action cannot be undone.
          </DialogDescription>
          {deleteUser && (
            <div className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center text-destructive font-bold text-sm">
                  {deleteUser.firstName?.[0]}{deleteUser.lastName?.[0]}
                </div>
                <div>
                  <p className="font-semibold">{deleteUser.firstName} {deleteUser.lastName}</p>
                  <p className="text-xs text-muted-foreground">{deleteUser.email}</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-3 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteUser(null)} className="border-white/20">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteUser && deleteUserMutation.mutate(deleteUser.id)}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
