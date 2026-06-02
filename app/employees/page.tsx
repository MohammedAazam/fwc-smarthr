'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import * as reactWindow from 'react-window';
// @ts-ignore
const List = reactWindow.FixedSizeList || (reactWindow as any).default?.FixedSizeList || reactWindow;
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Download,
  Users,
  GitFork,
  ChevronRight,
  ChevronDown,
  X,
  Upload,
} from 'lucide-react';
import RoleGuard from '@/components/layout/RoleGuard';

interface Employee {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'senior_manager' | 'hr_recruiter' | 'employee';
  department: string;
  designation: string;
  managerId: {
    _id: string;
    name: string;
    designation: string;
  } | null;
  phone?: string;
  photoUrl?: string;
  basicSalary: number;
}

export default function EmployeesPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.role === 'admin';

  // Tabs: 'directory' or 'orgchart'
  const [activeTab, setActiveTab] = useState<'directory' | 'orgchart'>('directory');

  // Search and Filter States
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // All employees for CSV and Org chart
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);

  // CRUD Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedId, setSelectedId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    department: 'Engineering',
    designation: '',
    managerId: '',
    phone: '',
    photoUrl: '',
    basicSalary: 30000,
  });

  const [uploading, setUploading] = useState(false);

  const departments = ['Engineering', 'Sales', 'HR', 'Finance', 'Operations', 'Design'];

  // Fetch paginated employees
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/employees?page=${page}&limit=20&search=${encodeURIComponent(search)}&department=${encodeURIComponent(
          department
        )}`
      );
      const json = await res.json();
      if (res.ok) {
        setEmployees(json.data || []);
        setTotalPages(json.totalPages || 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, department]);

  // Fetch managers list (for dropdown selection)
  const fetchManagers = async () => {
    try {
      const res = await fetch('/api/employees?limit=200&managerOnly=true');
      const json = await res.json();
      if (res.ok) {
        setManagers(json.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch all active employees flat list (for CSV export and org chart tree)
  const fetchAllEmployees = async () => {
    try {
      const res = await fetch('/api/employees/org-chart');
      const json = await res.json();
      if (res.ok) {
        setAllEmployees(json || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchManagers();
    fetchAllEmployees();
  }, []);

  // Handle Photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', 'unsigned_hrms'); // Replace with a Cloudinary unsigned preset if needed

    try {
      // Mock Cloudinary fallback if credentials are mock
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'mock-cloud';
      if (cloudName === 'mock-cloud') {
        // Return a mock URL simulating successful upload
        setTimeout(() => {
          setFormData((prev) => ({
            ...prev,
            photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
          }));
          setUploading(false);
        }, 1000);
        return;
      }

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: form,
      });
      const json = await res.json();
      if (res.ok) {
        setFormData((prev) => ({ ...prev, photoUrl: json.secure_url }));
      }
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
    }
  };

  // Create or Update submit handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = '/api/employees';
    const method = modalMode === 'add' ? 'POST' : 'PUT';

    const payload =
      modalMode === 'add'
        ? formData
        : { id: selectedId, ...formData };

    // Clean up empty password
    if (modalMode === 'edit' && !formData.password) {
      delete (payload as any).password;
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchEmployees();
        fetchManagers();
        fetchAllEmployees();
      } else {
        const errorJson = await res.json();
        alert(`Error: ${errorJson.error || 'Failed to save employee'}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Delete employee
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this employee?')) return;

    try {
      const res = await fetch(`/api/employees?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchEmployees();
        fetchAllEmployees();
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  // Client-Side CSV Exporter
  const exportToCSV = () => {
    if (allEmployees.length === 0) return;
    const headers = ['Name', 'Email', 'Department', 'Designation', 'Role', 'Phone', 'Basic Salary'];
    const rows = allEmployees.map((emp) => [
      emp.name,
      emp.email,
      emp.department,
      emp.designation,
      emp.role,
      emp.phone || '',
      emp.basicSalary || 0,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'employees_directory.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // React Virtualization for Directory (Scalability requirement for 100+ items)
  const VirtualRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = employees[index];
    if (!item) return null;

    return (
      <div
        style={style}
        className="flex items-center px-4 border-b border-slate-800/80 hover:bg-slate-800/20 text-slate-300 text-sm"
      >
        <div className="w-[20%] flex items-center gap-3">
          <div className="h-8 w-8 rounded-full overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
            {item.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.photoUrl} alt={item.name} className="h-full w-full object-cover" />
            ) : (
              <Users className="h-4 w-4 text-slate-400" />
            )}
          </div>
          <span className="font-semibold text-slate-100 truncate">{item.name}</span>
        </div>
        <div className="w-[20%] truncate">{item.email}</div>
        <div className="w-[15%] truncate">{item.designation}</div>
        <div className="w-[15%] truncate">{item.department}</div>
        <div className="w-[15%] truncate">{item.managerId?.name || 'N/A'}</div>
        <div className="w-[15%] flex justify-end gap-2 pr-2">
          {isAdmin && (
            <>
              <button
                onClick={() => {
                  setModalMode('edit');
                  setSelectedId(item._id);
                  setFormData({
                    name: item.name,
                    email: item.email,
                    password: '',
                    role: item.role,
                    department: item.department,
                    designation: item.designation,
                    managerId: item.managerId?._id || '',
                    phone: item.phone || '',
                    photoUrl: item.photoUrl || '',
                    basicSalary: item.basicSalary,
                  });
                  setIsModalOpen(true);
                }}
                className="p-1.5 hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-400 rounded-lg transition-colors"
                title="Edit Employee"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(item._id)}
                className="p-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                title="Deactivate"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  // Render Org Chart Tree Node Recursively
  const renderTreeNode = (managerId: string | null, depth = 0) => {
    // Find children linked to this manager
    const children = allEmployees.filter((emp) => {
      if (managerId === null) {
        // Root managers: role is admin or senior_manager, and managerId is null or missing from list
        return (
          (emp.role === 'admin' || emp.role === 'senior_manager') &&
          (!emp.managerId || !allEmployees.some((m) => m._id === String(emp.managerId)))
        );
      }
      return String(emp.managerId) === String(managerId) && emp._id !== String(managerId);
    });

    // Remove duplicates if any
    const uniqueChildren = Array.from(new Set(children.map((c) => c._id))).map((id) =>
      children.find((c) => c._id === id)
    );

    if (uniqueChildren.length === 0) return null;

    return (
      <ul className={`pl-6 border-l border-slate-800 space-y-3 ${depth > 0 ? 'mt-3' : ''}`}>
        {uniqueChildren.map((emp) => {
          if (!emp) return null;
          return (
            <li key={emp._id} className="relative">
              {/* Connecting line */}
              <div className="absolute left-[-24px] top-4 w-6 border-t border-slate-800"></div>

              <div className="inline-flex items-center gap-3 p-3 bg-slate-900 border border-slate-800 rounded-xl shadow-sm min-w-[240px]">
                <div className="h-8 w-8 rounded-full overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  {emp.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={emp.photoUrl} alt={emp.name} className="h-full w-full object-cover" />
                  ) : (
                    <Users className="h-4 w-4 text-slate-400" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-100 leading-none">{emp.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-1">{emp.designation}</p>
                  <p className="text-[9px] text-indigo-400 font-semibold bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/15 w-fit mt-1 leading-none uppercase">
                    {emp.department}
                  </p>
                </div>
              </div>

              {/* Recursively render child employees */}
              {renderTreeNode(emp._id, depth + 1)}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <RoleGuard allowedRoles={['admin', 'senior_manager', 'hr_recruiter']}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-2">
              <Users className="h-8 w-8 text-indigo-500" />
              <span>Employees Directory</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Manage organization profiles, structure hierarchy, and staff roles.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-sm font-semibold border border-slate-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => {
                  setModalMode('add');
                  setFormData({
                    name: '',
                    email: '',
                    password: '',
                    role: 'employee',
                    department: 'Engineering',
                    designation: '',
                    managerId: '',
                    phone: '',
                    photoUrl: '',
                    basicSalary: 30000,
                  });
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>Add Employee</span>
              </button>
            )}
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-medium transition-all ${
              activeTab === 'directory'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Directory List</span>
          </button>
          <button
            onClick={() => setActiveTab('orgchart')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-medium transition-all ${
              activeTab === 'orgchart'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitFork className="h-4 w-4" />
            <span>Org Chart Tree</span>
          </button>
        </div>

        {/* Tabs Content */}
        {activeTab === 'directory' ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {/* Table Filters */}
            <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition-colors"
                />
              </div>

              <div className="flex gap-3">
                <div className="relative min-w-[160px]">
                  <Filter className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <select
                    value={department}
                    onChange={(e) => {
                      setDepartment(e.target.value);
                      setPage(1);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm appearance-none"
                  >
                    <option value="">All Departments</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* List Header */}
            <div className="flex items-center px-4 py-3.5 bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold text-xs uppercase tracking-wider">
              <div className="w-[20%]">Employee</div>
              <div className="w-[20%]">Email</div>
              <div className="w-[15%]">Designation</div>
              <div className="w-[15%]">Department</div>
              <div className="w-[15%]">Reports To</div>
              <div className="w-[15%] text-right pr-4">Actions</div>
            </div>

            {/* List Body with Virtualization */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                <p className="text-slate-400 text-sm">Loading employees...</p>
              </div>
            ) : employees.length === 0 ? (
              <div className="py-20 text-center text-slate-500 text-sm">No employees found.</div>
            ) : (
              <List
                height={Math.min(employees.length * 60, 540)}
                itemCount={employees.length}
                itemSize={60}
                width="100%"
                className="overflow-y-auto"
              >
                {VirtualRow}
              </List>
            )}

            {/* Pagination footer */}
            <div className="p-4 border-t border-slate-800 flex justify-between items-center text-slate-400 text-xs bg-slate-900/50">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
                >
                  Prev
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Tree Org Chart Tab */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 overflow-x-auto shadow-xl">
            <h3 className="text-slate-200 font-semibold mb-4 text-sm">Hierarchical Structure</h3>
            <div className="min-w-[800px] py-4">
              {allEmployees.length === 0 ? (
                <div className="py-10 text-center text-slate-500 text-sm">Generating chart structure...</div>
              ) : (
                /* Root Tree Trigger */
                renderTreeNode(null)
              )}
            </div>
          </div>
        )}

        {/* Add/Edit CRUD Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <h2 className="text-lg font-bold text-slate-100">
                  {modalMode === 'add' ? 'Add New Employee' : 'Edit Employee Profile'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Photo Upload Box */}
                  <div className="md:col-span-2 flex items-center gap-5 p-4 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="h-16 w-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 relative">
                      {formData.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={formData.photoUrl}
                          alt="preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Users className="h-6 w-6 text-slate-500" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-200">Profile Photo</p>
                      <p className="text-xs text-slate-500">Upload to Cloudinary (Mock fallback if empty)</p>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-200 border border-slate-700 cursor-pointer mt-1">
                        <Upload className="h-3.5 w-3.5" />
                        <span>{uploading ? 'Uploading...' : 'Choose File'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                          disabled={uploading}
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                      placeholder="Jane Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                      placeholder="jane@company.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Password {modalMode === 'edit' && '(Leave blank to keep current)'}
                    </label>
                    <input
                      type="password"
                      required={modalMode === 'add'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      System Role
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e: any) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm appearance-none"
                    >
                      <option value="employee">Employee</option>
                      <option value="hr_recruiter">HR Recruiter</option>
                      <option value="senior_manager">Senior Manager</option>
                      <option value="admin">System Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Department
                    </label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm appearance-none"
                    >
                      {departments.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Designation
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                      placeholder="Software Engineer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Reports To (Manager)
                    </label>
                    <select
                      value={formData.managerId}
                      onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm appearance-none"
                    >
                      <option value="">No Manager (Root)</option>
                      {managers.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name} ({m.designation})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Basic Salary
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.basicSalary}
                      onChange={(e) =>
                        setFormData({ ...formData, basicSalary: parseInt(e.target.value) || 0 })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                      placeholder="35000"
                    />
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-sm font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                  >
                    {modalMode === 'add' ? 'Create Profile' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
