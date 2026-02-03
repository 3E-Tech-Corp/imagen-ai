import { useState, useCallback, useRef } from 'react';
import api from '../services/api';
import VoiceInput from './VoiceInput';

interface Recipe {
  name: string;
  description: string;
  prepTime: string;
  cookTime: string;
  servings: number;
  calories: number;
  difficulty: string;
  ingredients: string[];
  steps: string[];
  tips: string;
  imagePrompt: string;
  imageUrl?: string;
}

interface RecipeResult {
  recipes: Recipe[];
}

interface MacroBreakdown {
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
  sugarGrams: number;
}

interface MealAnalysisResult {
  foodName: string;
  description: string;
  estimatedCalories: number;
  macros: MacroBreakdown;
  healthScore: number;
  goalVerdict: string;
  goalExplanation: string;
  pros: string[];
  cons: string[];
  suggestions: string[];
  portionSize: string;
}

const MEAL_TYPES = [
  { value: 'any', label: 'Cualquiera', emoji: '🍽️' },
  { value: 'breakfast', label: 'Desayuno', emoji: '🌅' },
  { value: 'lunch', label: 'Almuerzo', emoji: '☀️' },
  { value: 'dinner', label: 'Cena', emoji: '🌙' },
  { value: 'snack', label: 'Merienda', emoji: '🍪' },
  { value: 'dessert', label: 'Postre', emoji: '🍰' },
];

const DIET_PREFS = [
  { value: 'healthy', label: 'Saludable', emoji: '💚' },
  { value: 'vegetarian', label: 'Vegetariana', emoji: '🥬' },
  { value: 'vegan', label: 'Vegana', emoji: '🌱' },
  { value: 'keto', label: 'Keto', emoji: '🥑' },
  { value: 'gluten-free', label: 'Sin Gluten', emoji: '🌾' },
  { value: 'low-calorie', label: 'Baja Calorías', emoji: '🪶' },
  { value: 'high-protein', label: 'Alta Proteína', emoji: '💪' },
];

const GOALS = [
  { value: 'lose-fat', label: 'Perder Grasa', emoji: '🔥', gradient: 'from-red-600 to-orange-500', ring: 'ring-red-500/50', bg: 'bg-red-900/20', border: 'border-red-500' },
  { value: 'maintain', label: 'Mantener Peso', emoji: '⚖️', gradient: 'from-blue-600 to-cyan-500', ring: 'ring-blue-500/50', bg: 'bg-blue-900/20', border: 'border-blue-500' },
  { value: 'gain-muscle', label: 'Ganar Músculo', emoji: '💪', gradient: 'from-green-600 to-emerald-500', ring: 'ring-green-500/50', bg: 'bg-green-900/20', border: 'border-green-500' },
];

interface RecipeGeneratorProps {
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
}

