import { useState } from 'react';
import api from '../services/api';

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

interface RecipeGeneratorProps {
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
}

export default function RecipeGenerator({ isGenerating, setIsGenerating }: RecipeGeneratorProps) {
  const [ingredients, setIngredients] = useState('');
  const [mealType, setMealType] = useState('any');
  const [dietPreference, setDietPreference] = useState('healthy');
  const [includeImages, setIncludeImages] = useState(true);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [expandedRecipe, setExpandedRecipe] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      }, 300_000); // 5 min timeout (images take time)

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

  return (
    <div className="space-y-6">
      {/* Input form */}
      <form onSubmit={handleGenerate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            🥕 ¿Qué ingredientes tienes?
          </label>
          <textarea
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            placeholder="Escribe los ingredientes que tienes... Ej: pollo, arroz, brócoli, cebolla, ajo, limón, aceite de oliva"
            rows={3}
            className="w-full px-5 py-4 bg-gray-800 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none text-lg"
          />
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
    </div>
  );
}
