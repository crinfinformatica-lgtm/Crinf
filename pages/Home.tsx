
import React, { useState, useEffect } from 'react';
import { Search, MapPin, Filter, Store, UserPlus, Navigation, Share2, Check } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Vendor, CATEGORIES } from '../types';
import { VendorCard, Button } from '../components/UI';
import { useAppContext } from '../App';
import { interpretSearchQuery } from '../services/geminiService';

// Updated AppLogo - Vertical Layout (Text Top, Icon Bottom)
const AppLogo = () => (
  <svg viewBox="0 0 300 140" className="w-72 h-auto drop-shadow-md animate-fade-in">
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1"/>
        <feOffset dx="1" dy="1" result="offsetblur"/>
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.3"/>
        </feComponentTransfer>
        <feMerge> 
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/> 
        </feMerge>
      </filter>
    </defs>

    {/* TEXT ON TOP */}
    <text x="150" y="28" textAnchor="middle" fontFamily="Arial Black, sans-serif" fontSize="24" fontWeight="900" fill="#0ea5e9" letterSpacing="0.5">O QUE TEM PERTO?</text>

    {/* GRAPHIC GROUP - Centered Below Text */}
    <g transform="translate(105, 45)">
        {/* Connected Lines */}
        <line x1="25" y1="30" x2="25" y2="70" stroke="#0c4a6e" strokeWidth="4" />
        <line x1="25" y1="50" x2="65" y2="50" stroke="#0c4a6e" strokeWidth="4" />

        {/* Circle 1: Shop (Yellow) - Top Left */}
        <g transform="translate(25, 30)">
            <circle r="18" fill="white" stroke="#facc15" strokeWidth="3" filter="url(#shadow)"/>
            <g transform="translate(-10, -10) scale(0.8)">
                <path d="M2 9a3 3 0 0 1 0-6h20a3 3 0 0 1 0 6v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9Z" fill="#facc15"/>
                <path d="M1 5h22v4H1z" fill="#ca8a04"/>
            </g>
        </g>

        {/* Circle 2: Tools (Blue) - Bottom Left */}
        <g transform="translate(25, 70)">
            <circle r="18" fill="white" stroke="#0ea5e9" strokeWidth="3" filter="url(#shadow)"/>
            <g transform="translate(-9, -9) scale(0.75)">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" fill="#0ea5e9"/>
            </g>
        </g>

        {/* Circle 3: User (Dark Blue) - Right */}
        <g transform="translate(65, 50)">
            <circle r="18" fill="white" stroke="#0c4a6e" strokeWidth="3" filter="url(#shadow)"/>
            <g transform="translate(-9, -9) scale(0.75)">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" fill="none" stroke="#0c4a6e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="7" r="4" fill="#0c4a6e"/>
            </g>
        </g>
    </g>
  </svg>
);