function resizeImage(file: File, maxWidth: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        // Strip the data:image/jpeg;base64, prefix
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export default function RecipeGenerator({ isGenerating, setIsGenerating }: RecipeGeneratorProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<'recipes' | 'analyzer'>('recipes');

  // Recipe generator state
  const [ingredients, setIngredients] = useState('');
  const [mealType, setMealType] = useState('any');
  const [dietPreference, setDietPreference] = useState('healthy');
  const [includeImages, setIncludeImages] = useState(true);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [expandedRecipe, setExpandedRecipe] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Meal analyzer state
  const [mealImage, setMealImage] = useState<string | null>(null); // base64
  const [mealImagePreview, setMealImagePreview] = useState<string | null>(null); // data URL for preview
  const [mealGoal, setMealGoal] = useState('lose-fat');
  const [mealNote, setMealNote] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<MealAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const handleVoiceTranscript = useCallback((text: string) => {
    setIngredients((prev) => {
      const trimmed = prev.trim();
      if (trimmed && !trimmed.endsWith(',')) {
        return trimmed + ', ' + text;
      }
      return trimmed ? trimmed + ' ' + text : text;
    });
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredients.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setRecipes([]);

    try {
      const result = await api.post<RecipeResult>('/recipe/generate', {
        ingredients: ingredients.trim(),
        mealType,
        dietPreference,
        count: 3,
        includeImages,
      }, 300_000);

      if (result.recipes && result.recipes.length > 0) {
        setRecipes(result.recipes);
        setExpandedRecipe(0);
      } else {
        setError('No se encontraron recetas con esos ingredientes. Intenta con otros.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar recetas. Intenta de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await resizeImage(file, 1024);
      setMealImage(base64);
      setMealImagePreview(`data:image/jpeg;base64,${base64}`);
      setAnalysisResult(null);
      setAnalysisError(null);
    } catch {
      setAnalysisError('Error al procesar la imagen. Intenta de nuevo.');
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  const handleRemoveImage = () => {
    setMealImage(null);
    setMealImagePreview(null);
    setAnalysisResult(null);
    setAnalysisError(null);
  };

  const handleAnalyze = async () => {
    if (!mealImage || analyzing) return;

    setAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      const result = await api.post<MealAnalysisResult>('/recipe/analyze-meal', {
        imageBase64: mealImage,
        goal: mealGoal,
        additionalInfo: mealNote.trim() || undefined,
      }, 120_000); // 2 min timeout

      setAnalysisResult(result);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Error al analizar el plato. Intenta de nuevo.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleResetAnalyzer = () => {
    setMealImage(null);
    setMealImagePreview(null);
    setMealGoal('lose-fat');
    setMealNote('');
    setAnalysisResult(null);
    setAnalysisError(null);
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 7) return { text: 'text-green-400', bg: 'bg-green-900/30', border: 'border-green-500/50', ring: 'text-green-500' };
    if (score >= 4) return { text: 'text-yellow-400', bg: 'bg-yellow-900/30', border: 'border-yellow-500/50', ring: 'text-yellow-500' };
    return { text: 'text-red-400', bg: 'bg-red-900/30', border: 'border-red-500/50', ring: 'text-red-500' };
  };

  const getTotalMacroGrams = (macros: MacroBreakdown) =>
    macros.proteinGrams + macros.carbsGrams + macros.fatGrams;

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-2 bg-gray-800/50 p-1.5 rounded-2xl">
        <button
          onClick={() => setActiveTab('recipes')}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'recipes'
              ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-600/25'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          }`}
        >
          🍳 Generar Recetas
        </button>
        <button
          onClick={() => setActiveTab('analyzer')}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'analyzer'
              ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-600/25'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          }`}
        >
          📸 Analizar Mi Plato
        </button>
      </div>

      {/* ===== MEAL ANALYZER TAB ===== */}
      {activeTab === 'analyzer' && (
        <div className="space-y-5">
          {/* Show results or input form */}
          {analysisResult ? (
            <MealAnalysisDisplay
              result={analysisResult}
              imagePreview={mealImagePreview}
              onReset={handleResetAnalyzer}
              getHealthScoreColor={getHealthScoreColor}
              getTotalMacroGrams={getTotalMacroGrams}
            />
          ) : (
            <>
              {/* Photo capture area */}
              <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageCapture}
                  className="hidden"
                />
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageCapture}
                  className="hidden"
                />

                {mealImagePreview ? (
                  <div className="relative">
                    <img
                      src={mealImagePreview}
                      alt="Tu plato"
                      className="w-full max-h-72 object-cover rounded-xl"
                    />
                    <button
                      onClick={handleRemoveImage}
                      className="absolute top-3 right-3 bg-black/70 hover:bg-red-600 text-white w-9 h-9 rounded-full flex items-center justify-center transition-colors text-lg"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">📸</div>
                    <p className="text-white font-medium text-lg mb-2">Toma una foto de tu plato</p>
                    <p className="text-gray-500 text-sm mb-6">Te diremos las calorías, macros y si es bueno para tu objetivo</p>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={() => cameraInputRef.current?.click()}
                        className="px-5 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold rounded-xl hover:from-orange-500 hover:to-amber-500 transition-all shadow-lg shadow-orange-600/25"
                      >
                        📷 Tomar Foto
                      </button>
                      <button
                        onClick={() => uploadInputRef.current?.click()}
                        className="px-5 py-3 bg-gray-700 text-gray-200 font-medium rounded-xl hover:bg-gray-600 transition-all border border-gray-600"
                      >
                        📁 Subir Imagen
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Goal selection */}
              <div>
                <p className="text-gray-400 text-xs mb-3 font-medium">🎯 ¿Cuál es tu objetivo?</p>
                <div className="grid grid-cols-3 gap-3">
                  {GOALS.map((goal) => (
                    <button
                      key={goal.value}
                      onClick={() => setMealGoal(goal.value)}
                      className={`relative py-4 px-3 rounded-xl text-center transition-all ${
                        mealGoal === goal.value
                          ? `bg-gradient-to-br ${goal.gradient} text-white shadow-lg ring-2 ${goal.ring}`
                          : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-500'
                      }`}
                    >
                      <div className="text-2xl mb-1">{goal.emoji}</div>
                      <div className="text-xs font-bold leading-tight">{goal.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional note */}
              <div>
                <label className="block text-gray-400 text-xs mb-2 font-medium">
                  💬 ¿Qué estás comiendo? (opcional)
                </label>
                <input
                  type="text"
                  value={mealNote}
                  onChange={(e) => setMealNote(e.target.value)}
                  placeholder="Ej: Ensalada de pollo con aguacate"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Analyze button */}
              <button
                onClick={handleAnalyze}
                disabled={!mealImage || analyzing}
                className={`w-full py-4 rounded-2xl text-lg font-bold transition-all ${
                  !mealImage
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
                    : analyzing
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-500 hover:to-amber-500 shadow-lg shadow-orange-600/25'
                }`}
              >
                {analyzing ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Analizando tu plato...
                  </span>
                ) : (
                  '📊 Analizar Mi Plato'
                )}
              </button>

              {/* Error */}
              {analysisError && (
                <div className="bg-red-900/20 border border-red-900/30 rounded-2xl p-4">
                  <p className="text-red-400 text-sm">❌ {analysisError}</p>
                </div>
              )}

              {/* Loading skeleton */}
              {analyzing && (
                <div className="space-y-4 animate-pulse">
                  <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
                    <div className="flex justify-center mb-4">
                      <div className="w-32 h-32 bg-gray-700 rounded-full" />
                    </div>
                    <div className="h-5 bg-gray-700 rounded w-2/3 mx-auto mb-3" />
                    <div className="h-4 bg-gray-700 rounded w-1/2 mx-auto mb-6" />
                    <div className="space-y-3">
                      <div className="h-6 bg-gray-700 rounded" />
                      <div className="h-6 bg-gray-700 rounded" />
                      <div className="h-6 bg-gray-700 rounded" />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ===== RECIPE GENERATOR TAB ===== */}
      {activeTab === 'recipes' && (
        <>
          {/* Input form */}
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                🥕 ¿Qué ingredientes tienes?
              </label>
              <div className="relative">
                <textarea
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                  placeholder="Escribe los ingredientes que tienes... Ej: pollo, arroz, brócoli, cebolla, ajo, limón, aceite de oliva"
                  rows={3}
                  className="w-full px-5 py-4 pr-14 bg-gray-800 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none text-lg"
                />
                <div className="absolute bottom-3 right-3">
                  <VoiceInput onTranscript={handleVoiceTranscript} />
                </div>
              </div>
            </div>

            {/* Meal type */}
            <div>
              <p className="text-gray-400 text-xs mb-2">Tipo de comida</p>
              <div className="flex flex-wrap gap-2">
                {MEAL_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setMealType(type.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      mealType === type.value
                        ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/25'
                        : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-orange-500 hover:text-white'
                    }`}
                  >
                    {type.emoji} {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Diet preference */}
            <div>
              <p className="text-gray-400 text-xs mb-2">Preferencia</p>
              <div className="flex flex-wrap gap-2">
                {DIET_PREFS.map((pref) => (
                  <button
                    key={pref.value}
                    type="button"
                    onClick={() => setDietPreference(pref.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      dietPreference === pref.value
                        ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/25'
                        : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-orange-500 hover:text-white'
                    }`}
                  >
                    {pref.emoji} {pref.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Include images toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIncludeImages(!includeImages)}
                className={`w-12 h-7 rounded-full transition-all relative ${
                  includeImages ? 'bg-orange-600' : 'bg-gray-700'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all ${
                  includeImages ? 'left-6' : 'left-1'
                }`} />
              </button>
              <span className="text-gray-400 text-sm">
                🖼️ Generar imagen del plato {includeImages ? '(activado)' : '(desactivado — más rápido)'}
              </span>
            </div>

            {/* Generate button */}
            <button
              type="submit"
              disabled={!ingredients.trim() || isGenerating}
              className={`w-full py-4 rounded-2xl text-lg font-bold transition-all ${
                isGenerating
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-500 hover:to-amber-500 shadow-lg shadow-orange-600/25'
              }`}
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Buscando recetas...
                </span>
              ) : (
                '🍳 Generar Recetas'
              )}
            </button>
          </form>

          {/* Error */}
          {error && (
            <div className="bg-red-900/20 border border-red-900/30 rounded-2xl p-4">
              <p className="text-red-400 text-sm">❌ {error}</p>
            </div>
          )}

          {/* Loading skeleton */}
          {isGenerating && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-24 h-24 bg-gray-700 rounded-xl" />
                    <div className="flex-1 space-y-3">
                      <div className="h-5 bg-gray-700 rounded w-3/4" />
                      <div className="h-4 bg-gray-700 rounded w-1/2" />
                      <div className="h-3 bg-gray-700 rounded w-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recipe results */}
          {recipes.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-white font-bold text-lg">🍽️ Recetas encontradas</h2>
              {recipes.map((recipe, index) => (
                <div
                  key={index}
                  className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden hover:border-orange-500/30 transition-all"
                >
                  {/* Recipe header (always visible) */}
                  <button
                    onClick={() => setExpandedRecipe(expandedRecipe === index ? null : index)}
                    className="w-full text-left p-5 flex gap-4 items-start"
                  >
                    {recipe.imageUrl ? (
                      <img
                        src={recipe.imageUrl}
                        alt={recipe.name}
                        className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gradient-to-br from-orange-900/30 to-amber-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-3xl">🍽️</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-white font-bold text-lg">{recipe.name}</h3>
                        <span className="text-gray-500 text-sm flex-shrink-0">
                          {expandedRecipe === index ? '▼' : '▶'}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">{recipe.description}</p>
                      <div className="flex flex-wrap gap-3 mt-3">
                        <span className="text-xs text-orange-400 bg-orange-900/20 px-2 py-1 rounded-lg">
                          ⏱️ {recipe.prepTime} prep
                        </span>
                        <span className="text-xs text-amber-400 bg-amber-900/20 px-2 py-1 rounded-lg">
                          🔥 {recipe.cookTime} cocción
                        </span>
                        <span className="text-xs text-green-400 bg-green-900/20 px-2 py-1 rounded-lg">
                          🔋 {recipe.calories} cal
                        </span>
                        <span className="text-xs text-blue-400 bg-blue-900/20 px-2 py-1 rounded-lg">
                          👥 {recipe.servings} porciones
                        </span>
                        <span className="text-xs text-purple-400 bg-purple-900/20 px-2 py-1 rounded-lg">
                          📊 {recipe.difficulty}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Expanded recipe details */}
                  {expandedRecipe === index && (
                    <div className="px-5 pb-5 border-t border-gray-700/50 pt-4 space-y-4">
                      {/* Full image */}
                      {recipe.imageUrl && (
                        <img
                          src={recipe.imageUrl}
                          alt={recipe.name}
                          className="w-full max-h-80 object-cover rounded-xl"
                        />
                      )}

                      {/* Ingredients */}
                      <div>
                        <h4 className="text-orange-400 font-medium text-sm mb-2">🥕 Ingredientes</h4>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {recipe.ingredients?.map((ing, i) => (
                            <li key={i} className="text-gray-300 text-sm flex items-center gap-2">
                              <span className="text-orange-500">•</span> {ing}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Steps */}
                      <div>
                        <h4 className="text-orange-400 font-medium text-sm mb-2">👩‍🍳 Preparación</h4>
                        <ol className="space-y-2">
                          {recipe.steps?.map((step, i) => (
                            <li key={i} className="text-gray-300 text-sm flex gap-3">
                              <span className="text-orange-500 font-bold flex-shrink-0">{i + 1}.</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>

                      {/* Tips */}
                      {recipe.tips && (
                        <div className="bg-orange-900/10 border border-orange-800/20 rounded-xl p-3">
                          <p className="text-orange-300 text-sm">💡 <strong>Consejo:</strong> {recipe.tips}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ===== Meal Analysis Results Component ===== */
function MealAnalysisDisplay({
  result,
  imagePreview,
  onReset,
  getHealthScoreColor,
  getTotalMacroGrams,
}: {
  result: MealAnalysisResult;
  imagePreview: string | null;
  onReset: () => void;
  getHealthScoreColor: (score: number) => { text: string; bg: string; border: string; ring: string };
  getTotalMacroGrams: (macros: MacroBreakdown) => number;
}) {
  const scoreColors = getHealthScoreColor(result.healthScore);
  const totalMacros = getTotalMacroGrams(result.macros);

  const macroItems = [
    { label: 'Proteína', grams: result.macros.proteinGrams, color: 'bg-blue-500', textColor: 'text-blue-400' },
    { label: 'Carbohidratos', grams: result.macros.carbsGrams, color: 'bg-yellow-500', textColor: 'text-yellow-400' },
    { label: 'Grasas', grams: result.macros.fatGrams, color: 'bg-red-500', textColor: 'text-red-400' },
    { label: 'Fibra', grams: result.macros.fiberGrams, color: 'bg-green-500', textColor: 'text-green-400' },
    { label: 'Azúcar', grams: result.macros.sugarGrams, color: 'bg-pink-500', textColor: 'text-pink-400' },
  ];

  const maxMacroGram = Math.max(...macroItems.map(m => m.grams), 1);

  // Calculate calorie ring percentage (max 2000 cal as reference)
  const calPercent = Math.min((result.estimatedCalories / 2000) * 100, 100);
  const circumference = 2 * Math.PI * 56;
  const strokeDashoffset = circumference - (calPercent / 100) * circumference;

  return (
    <div className="space-y-5">
      {/* Food Name & Image Header */}
      <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden">
        {imagePreview && (
          <img
            src={imagePreview}
            alt={result.foodName}
            className="w-full h-48 object-cover"
          />
        )}
        <div className="p-5">
          <h2 className="text-white font-bold text-xl">{result.foodName}</h2>
          <p className="text-gray-400 text-sm mt-1">{result.description}</p>
          <p className="text-gray-500 text-xs mt-2">📏 {result.portionSize}</p>
        </div>
      </div>

      {/* Calories & Health Score */}
      <div className="grid grid-cols-2 gap-4">
        {/* Calorie Ring */}
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-5 flex flex-col items-center">
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r="56" fill="none" stroke="#374151" strokeWidth="8" />
              <circle
                cx="64" cy="64" r="56" fill="none"
                stroke="url(#calGradient)" strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="calGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-white">{result.estimatedCalories}</span>
              <span className="text-xs text-gray-400">kcal</span>
            </div>
          </div>
          <p className="text-gray-400 text-xs mt-2">Calorías estimadas</p>
        </div>

        {/* Health Score */}
        <div className={`rounded-2xl border p-5 flex flex-col items-center justify-center ${scoreColors.bg} ${scoreColors.border}`}>
          <div className={`text-5xl font-bold ${scoreColors.text}`}>
            {result.healthScore}
          </div>
          <div className="text-gray-400 text-xs mt-1">/ 10</div>
          <p className={`text-xs mt-2 font-medium ${scoreColors.text}`}>
            {result.healthScore >= 7 ? '¡Excelente!' : result.healthScore >= 4 ? 'Regular' : 'Mejorable'}
          </p>
          <p className="text-gray-500 text-xs mt-1">Puntuación de salud</p>
        </div>
      </div>

      {/* Goal Verdict */}
      <div className="bg-gradient-to-r from-orange-900/30 to-amber-900/30 rounded-2xl border border-orange-500/30 p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🎯</span>
          <div>
            <p className="text-orange-300 font-bold text-sm">{result.goalVerdict}</p>
            <p className="text-gray-400 text-sm mt-2">{result.goalExplanation}</p>
          </div>
        </div>
      </div>

      {/* Macro Breakdown */}
      <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-5">
        <h3 className="text-white font-bold text-sm mb-4">📊 Macronutrientes</h3>
        <div className="space-y-3">
          {macroItems.map((macro) => (
            <div key={macro.label}>
              <div className="flex justify-between items-center mb-1">
                <span className={`text-xs font-medium ${macro.textColor}`}>{macro.label}</span>
                <span className="text-xs text-gray-400">{macro.grams}g</span>
              </div>
              <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${macro.color} transition-all duration-1000`}
                  style={{ width: `${Math.max((macro.grams / maxMacroGram) * 100, 2)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        {/* Macro pie summary */}
        {totalMacros > 0 && (
          <div className="flex gap-4 mt-4 pt-4 border-t border-gray-700/50 justify-center text-xs text-gray-400">
            <span className="text-blue-400">🔵 Proteína {Math.round((result.macros.proteinGrams / totalMacros) * 100)}%</span>
            <span className="text-yellow-400">🟡 Carbos {Math.round((result.macros.carbsGrams / totalMacros) * 100)}%</span>
            <span className="text-red-400">🔴 Grasas {Math.round((result.macros.fatGrams / totalMacros) * 100)}%</span>
          </div>
        )}
      </div>

      {/* Pros */}
      {result.pros.length > 0 && (
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-5">
          <h3 className="text-green-400 font-bold text-sm mb-3">✅ Lo bueno</h3>
          <ul className="space-y-2">
            {result.pros.map((pro, i) => (
              <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                <span className="text-green-500 flex-shrink-0">✅</span>
                <span>{pro}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cons */}
      {result.cons.length > 0 && (
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-5">
          <h3 className="text-yellow-400 font-bold text-sm mb-3">⚠️ A mejorar</h3>
          <ul className="space-y-2">
            {result.cons.map((con, i) => (
              <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                <span className="text-yellow-500 flex-shrink-0">⚠️</span>
                <span>{con}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {result.suggestions.length > 0 && (
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-5">
          <h3 className="text-amber-400 font-bold text-sm mb-3">💡 Sugerencias</h3>
          <ul className="space-y-2">
            {result.suggestions.map((sug, i) => (
              <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                <span className="text-amber-500 flex-shrink-0">💡</span>
                <span>{sug}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Reset button */}
      <button
        onClick={onReset}
        className="w-full py-4 rounded-2xl text-lg font-bold bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-500 hover:to-amber-500 shadow-lg shadow-orange-600/25 transition-all"
      >
        📸 Analizar otro plato
      </button>
    </div>
  );
}
