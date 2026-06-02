'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Award,
  Plus,
  Trash2,
  TrendingUp,
  FileText,
  Sliders,
  Sparkles,
  Search,
  CheckCircle,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import RoleGuard from '@/components/layout/RoleGuard';

interface Goal {
  _id?: string;
  title: string;
  target: number;
  achieved: number;
  score: number;
}

interface ReviewRecord {
  _id: string;
  userId: string;
  reviewerId: {
    name: string;
    designation: string;
  };
  period: string;
  goals: Goal[];
  overallRating: number;
  aiGeneratedReview?: string;
  submittedAt: string;
}

export default function PerformancePage() {
  const { data: session } = useSession();
  const currentUser = session?.user as any;
  const isManagerOrAdmin = ['admin', 'senior_manager'].includes(currentUser?.role || '');

  // Active view: 'my_goals' or 'set_goals_reviews'
  const [activeTab, setActiveTab] = useState<'my_goals' | 'set_goals_reviews'>('my_goals');

  // Employee data states
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Managers select employee
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  // Set goals states
  const [goalPeriod, setGoalPeriod] = useState('Q2 2026');
  const [newGoalsList, setNewGoalsList] = useState<Omit<Goal, 'score' | 'achieved'>[]>([
    { title: 'Complete Next.js Core Features', target: 100 },
  ]);

  // Review states
  const [reviewPeriod, setReviewPeriod] = useState('Q2 2026');
  const [rating, setRating] = useState(4);
  const [observations, setObservations] = useState('');
  const [aiReviewText, setAiReviewText] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);

  // Chart data resolution
  const [chartData, setChartData] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Fetch employees list
  const fetchEmployeesList = async () => {
    try {
      const res = await fetch('/api/employees?limit=200');
      const json = await res.json();
      if (res.ok) {
        setEmployeesList(json.data || []);
        if (json.data && json.data.length > 0 && !selectedEmployeeId) {
          setSelectedEmployeeId(json.data[0]._id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch performance reviews
  const fetchPerformanceData = useCallback(async () => {
    setLoading(true);
    try {
      const targetUser = isManagerOrAdmin ? selectedEmployeeId : currentUser?.id;
      if (!targetUser) return;

      const res = await fetch(`/api/performance?employeeId=${targetUser}`);
      const json = await res.json();
      if (res.ok) {
        setReviews(json || []);

        // Format chart data (reverse to chronological order)
        const reversed = [...(json || [])].reverse();
        const formatted = reversed.map((r: any) => ({
          period: r.period,
          rating: r.overallRating,
          avgGoalCompletion: Math.round(
            r.goals.reduce((acc: number, curr: any) => acc + (curr.achieved / curr.target) * 100, 0) /
              (r.goals.length || 1)
          ),
        }));
        setChartData(formatted);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [isManagerOrAdmin, selectedEmployeeId, currentUser?.id]);

  useEffect(() => {
    setIsClient(true);
    if (isManagerOrAdmin) {
      fetchEmployeesList();
    }
  }, [isManagerOrAdmin]);

  useEffect(() => {
    if (currentUser?.id) {
      fetchPerformanceData();
    }
  }, [currentUser?.id, selectedEmployeeId, fetchPerformanceData]);

  // Handle slide progress updates for employees
  const handleProgressUpdate = async (reviewId: string, goalId: string, value: number) => {
    try {
      const res = await fetch('/api/performance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, goalId, achieved: value }),
      });

      if (res.ok) {
        fetchPerformanceData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add draft goal item
  const addDraftGoal = () => {
    setNewGoalsList([...newGoalsList, { title: '', target: 100 }]);
  };

  // Remove draft goal item
  const removeDraftGoal = (idx: number) => {
    setNewGoalsList(newGoalsList.filter((_, i) => i !== idx));
  };

  // Set goals submission
  const handleSetGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || newGoalsList.some((g) => !g.title)) {
      alert('Please fill out all goal titles.');
      return;
    }

    try {
      const res = await fetch('/api/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          period: goalPeriod,
          goals: newGoalsList,
        }),
      });

      if (res.ok) {
        alert('Goals set successfully for this period.');
        setNewGoalsList([{ title: '', target: 100 }]);
        fetchPerformanceData();
      } else {
        const errorJson = await res.json();
        alert(errorJson.error || 'Failed to set goals');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // AI Performance Review Generator trigger (calls endpoint written in Step 12)
  const triggerAiReviewGenerator = async () => {
    if (!selectedEmployeeId || !observations) {
      alert('Please provide manager observations first so the AI has context.');
      return;
    }

    setAiGenerating(true);
    try {
      // Find current goals for selected period to feed into AI
      const currentReview = reviews.find((r) => r.period === reviewPeriod);
      const goalsText = currentReview
        ? currentReview.goals.map((g) => `${g.title} (Target: ${g.target}%, Achieved: ${g.achieved}%)`).join(', ')
        : 'No specific goals set';

      const res = await fetch('/api/ai/generate-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          period: reviewPeriod,
          rating,
          managerObservations: observations,
          goals: goalsText,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setAiReviewText(json.review);
      } else {
        alert(json.error || 'Failed to generate review. Falling back to manual text.');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setAiGenerating(false);
    }
  };

  // Save finalized review
  const handleSaveFinalReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || !aiReviewText) {
      alert('Please compile the review text before saving.');
      return;
    }

    setReviewSaving(true);
    try {
      const currentReview = reviews.find((r) => r.period === reviewPeriod);
      const goals = currentReview ? currentReview.goals : [];

      const res = await fetch('/api/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          period: reviewPeriod,
          goals,
          overallRating: rating,
          aiGeneratedReview: aiReviewText,
        }),
      });

      if (res.ok) {
        alert('Performance review finalized and saved.');
        setObservations('');
        setAiReviewText('');
        fetchPerformanceData();
      } else {
        const errorJson = await res.json();
        alert(errorJson.error || 'Failed to save review');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setReviewSaving(false);
    }
  };

  return (
    <RoleGuard allowedRoles={['admin', 'senior_manager', 'employee']}>
      <div className="space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-2">
              <Award className="h-8 w-8 text-indigo-500" />
              <span>Performance &amp; Goals</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Set organizational goals, track employee progress levels, and run AI-assisted performance evaluations.
            </p>
          </div>

          {/* Tab toggles */}
          {isManagerOrAdmin && (
            <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 shrink-0">
              <button
                onClick={() => setActiveTab('my_goals')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'my_goals' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Progress Dashboard
              </button>
              <button
                onClick={() => setActiveTab('set_goals_reviews')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'set_goals_reviews' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Set Goals &amp; Review
              </button>
            </div>
          )}
        </div>

        {/* Tab Content 1: Progress dashboard */}
        {activeTab === 'my_goals' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Recharts Trend Chart & Reviews */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Trend Chart */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-slate-100 font-bold text-base mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4.5 w-4.5 text-indigo-400" />
                  <span>Performance Score Trends</span>
                </h3>

                <div className="h-64 w-full">
                  {isClient && chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }} />
                        <Line
                          type="monotone"
                          dataKey="avgGoalCompletion"
                          stroke="#6366f1"
                          strokeWidth={3}
                          activeDot={{ r: 8 }}
                          name="Avg Goal Completion (%)"
                        />
                        <Line
                          type="monotone"
                          dataKey="rating"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          name="Overall Rating (1-5)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                      Not enough evaluation periods completed to display trend data.
                    </div>
                  )}
                </div>
              </div>

              {/* Past Reviews Log */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-slate-100 font-bold text-base mb-4 flex items-center gap-2">
                  <FileText className="h-4.5 w-4.5 text-indigo-400" />
                  <span>Finalized Reviews Log</span>
                </h3>

                {loading ? (
                  <div className="py-10 text-center text-slate-500 text-sm">Loading evaluations...</div>
                ) : reviews.filter((r) => r.aiGeneratedReview).length === 0 ? (
                  <div className="py-10 text-center text-slate-500 text-sm">No review logs saved yet.</div>
                ) : (
                  <div className="space-y-4">
                    {reviews
                      .filter((r) => r.aiGeneratedReview)
                      .map((review) => (
                        <div key={review._id} className="p-5 bg-slate-950 border border-slate-850 rounded-xl space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-sm font-bold text-slate-200">{review.period} Review</h4>
                              <p className="text-[10px] text-slate-500 mt-1">
                                Reviewed by {review.reviewerId?.name} on {new Date(review.submittedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-xs font-semibold">
                              <span>★</span>
                              <span>{review.overallRating} / 5</span>
                            </div>
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line p-3 bg-slate-900 border border-slate-850 rounded-lg">
                            {review.aiGeneratedReview}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Goal sliders */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl h-fit">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-100 font-bold text-base flex items-center gap-2">
                  <Sliders className="h-4.5 w-4.5 text-indigo-400" />
                  <span>Quarterly Goals</span>
                </h3>
                {isManagerOrAdmin && (
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-500 text-[10px] w-36 appearance-none"
                  >
                    {employeesList.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {loading ? (
                <div className="py-20 text-center text-slate-500 text-sm animate-pulse">Loading goals...</div>
              ) : reviews.length === 0 ? (
                <div className="py-20 text-center text-slate-500 text-sm">No goals assigned for this user.</div>
              ) : (
                <div className="space-y-6">
                  {reviews.map((periodRec) => (
                    <div key={periodRec._id} className="space-y-4 border-b border-slate-800/80 pb-6 last:border-0 last:pb-0">
                      <div className="flex justify-between items-center bg-slate-950/45 px-3 py-1.5 rounded-lg border border-slate-850">
                        <span className="text-xs font-bold text-slate-200">{periodRec.period} Goals</span>
                        <span className="text-[10px] text-slate-500">Weight: 5pt Scale</span>
                      </div>

                      <div className="space-y-4">
                        {periodRec.goals.map((goal) => {
                          const isOwnRecord = periodRec.userId === currentUser?.id;
                          return (
                            <div key={goal._id} className="space-y-2.5">
                              <div className="flex justify-between text-xs">
                                <span className="font-semibold text-slate-300">{goal.title}</span>
                                <span className="text-indigo-400 font-bold">{goal.achieved} / {goal.target}%</span>
                              </div>

                              {/* Progress bar or slider */}
                              {isOwnRecord ? (
                                <div className="flex items-center gap-3">
                                  <input
                                    type="range"
                                    min="0"
                                    max={goal.target}
                                    value={goal.achieved}
                                    onChange={(e) =>
                                      handleProgressUpdate(periodRec._id, goal._id!, parseInt(e.target.value))
                                    }
                                    className="w-full h-1.5 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
                                  />
                                </div>
                              ) : (
                                <div className="w-full bg-slate-850 rounded-full h-2">
                                  <div
                                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(100, (goal.achieved / goal.target) * 100)}%` }}
                                  ></div>
                                </div>
                              )}
                              <p className="text-[9px] text-slate-500 text-right">
                                Goal Score: {goal.score} / 5
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Content 2: Set Goals and Reviews (Manager/Admin Only) */}
        {activeTab === 'set_goals_reviews' && isManagerOrAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Set Goals Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl h-fit">
              <h3 className="text-slate-100 font-bold text-base mb-4 flex items-center gap-2">
                <Plus className="h-4.5 w-4.5 text-indigo-400" />
                <span>Assign New Goals</span>
              </h3>

              <form onSubmit={handleSetGoals} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Target Staff
                    </label>
                    <select
                      value={selectedEmployeeId}
                      onChange={(e) => setSelectedEmployeeId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
                    >
                      {employeesList.map((emp) => (
                        <option key={emp._id} value={emp._id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Review Period
                    </label>
                    <select
                      value={goalPeriod}
                      onChange={(e) => {
                        setGoalPeriod(e.target.value);
                        setReviewPeriod(e.target.value);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
                    >
                      <option value="Q1 2026">Q1 2026</option>
                      <option value="Q2 2026">Q2 2026</option>
                      <option value="Q3 2026">Q3 2026</option>
                      <option value="Q4 2026">Q4 2026</option>
                    </select>
                  </div>
                </div>

                {/* Goals drafting list */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Goals Checklist
                  </label>

                  {newGoalsList.map((g, idx) => (
                    <div key={idx} className="flex gap-3 items-center">
                      <input
                        type="text"
                        required
                        placeholder="Goal description..."
                        value={g.title}
                        onChange={(e) => {
                          const updated = [...newGoalsList];
                          updated[idx].title = e.target.value;
                          setNewGoalsList(updated);
                        }}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                      />
                      <input
                        type="number"
                        required
                        value={g.target}
                        onChange={(e) => {
                          const updated = [...newGoalsList];
                          updated[idx].target = parseInt(e.target.value) || 100;
                          setNewGoalsList(updated);
                        }}
                        className="w-20 bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 text-center"
                        placeholder="100%"
                      />
                      <button
                        type="button"
                        onClick={() => removeDraftGoal(idx)}
                        disabled={newGoalsList.length <= 1}
                        className="p-2 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addDraftGoal}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5 mt-2"
                  >
                    <span>+ Add Goal Item</span>
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm active:scale-95 transition-all shadow-lg shadow-indigo-600/15"
                >
                  Confirm &amp; Assign Goals
                </button>
              </form>
            </div>

            {/* AI Review Generator Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-slate-100 font-bold text-base mb-1 flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-indigo-400" />
                <span>Quarterly Review Form</span>
              </h3>
              <p className="text-slate-400 text-xs mb-4">
                Formulate evaluations. Triggers Google Gemini to auto-generate review text drafts.
              </p>

              <form onSubmit={handleSaveFinalReview} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Review Period
                    </label>
                    <select
                      value={reviewPeriod}
                      onChange={(e) => setReviewPeriod(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
                    >
                      <option value="Q1 2026">Q1 2026</option>
                      <option value="Q2 2026">Q2 2026</option>
                      <option value="Q3 2026">Q3 2026</option>
                      <option value="Q4 2026">Q4 2026</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Overall Rating (1-5)
                    </label>
                    <select
                      value={rating}
                      onChange={(e) => setRating(parseInt(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
                    >
                      <option value={5}>5 - Outstanding</option>
                      <option value={4}>4 - Commendable</option>
                      <option value={3}>3 - Satisfactory</option>
                      <option value={2}>2 - Needs Improvement</option>
                      <option value={1}>1 - Unsatisfactory</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Manager Observations
                  </label>
                  <textarea
                    required
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                    placeholder="Describe strengths, leadership skills, or points for improvement to feed the AI generator..."
                  />
                </div>

                {/* AI Trigger Button */}
                <button
                  type="button"
                  onClick={triggerAiReviewGenerator}
                  disabled={aiGenerating}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  {aiGenerating ? (
                    <span className="h-3 w-3 border-2 border-indigo-400/30 border-t-indigo-400 animate-spin rounded-full"></span>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Draft with Google Gemini AI</span>
                    </>
                  )}
                </button>

                {/* Styled Review Text Area */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Finalized Review Summary (Editable)
                  </label>
                  <textarea
                    required
                    value={aiReviewText}
                    onChange={(e) => setAiReviewText(e.target.value)}
                    rows={5}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500 text-xs leading-relaxed"
                    placeholder="AI generated text will appear here. You can manually edit or refine before saving..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={reviewSaving}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm active:scale-95 transition-all shadow-lg shadow-indigo-600/15 flex items-center justify-center gap-2"
                >
                  {reviewSaving ? (
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full"></span>
                  ) : (
                    'Finalize &amp; Submit Review'
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
