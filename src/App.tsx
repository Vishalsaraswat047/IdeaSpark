/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Trash2,
  Plus,
  Compass,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  ChevronRight,
  MessageSquare,
  Send,
  Calendar,
  Layers,
  Target,
  Users,
  Globe,
  Code2,
  AlertCircle,
  Activity,
  Bot,
  RefreshCw,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { IdeaReport, ChatMessage } from "./types";
import NewIdeaForm from "./components/NewIdeaForm";

const CATEGORIES = [
  { id: "Startup", title: "Startup Venture", color: "text-blue-600 bg-blue-50 border-blue-100" },
  { id: "Research", title: "Research & Academic", color: "text-amber-600 bg-amber-50 border-amber-100" },
  { id: "Social Impact", title: "Social Impact / NGO", color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
  { id: "Product Concept", title: "Product Feature", color: "text-purple-600 bg-purple-50 border-purple-100" },
  { id: "Other", title: "Other Innovation", color: "text-gray-600 bg-gray-50 border-gray-100" },
];

export default function App() {
  const [ideas, setIdeas] = useState<IdeaReport[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<IdeaReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"analysis" | "scores" | "market" | "improvements" | "roadmap">("scores");
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<{ [ideaId: string]: ChatMessage[] }>({});
  const [inputMessage, setInputMessage] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Fetch registered ideas on load
  const fetchIdeas = async () => {
    try {
      const res = await fetch("/api/ideas");
      if (res.ok) {
        const data = await res.json();
        setIdeas(data);
        if (data.length > 0 && !selectedIdea) {
          // Default to select first idea
          setSelectedIdea(data[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching ideas:", err);
    }
  };

  useEffect(() => {
    fetchIdeas();
  }, []);

  // Fetch initial chats from localstorage if desired, or handle in-memory
  useEffect(() => {
    if (selectedIdea) {
      // Auto scroll chat to bottom when selecting an idea or receiving a message
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedIdea, chatMessages, isAsking]);

  const handleAnalyze = async (rawInput: string, category: string) => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/ideas/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawInput, category }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze idea.");
      }
      setIdeas((prev) => [data, ...prev]);
      setSelectedIdea(data);
      setActiveTab("scores");
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during evaluation.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this innovation report?")) return;
    try {
      const res = await fetch(`/api/ideas/${id}`, { method: "DELETE" });
      if (res.ok) {
        const updated = ideas.filter((item) => item.id !== id);
        setIdeas(updated);
        if (selectedIdea?.id === id) {
          setSelectedIdea(updated.length > 0 ? updated[0] : null);
        }
      }
    } catch (err) {
      console.error("Failed to delete idea:", err);
    }
  };

  const handleAskAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIdea || !inputMessage.trim() || isAsking) return;

    const userMsgText = inputMessage;
    setInputMessage("");

    const currentIdeaId = selectedIdea.id;
    const previousHistory = chatMessages[currentIdeaId] || [];
    
    const userMessage: ChatMessage = {
      role: "user",
      text: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Update locally immediately
    setChatMessages((prev) => ({
      ...prev,
      [currentIdeaId]: [...previousHistory, userMessage],
    }));

    setIsAsking(true);

    try {
      const res = await fetch(`/api/ideas/${currentIdeaId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsgText,
          chatHistory: previousHistory,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Advisor is currently unreachable.");
      }

      const modelMessage: ChatMessage = {
        role: "model",
        text: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => ({
        ...prev,
        [currentIdeaId]: [...(prev[currentIdeaId] || []), modelMessage],
      }));
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        role: "model",
        text: "⚠️ Core System Error: " + (err.message || "Unable to parse request. Please verify NVIDIA_API_KEY."),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => ({
        ...prev,
        [currentIdeaId]: [...(prev[currentIdeaId] || []), errorMessage],
      }));
    } finally {
      setIsAsking(false);
    }
  };

  const currentChats = selectedIdea ? chatMessages[selectedIdea.id] || [] : [];

  // Circle dynamic calculations for SVG gauges
  const getScoreColor = (score: number) => {
    if (score >= 80) return "stroke-emerald-500 text-emerald-600 bg-emerald-50";
    if (score >= 60) return "stroke-blue-500 text-blue-600 bg-blue-50";
    if (score >= 40) return "stroke-amber-500 text-amber-600 bg-amber-50";
    return "stroke-rose-500 text-rose-600 bg-rose-50";
  };

  const getScoreFillColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-100";
    if (score >= 60) return "text-blue-600 bg-blue-50 border-blue-100";
    if (score >= 40) return "text-amber-600 bg-amber-50 border-amber-100";
    return "text-rose-600 bg-rose-50 border-rose-100";
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafb]" id="app-root">
      {/* Upper Navigation Bar */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-40 shadow-xs" id="header">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-brand-600 to-indigo-600 text-white rounded-xl shadow-xs">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div>
              <span className="font-display font-bold text-lg tracking-tight text-gray-900 block">
                IdeaSpark <span className="text-brand-600">AI</span>
              </span>
              <span className="text-[10px] text-gray-400 block font-mono -mt-1 leading-none">
                "From Ideas to Opportunities."
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {selectedIdea && (
              <button
                onClick={() => setSelectedIdea(null)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-dashed border-brand-200 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 hover:border-brand-300 transition-all shadow-2xs"
                id="btn-new-spark"
              >
                <Plus size={14} />
                New Spark
              </button>
            )}
            <div className="text-xs text-gray-400 hidden sm:block bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl font-mono">
              Validation Engine v1.2
            </div>
          </div>
        </div>
      </header>

      {/* Main Framework Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row min-h-0" id="main-frame">
        
        {/* Sidebar Panel: All Submitted Ideas */}
        <aside className="w-full md:w-64 border-r border-gray-100 bg-white flex flex-col shrink-0 md:sticky md:top-20 md:h-[calc(100vh-6rem)]" id="history-sidebar">
          <div className="p-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <Activity size={12} className="text-brand-500" />
              Sought Innovations
            </h2>
            <span className="text-[11px] font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {ideas.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {ideas.length === 0 ? (
              <div className="text-center py-8 px-4 border-2 border-dashed border-gray-50 rounded-xl hover:bg-gray-50/50 transition-colors">
                <Compass size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-xs text-gray-400 font-medium">No recorded evaluations.</p>
                <p className="text-[10px] text-gray-400 mt-1">Submit your first concept in the center pane to begin validation.</p>
              </div>
            ) : (
              ideas.map((item) => {
                const isSelected = selectedIdea?.id === item.id;
                const catBadge = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[4];
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedIdea(item);
                      setErrorMessage(null);
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all relative group shadow-2xs ${
                      isSelected
                        ? "bg-brand-50/50 border-brand-200 ring-2 ring-brand-100"
                        : "bg-white border-gray-100 hover:border-gray-200"
                    }`}
                    id={`sidebar-item-${item.id}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white border border-gray-200 text-gray-500">
                        {item.category}
                      </span>
                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        className="text-gray-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 p-0.5"
                        title="Delete Concept"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <h3 className="text-xs font-bold text-gray-900 group-hover:text-brand-700 transition-colors truncate">
                      {item.title}
                    </h3>
                    <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">
                      {item.tagline}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-50">
                      <span className="text-[9px] font-mono text-gray-400">
                        {new Date(item.submittedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                      <div className="flex items-center gap-1 font-mono text-[10px] font-bold text-brand-700">
                        Score: {item.scores?.overall || "N/A"}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-4 border-t border-gray-50 space-y-2 bg-gray-50/30">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
              <Bot size={14} className="text-brand-500 animate-pulse" />
              Your Personal AI Sandbox
            </div>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Every concept is processed via isolated pipelines to guarantee research confidentiality.
            </p>
          </div>
        </aside>

        {/* Center Canvas Area: Dashboard or Submit Form */}
        <main className="flex-1 px-4 py-6 md:p-6 flex flex-col justify-between" id="center-panel">
          
          <AnimatePresence mode="wait">
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 rounded-xl border border-rose-100 bg-rose-50 text-rose-800 text-xs flex items-start gap-2 max-w-4xl mx-auto w-full shadow-2xs"
                id="error-block"
              >
                <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Evaluation Suspended: </span>
                  {errorMessage}
                  <div className="mt-2 text-[10px] font-mono text-rose-600">
                    Protip: Verify that your Gemini Secret is properly formulated in the Secrets Panel.
                  </div>
                </div>
              </motion.div>
            )}

            {!selectedIdea ? (
              <NewIdeaForm
                onSubmit={handleAnalyze}
                isAnalyzing={isAnalyzing}
              />
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="max-w-4xl w-full mx-auto space-y-6"
                id="report-dashboard-container"
              >
                {/* Active Idea Core Header */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-100">
                      <Sparkles size={12} />
                      {selectedIdea.category} Category
                    </span>
                    <span className="text-xs font-mono text-gray-400">
                      Evaluated on {new Date(selectedIdea.submittedAt).toLocaleString([], { dateStyle: "long", timeStyle: "short" })}
                    </span>
                  </div>

                  <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-gray-900 mb-1">
                    {selectedIdea.title}
                  </h1>
                  <p className="text-base text-gray-500 italic max-w-2xl font-sans mb-4">
                    "{selectedIdea.tagline}"
                  </p>

                  <div className="p-4 bg-gray-50 rounded-xl mb-4 border border-gray-100">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                      <Compass size={12} className="text-gray-500" />
                      Submitted Premise
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed max-h-24 overflow-y-auto whitespace-pre-wrap font-sans">
                      {selectedIdea.rawInput}
                    </p>
                  </div>

                  {/* Dynamic Nav Tabs */}
                  <div className="flex flex-wrap border-b border-gray-100 pt-2 gap-1 overflow-x-auto">
                    {[
                      { id: "scores", label: "Validation Scores", icon: Activity },
                      { id: "analysis", label: "Structured Analysis", icon: Target },
                      { id: "market", label: "Market Intelligence", icon: TrendingUp },
                      { id: "improvements", label: "Recommended Enhancements", icon: Sparkles },
                      { id: "roadmap", label: "MVP Execution Roadmap", icon: Layers },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-[2px] transition-all whitespace-nowrap ${
                            isActive
                              ? "border-brand-600 text-brand-700 bg-brand-50/20"
                              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
                          }`}
                          id={`tab-btn-${tab.id}`}
                        >
                          <Icon size={14} />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Switchable Dashboard Screens */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start" id="tabbed-modules">
                  <div className="md:col-span-2 space-y-6">
                    <AnimatePresence mode="wait">
                      
                      {/* SCORES TAB */}
                      {activeTab === "scores" && (
                        <motion.div
                          key="scores-tab"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="space-y-6"
                        >
                          {/* Main Scoring Header */}
                          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                            <h2 className="text-sm font-bold font-display text-gray-900 border-b border-gray-50 pb-3 mb-6 flex items-center gap-1.5">
                              <Activity size={16} className="text-brand-500" />
                              Innovation Scoring Deck
                            </h2>

                            <div className="flex flex-col sm:flex-row items-center gap-8 justify-around p-4 bg-gradient-to-tr from-brand-50/30 to-indigo-50/30 rounded-xl border border-brand-100/50 mb-6">
                              {/* Overall SVG Circular progress gage */}
                              <div className="relative w-32 h-32 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                  <circle
                                    cx="64"
                                    cy="64"
                                    r="52"
                                    className="stroke-gray-100"
                                    strokeWidth="8"
                                    fill="transparent"
                                  />
                                  <circle
                                    cx="64"
                                    cy="64"
                                    r="52"
                                    className={`transition-all duration-1000 ${getScoreColor(selectedIdea.scores?.overall || 0)}`}
                                    strokeWidth="10"
                                    fill="transparent"
                                    strokeDasharray={`${2 * Math.PI * 52}`}
                                    strokeDashoffset={`${2 * Math.PI * 52 * (1 - (selectedIdea.scores?.overall || 0) / 100)}`}
                                    strokeLinecap="round"
                                  />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                  <span className="text-3xl font-display font-black text-gray-900">
                                    {selectedIdea.scores?.overall || 0}
                                  </span>
                                  <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">
                                    Opportunity
                                  </span>
                                </div>
                              </div>

                              <div className="text-left space-y-2 max-w-xs">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-[#aaa] font-mono">
                                  Score Indexing
                                </h3>
                                <p className="text-sm font-semibold text-gray-900">
                                  Braced Global Potential Rating
                                </p>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                  The Overall Opportunity calculation factors initial novelty, ease of MVP deployment, direct market accessibility, and risk resistance.
                                </p>
                              </div>
                            </div>

                            {/* Sub scores Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {[
                                { title: "Originality & Novelty", data: selectedIdea.scores?.innovation, icon: Sparkles, label: "Innovation" },
                                { title: "Technical Feasibility", data: selectedIdea.scores?.feasibility, icon: Code2, label: "Feasibility" },
                                { title: "Global Impact Metric", data: selectedIdea.scores?.impact, icon: Globe, label: "Impact" },
                                { title: "Startup Viability Market", data: selectedIdea.scores?.startupPotential, icon: TrendingUp, label: "Startup Potential" },
                              ].map((scoreObj, idx) => (
                                <div key={idx} className="p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-all flex flex-col justify-between">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                      <scoreObj.icon size={12} className="text-brand-500" />
                                      {scoreObj.label}
                                    </span>
                                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${getScoreFillColor(scoreObj.data?.score || 0)}`}>
                                      {scoreObj.data?.score || 0}%
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-700 font-medium mb-1.5 leading-snug">
                                    {scoreObj.title}
                                  </p>
                                  <p className="text-[11px] text-gray-500 italic leading-relaxed">
                                    "{scoreObj.data?.feedback}"
                                  </p>
                                </div>
                              ))}
                            </div>

                            {/* Risk Exposure assessment */}
                            {selectedIdea.scores?.riskScore && (
                              <div className="mt-4 p-4 border border-rose-100 bg-rose-50/50 rounded-xl">
                                <div className="flex items-center gap-2 mb-1">
                                  <AlertTriangle size={15} className="text-rose-600 animate-bounce" />
                                  <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                                    Risk Score Assessment: {selectedIdea.scores.riskScore.score}% Exposure
                                  </h4>
                                </div>
                                <p className="text-xs text-rose-800 leading-relaxed">
                                  {selectedIdea.scores.riskScore.feedback}
                                </p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}

                      {/* ANALYSIS TAB */}
                      {activeTab === "analysis" && (
                        <motion.div
                          key="analysis-tab"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="space-y-6"
                        >
                          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
                            <h2 className="text-sm font-bold font-display text-gray-900 border-b border-gray-50 pb-3 flex items-center gap-1.5">
                              <Target size={16} className="text-brand-500" />
                              Structured Innovation Breakdown
                            </h2>

                            {selectedIdea.analysis ? (
                              <div className="space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="p-4 bg-gray-55/40 border border-gray-100 rounded-xl">
                                    <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                      Industry Core
                                    </span>
                                    <p className="text-xs font-bold text-gray-900">
                                      {selectedIdea.analysis.industryClassification || "De Facto Frontier Innovation"}
                                    </p>
                                  </div>

                                  <div className="p-4 bg-gray-55/40 border border-gray-100 rounded-xl">
                                    <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                      Global Target Audience
                                    </span>
                                    <p className="text-xs font-bold text-gray-900">
                                      {selectedIdea.analysis.targetAudience}
                                    </p>
                                  </div>
                                </div>

                                <div className="p-4 border border-indigo-50 bg-indigo-50/10 rounded-xl space-y-1.5">
                                  <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <AlertTriangle size={12} className="text-indigo-500" />
                                    Defined Problem Statement
                                  </h3>
                                  <p className="text-xs text-gray-700 leading-relaxed">
                                    {selectedIdea.analysis.problemStatement}
                                  </p>
                                </div>

                                <div className="p-4 border border-brand-50 bg-brand-50/10 rounded-xl space-y-1.5">
                                  <h3 className="text-xs font-bold text-brand-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <CheckCircle2 size={12} className="text-brand-500" />
                                    The Intelligent Solution Architecture
                                  </h3>
                                  <p className="text-xs text-gray-700 leading-relaxed">
                                    {selectedIdea.analysis.solutionOverview}
                                  </p>
                                </div>

                                <div className="p-4 border border-emerald-50 bg-emerald-50/10 rounded-xl space-y-1.5">
                                  <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                                    <TrendingUp size={12} className="text-emerald-600" />
                                    Primary Value Proposition & Catalyst
                                  </h3>
                                  <p className="text-xs text-gray-700 leading-relaxed">
                                    {selectedIdea.analysis.valueProposition}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400">Analysis metrics unavailable.</p>
                            )}
                          </div>
                        </motion.div>
                      )}

                      {/* MARKET INTELLIGENCE TAB */}
                      {activeTab === "market" && (
                        <motion.div
                          key="market-tab"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="space-y-6"
                        >
                          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
                            <h2 className="text-sm font-bold font-display text-gray-900 border-b border-gray-50 pb-3 flex items-center gap-1.5">
                              <TrendingUp size={16} className="text-indigo-500" />
                              Competitive Market Intelligence
                            </h2>

                            {selectedIdea.market ? (
                              <div className="space-y-6">
                                {/* Market Size Sizing */}
                                <div className="p-4 bg-gradient-to-tr from-brand-50/20 to-indigo-50/20 rounded-xl border border-brand-100">
                                  <h3 className="text-xs font-bold text-brand-950 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                                    <Globe size={13} className="text-brand-600" />
                                    Addressable Market Potential
                                  </h3>
                                  <p className="text-sm font-semibold text-gray-900 font-display">
                                    {selectedIdea.market.marketSize || "Emergent Blue Ocean Sector"}
                                  </p>
                                </div>

                                {/* Known Competitors */}
                                <div>
                                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                                    Identified Competitive Alternatives
                                  </h3>
                                  {selectedIdea.market.competitors?.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-4">
                                      {selectedIdea.market.competitors.map((comp, idx) => (
                                        <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col justify-between">
                                          <div>
                                            <h4 className="text-xs font-bold text-gray-900">{comp.name}</h4>
                                            <p className="text-[11px] text-gray-500 leading-normal mb-2 mt-0.5">{comp.description}</p>
                                          </div>
                                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                                            <div>
                                              <span className="text-[9px] font-mono font-bold text-emerald-600 uppercase tracking-wide">strength</span>
                                              <p className="text-[10px] text-gray-700 leading-relaxed italic">"{comp.strengths}"</p>
                                            </div>
                                            <div>
                                              <span className="text-[9px] font-mono font-bold text-rose-600 uppercase tracking-wide">weakness</span>
                                              <p className="text-[10px] text-gray-700 leading-relaxed italic">"{comp.weaknesses}"</p>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-gray-400 italic">No exact competitors identified. Pioneer blue-ocean opportunity suspected.</p>
                                  )}
                                </div>

                                {/* Industry Trends pills */}
                                <div>
                                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                                    Strategic Industry Trends Shift
                                  </h3>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedIdea.market.industryTrends?.map((trend, idx) => (
                                      <span key={idx} className="text-xs px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 font-sans font-medium">
                                        📈 {trend}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                {/* Market opportunities */}
                                <div>
                                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                                    Unlocked Arbitrages & Opportunities
                                  </h3>
                                  <div className="space-y-2">
                                    {selectedIdea.market.marketOpportunities?.map((opp, idx) => (
                                      <div key={idx} className="flex gap-2 text-xs text-gray-700 leading-relaxed">
                                        <span className="text-emerald-500 flex-shrink-0 font-bold">✓</span>
                                        <span>{opp}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400">Competitive insights unpopulated.</p>
                            )}
                          </div>
                        </motion.div>
                      )}

                      {/* IMPROVEMENTS TAB */}
                      {activeTab === "improvements" && (
                        <motion.div
                          key="improvements-tab"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="space-y-6"
                        >
                          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
                            <h2 className="text-sm font-bold font-display text-gray-900 border-b border-gray-50 pb-3 flex items-center gap-1.5">
                              <Sparkles size={16} className="text-brand-500" />
                              AI-Driven Idea Re-Positioning & Enhancement Gaps
                            </h2>

                            {selectedIdea.improvements ? (
                              <div className="space-y-6">
                                <p className="text-xs text-gray-500 font-sans leading-relaxed">
                                  Based on current market signals, these recommendations optimize the initial vision to address hidden demand vectors and maximize the ultimate valuation ceiling.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="p-4 bg-indigo-50/20 border border-indigo-100/50 rounded-xl space-y-2">
                                    <span className="text-[10px] font-mono font-bold text-indigo-600 uppercase tracking-wider block">
                                      Recommended Feature Extension
                                    </span>
                                    <ul className="space-y-2">
                                      {selectedIdea.improvements.additionalFeatures?.map((f, idx) => (
                                        <li key={idx} className="text-xs text-gray-700 flex gap-1.5 leading-relaxed">
                                          <span className="text-brand-500">•</span>
                                          <span>{f}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>

                                  <div className="p-4 bg-emerald-50/20 border border-emerald-100/50 rounded-xl space-y-2">
                                    <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase tracking-wider block">
                                      High-Value Targeted Segments
                                    </span>
                                    <ul className="space-y-2">
                                      {selectedIdea.improvements.betterTargetMarkets?.map((m, idx) => (
                                        <li key={idx} className="text-xs text-gray-700 flex gap-1.5 leading-relaxed">
                                          <span className="text-emerald-500">•</span>
                                          <span>{m}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>

                                  <div className="p-4 bg-amber-50/20 border border-amber-100/50 rounded-xl space-y-2">
                                    <span className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-wider block">
                                      Product UX Enhancements
                                    </span>
                                    <ul className="space-y-2">
                                      {selectedIdea.improvements.productEnhancements?.map((e, idx) => (
                                        <li key={idx} className="text-xs text-gray-700 flex gap-1.5 leading-relaxed">
                                          <span className="text-amber-500">•</span>
                                          <span>{e}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>

                                  <div className="p-4 bg-purple-50/20 border border-purple-100/50 rounded-xl space-y-2">
                                    <span className="text-[10px] font-mono font-bold text-purple-700 uppercase tracking-wider block">
                                      Strategic Playbook Tweaks
                                    </span>
                                    <ul className="space-y-2">
                                      {selectedIdea.improvements.strategicImprovements?.map((s, idx) => (
                                        <li key={idx} className="text-xs text-gray-700 flex gap-1.5 leading-relaxed">
                                          <span className="text-purple-500">•</span>
                                          <span>{s}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400">Optimization notes unavailable.</p>
                            )}
                          </div>
                        </motion.div>
                      )}

                      {/* ROADMAP TAB */}
                      {activeTab === "roadmap" && (
                        <motion.div
                          key="roadmap-tab"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="space-y-6"
                        >
                          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
                            <h2 className="text-sm font-bold font-display text-gray-900 border-b border-gray-50 pb-3 flex items-center gap-1.5">
                              <Layers size={16} className="text-indigo-500" />
                              MVP Phased Execution Roadmap
                            </h2>

                            {selectedIdea.roadmap ? (
                              <div className="space-y-6">
                                {/* Technology Recommendations Chips */}
                                <div>
                                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <Code2 size={13} className="text-gray-500" />
                                    Optimized Technology Stack Recommendations
                                  </h3>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedIdea.roadmap.recommendedTechnologies?.map((tech, idx) => (
                                      <span key={idx} className="text-xs px-3 py-1 bg-gray-100 text-gray-800 border border-gray-200 rounded-lg font-mono">
                                        {tech}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                {/* Stepper Phases */}
                                <div>
                                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                                    Dev Stages & Milestones
                                  </h3>
                                  <div className="space-y-6 relative pl-4 border-l border-brand-100">
                                    {selectedIdea.roadmap.stages?.map((stage, idx) => (
                                      <div key={idx} className="relative">
                                        {/* Colored circle pointer */}
                                        <div className="absolute -left-[21px] top-0 w-3.5 h-3.5 rounded-full bg-white border-2 border-brand-500" />
                                        <div className="flex flex-wrap items-baseline justify-between gap-1 mb-1">
                                          <h4 className="text-xs font-bold text-gray-950">
                                            {stage.title}
                                          </h4>
                                          <span className="text-[10px] font-mono text-brand-600 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-full">
                                            📅 {stage.timeline}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 leading-relaxed mb-2">
                                          {stage.description}
                                        </p>

                                        {/* Actions & milestones */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                                          <div>
                                            <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                              Actions Checklist
                                            </span>
                                            <ul className="space-y-1">
                                              {stage.actions?.map((act, aIdx) => (
                                                <li key={aIdx} className="text-[10px] text-gray-700 flex gap-1 items-start">
                                                  <span className="text-gray-400 font-bold text-xs leading-none">-</span>
                                                  <span>{act}</span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                          <div>
                                            <span className="text-[9px] font-mono font-bold text-emerald-600 uppercase tracking-wider block mb-1">
                                              Milestone Target
                                            </span>
                                            <ul className="space-y-1">
                                              {stage.milestones?.map((mil, mIdx) => (
                                                <li key={mIdx} className="text-[10px] text-gray-750 flex gap-1 items-start">
                                                  <span className="text-emerald-500 font-bold leading-none">✓</span>
                                                  <span>{mil}</span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* MVP Features Core */}
                                <div className="p-4 bg-brand-50/20 border border-brand-100 rounded-xl">
                                  <h3 className="text-xs font-bold text-brand-950 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                    <Target size={13} className="text-brand-600" />
                                    Essential MVP Feature Scope
                                  </h3>
                                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {selectedIdea.roadmap.mvpFeatures?.map((feat, idx) => (
                                      <li key={idx} className="text-xs text-gray-800 flex gap-2">
                                        <span className="text-brand-500 font-bold">❖</span>
                                        <span>{feat}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                {/* Go-To-Market and launch strategy */}
                                <div>
                                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                                    GTM & Launch Strategy Block
                                  </h3>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {selectedIdea.roadmap.launchStrategy?.map((strat, idx) => (
                                      <div key={idx} className="p-3 bg-white border border-gray-100 rounded-xl flex items-start gap-2">
                                        <span className="text-indigo-500 font-bold text-xs">🚀</span>
                                        <p className="text-xs text-gray-700 leading-normal font-medium">{strat}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400">Launch strategies unavailable.</p>
                            )}
                          </div>
                        </motion.div>
                      )}

                    </AnimatePresence>
                  </div>

                  {/* AI Advisor Panel */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5 shadow-sm space-y-4 shrink-0 flex flex-col md:h-[500px] md:sticky md:top-24" id="ai-chat-advisor">
                    <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
                      <div className="p-1.5 bg-brand-50 text-brand-600 rounded-lg border border-brand-100 animate-pulse">
                        <Bot size={16} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-gray-900 leading-none">
                          Innovation Assistant
                        </h3>
                        <p className="text-[10px] text-gray-400 leading-relaxed mt-0.5">
                          Context: "{selectedIdea.title}"
                        </p>
                      </div>
                    </div>

                    {/* Chat Bubble Thread container */}
                    <div className="flex-1 overflow-y-auto space-y-3 min-h-[220px] max-h-[380px] p-1 pr-2">
                      {currentChats.length === 0 ? (
                        <div className="text-center py-6 px-2 space-y-2">
                          <Bot size={28} className="mx-auto text-gray-300" />
                          <p className="text-xs text-gray-600 font-semibold leading-relaxed">
                            Ask me anything about your idea!
                          </p>
                          <div className="flex flex-col gap-1 text-left max-w-xs mx-auto">
                            {[
                              "Is my idea worth pursuing?",
                              "What features should I add to my MVP?",
                              "What are typical risks to expect?",
                              "Describe competitor alternatives."
                            ].map((prompt, qIdx) => (
                              <button
                                key={qIdx}
                                onClick={() => setInputMessage(prompt)}
                                className="text-[10px] text-left hover:bg-gray-50 border border-gray-100 hover:border-brand-200 text-gray-500 px-2 py-1.5 rounded-lg transition-colors truncate"
                              >
                                {prompt}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        currentChats.map((msg, idx) => {
                          const isUser = msg.role === "user";
                          return (
                            <div
                              key={idx}
                              className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                            >
                              <div
                                className={`p-2.5 rounded-xl text-xs max-w-[90%] leading-relaxed ${
                                  isUser
                                    ? "bg-brand-600 text-white font-medium"
                                    : "bg-gray-50 text-gray-800 border border-gray-100"
                                }`}
                              >
                                {msg.text}
                              </div>
                              <span className="text-[8px] font-mono text-gray-400 mt-1 pl-1 pr-1">
                                {msg.timestamp}
                              </span>
                            </div>
                          );
                        })
                      )}

                      {isAsking && (
                        <div className="flex items-center gap-2 text-xs text-gray-400 pl-1 p-1">
                          <Bot size={13} className="animate-spin text-brand-500" />
                          <span>Advisor compiling answer...</span>
                        </div>
                      )}
                      
                      <div ref={chatBottomRef} />
                    </div>

                    {/* Ask field input */}
                    <form onSubmit={handleAskAssistant} className="pt-2 border-t border-gray-50 flex items-center gap-2">
                      <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Ask co-pilot..."
                        disabled={isAsking}
                        className="flex-1 text-xs border border-gray-100 rounded-xl px-3 py-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-100 outline-none placeholder-gray-400 font-sans"
                      />
                      <button
                        type="submit"
                        disabled={isAsking || !inputMessage.trim()}
                        className="p-2 rounded-xl bg-brand-600 text-white font-semibold disabled:opacity-50 transition-all hover:bg-brand-700 active:scale-95 flex items-center justify-center shrink-0"
                      >
                        <Send size={13} />
                      </button>
                    </form>
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Footer Branding line */}
      <footer className="bg-white border-t border-gray-100 py-3 text-center" id="footer">
        <p className="text-[10px] text-gray-400">
          IdeaSpark AI &copy; 2026. Every Great Innovation Starts with an Idea.
        </p>
      </footer>
    </div>
  );
}
