
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Plus, 
  Check, 
  Bookmark, 
  History, 
  Star, 
  ChevronLeft, 
  LogOut,
  Zap,
  Search,
  Loader2,
  X,
  User,
  ArrowRight,
  Filter,
  Trash2,
  Info,
  TrendingUp,
  Eye,
  EyeOff,
  ChevronDown,
  Image as ImageIcon
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---

type Mood = 'sad' | 'excited' | 'happy' | 'curious';
type View = 'login' | 'profile-select' | 'mood' | 'results' | 'library' | 'search-results';
type SortOption = 'match' | 'rating' | 'year';

interface Movie {
  movie_id: string;
  title: string;
  overview: string;
  genres: string[];
  vote_average: number;
  poster_path: string;
  release_year: number;
  match_score: number;
  reasoning?: string;
}

interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

interface UserData {
  user: UserProfile | null;
  profiles: UserProfile[];
  watchlist: Movie[]; 
  history: Movie[];
}

// --- Constants ---

const MOOD_CONFIG: Record<Mood, { label: string; emoji: string; gradient: string; glow: string; genres: string[]; keywords: string[] }> = {
  sad: {
    label: 'SAD',
    emoji: '😔',
    gradient: 'from-blue-500 to-blue-800',
    glow: 'shadow-blue-500/50',
    genres: ["Drama", "Romance"],
    keywords: ["emotional", "tragic", "heartbreak", "loss", "grief"]
  },
  excited: {
    label: 'EXCITED',
    emoji: '🔥',
    gradient: 'from-red-500 to-orange-600',
    glow: 'shadow-orange-500/50',
    genres: ["Action", "Thriller", "Adventure"],
    keywords: ["chase", "fight", "explosion", "adrenaline", "danger"]
  },
  happy: {
    label: 'HAPPY',
    emoji: '✨',
    gradient: 'from-yellow-400 to-amber-500',
    glow: 'shadow-yellow-400/50',
    genres: ["Comedy", "Animation", "Family", "Musical"],
    keywords: ["funny", "joy", "upbeat", "cheerful", "heartwarming"]
  },
  curious: {
    label: 'CURIOUS',
    emoji: '🤔',
    gradient: 'from-purple-500 to-indigo-600',
    glow: 'shadow-purple-500/50',
    genres: ["Science Fiction", "Mystery", "Documentary", "History"],
    keywords: ["mystery", "discovery", "mind-bending", "twist", "unknown"]
  }
};

const TRENDING_SEARCHES = [
  "Mind-bending sci-fi",
  "80s high school comedies",
  "Dark psychological thrillers",
  "Animated movies for adults",
  "Atmospheric horror",
  "Indie coming-of-age"
];

// --- Components ---

