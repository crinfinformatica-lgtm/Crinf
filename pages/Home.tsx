import React, { useState, useEffect } from 'react';
import { Search, MapPin, Filter, Store, UserPlus, Navigation, Share2, Check, Briefcase, ShoppingBag, Grid, X, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Vendor, CATEGORIES, UserType } from '../types';
import { VendorCard, Button, AppLogo } from '../components/UI';
import { useAppContext } from '../App';
import { interpretSearchQuery } from '../services/geminiService';
import { ALLOWED_NEIGHBORHOODS } from '../config';

export const Home: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [localSearch, setLocalSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState<'landing' | 'search'>('landing');
  
  // Distance Filter State: null means "All/No limit"
  const [maxDistance, setMaxDistance] = useState<number | null>(null);

  // Logic to determine if we should stay in search mode if there's an active query or filters
  useEffect(() => {
    if (state.searchQuery || state.selectedCategory || state.selectedNeighborhood || state.selectedSubtype !== 'ALL') {
        setViewMode('search');
    }
  }, [state.searchQuery, state.selectedCategory, state.selectedNeighborhood, state.selectedSubtype]);

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
        title: state.appConfig.appName,
        text: `Descubra os melhores comércios e serviços no app ${state.appConfig.appName}!`,
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

  // --- FILTERING LOGIC ---
  const filteredVendors = state.vendors.filter(v => {
    // 1. Category Filter
    const matchesCategory = state.selectedCategory 
      ? v.categories.some(c => c.toLowerCase().includes(state.selectedCategory!.toLowerCase()))
      : true;
    
    // 2. Search Text Filter
    const matchesSearch = state.searchQuery 
      ? v.name.toLowerCase().includes(state.searchQuery.toLowerCase()) || 
        v.description.toLowerCase().includes(state.searchQuery.toLowerCase())
      : true;

    // 3. Distance Filter
    const matchesDistance = maxDistance === null 
        ? true 
        : (v.distance !== undefined && v.distance <= maxDistance);
    
    // 4. Neighborhood Filter
    const matchesNeighborhood = state.selectedNeighborhood
        ? v.address.toLowerCase().includes(state.selectedNeighborhood.toLowerCase())
        : true;

    // 5. Subtype Filter (Commerce vs Service)
    const matchesSubtype = state.selectedSubtype === 'ALL'
        ? true
        : v.subtype === state.selectedSubtype;

    return matchesCategory && matchesSearch && matchesDistance && matchesNeighborhood && matchesSubtype;
  });

  // --- SORTING LOGIC (Featured First) ---
  const sortedVendors = filteredVendors.sort((a, b) => {
      // Check if featured and valid
      const isAFeatured = a.featuredUntil && a.featuredUntil > Date.now();
      const isBFeatured = b.featuredUntil && b.featuredUntil > Date.now();

      if (isAFeatured && !isBFeatured) return -1; // A comes first
      if (!isAFeatured && isBFeatured) return 1;  // B comes first
      
      // If both featured or both not, sort by distance (if available) or existing order
      if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
      }
      return 0;
  });

  const goHome = () => {
      dispatch({ type: 'SET_CATEGORY', payload: null });
      dispatch({ type: 'SET_SEARCH', payload: '' });
      dispatch({ type: 'SET_NEIGHBORHOOD', payload: null });
      dispatch({ type: 'SET_SUBTYPE', payload: 'ALL' });
      setLocalSearch('');
      setMaxDistance(null);
      setViewMode('landing');
  }

  const clearFilters = () => {
      dispatch({ type: 'SET_CATEGORY', payload: null });
      dispatch({ type: 'SET_SEARCH', payload: '' });
      dispatch({ type: 'SET_NEIGHBORHOOD', payload: null });
      dispatch({ type: 'SET_SUBTYPE', payload: 'ALL' });
      setLocalSearch('');
      setMaxDistance(null);
  };

  // --- VIEW: LANDING PAGE ---
  if (viewMode === 'landing') {
    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-sky-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-sky-200/40 rounded-full blur-3xl"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-blue-200/30 rounded-full blur-2xl"></div>

            <div className="z-10 w-full flex flex-col items-center text-center">
                {/* Logo Area - Uses global AppLogo which respects custom config */}
                <div className="mb-6 w-full flex justify-center transform hover:scale-105 transition-transform duration-500">
                    <AppLogo />
                </div>
                
                <p 
                    className="mb-10 max-w-xs mx-auto transition-all" 
                    style={{ 
                        color: state.appConfig.descriptionColor || '#6b7280', 
                        fontSize: `${state.appConfig.descriptionSize || 14}px`,
                        fontWeight: state.appConfig.descriptionBold ? 'bold' : 'normal',
                        fontStyle: state.appConfig.descriptionItalic ? 'italic' : 'normal',
                        textDecoration: state.appConfig.descriptionUnderline ? 'underline' : 'none',
                        textAlign: state.appConfig.descriptionAlign || 'center',
                        whiteSpace: 'pre-wrap' 
                    }}
                >
                    {state.appConfig.appDescription || "Descubra os melhores serviços e comércios da região em um só lugar."}
                </p>
                
                {/* Main Action Buttons */}
                <div className="w-full space-y-3 max-w-sm">
                    <button 
                        onClick={() => setViewMode('search')}
                        className="group w-full bg-primary hover:bg-sky-600 text-white font-bold text-lg py-4 px-6 rounded-2xl shadow-lg shadow-sky-200 transform transition active:scale-95 flex items-center justify-center gap-3 border-b-4 border-sky-700 relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        <Search size={24} className="text-white relative z-10" />
                        <span className="relative z-10">Explorar Agora</span>
                    </button>

                    <div className="flex gap-2">
                         <button 
                             onClick={() => navigate('/register', { state: { initialTab: UserType.USER } })}
                             className="flex-1 bg-white hover:bg-gray-50 text-sky-700 font-bold py-3 px-2 rounded-2xl shadow-md transform transition active:scale-95 flex flex-col items-center justify-center gap-1 border border-sky-100 h-24"
                         >
                             <div className="bg-sky-50 p-2 rounded-full mb-1">
                                <User size={20} className="text-sky-600" />
                             </div>
                             <span className="text-xs">Criar Conta<br/>(Cliente)</span>
                         </button>

                         <button 
                             onClick={() => navigate('/register', { state: { initialTab: UserType.VENDOR } })}
                             className="flex-1 bg-white hover:bg-gray-50 text-sky-700 font-bold py-3 px-2 rounded-2xl shadow-md transform transition active:scale-95 flex flex-col items-center justify-center gap-1 border border-sky-100 h-24"
                         >
                             <div className="bg-sky-50 p-2 rounded-full mb-1">
                                <Store size={20} className="text-sky-600" />
                             </div>
                             <span className="text-xs">Cadastrar<br/>Negócio</span>
                         </button>
                    </div>

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
                {/* Use configuration for App Name */}
                <h1 className="text-xl font-extrabold tracking-tight" style={{ color: state.appConfig.primaryColor }}>
                    {state.appConfig.appName}
                </h1>
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

      {/* FILTER CONTROLS */}
      <div className="px-4 space-y-4 mb-6">
          
          {/* 1. TYPE FILTER (TABS) */}
          <div className="flex bg-gray-100 p-1 rounded-xl">
               <button 
                  onClick={() => dispatch({ type: 'SET_SUBTYPE', payload: 'ALL' })}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${state.selectedSubtype === 'ALL' ? 'bg-white shadow text-sky-700' : 'text-gray-500'}`}
               >
                   <Grid size={14} /> Todos
               </button>
               <button 
                  onClick={() => dispatch({ type: 'SET_SUBTYPE', payload: 'COMMERCE' })}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${state.selectedSubtype === 'COMMERCE' ? 'bg-white shadow text-sky-700' : 'text-gray-500'}`}
               >
                   <ShoppingBag size={14} /> Comércios
               </button>
               <button 
                  onClick={() => dispatch({ type: 'SET_SUBTYPE', payload: 'SERVICE' })}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${state.selectedSubtype === 'SERVICE' ? 'bg-white shadow text-sky-700' : 'text-gray-500'}`}
               >
                   <Briefcase size={14} /> Serviços
               </button>
          </div>

          {/* 2. CATEGORIES (Horizontal Scroll) */}
          <div>
            <div className="flex justify-between items-end mb-2">
                <h2 className="text-gray-600 font-bold text-xs uppercase tracking-wider">Categorias</h2>
                <button 
                    onClick={() => dispatch({ type: 'SET_CATEGORY', payload: null })}
                    className="text-xs text-primary font-semibold underline"
                >
                    Ver todas
                </button>
            </div>
            <div className="flex space-x-3 overflow-x-auto no-scrollbar pb-2">
            {CATEGORIES.map(cat => (
                <button
                key={cat}
                onClick={() => dispatch({ type: 'SET_CATEGORY', payload: cat })}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all transform hover:scale-105 ${state.selectedCategory === cat ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-500 border border-gray-100 shadow-sm'}`}
                >
                {cat}
                </button>
            ))}
            </div>
          </div>

          {/* 3. ADDITIONAL FILTERS (Neighborhood & Distance) */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {/* Neighborhood Dropdown */}
              <div className="relative">
                  <select
                      value={state.selectedNeighborhood || ''}
                      onChange={(e) => dispatch({ type: 'SET_NEIGHBORHOOD', payload: e.target.value || null })}
                      className={`appearance-none pl-8 pr-8 py-2 rounded-lg text-xs font-bold border outline-none focus:ring-2 focus:ring-primary/50 transition-all ${state.selectedNeighborhood ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-gray-600 border-gray-200'}`}
                  >
                      <option value="">Bairro: Todos</option>
                      {ALLOWED_NEIGHBORHOODS.map(n => (
                          <option key={n} value={n} className="text-gray-800 bg-white">{n}</option>
                      ))}
                  </select>
                  <MapPin size={12} className={`absolute left-2.5 top-2.5 ${state.selectedNeighborhood ? 'text-white' : 'text-gray-400'}`} />
              </div>

              {/* Distance Dropdown/Buttons (Simplified) */}
              {[3, 5, 10].map(dist => (
                  <button 
                      key={dist}
                      onClick={() => setMaxDistance(maxDistance === dist ? null : dist)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 border ${maxDistance === dist ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-gray-600 border-gray-200'}`}
                  >
                      {maxDistance === dist ? <Check size={12} /> : <Filter size={12} />}
                      Até {dist}km
                  </button>
              ))}
          </div>
      </div>

      {/* Results */}
      <div className="px-4">
        <div className="flex justify-between items-center mb-3">
            <h2 className="text-sky-900 font-bold text-lg">
                {state.selectedCategory ? `${state.selectedCategory}` : 
                 state.selectedSubtype === 'COMMERCE' ? 'Comércios Locais' :
                 state.selectedSubtype === 'SERVICE' ? 'Prestadores de Serviço' :
                 'Destaques Locais'}
            </h2>
            {state.userLocation && (
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center font-bold">
                    <Navigation size={10} className="mr-1 fill-green-700" /> GPS Ativo
                </span>
            )}
        </div>
        
        {sortedVendors.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-sky-100 p-8 shadow-sm mx-2">
            <div className="bg-sky-50 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-4">
                <Search className="text-primary" size={32}/>
            </div>
            <p className="text-gray-500 font-medium">Nenhum resultado encontrado.</p>
            <p className="text-xs text-gray-400 mt-2">Tente ajustar os filtros de bairro ou categoria.</p>
            <Button variant="outline" className="mt-6 border-primary text-primary" onClick={clearFilters}>
                <X size={16} className="mr-1" /> Limpar Filtros
            </Button>
          </div>
        ) : (
          sortedVendors.map(vendor => (
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