export const Home: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [localSearch, setLocalSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState<'landing' | 'search'>('landing');
  
  // Distance Filter State: null means "All/No limit"
  const [maxDistance, setMaxDistance] = useState<number | null>(null);

  // Logic to determine if we should stay in search mode if there's an active query
  useEffect(() => {
    if (state.searchQuery || state.selectedCategory) {
        setViewMode('search');
    }
  }, [state.searchQuery, state.selectedCategory]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    
    // Smart search using Gemini
    if (localSearch.length > 2) {
      const result = await interpretSearchQuery(localSearch);
      if (result.category) {
        dispatch({ type: 'SET_CATEGORY', payload: result.category });
      }
      dispatch({ type: 'SET_SEARCH', payload: localSearch });
    } else {
        dispatch({ type: 'SET_SEARCH', payload: localSearch });
    }
    setIsSearching(false);
  };

  const handleShareApp = async () => {
    const shareData = {
        title: 'O Que Tem Perto?',
        text: 'Descubra os melhores comércios e serviços de Águas Claras e região no app O Que Tem Perto!',
        url: window.location.href.split('#')[0]
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            console.log('Error sharing', err);
        }
    } else {
        navigator.clipboard.writeText(shareData.url);
        alert('Link do aplicativo copiado para a área de transferência!');
    }
  };

  const filteredVendors = state.vendors.filter(v => {
    const matchesCategory = state.selectedCategory 
      ? v.categories.some(c => c.toLowerCase().includes(state.selectedCategory!.toLowerCase()))
      : true;
    
    const matchesSearch = state.searchQuery 
      ? v.name.toLowerCase().includes(state.searchQuery.toLowerCase()) || 
        v.description.toLowerCase().includes(state.searchQuery.toLowerCase())
      : true;

    // Distance Filter Logic
    const matchesDistance = maxDistance === null 
        ? true 
        : (v.distance !== undefined && v.distance <= maxDistance);

    return matchesCategory && matchesSearch && matchesDistance;
  });

  const goHome = () => {
      dispatch({ type: 'SET_CATEGORY', payload: null });
      dispatch({ type: 'SET_SEARCH', payload: '' });
      setLocalSearch('');
      setMaxDistance(null);
      setViewMode('landing');
  }

  // --- VIEW: LANDING PAGE ---
  if (viewMode === 'landing') {
    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-sky-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-sky-200/40 rounded-full blur-3xl"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-blue-200/30 rounded-full blur-2xl"></div>

            <div className="z-10 w-full flex flex-col items-center text-center">
                {/* Logo Area */}
                <div className="mb-8 transform hover:scale-105 transition-transform duration-500">
                    <AppLogo />
                </div>
                
                <p className="text-gray-500 mb-10 text-sm max-w-xs mx-auto font-medium">
                    Descubra os melhores serviços e comércios da região do Águas Claras em um só lugar.
                </p>
                
                {/* Main Action Buttons */}
                <div className="w-full space-y-4 max-w-sm">
                    <button 
                        onClick={() => setViewMode('search')}
                        className="group w-full bg-primary hover:bg-sky-600 text-white font-bold text-lg py-4 px-6 rounded-2xl shadow-lg shadow-sky-200 transform transition active:scale-95 flex items-center justify-center gap-3 border-b-4 border-sky-700 relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        <Search size={24} className="text-white relative z-10" />
                        <span className="relative z-10">Explorar Agora</span>
                    </button>

                    <button 
                        onClick={() => navigate('/register')}
                        className="group w-full bg-white hover:bg-gray-50 text-sky-700 font-bold text-lg py-4 px-6 rounded-2xl shadow-md transform transition active:scale-95 flex items-center justify-center gap-3 border border-sky-100"
                    >
                        <Store size={24} className="text-sky-500 relative z-10" />
                        <span className="relative z-10">Cadastrar Negócio</span>
                    </button>

                    {/* Botão de Compartilhar App */}
                    <button 
                        onClick={handleShareApp}
                        className="w-full text-sky-600 font-semibold py-3 px-6 rounded-2xl flex items-center justify-center gap-2 hover:bg-sky-50 transition-colors"
                    >
                        <Share2 size={18} />
                        Compartilhar App
                    </button>
                </div>
            </div>
        </div>
    );
  }

  // --- VIEW: SEARCH & RESULTS PAGE ---
  return (
    <div className="pb-20 bg-transparent min-h-screen">
      {/* Header / Search Area */}
      <div className="bg-white/80 backdrop-blur-md pt-6 pb-6 px-4 rounded-b-[2.5rem] shadow-lg mb-6 sticky top-0 z-40 border-b border-sky-100">
        <div className="flex justify-between items-center mb-6">
            <div className="cursor-pointer" onClick={goHome}>
                <h1 className="text-xl font-extrabold tracking-tight text-sky-900">O Que Tem Perto?</h1>
                <p className="text-sky-600 text-xs flex items-center font-medium bg-sky-50 inline-block px-2 py-0.5 rounded-md mt-1 border border-sky-100">
                    <MapPin size={10} className="mr-1" /> Águas Claras e Região
                </p>
            </div>
            {!state.currentUser && (
                <button 
                  onClick={() => navigate('/login')}
                  className="text-xs font-bold bg-primary text-white px-5 py-2 rounded-full hover:bg-sky-600 shadow-sm transition-colors"
                >
                    Entrar
                </button>
            )}
            {state.currentUser && (
                <div className="h-10 w-10 rounded-full bg-accent border-2 border-white flex items-center justify-center text-sky-900 font-bold shadow-md overflow-hidden cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate('/settings')}>
                    {state.currentUser.photoUrl ? (
                        <img src={state.currentUser.photoUrl} alt="User" className="w-full h-full object-cover" />
                    ) : (
                        state.currentUser.name[0]
                    )}
                </div>
            )}
        </div>

        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            placeholder="Buscar em Águas Claras..."
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 text-gray-900 shadow-inner border border-gray-200 focus:border-primary focus:ring-2 focus:ring-sky-100 focus:outline-none placeholder-gray-400 transition-all"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
          <Search className="absolute left-4 top-4 text-gray-400" size={20} />
          <button type="submit" className="absolute right-3 top-3 bg-primary p-1.5 rounded-xl text-white shadow-sm hover:bg-sky-600 transition-colors">
            {isSearching ? <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent" /> : <Search size={20} />}
          </button>
        </form>
      </div>

      {/* Categories */}
      <div className="px-4 mb-6">
        <div className="flex justify-between items-end mb-3">
            <h2 className="text-sky-900 font-bold text-lg">Categorias</h2>
            <button 
                onClick={() => dispatch({ type: 'SET_CATEGORY', payload: null })}
                className="text-xs text-primary font-semibold underline"
            >
                Ver tudo
            </button>
        </div>
        <div className="flex space-x-3 overflow-x-auto no-scrollbar pb-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => dispatch({ type: 'SET_CATEGORY', payload: cat })}
              className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all transform hover:scale-105 ${state.selectedCategory === cat ? 'bg-primary text-white shadow-lg shadow-sky-200' : 'bg-white text-gray-500 border border-gray-100 shadow-sm hover:border-primary/30'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Distance Filters */}
      <div className="px-4 mb-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
              <div className="flex items-center text-xs text-gray-400 font-bold mr-2">
                  <Filter size={14} className="mr-1" /> Raio:
              </div>
              <button 
                  onClick={() => setMaxDistance(null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${maxDistance === null ? 'bg-sky-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
              >
                  Todos
              </button>
              {[1, 3, 5, 10, 20].map(dist => (
                  <button 
                      key={dist}
                      onClick={() => setMaxDistance(dist)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${maxDistance === dist ? 'bg-sky-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}
                  >
                      {maxDistance === dist && <Check size={12} />}
                      Até {dist}km
                  </button>
              ))}
          </div>
      </div>

      {/* Results */}
      <div className="px-4">
        <div className="flex justify-between items-center mb-3">
            <h2 className="text-sky-900 font-bold text-lg">
                {state.selectedCategory ? `${state.selectedCategory} na Região` : 'Destaques Locais'}
            </h2>
            {state.userLocation && (
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center font-bold">
                    <Navigation size={10} className="mr-1 fill-green-700" /> GPS Ativo
                </span>
            )}
        </div>
        
        {filteredVendors.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-sky-100 p-8 shadow-sm mx-2">
            <div className="bg-sky-50 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-4">
                <Search className="text-primary" size={32}/>
            </div>
            <p className="text-gray-500 font-medium">Nenhum resultado encontrado nesta área.</p>
            {maxDistance !== null && (
                <p className="text-xs text-gray-400 mt-2">Tente aumentar o raio de distância.</p>
            )}
            <Button variant="outline" className="mt-6 border-primary text-primary" onClick={() => {
                dispatch({ type: 'SET_CATEGORY', payload: null });
                dispatch({ type: 'SET_SEARCH', payload: '' });
                setLocalSearch('');
                setMaxDistance(null);
            }}>Limpar Filtros</Button>
          </div>
        ) : (
          filteredVendors.map(vendor => (
            <VendorCard 
              key={vendor.id} 
              vendor={vendor} 
              onClick={() => navigate(`/vendor/${vendor.id}`)} 
            />
          ))
        )}
      </div>
    </div>
  );
};