const Badge = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${className}`}>
    {children}
  </span>
);

const MovieCard = ({ 
  movie, 
  onWatchlist, 
  onWatched, 
  onDetail,
  isWatchlisted, 
  isWatched,
  onRemoveWatchlist
}: { 
  movie: Movie; 
  onWatchlist: (m: Movie) => void; 
  onWatched: (m: Movie) => void;
  onDetail: (m: Movie) => void;
  isWatchlisted: boolean;
  isWatched: boolean;
  onRemoveWatchlist?: (id: string) => void;
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ y: -8 }}
      className="group relative bg-[#1a1a1a] rounded-xl overflow-hidden aspect-[2/3] shadow-2xl cursor-pointer"
      onClick={() => onDetail(movie)}
    >
      {!imgError && movie.poster_path ? (
        <img 
          src={movie.poster_path}
          alt={movie.title}
          loading="lazy"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-gray-800 to-gray-900">
          <ImageIcon size={32} className="text-gray-600 mb-2" />
          <span className="text-xs font-bold text-gray-400 leading-tight">{movie.title}</span>
          <span className="text-[10px] text-gray-600 mt-2">({movie.release_year})</span>
        </div>
      )}
      
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
        <Badge className="bg-purple-600 text-white border border-purple-400/30 shadow-lg">
          {Math.round((movie.match_score || 0) * 100)}% MATCH
        </Badge>
        {isWatched && <Badge className="bg-green-600 text-white border border-green-400/30 shadow-lg">WATCHED</Badge>}
        {isWatchlisted && !isWatched && <Badge className="bg-blue-600 text-white border border-blue-400/30 shadow-lg">IN QUEUE</Badge>}
      </div>

      <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
        {!isWatched && (
          <button 
            onClick={(e) => { e.stopPropagation(); onWatched(movie); }}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-green-600 text-white hover:bg-green-500 transition-colors shadow-xl"
            title="Mark as Seen"
          >
            <Eye size={18} />
          </button>
        )}
        
        {!isWatchlisted ? (
          <button 
            onClick={(e) => { e.stopPropagation(); onWatchlist(movie); }}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-black/70 backdrop-blur-md text-white hover:bg-white hover:text-black transition-colors shadow-xl"
            title="Add to Watchlist"
          >
            <Plus size={20} />
          </button>
        ) : (
          <button 
            onClick={(e) => { e.stopPropagation(); onRemoveWatchlist?.(movie.movie_id); }}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-red-600/80 text-white hover:bg-red-500 transition-colors shadow-xl"
            title="Remove from Queue"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent opacity-60 group-hover:opacity-95 transition-opacity duration-300" />
      
      <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
        <h3 className="text-white font-bold text-sm line-clamp-2 mb-1 drop-shadow-lg">{movie.title}</h3>
        <div className="flex items-center gap-2 text-[10px] text-gray-300 font-bold">
          <span className="flex items-center gap-1 text-yellow-400">
            <Star size={10} fill="currentColor" /> {Number(movie.vote_average || 0).toFixed(1)}
          </span>
          <span className="opacity-40">•</span>
          <span>{movie.release_year}</span>
          <span className="opacity-40">•</span>
          <span className="truncate">{movie.genres?.[0] || 'Movie'}</span>
        </div>
      </div>
    </motion.div>
  );
};

// --- App Root ---

const App = () => {
  const [view, setView] = useState<View>('login');
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  
  // Filtering & Sorting State
  const [sortBy, setSortBy] = useState<SortOption>('match');
  const [genreFilter, setGenreFilter] = useState<string>('All');
  const [hideWatched, setHideWatched] = useState(false);
  const [librarySort, setLibrarySort] = useState<'match' | 'year' | 'rating'>('match');
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [userData, setUserData] = useState<UserData>(() => {
    const saved = localStorage.getItem('moodflix_data_v2');
    if (saved) return JSON.parse(saved);
    return { 
      user: null, 
      profiles: [
        { id: '1', name: 'Alex', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex', color: '#8b5cf6' },
        { id: '2', name: 'Sarah', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', color: '#ec4899' },
        { id: '3', name: 'Kids', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', color: '#10b981' }
      ],
      watchlist: [], 
      history: [] 
    };
  });

  useEffect(() => {
    localStorage.setItem('moodflix_data_v2', JSON.stringify(userData));
  }, [userData]);

  const handleLogin = (guest = false) => {
    if (guest) {
      setUserData(prev => ({ ...prev, user: prev.profiles[0] }));
      setView('mood');
    } else {
      setView('profile-select');
    }
  };

  const selectProfile = (profile: UserProfile) => {
    setUserData(prev => ({ ...prev, user: profile }));
    setView('mood');
  };

  const handleLogout = () => {
    setUserData(prev => ({ ...prev, user: null }));
    setView('login');
  };

  const toggleWatchlist = (movie: Movie) => {
    setUserData(prev => {
      const exists = prev.watchlist.some(m => m.movie_id === movie.movie_id);
      if (exists) {
        return { ...prev, watchlist: prev.watchlist.filter(m => m.movie_id !== movie.movie_id) };
      }
      return { ...prev, watchlist: [movie, ...prev.watchlist] };
    });
  };

  const markAsWatched = (movie: Movie) => {
    setUserData(prev => {
      const isAlreadyWatched = prev.history.some(h => h.movie_id === movie.movie_id);
      if (isAlreadyWatched) {
        // Toggle off if already watched (Mark as Unseen)
        return { ...prev, history: prev.history.filter(h => h.movie_id !== movie.movie_id) };
      }
      return {
        ...prev,
        watchlist: prev.watchlist.filter(m => m.movie_id !== movie.movie_id),
        history: [{ ...movie, match_score: 1.0 }, ...prev.history]
      };
    });
  };

  const cleanMovies = (data: any[]) => {
    return data.map((m: any) => {
      // 1. Poster Path logic
      let poster = m.poster_path || '';
      if (typeof poster === 'string' && poster.startsWith('/')) {
        poster = `https://image.tmdb.org/t/p/w780${poster}`;
      } else if (typeof poster === 'string' && !poster.startsWith('http')) {
        // AI might sometimes just give a filename or nothing
        poster = `https://via.placeholder.com/500x750/111111/ffffff?text=${encodeURIComponent(m.title)}`;
      }

      // 2. Year logic - handle "2023-10-12" or just "2023" or strings
      let year = m.release_year;
      if (typeof year === 'string') {
        const match = year.match(/\d{4}/);
        year = match ? parseInt(match[0], 10) : new Date().getFullYear();
      } else if (!year || typeof year !== 'number') {
        year = new Date().getFullYear();
      }

      // 3. Rating logic
      let rating = m.vote_average;
      if (typeof rating === 'string') {
        rating = parseFloat(rating);
      }
      if (isNaN(rating as number) || rating === null || rating === undefined) {
        rating = 0;
      }

      return {
        ...m,
        movie_id: String(m.movie_id || Math.random().toString(36).substr(2, 9)),
        poster_path: poster,
        vote_average: rating,
        release_year: year,
        match_score: Number(m.match_score || 0)
      };
    });
  };

  const performAISearch = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setView('search-results');
    setIsSearchExpanded(false);
    setGenreFilter('All');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Perform a semantic search for movies based on: "${query}". 
      Return 18 high-quality movie results as a JSON array. 
      IMPORTANT SCHEMA:
      {
        "movie_id": "unique_string",
        "title": "string",
        "overview": "string",
        "genres": ["string"],
        "vote_average": 8.5, (Must be a number 0-10)
        "poster_path": "/path.jpg", (Must be a valid TMDB path starting with /)
        "release_year": 2023, (Must be an integer year)
        "match_score": 0.95, (Must be a number 0-1)
        "reasoning": "string"
      }
      Do not return anything but the JSON array.`;

      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      const data = JSON.parse(result.text || "[]");
      setMovies(cleanMovies(data));
    } catch (e) {
      console.error(e);
      setMovies([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMoviesByMood = async (mood: Mood) => {
    setLoading(true);
    setView('results');
    setSelectedMood(mood);
    setGenreFilter('All');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Recommend 18 movies for a person feeling ${mood}. 
      Vibes: ${MOOD_CONFIG[mood].keywords.join(', ')}.
      IMPORTANT SCHEMA REQUIREMENTS:
      - "poster_path" MUST be a valid TMDB relative path starting with / (e.g. /q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg).
      - "release_year" MUST be the actual 4-digit integer release year of the movie.
      - "vote_average" MUST be the actual IMDB/TMDB rating as a float (0-10).
      - "match_score" is a float (0-1) representing how well it fits the mood.
      - Exclude already watched: ${userData.history.map(h => h.title).join(', ')}.
      Return ONLY a JSON array.`;

      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      const data = JSON.parse(result.text || "[]");
      setMovies(cleanMovies(data));
    } catch (error) {
      console.error(error);
      setMovies([]);
    } finally {
      setLoading(false);
    }
  };

  // --- Computed Results ---
  
  const availableGenres = useMemo(() => {
    const genres = new Set<string>();
    movies.forEach(m => m.genres?.forEach(g => genres.add(g)));
    return ['All', ...Array.from(genres).sort()];
  }, [movies]);

  const processedResults = useMemo(() => {
    let filtered = [...movies];

    // Filter by Genre
    if (genreFilter !== 'All') {
      filtered = filtered.filter(m => m.genres?.includes(genreFilter));
    }

    // Filter by Seen
    if (hideWatched) {
      filtered = filtered.filter(m => !userData.history.some(h => h.movie_id === m.movie_id));
    }

    // Sort
    return filtered.sort((a, b) => {
      if (sortBy === 'match') return (b.match_score || 0) - (a.match_score || 0);
      if (sortBy === 'year') return (b.release_year || 0) - (a.release_year || 0);
      if (sortBy === 'rating') return (b.vote_average || 0) - (a.vote_average || 0);
      return 0;
    });
  }, [movies, sortBy, genreFilter, hideWatched, userData.history]);

  const sortedWatchlist = useMemo(() => {
    return [...userData.watchlist].sort((a, b) => {
      if (librarySort === 'match') return (b.match_score || 0) - (a.match_score || 0);
      if (librarySort === 'year') return (b.release_year || 0) - (a.release_year || 0);
      if (librarySort === 'rating') return (b.vote_average || 0) - (a.vote_average || 0);
      return 0;
    });
  }, [userData.watchlist, librarySort]);

  const sortedHistory = useMemo(() => {
    return [...userData.history].sort((a, b) => {
      if (librarySort === 'year') return (b.release_year || 0) - (a.release_year || 0);
      if (librarySort === 'rating') return (b.vote_average || 0) - (a.vote_average || 0);
      return 0;
    });
  }, [userData.history, librarySort]);

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-purple-500/30 overflow-x-hidden">
      {/* Dynamic Header */}
      {(view !== 'login' && view !== 'profile-select') && (
        <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between backdrop-blur-2xl bg-black/50 border-b border-white/10">
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => setView('mood')}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Zap size={18} fill="white" className="text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              MOODFLIX
            </span>
          </div>

          <div className="flex-1 max-w-xl px-12 relative hidden md:block">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && performAISearch(searchQuery)}
                onFocus={() => setIsSearchExpanded(true)}
                placeholder="Search movies, themes, or moods..."
                className="w-full bg-white/5 border border-white/10 rounded-full px-5 py-2.5 pl-12 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-sm font-medium"
              />
              <Search className="absolute left-4 top-3 text-gray-500" size={18} />
              
              <AnimatePresence>
                {isSearchExpanded && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-[#111] border border-white/10 rounded-2xl shadow-2xl p-4 z-[100]"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] font-black text-gray-500 tracking-widest uppercase flex items-center gap-2">
                        <TrendingUp size={12} /> Suggested
                      </p>
                      <button onClick={() => setIsSearchExpanded(false)} className="text-gray-500 hover:text-white">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {TRENDING_SEARCHES.map(s => (
                        <button 
                          key={s}
                          onClick={() => { setSearchQuery(s); performAISearch(s); }}
                          className="text-left px-3 py-2 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Search size={10} /> {s}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button 
              onClick={() => setView('library')}
              className={`text-sm font-black transition-colors flex items-center gap-2 ${view === 'library' ? 'text-purple-400' : 'text-gray-400 hover:text-white'}`}
            >
              <Bookmark size={18} /> <span className="hidden sm:inline tracking-tight">THE VAULT</span>
            </button>
            
            <div className="relative group flex items-center gap-3 pl-6 border-l border-white/10">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-white leading-none">{userData.user?.name}</p>
                <p className="text-[10px] text-gray-500 font-bold">Premium</p>
              </div>
              <img src={userData.user?.avatar} className="w-9 h-9 rounded-full bg-gray-800 border border-white/10 p-0.5" alt="Avatar" />
              <div className="absolute top-full right-0 mt-2 w-48 bg-[#111] border border-white/10 rounded-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-2xl">
                <button 
                  onClick={() => setView('profile-select')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <User size={16} /> Switch Profile
                </button>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition-colors border-t border-white/5"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}

      <main className={`${(view === 'login' || view === 'profile-select') ? '' : 'pt-24'} pb-12 px-6 max-w-7xl mx-auto`}>
        <AnimatePresence mode="wait">
          {view === 'login' && (
            <motion.div 
              key="login"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center z-50 bg-[#050505]"
            >
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[150px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[150px] rounded-full animate-pulse" />
              </div>

              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="relative z-10 w-full max-w-md p-10 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-3xl text-center shadow-2xl"
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-2xl mx-auto mb-8 animate-bounce-slow">
                  <Zap size={40} fill="white" />
                </div>
                <h1 className="text-5xl font-black tracking-tighter mb-4">MOODFLIX</h1>
                <p className="text-gray-400 mb-10 text-sm font-medium">Hyper-personalized cinema for your every emotion.</p>

                <div className="space-y-4">
                  <button 
                    onClick={() => handleLogin()}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-white text-black font-black rounded-xl hover:bg-gray-200 transition-all transform hover:scale-[1.02]"
                  >
                    SIGN IN TO WATCH <ArrowRight size={18} />
                  </button>
                  <button 
                    onClick={() => handleLogin(true)}
                    className="w-full py-4 bg-white/5 border border-white/10 text-white font-black rounded-xl hover:bg-white/10 transition-all"
                  >
                    BROWSE AS GUEST
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {view === 'profile-select' && (
            <motion.div 
              key="profile-select"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="fixed inset-0 flex flex-col items-center justify-center z-50 bg-[#050505]"
            >
              <h2 className="text-3xl md:text-5xl font-black mb-16 tracking-tight">Who's watching?</h2>
              <div className="flex flex-wrap justify-center gap-8 md:gap-12">
                {userData.profiles.map(profile => (
                  <motion.button
                    key={profile.id}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => selectProfile(profile)}
                    className="flex flex-col items-center gap-4 group"
                  >
                    <div 
                      className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden border-4 border-transparent group-hover:border-white transition-all shadow-2xl"
                      style={{ backgroundColor: profile.color }}
                    >
                      <img src={profile.avatar} className="w-full h-full object-cover" alt={profile.name} />
                    </div>
                    <span className="text-gray-500 font-bold group-hover:text-white transition-colors">{profile.name}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'mood' && (
            <motion.div 
              key="mood"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="min-h-[70vh] flex flex-col items-center justify-center text-center"
            >
              <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
                Hey {userData.user?.name}, how are we <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">feeling?</span>
              </h1>
              <p className="text-gray-400 text-lg mb-16 max-w-xl mx-auto leading-relaxed font-bold opacity-80">
                Skip the scroll. Tell us your mood, and our AI will serve up the exact cinematic soulmate you need right now.
              </p>

              <div className="flex flex-wrap justify-center gap-8 md:gap-12">
                {(['sad', 'excited', 'happy', 'curious'] as Mood[]).map((mood) => {
                  const cfg = MOOD_CONFIG[mood];
                  return (
                    <motion.button
                      key={mood}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => fetchMoviesByMood(mood)}
                      className={`relative w-32 h-32 md:w-44 md:h-44 rounded-full flex flex-col items-center justify-center bg-gradient-to-br ${cfg.gradient} shadow-2xl group transition-all`}
                    >
                      <div className={`absolute inset-0 rounded-full blur-[20px] opacity-40 group-hover:opacity-100 transition-opacity bg-gradient-to-br ${cfg.gradient}`} />
                      <span className="text-5xl md:text-6xl mb-3 relative z-10">{cfg.emoji}</span>
                      <span className="text-white text-xs md:text-sm font-black tracking-widest relative z-10">{cfg.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {(view === 'results' || view === 'search-results') && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <header className="mb-8 flex flex-col gap-6 border-b border-white/5 pb-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <button onClick={() => setView('mood')} className="flex items-center gap-2 text-gray-500 hover:text-white text-xs font-black mb-4 transition-colors tracking-widest uppercase">
                      <ChevronLeft size={16} /> Back to moods
                    </button>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tighter">
                      {view === 'search-results' ? (
                        <>Matches for <span className="text-purple-500">"{searchQuery}"</span></>
                      ) : (
                        <>Mood: <span className={`capitalize text-transparent bg-clip-text bg-gradient-to-r ${selectedMood && MOOD_CONFIG[selectedMood] ? MOOD_CONFIG[selectedMood].gradient : 'from-white to-gray-400'}`}>{selectedMood}</span></>
                      )}
                    </h2>
                  </div>
                  
                  {/* Filter Toolbar */}
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Hide Watched Toggle */}
                    <button 
                      onClick={() => setHideWatched(!hideWatched)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-xs font-black uppercase tracking-wider ${hideWatched ? 'bg-purple-600 border-purple-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'}`}
                    >
                      {hideWatched ? <EyeOff size={14} /> : <Eye size={14} />}
                      {hideWatched ? 'Hiding Watched' : 'Hide Watched'}
                    </button>

                    {/* Genre Dropdown */}
                    <div className="relative group">
                      <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10 group-hover:border-white/30 transition-all cursor-pointer">
                        <Filter size={14} className="text-gray-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white">{genreFilter}</span>
                        <ChevronDown size={14} className="text-gray-500" />
                      </div>
                      <div className="absolute top-full right-0 mt-2 w-48 bg-[#111] border border-white/10 rounded-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-2xl z-[100]">
                        {availableGenres.map(g => (
                          <button 
                            key={g} 
                            onClick={() => setGenreFilter(g)}
                            className={`w-full text-left px-4 py-3 text-xs font-bold transition-colors ${genreFilter === g ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sort Dropdown */}
                    <div className="relative group">
                      <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10 group-hover:border-white/30 transition-all cursor-pointer">
                        <SortByIcon option={sortBy} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white">{sortBy}</span>
                        <ChevronDown size={14} className="text-gray-500" />
                      </div>
                      <div className="absolute top-full right-0 mt-2 w-48 bg-[#111] border border-white/10 rounded-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-2xl z-[100]">
                        {(['match', 'rating', 'year'] as SortOption[]).map(o => (
                          <button 
                            key={o} 
                            onClick={() => setSortBy(o)}
                            className={`w-full text-left px-4 py-3 text-xs font-bold transition-colors ${sortBy === o ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                          >
                            {o.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </header>

              {loading ? (
                <div className="min-h-[50vh] flex flex-col items-center justify-center text-center">
                  <div className="relative mb-10">
                    <div className="absolute inset-0 blur-3xl bg-purple-500/30 animate-pulse" />
                    <Loader2 className="animate-spin text-purple-500 relative z-10" size={64} />
                  </div>
                  <h3 className="text-2xl font-black mb-2">Analyzing the Cinemaverse</h3>
                  <p className="text-gray-500 font-bold">Selecting the perfect frames for your soul...</p>
                </div>
              ) : (
                <>
                  {processedResults.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
                      {processedResults.map(movie => (
                        <MovieCard 
                          key={movie.movie_id}
                          movie={movie}
                          onWatchlist={toggleWatchlist}
                          onWatched={markAsWatched}
                          onDetail={setSelectedMovie}
                          isWatchlisted={userData.watchlist.some(m => m.movie_id === movie.movie_id)}
                          isWatched={userData.history.some(h => h.movie_id === movie.movie_id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="py-32 text-center opacity-40">
                      <Search size={48} className="mx-auto mb-4" />
                      <p className="text-lg font-bold">No movies found matching these filters.</p>
                      <button 
                        onClick={() => { setGenreFilter('All'); setHideWatched(false); }}
                        className="mt-4 text-purple-400 font-black text-xs underline underline-offset-4"
                      >
                        Reset Filters
                      </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {view === 'library' && (
            <motion.div key="library" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
                <div>
                  <button onClick={() => setView('mood')} className="flex items-center gap-2 text-gray-500 hover:text-white text-xs font-black mb-4 transition-colors tracking-widest uppercase">
                    <ChevronLeft size={16} /> BACK TO DISCOVER
                  </button>
                  <h2 className="text-6xl font-black tracking-tighter">The <span className="text-purple-500 italic">Vault</span></h2>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-white/5 px-6 py-4 rounded-2xl border border-white/10 text-center min-w-[120px] transition-all hover:bg-white/10">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Active Queue</p>
                    <p className="text-3xl font-black">{userData.watchlist.length}</p>
                  </div>
                  <div className="bg-white/5 px-6 py-4 rounded-2xl border border-white/10 text-center min-w-[120px] transition-all hover:bg-white/10">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Seen It</p>
                    <p className="text-3xl font-black">{userData.history.length}</p>
                  </div>
                </div>
              </header>
              
              <div className="space-y-24">
                <section>
                  <div className="flex items-center justify-between mb-10">
                    <h3 className="text-2xl font-black tracking-tighter uppercase border-l-4 border-purple-500 pl-4">YOUR QUEUE</h3>
                    <div className="flex gap-2 bg-white/5 p-1 rounded-lg">
                       {['match', 'rating', 'year'].map(s => (
                          <button 
                            key={s}
                            onClick={() => setLibrarySort(s as any)}
                            className={`px-3 py-1 text-[10px] font-black uppercase rounded-md transition-all ${librarySort === s ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                          >
                            {s}
                          </button>
                        ))}
                    </div>
                  </div>
                  
                  {userData.watchlist.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
                      {sortedWatchlist.map(movie => (
                        <MovieCard 
                          key={movie.movie_id}
                          movie={movie}
                          onWatchlist={toggleWatchlist}
                          onWatched={markAsWatched}
                          onDetail={setSelectedMovie}
                          isWatchlisted={true}
                          isWatched={userData.history.some(h => h.movie_id === movie.movie_id)}
                          onRemoveWatchlist={(id) => setUserData(p => ({ ...p, watchlist: p.watchlist.filter(m => m.movie_id !== id) }))}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="p-24 text-center bg-white/5 rounded-[40px] border-2 border-dashed border-white/10">
                      <Bookmark size={48} className="mx-auto mb-4 text-gray-600" />
                      <p className="text-gray-500 font-bold mb-6">Your queue is currently empty.</p>
                      <button 
                        onClick={() => setView('mood')} 
                        className="px-8 py-3 bg-purple-600 text-white font-black rounded-xl hover:bg-purple-700 transition-colors shadow-lg shadow-purple-900/20"
                      >
                        DISCOVER MOVIES
                      </button>
                    </div>
                  )}
                </section>

                {userData.history.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-10">
                      <h3 className="text-2xl font-black flex items-center gap-3 border-l-4 border-green-500 pl-4 tracking-tighter uppercase">
                        WATCHED HISTORY
                      </h3>
                      <button 
                        onClick={() => { if(confirm('Clear history?')) setUserData(p => ({...p, history: []})) }}
                        className="text-gray-600 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8 opacity-70 hover:opacity-100 transition-opacity">
                      {sortedHistory.map(movie => (
                        <MovieCard 
                          key={movie.movie_id}
                          movie={movie}
                          onWatchlist={toggleWatchlist}
                          onWatched={markAsWatched}
                          onDetail={setSelectedMovie}
                          isWatchlisted={userData.watchlist.some(m => m.movie_id === movie.movie_id)}
                          isWatched={true}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Movie Details Modal */}
      <AnimatePresence>
        {selectedMovie && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-12 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMovie(null)}
              className="fixed inset-0 bg-black/95 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-5xl bg-[#0a0a0a] border border-white/10 rounded-[40px] overflow-hidden shadow-[0_0_120px_rgba(139,92,246,0.4)] flex flex-col md:flex-row max-h-[95vh]"
            >
              <div className="w-full md:w-2/5 h-[400px] md:h-auto relative">
                <img 
                  src={selectedMovie.poster_path} 
                  className="w-full h-full object-cover" 
                  alt={selectedMovie.title} 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent md:hidden" />
              </div>
              <div className="w-full md:w-3/5 p-8 md:p-14 flex flex-col overflow-y-auto relative">
                {/* Backdrop Blur Poster */}
                <div className="absolute inset-0 pointer-events-none opacity-10 overflow-hidden">
                  <img src={selectedMovie.poster_path} className="w-full h-full object-cover blur-[80px]" alt="" />
                </div>

                <div className="flex justify-between items-start mb-8 relative z-10">
                  <div>
                    <Badge className="bg-purple-600 text-white mb-4 shadow-xl">AI ANALYSIS: {Math.round((selectedMovie.match_score || 0) * 100)}% MATCH</Badge>
                    <h2 className="text-4xl md:text-5xl font-black leading-none tracking-tighter mb-4">{selectedMovie.title}</h2>
                    <div className="flex items-center gap-4 text-sm font-bold text-gray-400">
                      <span className="flex items-center gap-1.5 text-yellow-400">
                        <Star size={16} fill="currentColor" /> {Number(selectedMovie.vote_average || 0).toFixed(1)}
                      </span>
                      <span className="opacity-30">•</span>
                      <span>{selectedMovie.release_year}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedMovie(null)}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors group"
                  >
                    <X size={24} className="group-hover:rotate-90 transition-transform" />
                  </button>
                </div>

                <div className="space-y-10 flex-1 relative z-10">
                  <div>
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">THE AI INSIGHT</h4>
                    <div className="p-6 bg-purple-500/10 border border-purple-500/20 rounded-[24px]">
                      <p className="text-purple-100 font-bold leading-relaxed italic text-lg">
                        "{selectedMovie.reasoning || "A masterfully selected match for your current emotional trajectory."}"
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">PLOT SYNOPSIS</h4>
                    <p className="text-gray-400 font-medium leading-relaxed text-base">
                      {selectedMovie.overview}
                    </p>
                  </div>
                </div>

                <div className="mt-12 flex flex-wrap gap-4 pt-6 border-t border-white/5 relative z-10">
                  <button 
                    onClick={() => { markAsWatched(selectedMovie); setSelectedMovie(null); }}
                    className="flex-1 min-w-[160px] flex items-center justify-center gap-3 py-4 bg-white text-black font-black rounded-2xl hover:bg-gray-200 transition-all shadow-xl active:scale-95"
                  >
                    <Eye size={20} className="mr-2" /> {userData.history.some(h => h.movie_id === selectedMovie.movie_id) ? 'SEEN' : 'MARK AS SEEN'}
                  </button>
                  <button 
                    onClick={() => toggleWatchlist(selectedMovie)}
                    className={`flex-1 min-w-[160px] flex items-center justify-center gap-3 py-4 border font-black rounded-2xl transition-all active:scale-95 ${userData.watchlist.some(m => m.movie_id === selectedMovie.movie_id) ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/30' : 'border-white/10 bg-white/5 hover:bg-white/10 text-white'}`}
                  >
                    {userData.watchlist.some(m => m.movie_id === selectedMovie.movie_id) ? <Check size={20} /> : <Plus size={20} />} 
                    {userData.watchlist.some(m => m.movie_id === selectedMovie.movie_id) ? 'IN QUEUE' : 'WATCHLIST'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SortByIcon = ({ option }: { option: SortOption }) => {
  if (option === 'match') return <Zap size={14} className="text-purple-400" />;
  if (option === 'rating') return <Star size={14} className="text-yellow-400" />;
  return <History size={14} className="text-blue-400" />;
};

createRoot(document.getElementById('root')!).render(<App />);
