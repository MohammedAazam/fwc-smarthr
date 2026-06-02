'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  Users,
  Award,
  CalendarDays,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import RoleGuard from '@/components/layout/RoleGuard';

interface Candidate {
  _id: string;
  name: string;
  email: string;
  aiScore: number;
  stage: string;
  jobId: {
    title: string;
    department: string;
  };
}

export default function HRDashboard() {
  const router = useRouter();

  // Recruitment metrics
  const [activeJobsCount, setActiveJobsCount] = useState(0);
  const [totalCandidates, setTotalCandidates] = useState(0);
  const [topCandidates, setTopCandidates] = useState<Candidate[]>([]);
  const [interviews, setInterviews] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/hr');
      const json = await res.json();
      if (res.ok) {
        setActiveJobsCount(json.activeJobsCount || 0);
        setTotalCandidates(json.totalCandidatesCount || 0);
        setTopCandidates(json.topCandidates || []);
        setInterviews(json.interviews || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20';
    if (score >= 60) return 'bg-amber-500/10 text-amber-455 border-amber-500/20';
    return 'bg-slate-500/10 text-slate-400 border-slate-700/50';
  };

  return (
    <RoleGuard allowedRoles={['admin', 'hr_recruiter']}>
      <div className="space-y-6">
        
        {/* Dashboard Title Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-2">
            <Briefcase className="h-8 w-8 text-indigo-500" />
            <span>Recruiter Operations Control</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Track talent pools, map interview slots, check job statistics, and analyze candidate metrics.
          </p>
        </div>

        {/* HR KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            onClick={() => router.push('/recruitment')}
            className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex items-center gap-5 cursor-pointer hover:border-indigo-500/30 transition-all group"
          >
            <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/15 text-indigo-400 group-hover:scale-105 transition-transform">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Openings</p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">{loading ? '--' : activeJobsCount}</h3>
            </div>
          </div>

          <div
            onClick={() => router.push('/recruitment')}
            className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex items-center gap-5 cursor-pointer hover:border-indigo-500/30 transition-all group"
          >
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/15 text-emerald-400 group-hover:scale-105 transition-transform">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Candidate Pool</p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">{loading ? '--' : totalCandidates}</h3>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex items-center gap-5">
            <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/15 text-rose-400">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Interviews Plotted</p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">{loading ? '--' : interviews.length}</h3>
            </div>
          </div>
        </div>

        {/* Top Candidates & Interview Schedule */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Top Ranked Candidates (AI Score desc) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl overflow-hidden">
            <h3 className="text-slate-100 font-bold text-base mb-4 flex items-center gap-2">
              <Award className="h-4.5 w-4.5 text-indigo-400" />
              <span>Top AI-Scored Applicants</span>
            </h3>

            {loading ? (
              <div className="space-y-3 py-4 animate-pulse">
                <div className="h-10 bg-slate-950 rounded-xl w-full"></div>
                <div className="h-10 bg-slate-950 rounded-xl w-full"></div>
              </div>
            ) : topCandidates.length === 0 ? (
              <p className="text-slate-500 text-xs py-10 text-center">No applicants scored yet.</p>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {topCandidates.map((candidate) => (
                  <div key={candidate._id} className="py-3.5 flex items-center justify-between text-xs hover:bg-slate-800/10 px-2 rounded-lg transition-all">
                    <div>
                      <h4 className="font-bold text-slate-200">{candidate.name}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Applied for: <span className="font-semibold text-slate-400">{candidate.jobId?.title}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getScoreColor(candidate.aiScore)}`}>
                        AI: {candidate.aiScore}
                      </span>
                      <button
                        onClick={() => router.push('/recruitment')}
                        className="p-1 hover:bg-slate-850 rounded text-slate-500 hover:text-white transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Interview Planner (Interviews stage) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl overflow-hidden">
            <h3 className="text-slate-100 font-bold text-base mb-4 flex items-center gap-2">
              <CalendarDays className="h-4.5 w-4.5 text-indigo-400" />
              <span>Interview Schedule Logs</span>
            </h3>

            {loading ? (
              <div className="space-y-3 py-4 animate-pulse">
                <div className="h-10 bg-slate-950 rounded-xl w-full"></div>
                <div className="h-10 bg-slate-950 rounded-xl w-full"></div>
              </div>
            ) : interviews.length === 0 ? (
              <p className="text-slate-500 text-xs py-10 text-center">No interviews scheduled today.</p>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {interviews.map((item) => (
                  <div key={item._id} className="py-3.5 flex items-center justify-between text-xs hover:bg-slate-800/10 px-2 rounded-lg transition-all">
                    <div>
                      <h4 className="font-bold text-slate-200">{item.name}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Role: <span className="font-semibold text-slate-400">{item.jobId?.title}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-955 border border-slate-800 px-2 py-0.5 rounded-full uppercase">
                        {item.stage}
                      </span>
                      <button
                        onClick={() => router.push('/recruitment')}
                        className="p-1 hover:bg-slate-850 rounded text-slate-500 hover:text-white transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
