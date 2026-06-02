'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Briefcase,
  Users,
  GitPullRequest,
  CheckCircle,
  Clock,
  ChevronRight,
  Plus,
  ArrowRightLeft,
  X,
  FileText,
  UserPlus,
  Sparkles,
  Phone,
  Mail,
  ListOrdered,
} from 'lucide-react';
import RoleGuard from '@/components/layout/RoleGuard';

interface Job {
  _id: string;
  title: string;
  department: string;
  description: string;
  requirements: string[];
  isActive: boolean;
}

interface Candidate {
  _id: string;
  jobId: {
    _id: string;
    title: string;
    department: string;
    description?: string;
    requirements?: string[];
  };
  name: string;
  email: string;
  phone: string;
  resumeUrl?: string;
  aiScore: number;
  aiMatchReason?: string;
  stage: 'applied' | 'screened' | 'interview' | 'offer' | 'hired' | 'rejected';
  interviewNotes?: string;
  aiRecommendation?: string;
}

export default function RecruitmentPage() {
  const { data: session } = useSession();

  // Tabs: 'kanban' or 'jobs'
  const [activeTab, setActiveTab] = useState<'kanban' | 'jobs'>('kanban');

  // Data states
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected filter
  const [selectedJobFilter, setSelectedJobFilter] = useState('');

  // Modals
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);

  // Job Form state
  const [jobForm, setJobForm] = useState({
    title: '',
    department: 'Engineering',
    description: '',
    requirements: '',
  });

  // Candidate Form state
  const [candidateForm, setCandidateForm] = useState({
    jobId: '',
    name: '',
    email: '',
    phone: '',
    resumeUrl: '',
  });

  // Selected candidate profile detail modal
  const [activeCandidateDetail, setActiveCandidateDetail] = useState<Candidate | null>(null);
  const [tempNotes, setTempNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [screeningLoading, setScreeningLoading] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [interviewQuestions, setInterviewQuestions] = useState<any[]>([]);
  const [isQuestionsModalOpen, setIsQuestionsModalOpen] = useState(false);

  const triggerInterviewPrep = async () => {
    if (!activeCandidateDetail) return;
    setQuestionsLoading(true);
    try {
      const res = await fetch('/api/ai/interview-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: activeCandidateDetail._id }),
      });
      const json = await res.json();
      if (res.ok) {
        setInterviewQuestions(json.questions || []);
        setIsQuestionsModalOpen(true);
      } else {
        alert(json.error || 'Failed to generate questions');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleScreenResume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeCandidateDetail) return;

    setScreeningLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('candidateId', activeCandidateDetail._id);
    const jobDetails = `Title: ${activeCandidateDetail.jobId?.title || ''}. Description: ${activeCandidateDetail.jobId?.description || ''}. Requirements: ${activeCandidateDetail.jobId?.requirements?.join(', ') || ''}`;
    formData.append('jobDescription', jobDetails);

    try {
      const res = await fetch('/api/ai/screen-resume', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (res.ok) {
        alert('Resume screened successfully!');
        setActiveCandidateDetail(json.candidate);
        fetchCandidates();
      } else {
        alert(json.error || 'Failed to screen resume');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setScreeningLoading(false);
    }
  };

  // Fetch Jobs
  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/recruitment?type=jobs');
      const json = await res.json();
      if (res.ok) {
        setJobs(json || []);
        if (json.length > 0 && !candidateForm.jobId) {
          setCandidateForm((prev) => ({ ...prev, jobId: json[0]._id }));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Candidates
  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedJobFilter
        ? `/api/recruitment?type=candidates&jobId=${selectedJobFilter}`
        : '/api/recruitment?type=candidates';
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok) {
        setCandidates(json || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedJobFilter]);

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // Handle Job Form Submit
  const handleJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/recruitment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_job', ...jobForm }),
      });

      if (res.ok) {
        alert('Job Posting created successfully.');
        setIsJobModalOpen(false);
        setJobForm({ title: '', department: 'Engineering', description: '', requirements: '' });
        fetchJobs();
      } else {
        const errorJson = await res.json();
        alert(errorJson.error || 'Failed to create job');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Handle Candidate Form Submit
  const handleCandidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/recruitment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_candidate', ...candidateForm }),
      });

      if (res.ok) {
        alert('Candidate registered successfully.');
        setIsCandidateModalOpen(false);
        setCandidateForm({ jobId: jobs[0]?._id || '', name: '', email: '', phone: '', resumeUrl: '' });
        fetchCandidates();
      } else {
        const errorJson = await res.json();
        alert(errorJson.error || 'Failed to add candidate');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Update candidate stage (drag-drop equivalent buttons)
  const updateCandidateStage = async (candidateId: string, nextStage: string) => {
    try {
      const res = await fetch('/api/recruitment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, stage: nextStage }),
      });

      if (res.ok) {
        fetchCandidates();
        if (activeCandidateDetail?._id === candidateId) {
          const updatedCandidate = await res.json();
          setActiveCandidateDetail(updatedCandidate);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save Interview Notes
  const handleSaveNotes = async () => {
    if (!activeCandidateDetail) return;
    setNotesSaving(true);
    try {
      const res = await fetch('/api/recruitment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: activeCandidateDetail._id, interviewNotes: tempNotes }),
      });

      if (res.ok) {
        const updated = await res.json();
        setActiveCandidateDetail(updated);
        alert('Interview notes updated.');
        fetchCandidates();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setNotesSaving(false);
    }
  };

  // Kanban Columns list
  const stagesList = [
    { key: 'applied', label: 'Applied', color: 'border-slate-800 bg-slate-900/40 text-slate-400' },
    { key: 'screened', label: 'Screened', color: 'border-indigo-500/10 bg-indigo-500/5 text-indigo-400' },
    { key: 'interview', label: 'Interviewing', color: 'border-amber-500/10 bg-amber-500/5 text-amber-400' },
    { key: 'offer', label: 'Offer Sent', color: 'border-emerald-500/10 bg-emerald-500/5 text-emerald-400' },
    { key: 'hired', label: 'Hired', color: 'border-teal-500/10 bg-teal-500/5 text-teal-400' },
    { key: 'rejected', label: 'Rejected', color: 'border-rose-500/10 bg-rose-500/5 text-rose-400' },
  ];

  // Helper to color AI Score badge
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25';
    if (score >= 60) return 'bg-amber-500/15 text-amber-400 border-amber-500/25';
    return 'bg-slate-500/15 text-slate-400 border-slate-700/50';
  };

  return (
    <RoleGuard allowedRoles={['admin', 'hr_recruiter']}>
      <div className="space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-2">
              <Briefcase className="h-8 w-8 text-indigo-500" />
              <span>Recruitment Portal</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Oversee the talent acquisition pipeline, post new roles, and review AI resume scores.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCandidateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-sm font-semibold border border-slate-700 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Candidate</span>
            </button>

            <button
              onClick={() => setIsJobModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>New Job Post</span>
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab('kanban')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-medium transition-all ${
              activeTab === 'kanban'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitPullRequest className="h-4 w-4" />
            <span>Kanban Board</span>
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-medium transition-all ${
              activeTab === 'jobs'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            <span>Job Openings</span>
          </button>
        </div>

        {/* Tab Content 1: Kanban Board */}
        {activeTab === 'kanban' && (
          <div className="space-y-4">
            
            {/* Filter Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Filter by Opening
              </span>
              <select
                value={selectedJobFilter}
                onChange={(e) => setSelectedJobFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 text-xs w-64 appearance-none"
              >
                <option value="">All Job Positions</option>
                {jobs.map((j) => (
                  <option key={j._id} value={j._id}>
                    {j.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Kanban columns grid */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                <p className="text-slate-400 text-sm">Loading candidates board...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start overflow-x-auto pb-6">
                {stagesList.map((col) => {
                  const filtered = candidates.filter((c) => c.stage === col.key);

                  return (
                    <div key={col.key} className="flex flex-col max-h-[80vh] min-w-[220px] bg-slate-900/50 border border-slate-850 rounded-2xl p-4">
                      {/* Column Header */}
                      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800/80">
                        <span className="text-xs font-bold text-slate-350">{col.label}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 rounded-full text-slate-400">
                          {filtered.length}
                        </span>
                      </div>

                      {/* Column Cards scroll area */}
                      <div className="flex-1 space-y-3 overflow-y-auto min-h-[300px]">
                        {filtered.map((candidate) => (
                          <div
                            key={candidate._id}
                            onClick={() => {
                              setActiveCandidateDetail(candidate);
                              setTempNotes(candidate.interviewNotes || '');
                            }}
                            className="bg-slate-900 border border-slate-800/80 p-3.5 rounded-xl space-y-3 hover:border-indigo-500/40 hover:shadow-md hover:shadow-indigo-500/5 transition-all cursor-pointer group"
                          >
                            <div>
                              <h4 className="text-xs font-semibold text-slate-100 group-hover:text-indigo-400 transition-colors leading-snug">
                                {candidate.name}
                              </h4>
                              <p className="text-[10px] text-slate-400 mt-1 truncate">
                                {candidate.jobId?.title || 'Unknown Role'}
                              </p>
                            </div>

                            {/* AI Score and Actions */}
                            <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-850">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${getScoreColor(candidate.aiScore)}`}>
                                AI: {candidate.aiScore || 0}
                              </span>

                              {/* Stage shifter selection (Alternative to drag and drop) */}
                              <div className="flex gap-1">
                                <select
                                  value={candidate.stage}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => updateCandidateStage(candidate._id, e.target.value)}
                                  className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[9px] text-slate-400 focus:outline-none"
                                >
                                  {stagesList.map((st) => (
                                    <option key={st.key} value={st.key}>
                                      {st.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab Content 2: Active Job Openings */}
        {activeTab === 'jobs' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <div key={job._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded border border-indigo-500/15 uppercase w-fit block">
                    {job.department}
                  </span>
                  <h3 className="text-base font-bold text-slate-200">{job.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed truncate-3-lines">
                    {job.description}
                  </p>
                </div>

                <div className="border-t border-slate-800/80 pt-4">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Requirements</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {job.requirements.slice(0, 3).map((req, idx) => (
                      <span key={idx} className="text-[9px] bg-slate-950 border border-slate-850 px-2 py-0.5 rounded text-slate-400">
                        {req}
                      </span>
                    ))}
                    {job.requirements.length > 3 && (
                      <span className="text-[9px] bg-slate-950 border border-slate-850 px-2 py-0.5 rounded text-slate-500">
                        +{job.requirements.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* New Job Posting Dialog Modal */}
        {isJobModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <h2 className="text-lg font-bold text-slate-100">Create Job Opening</h2>
                <button
                  onClick={() => setIsJobModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleJobSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Job Title
                  </label>
                  <input
                    type="text"
                    required
                    value={jobForm.title}
                    onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                    placeholder="Senior React Engineer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Department
                    </label>
                    <select
                      value={jobForm.department}
                      onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
                    >
                      <option value="Engineering">Engineering</option>
                      <option value="Sales">Sales</option>
                      <option value="HR">HR</option>
                      <option value="Finance">Finance</option>
                      <option value="Operations">Operations</option>
                      <option value="Design">Design</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Job Description
                  </label>
                  <textarea
                    required
                    value={jobForm.description}
                    onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                    rows={4}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                    placeholder="Outline job responsibilities..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Key Requirements (comma separated)
                  </label>
                  <input
                    type="text"
                    required
                    value={jobForm.requirements}
                    onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                    placeholder="React, TypeScript, 3 years experience"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsJobModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold active:scale-95 transition-all shadow shadow-indigo-600/10"
                  >
                    Post Position
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* New Candidate Registration Dialog Modal */}
        {isCandidateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <h2 className="text-lg font-bold text-slate-100">Add Applicant Profile</h2>
                <button
                  onClick={() => setIsCandidateModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCandidateSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Associate with Job Position
                  </label>
                  <select
                    value={candidateForm.jobId}
                    onChange={(e) => setCandidateForm({ ...candidateForm, jobId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
                  >
                    {jobs.map((j) => (
                      <option key={j._id} value={j._id}>
                        {j.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Candidate Name
                  </label>
                  <input
                    type="text"
                    required
                    value={candidateForm.name}
                    onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                    placeholder="Applicant full name..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={candidateForm.email}
                      onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                      placeholder="email@domain.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      required
                      value={candidateForm.phone}
                      onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Resume Document URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={candidateForm.resumeUrl}
                    onChange={(e) => setCandidateForm({ ...candidateForm, resumeUrl: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                    placeholder="https://domain.com/resume.pdf"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCandidateModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold active:scale-95 transition-all shadow shadow-indigo-600/10"
                  >
                    Add Applicant
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Candidate Profile Details Drawer Modal */}
        {activeCandidateDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-end p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-l-2xl h-screen overflow-y-auto p-6 space-y-6 shadow-xl flex flex-col justify-between">
              
              <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start pb-4 border-b border-slate-800">
                  <div>
                    <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/15 uppercase">
                      Applicant Detail
                    </span>
                    <h2 className="text-xl font-bold text-slate-100 mt-2">{activeCandidateDetail.name}</h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Applying for: <span className="font-semibold text-slate-350">{activeCandidateDetail.jobId?.title}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveCandidateDetail(null)}
                    className="text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded-lg"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Info Card */}
                <div className="grid grid-cols-2 gap-3 p-4 bg-slate-950 border border-slate-850 rounded-xl text-xs">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-slate-300 truncate">{activeCandidateDetail.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-slate-300">{activeCandidateDetail.phone}</span>
                  </div>
                  {activeCandidateDetail.resumeUrl && (
                    <div className="col-span-2 flex items-center gap-2 mt-2 pt-2 border-t border-slate-900">
                      <FileText className="h-3.5 w-3.5 text-indigo-400" />
                      <a
                        href={activeCandidateDetail.resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:underline font-semibold"
                      >
                        Open Resume PDF Document
                      </a>
                    </div>
                  )}
                </div>

                {/* Upload and Screen Trigger */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <span className="block text-xs font-bold text-slate-350">Upload Resume for AI Screening</span>
                  <label className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-850 text-xs font-semibold rounded-xl text-slate-200 border border-slate-800 border-dashed cursor-pointer transition-all active:scale-98">
                    <Sparkles className="h-4 w-4 text-indigo-400" />
                    <span>{screeningLoading ? 'Screening PDF...' : 'Select Resume PDF File'}</span>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleScreenResume}
                      className="hidden"
                      disabled={screeningLoading}
                    />
                  </label>
                </div>

                {/* AI Review score board */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                      <Sparkles className="h-4 w-4 text-indigo-400" />
                      <span>AI Review Analysis</span>
                    </span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded border ${getScoreColor(activeCandidateDetail.aiScore)}`}>
                      Score: {activeCandidateDetail.aiScore || 0} / 100
                    </span>
                  </div>

                  {activeCandidateDetail.aiRecommendation && (
                    <p className="text-xs text-slate-300 leading-snug">
                      <span className="font-semibold text-slate-400">Match recommendation: </span>
                      <span className="font-bold text-indigo-400">{activeCandidateDetail.aiRecommendation}</span>
                    </p>
                  )}

                  {activeCandidateDetail.aiMatchReason ? (
                    <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                      {activeCandidateDetail.aiMatchReason}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic leading-relaxed mt-1">
                      No AI analysis run. Click the "Screen Resume" tab above or upload a resume in the Screener section to update.
                    </p>
                  )}
                </div>

                {/* Interview notes editor */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Interview Progress Notes
                  </label>
                  <textarea
                    value={tempNotes}
                    onChange={(e) => setTempNotes(e.target.value)}
                    rows={4}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs"
                    placeholder="Enter observations, ratings, and coding test feedback..."
                  />
                  <button
                    onClick={handleSaveNotes}
                    disabled={notesSaving}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow active:scale-95 transition-all w-fit block ml-auto"
                  >
                    {notesSaving ? 'Saving...' : 'Update Notes'}
                  </button>
                </div>

                {/* AI Interview Questions Trigger Button */}
                <button
                  type="button"
                  onClick={triggerInterviewPrep}
                  disabled={questionsLoading}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 disabled:opacity-50 text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all mt-4"
                >
                  {questionsLoading ? (
                    <span className="h-3.5 w-3.5 border-2 border-indigo-400/30 border-t-indigo-400 animate-spin rounded-full"></span>
                  ) : (
                    <>
                      <ListOrdered className="h-4 w-4" />
                      <span>Generate AI Interview Prep Sheet</span>
                    </>
                  )}
                </button>

              </div>

              {/* Transition stage drawer bottom */}
              <div className="border-t border-slate-800 pt-4 mt-6">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                  Update Candidate stage
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {stagesList.map((st) => (
                    <button
                      key={st.key}
                      onClick={() => updateCandidateStage(activeCandidateDetail._id, st.key)}
                      className={`py-1.5 px-2 border rounded-lg text-[10px] font-semibold transition-all ${
                        activeCandidateDetail.stage === st.key
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow'
                          : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-850'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* AI Interview Questions Sheet Modal */}
        {isQuestionsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm print:p-0 print:bg-white print:text-black">
            <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] print:border-0 print:shadow-none print:h-auto print:max-h-none print:bg-white print:text-black">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 print:hidden">
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <ListOrdered className="h-5 w-5 text-indigo-400" />
                  <span>Interview Prep Sheet</span>
                </h2>
                <button
                  onClick={() => setIsQuestionsModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Questions Sheet Content (Print-Ready) */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 print:overflow-visible print:p-0 print:text-black">
                {/* Print Title Block */}
                <div className="border-b border-slate-800 pb-4 print:border-black print:text-black">
                  <h1 className="text-2xl font-bold text-slate-100 print:text-black">FWC SmartHR - Candidate Evaluation</h1>
                  <div className="grid grid-cols-2 gap-4 mt-4 text-sm text-slate-300 print:text-black">
                    <p><span className="font-semibold text-slate-450 print:text-slate-700">Candidate:</span> {activeCandidateDetail?.name}</p>
                    <p><span className="font-semibold text-slate-455 print:text-slate-700">Position:</span> {activeCandidateDetail?.jobId?.title}</p>
                    <p><span className="font-semibold text-slate-460 print:text-slate-700">Department:</span> {activeCandidateDetail?.jobId?.department}</p>
                    <p><span className="font-semibold text-slate-465 print:text-slate-700">Date:</span> {new Date().toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Questions listing */}
                <div className="space-y-6 print:text-black">
                  {interviewQuestions.map((q, idx) => (
                    <div key={idx} className="space-y-2 border-b border-slate-800/40 pb-4 last:border-0 print:border-slate-350 print:page-break-inside-avoid">
                      <div className="flex items-start gap-3">
                        <span className="font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded text-[10px] uppercase mt-0.5 shrink-0 print:border print:border-slate-300 print:text-black">
                          {q.type}
                        </span>
                        <h4 className="text-sm font-semibold text-slate-200 leading-snug print:text-black">
                          Q{idx + 1}: {q.question}
                        </h4>
                      </div>
                      <div className="pl-14 text-xs text-slate-400 leading-relaxed print:text-slate-800 print:pl-4">
                        <p><span className="font-semibold text-slate-500 print:text-slate-700">Expected Answer Keywords / Evaluation criteria:</span></p>
                        <p className="mt-1">{q.expectedAnswer}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/50 print:hidden">
                <button
                  type="button"
                  onClick={() => setIsQuestionsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold active:scale-95 transition-all shadow-lg shadow-indigo-600/15"
                >
                  Print Question Sheet
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
