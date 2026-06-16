import React, { useState } from "react";
import { Sparkles, ArrowRight, ShieldAlert, BookOpen, Lightbulb, HeartHandshake, Briefcase, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface NewIdeaFormProps {
  onSubmit: (rawInput: string, category: string) => Promise<void>;
  isAnalyzing: boolean;
}

const CATEGORIES = [
  { id: "Startup", title: "Startup Venture", icon: Briefcase, color: "text-blue-600 bg-blue-50 border-blue-100" },
  { id: "Research", title: "Research & Academic", icon: BookOpen, color: "text-amber-600 bg-amber-50 border-amber-100" },
  { id: "Social Impact", title: "Social Impact / NGO", icon: HeartHandshake, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
  { id: "Product Concept", title: "Product Feature", icon: Lightbulb, color: "text-purple-600 bg-purple-50 border-purple-100" },
  { id: "Other", title: "Other Innovation", icon: Sparkles, color: "text-gray-600 bg-gray-50 border-gray-100" },
];

const SUGGESTIONS = [
  {
    category: "Startup",
    title: "Eco-Agri Crop Scan",
    text: "An AI platform that helps rural farmers detect crop diseases early using standard smartphone photos.",
  },
  {
    category: "Product Concept",
    title: "NeuroLearning Quest",
    text: "A micro-learning app that converts dry academic textbook chapters into interactive audio roleplay games for students.",
  },
  {
    category: "Social Impact",
    title: "Elderly Fall Prediction",
    text: "Smart wearable IoT insoles that monitor stride frequency and gait balance to predict elderly falls before they occur.",
  },
];

const STAGES_MESSAGES = [
  "Structuring core problem components...",
  "Running competitive market discovery...",
  "Evaluating feasibility & tech architecture...",
  "Calculating Innovation scoring models...",
  "Synthesizing launch roadmap & MVP scope...",
];

export default function NewIdeaForm({ onSubmit, isAnalyzing }: NewIdeaFormProps) {
  const [rawInput, setRawInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Startup");
  const [loadingStage, setLoadingStage] = useState(0);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAnalyzing) {
      setLoadingStage(0);
      interval = setInterval(() => {
        setLoadingStage((prev) => (prev < STAGES_MESSAGES.length - 1 ? prev + 1 : prev));
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawInput.trim() || isAnalyzing) return;
    onSubmit(rawInput, selectedCategory);
  };

  const handleSuggestionClick = (text: string, category: string) => {
    setRawInput(text);
    setSelectedCategory(category);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 border border-brand-100 text-brand-700 rounded-full text-xs font-semibold mb-3 tracking-wide uppercase">
          <Sparkles size={14} className="animate-pulse" />
          Powered by Gemini 3.5 AI
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-gray-900 mb-4">
          From Ideas to <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-600">Opportunities</span>
        </h1>
        <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto font-sans leading-relaxed">
          Submit your startup vision, product concept, research idea, or social initiative.
          Our Advanced Validation Engine will evaluate the market, suggest improvements, and build your MVP roadmap.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!isAnalyzing ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="md:grid md:grid-cols-3 gap-8 items-start"
          >
            {/* Main Form */}
            <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 md:p-8 shadow-sm">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    1. Select Innovation Category
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {CATEGORIES.map((cat) => {
                      const IconComp = cat.icon;
                      const isSelected = selectedCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                            isSelected
                              ? "border-brand-500 bg-brand-50 text-brand-700 shadow-sm"
                              : "border-gray-100 hover:border-gray-200 bg-gray-50/50 hover:bg-gray-50 text-gray-600"
                          }`}
                        >
                          <IconComp size={18} className="mb-1" />
                          <span className="text-xs font-medium">{cat.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-baseline mb-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      2. Describe Your Concept
                    </label>
                    <span className="text-xs text-gray-400 font-mono">
                      {rawInput.length} chars
                    </span>
                  </div>
                  <textarea
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                    placeholder="E.g., An offline-first mobile app that helps farmers detect crop diseases by analyzing leaves using computer vision. It suggests organic treatments instantly and tracks treatment history..."
                    rows={6}
                    maxLength={1500}
                    required
                    className="w-full text-sm border border-gray-200 rounded-xl p-4 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all placeholder-gray-400 leading-relaxed font-sans"
                  />
                  <p className="mt-2 text-xs text-gray-400">
                    Be specific about the problem you are solving, the core solution, and the target users for a more accurate analysis.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={!rawInput.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                >
                  Analyze & Validate Innovation
                  <ArrowRight size={18} />
                </button>
              </form>
            </div>

            {/* Sidebar Suggestions */}
            <div className="mt-6 md:mt-0 space-y-4">
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Need Inspiration?
                </h3>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                  Click on any sample concept to load a structured starter configuration:
                </p>
                <div className="space-y-4">
                  {SUGGESTIONS.map((sug, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(sug.text, sug.category)}
                      className="w-full text-left bg-white hover:bg-brand-50/30 p-4 rounded-xl border border-gray-100 hover:border-brand-200 transition-all shadow-2xs group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                          {sug.category}
                        </span>
                        <ChevronRight size={14} className="text-gray-300 group-hover:text-brand-500 transition-colors" />
                      </div>
                      <h4 className="text-xs font-bold text-gray-950 mb-1 group-hover:text-brand-600 transition-colors">
                        {sug.title}
                      </h4>
                      <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                        {sug.text}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-center p-4 border border-dashed border-gray-200 rounded-2xl bg-white/50">
                <ShieldAlert size={18} className="mx-auto text-indigo-400 mb-2" />
                <h4 className="text-xs font-semibold text-gray-700 mb-1">100% Confidential</h4>
                <p className="text-[10px] text-gray-400">
                  Concept submissions are securely analyzed in-memory. Zero leaks.
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl border border-gray-100 p-8 md:p-12 text-center shadow-sm max-w-xl mx-auto"
          >
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-brand-100 animate-pulse" />
              <div className="absolute inset-0 rounded-full border-t-4 border-brand-600 animate-spin" />
              <div className="absolute inset-4 bg-brand-50 rounded-full flex items-center justify-center text-brand-600">
                <Sparkles size={24} className="animate-bounce" />
              </div>
            </div>

            <h3 className="text-xl font-bold font-display text-gray-900 mb-2">
              Evaluating Innovation Spark...
            </h3>
            
            <div className="h-6 overflow-hidden relative mb-4">
              <AnimatePresence mode="wait">
                <motion.p
                  key={loadingStage}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm font-semibold text-brand-600 absolute inset-0 text-center"
                >
                  {STAGES_MESSAGES[loadingStage]}
                </motion.p>
              </AnimatePresence>
            </div>

            <div className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
              Gemini is running competitive market scans, analyzing technological complexity and predicting business viability. This usually takes around 5-15 seconds.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
