
import React, { createContext, useContext, useReducer, useEffect, ReactNode, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Home, User, Settings, PlusCircle, Instagram, Globe, Shield, Lock, Mail, ArrowRight, CheckCircle, AlertTriangle, Download, Clock, LogOut, ChevronRight, Bell, Moon, KeyRound } from 'lucide-react';
import { AppState, Vendor, User as UserType, Location as LatLng, UserType as UserEnum } from './types';
import { Home as HomePage } from './pages/Home';
import { VendorDetails } from './pages/VendorDetails';
import { Register } from './pages/Register';
import { AdminDashboard } from './pages/AdminDashboard';
import { generateMockVendors } from './services/geminiService';
import { getUserLocation, calculateDistance } from './services/geoService';
import { TwoFactorModal, Modal, Input, Button, AdminLogo, AppLogo } from './components/UI'; // Imported AdminLogo

// --- State Management ---
const initialState: AppState = {
  currentUser: null,
  users: [
    // Mock Users for Demo purposes allowing password changes
    { id: 'user_1', name: 'Maria Silva', email: 'maria@email.com', cpf: '111.111.111-11', address: 'Centro', type: UserEnum.USER, password: '123' } as any
  ],
  vendors: [],
  bannedDocuments: [],
  searchQuery: '',
  selectedCategory: null,
  userLocation: null
};

type Action = 
  | { type: 'SET_VENDORS'; payload: Vendor[] }
  | { type: 'ADD_VENDOR'; payload: Vendor }
  | { type: 'ADD_USER'; payload: UserType }
  | { type: 'UPDATE_USER'; payload: UserType }
  | { type: 'UPDATE_VENDOR'; payload: Vendor }
  | { type: 'DELETE_USER'; payload: string }
  | { type: 'DELETE_VENDOR'; payload: string }
  | { type: 'BAN_DOCUMENT'; payload: string }
  | { type: 'UNBAN_DOCUMENT'; payload: string }
  | { type: 'LOGIN'; payload: any }
  | { type: 'LOGOUT' }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_CATEGORY'; payload: string | null }
  | { type: 'ADD_REVIEW'; payload: { vendorId: string; review: any } }
  | { type: 'REPLY_REVIEW'; payload: { vendorId: string; reviewId: string; replyText: string } }
  | { type: 'SET_LOCATION'; payload: LatLng }
  | { type: 'RESET_PASSWORD'; payload: { id: string; type: 'user' | 'vendor' } }
  | { type: 'CHANGE_PASSWORD'; payload: { email: string; newPass: string } };

const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_VENDORS':
      return { ...state, vendors: action.payload };
    case 'ADD_VENDOR':
      return { ...state, vendors: [action.payload, ...state.vendors] };
    case 'ADD_USER':
      return { ...state, users: [...state.users, action.payload] };
    case 'UPDATE_USER':
      return { ...state, users: state.users.map(u => u.id === action.payload.id ? action.payload : u) };
    case 'UPDATE_VENDOR':
      return { ...state, vendors: state.vendors.map(v => v.id === action.payload.id ? { ...v, ...action.payload } : v) };
    case 'DELETE_USER':
      return { ...state, users: state.users.filter(u => u.id !== action.payload) };
    case 'DELETE_VENDOR':
      return { ...state, vendors: state.vendors.filter(v => v.id !== action.payload) };
    case 'BAN_DOCUMENT':
      // Payload can be Email, CPF, or CNPJ
      return { 
        ...state, 
        bannedDocuments: [...state.bannedDocuments, action.payload],
        // Remove users if CPF OR Email matches the banned string
        users: state.users.filter(u => u.cpf !== action.payload && u.email !== action.payload),
        // Remove vendors if Document (CNPJ/CPF) matches
        vendors: state.vendors.filter(v => v.document !== action.payload)
      };
    case 'UNBAN_DOCUMENT':
      return { ...state, bannedDocuments: state.bannedDocuments.filter(d => d !== action.payload) };
    case 'LOGIN':
      return { ...state, currentUser: action.payload };
    case 'LOGOUT':
      return { ...state, currentUser: null };
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.payload };
    case 'SET_CATEGORY':
      return { ...state, selectedCategory: action.payload };
    case 'SET_LOCATION':
      return { ...state, userLocation: action.payload };
    case 'ADD_REVIEW':
      return {
        ...state,
        vendors: state.vendors.map(v => {
          if (v.id === action.payload.vendorId) {
            const newReviews = [action.payload.review, ...v.reviews];
            const newCount = newReviews.length;
            const newRating = newReviews.reduce((acc, r) => acc + r.rating, 0) / newCount;
            return { ...v, reviews: newReviews, reviewCount: newCount, rating: newRating };
          }
          return v;
        })
      };
    case 'REPLY_REVIEW':
      return {
          ...state,
          vendors: state.vendors.map(v => {
              if (v.id === action.payload.vendorId) {
                  const updatedReviews = v.reviews.map(r => {
                      if (r.id === action.payload.reviewId) {
                          return { 
                              ...r, 
                              reply: action.payload.replyText, 
                              replyDate: new Date().toLocaleDateString() 
                          };
                      }
                      return r;
                  });
                  return { ...v, reviews: updatedReviews };
              }
              return v;
          })
      };
    case 'RESET_PASSWORD':
      // Admin resets password to '123456'
      // We need to update the actual user object in the array
      const tempPass = '123456';
      if (action.payload.type === 'user') {
          return {
              ...state,
              users: state.users.map(u => u.id === action.payload.id ? { ...u, password: tempPass } as any : u)
          };
      } else {
           // Vendors (simulated)
           return state;
      }
    case 'CHANGE_PASSWORD':
      return {
          ...state,
          users: state.users.map(u => u.email === action.payload.email ? { ...u, password: action.payload.newPass } as any : u)
      };
    default:
      return state;
  }
};

const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};

// --- Google Login Component (Simulated) ---
interface GoogleLoginButtonProps {
    onClick?: () => void;
    text?: string;
    onSuccess?: (googleData: any) => void; // New prop for registration flow
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({ onClick, text = "Continuar com Google", onSuccess }) => {
  const { dispatch, state } = useAppContext();
  const navigate = useNavigate();

  const handleGoogleLogin = () => {
    if (onClick) onClick();

    // Simulate API call delay
    setTimeout(() => {
        const mockCPF = "000.000.000-00"; 
        
        // Normal login page - ask user (only if not registering)
        if (!onSuccess) {
            const isSimulatedUser = confirm("DEMO: Simular login de usuário comum?\n\nOK = Usuário\nCancel = Cancelar");
            if (!isSimulatedUser) return;
        }

        let mockEmail = "usuario@gmail.com";
        let mockName = "Usuário Google";
        const mockPhoto = "https://lh3.googleusercontent.com/a/default-user";

        if (onSuccess) {
             const randomId = Math.floor(Math.random() * 1000);
             mockEmail = `novo.usuario${randomId}@gmail.com`;
        }
        
        // If we are in registration mode (onSuccess provided), pass data back and DO NOT login yet
        if (onSuccess) {
            onSuccess({
                name: mockName,
                email: mockEmail,
                photoUrl: mockPhoto
            });
            return; 
        }

        // --- Standard Login Flow ---
        
        // Check Ban (CPF or Email)
        if (state.bannedDocuments.includes(mockCPF) || state.bannedDocuments.includes(mockEmail)) {
            alert("Acesso negado: Esta conta foi suspensa pelo administrador.");
            return;
        }

        const mockUser: UserType = {
            id: `google_${Date.now()}`,
            name: mockName,
            email: mockEmail,
            cpf: mockCPF, 
            address: "Campo Largo, PR",
            type: UserEnum.USER,
            photoUrl: mockPhoto
        };

        dispatch({ type: 'LOGIN', payload: mockUser });
        navigate('/');
    }, 800);
  };

  return (
    <button 
      type="button"
      onClick={handleGoogleLogin}
      className={`w-full flex items-center justify-center border text-font-semibold py-3 px-4 rounded-xl transition shadow-sm gap-3 relative overflow-hidden active:scale-95 duration-200 bg-white border-gray-300 text-gray-700 hover:bg-gray-50`}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      {text}
    </button>
  );
};

// --- Footer Component ---
const Footer = () => {
  return (
    <div className="w-full py-8 text-center bg-transparent mt-auto mb-20">
      <p className="text-[10px] text-gray-400 font-medium">
        Desenvolvido por <span className="text-primary font-bold">Crinf-Informática</span>
      </p>
      <a 
        href="https://instagram.com/crinfinformatica" 
        target="_blank" 
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-1 mt-1 text-sky-600 hover:text-sky-800 text-[11px] font-semibold transition-colors"
      >
        <Instagram size={12} />
        @crinfinformatica
      </a>
    </div>
  );
};

// --- Mobile Navigation ---
const BottomNav = () => {
  const location = useLocation();
  const { state } = useAppContext();
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    // Listen for PWA install prompt
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((result: any) => {
        if (result.outcome === 'accepted') {
          setInstallPrompt(null);
        }
      });
    }
  };
  
  // Hide nav on specific pages, including the new admin login
  if (['/register', '/login', '/admin', '/reset-password', '/admin-login'].includes(location.pathname)) return null;

  const navClass = (path: string) => 
    `flex flex-col items-center p-2 text-xs font-medium transition-colors ${location.pathname === path ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 py-2 pb-safe px-6 flex justify-between items-center z-50 max-w-md mx-auto">
      <Link to="/" className={navClass('/')}>
        <Home size={24} className="mb-1" />
        Início
      </Link>
      
      {!state.currentUser ? (
        <Link to="/register" className="flex flex-col items-center -mt-6">
            <div className="bg-accent text-sky-900 p-3 rounded-full shadow-lg border-2 border-white hover:scale-105 transition-transform">
                <PlusCircle size={28} />
            </div>
            <span className="text-xs font-medium text-gray-500 mt-1">Cadastrar</span>
        </Link>
      ) : (
        <Link to="/register" className={navClass('/register')}>
             {state.currentUser.type === UserEnum.VENDOR ? (
                <>
                    <Settings size={24} className="mb-1" />
                    Meu Negócio
                </>
             ) : (
                <>
                    <User size={24} className="mb-1" />
                    Perfil
                </>
             )}
        </Link>
      )}

      {/* Settings / Adjustments (Includes Admin Access) */}
      <Link to="/settings" className={navClass('/settings')}>
          <Settings size={24} className="mb-1" />
          Ajustes
      </Link>
    </div>
  );
};

// --- Settings Page ---
const SettingsPage: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const navigate = useNavigate();

    const handleLogout = () => {
        if(confirm("Tem certeza que deseja sair?")) {
            dispatch({ type: 'LOGOUT' });
            navigate('/');
        }
    };

    const isAdminOrMaster = state.currentUser?.type === UserEnum.ADMIN || state.currentUser?.type === UserEnum.MASTER;

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-sky-50 pb-24">
             {/* Header */}
             <div className="bg-white p-6 pb-8 shadow-sm rounded-b-[2rem] mb-6">
                 <h1 className="text-2xl font-bold text-sky-900 mb-6">Ajustes</h1>
                 
                 {state.currentUser ? (
                     <div className="flex items-center gap-4">
                         <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center border-4 border-white shadow-md overflow-hidden">
                             {state.currentUser.photoUrl ? (
                                 <img src={state.currentUser.photoUrl} alt="Perfil" className="w-full h-full object-cover" />
                             ) : (
                                 <User size={32} className="text-sky-500" />
                             )}
                         </div>
                         <div>
                             <h2 className="text-lg font-bold text-gray-800">{state.currentUser.name}</h2>
                             <p className="text-sm text-gray-500">{state.currentUser.email}</p>
                             <span className="text-[10px] bg-sky-50 text-sky-600 px-2 py-0.5 rounded-full border border-sky-100 font-semibold uppercase mt-1 inline-block">
                                {state.currentUser.type === UserEnum.MASTER ? 'Conta Master' : 
                                 state.currentUser.type === UserEnum.ADMIN ? 'Administrador' : 
                                 state.currentUser.type === UserEnum.VENDOR ? 'Conta Comercial' : 'Cliente'}
                             </span>
                         </div>
                     </div>
                 ) : (
                     <div className="text-center py-4">
                         <p className="text-gray-500 mb-4">Você não está logado.</p>
                         <Button onClick={() => navigate('/login')} fullWidth>Entrar na Conta</Button>
                     </div>
                 )}
             </div>

             <div className="px-4 space-y-4">
                
                {/* ADMIN ACCESS CARD */}
                {isAdminOrMaster && (
                    <div 
                        onClick={() => navigate('/admin')}
                        className="bg-gradient-to-r from-sky-800 to-sky-600 p-5 rounded-2xl shadow-lg shadow-sky-200 text-white flex items-center justify-between cursor-pointer transform transition active:scale-95"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                                <Shield size={24} className="text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Painel Administrativo</h3>
                                <p className="text-sky-100 text-xs">Gerenciar usuários e sistema</p>
                            </div>
                        </div>
                        <ChevronRight size={20} className="text-white/70" />
                    </div>
                )}

                {/* General Settings Placeholders */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                            <Bell size={20} className="text-gray-400" />
                            <span className="text-gray-700 font-medium">Notificações</span>
                        </div>
                        <div className="w-10 h-6 bg-green-500 rounded-full relative">
                            <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                        </div>
                    </div>
                    <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                            <Moon size={20} className="text-gray-400" />
                            <span className="text-gray-700 font-medium">Modo Escuro</span>
                        </div>
                        <div className="w-10 h-6 bg-gray-200 rounded-full relative">
                            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                        </div>
                    </div>
                </div>

                {state.currentUser && (
                    <button 
                        onClick={handleLogout}
                        className="w-full bg-white text-red-500 font-semibold p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
                    >
                        <LogOut size={20} />
                        Sair da Conta
                    </button>
                )}
                
                <div className="text-center pt-8 pb-4">
                    <p className="text-xs text-gray-400">Versão do App: 1.2.0 (PWA)</p>
                </div>
             </div>
        </div>
    );
};

// --- Reset Password Page ---
const ResetPasswordPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { dispatch } = useAppContext();
    const emailFromUrl = searchParams.get('email') || '';
    
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleReset = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPass !== confirmPass) {
            alert("As senhas não coincidem.");
            return;
        }
        if (newPass.length < 4) {
            alert("A senha deve ter pelo menos 4 caracteres.");
            return;
        }

        setIsLoading(true);
        setTimeout(() => {
            dispatch({ type: 'CHANGE_PASSWORD', payload: { email: emailFromUrl, newPass } });
            alert("Senha alterada com sucesso! Faça login com a nova senha.");
            navigate('/admin-login'); // Redirect to admin login if it was an admin reset
        }, 1500);
    };

    if (!emailFromUrl) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-sky-50">
                <div className="bg-white p-6 rounded-2xl shadow text-center">
                    <AlertTriangle className="mx-auto text-red-500 mb-2" size={32} />
                    <p>Link de redefinição inválido.</p>
                    <button onClick={() => navigate('/')} className="mt-4 text-primary font-bold">Voltar para Início</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-sky-100 via-white to-sky-50 max-w-md mx-auto">
             <div className="w-full bg-white rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
                <div className="bg-sky-50 p-6 text-center border-b border-sky-100">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-primary">
                        <Lock size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">Criar Nova Senha</h2>
                    <p className="text-sm text-gray-500 mt-1">Defina uma nova senha para<br/><strong>{emailFromUrl}</strong></p>
                </div>
                
                <form onSubmit={handleReset} className="p-6 space-y-4">
                    <Input 
                        label="Nova Senha" 
                        type="password" 
                        value={newPass} 
                        onChange={e => setNewPass(e.target.value)} 
                        required 
                    />
                    <Input 
                        label="Confirmar Nova Senha" 
                        type="password" 
                        value={confirmPass} 
                        onChange={e => setConfirmPass(e.target.value)} 
                        required 
                    />
                    
                    <Button fullWidth type="submit" disabled={isLoading} className="mt-4">
                        {isLoading ? 'Atualizando...' : 'Redefinir Senha'}
                    </Button>
                </form>
             </div>
        </div>
    );
};

// --- Dedicated Admin Login (Manual Only) ---
const AdminLogin: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    // Forgot Password State
    const [isForgotModalOpen, setForgotModalOpen] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [isEmailSent, setIsEmailSent] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();

        // 1. MASTER CREDENTIALS CHECK (Hardcoded as requested)
        if (email === 'crinf.informatica@gmail.com' && password === 'Crinf!2025#') {
             const masterUser: UserType = {
                id: 'master_crinf',
                name: 'Administrador Crinf',
                email: 'crinf.informatica@gmail.com',
                cpf: '000.000.000-00',
                address: 'Sede Administrativa',
                type: UserEnum.MASTER,
                photoUrl: undefined
            };
            dispatch({ type: 'LOGIN', payload: masterUser });
            navigate('/admin');
            return;
        }

        // 2. OTHER ADMINS CHECK (From State)
        const foundUser = state.users.find(u => u.email === email && u.type === UserEnum.ADMIN);
        
        if (foundUser) {
            if (foundUser.password === password) {
                dispatch({ type: 'LOGIN', payload: foundUser });
                navigate('/admin');
            } else {
                alert("Senha incorreta.");
            }
        } else {
            alert("Credenciais inválidas ou usuário sem permissão.");
        }
    };

    const handleSendForgotEmail = () => {
        if (!forgotEmail.includes('@')) {
            alert("Digite um e-mail válido.");
            return;
        }
        setIsEmailSent(true);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900 max-w-md mx-auto relative overflow-hidden">
             
             <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                 <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-sky-500 to-transparent"></div>
             </div>

             <div className="relative z-10 w-full">
                <div className="flex justify-center mb-8">
                    <div className="bg-slate-800 p-5 rounded-3xl shadow-2xl border border-slate-700">
                        <AdminLogo />
                    </div>
                </div>

                <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700 p-8 rounded-3xl shadow-2xl">
                    <h1 className="text-2xl font-bold text-white text-center mb-1">Acesso Administrativo</h1>
                    <p className="text-slate-400 text-sm text-center mb-8">Restrito para Master e Administradores</p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 ml-1">E-mail Corporativo</label>
                            <input 
                                className="w-full bg-slate-900 border border-slate-600 px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none focus:border-sky-500 transition-colors" 
                                placeholder="admin@empresa.com" 
                                type="email" 
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 ml-1">Senha de Acesso</label>
                            <input 
                                className="w-full bg-slate-900 border border-slate-600 px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none focus:border-sky-500 transition-colors" 
                                placeholder="••••••••" 
                                type="password" 
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                        
                        <div className="flex justify-end">
                             <button 
                                type="button"
                                onClick={() => {
                                    setForgotModalOpen(true);
                                    setIsEmailSent(false);
                                    setForgotEmail('');
                                }}
                                className="text-sky-400 hover:text-sky-300 text-xs font-medium flex items-center gap-1"
                             >
                                <KeyRound size={12} /> Esqueci a senha
                             </button>
                        </div>

                        <button 
                            type="submit"
                            className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-sky-900 mt-2"
                        >
                            Acessar Painel
                        </button>
                    </form>
                    
                    <div className="mt-8 text-center border-t border-slate-700 pt-6">
                        <button 
                            onClick={() => navigate('/login')}
                            className="text-slate-500 hover:text-sky-400 text-xs font-medium transition-colors flex items-center justify-center gap-1 mx-auto"
                        >
                            <ArrowRight size={12} className="rotate-180" /> Voltar para Login Comum
                        </button>
                    </div>
                </div>

                <div className="mt-8 text-center text-slate-600 text-[10px] font-mono">
                    SISTEMA DE GESTÃO CRINF v2.1
                </div>
             </div>

             {/* Admin Forgot Password Modal */}
             <Modal isOpen={isForgotModalOpen} onClose={() => setForgotModalOpen(false)} title="Recuperar Acesso">
                {!isEmailSent ? (
                    <div className="space-y-4">
                        <div className="bg-yellow-50 p-4 rounded-lg flex gap-3 items-start border border-yellow-200">
                            <Shield className="text-yellow-600 mt-1 flex-shrink-0" size={20} />
                            <p className="text-sm text-yellow-800">
                                Por segurança, contas administrativas só podem redefinir a senha através de um link enviado ao e-mail cadastrado.
                            </p>
                        </div>
                        <Input 
                            label="E-mail Administrativo" 
                            placeholder="admin@empresa.com" 
                            value={forgotEmail}
                            onChange={e => setForgotEmail(e.target.value)}
                        />
                        <Button fullWidth onClick={handleSendForgotEmail}>Enviar Link de Redefinição</Button>
                    </div>
                ) : (
                    <div className="text-center space-y-4 py-4">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 mb-2">
                            <CheckCircle size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">Link Enviado!</h3>
                        <p className="text-sm text-gray-500">
                            Verifique o e-mail <strong>{forgotEmail}</strong> para continuar o processo de alteração de senha.
                        </p>
                        
                        {/* SIMULATION FOR DEMO PURPOSES */}
                        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                            <p className="text-xs text-gray-400 uppercase font-bold mb-2 tracking-wider">Simulação (Demo)</p>
                            <button 
                                onClick={() => {
                                    setForgotModalOpen(false);
                                    navigate(`/reset-password?email=${encodeURIComponent(forgotEmail)}`);
                                }}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 flex items-center justify-center w-full gap-2"
                            >
                                Definir Nova Senha <ArrowRight size={16}/>
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

// --- Login Page (Standard) ---
const Login: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    // Forgot Password State
    const [isForgotModalOpen, setForgotModalOpen] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [isEmailSent, setIsEmailSent] = useState(false);

    // Security Mechanism States (Rate Limiting)
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [lockoutTime, setLockoutTime] = useState<number | null>(null);

    const checkLockout = () => {
        if (lockoutTime) {
            if (Date.now() < lockoutTime) {
                const remaining = Math.ceil((lockoutTime - Date.now()) / 60000);
                alert(`Muitas tentativas falhas. Por segurança, aguarde ${remaining} minutos para tentar novamente.`);
                return true; // Locked out
            } else {
                setLockoutTime(null); // Lockout expired
                setFailedAttempts(0); // Reset attempts
                return false;
            }
        }
        return false;
    };

    const handleLogin = () => {
        // 0. Check Security Lockout
        if (checkLockout()) return;

        // 1. Master Check - PREVENT MANUAL LOGIN
        if (email.toLowerCase() === 'crinf.informatica@gmail.com') {
            alert("Esta conta possui privilégios elevados. Por favor, utilize a área de 'Acesso Administrativo'.");
            navigate('/admin-login');
            return;
        }

        // 2. Find User in State (Users or Vendors)
        const foundUser = state.users.find(u => u.email === email) as any;
        
        if (foundUser) {
            // Check Ban (CPF/Document OR Email)
            if (state.bannedDocuments.includes(foundUser.cpf) || state.bannedDocuments.includes(foundUser.email)) {
                alert("Acesso negado: Esta conta foi banida permanentemente pelo administrador.");
                return;
            }

            // Check if Password Matches
            const storedPass = foundUser.password || '123'; 

            if (password === storedPass) {
                // FORCE PASSWORD RESET if password is '123456' (Admin Reset Default)
                if (password === '123456') {
                    alert("Sua senha foi redefinida pelo administrador. Por segurança, crie uma nova senha agora.");
                    navigate(`/reset-password?email=${encodeURIComponent(foundUser.email)}`);
                    return;
                }

                dispatch({ type: 'LOGIN', payload: foundUser });
                navigate('/');
            } else {
                handleFailedAttempt();
            }
        } else {
            // Fallback for demo user or invalid user
             if (email === 'maria@email.com' && password === '123') {
                  alert("Usuário não encontrado ou senha incorreta."); // Generic error
             } else {
                 handleFailedAttempt();
             }
        }
    };

    const handleFailedAttempt = () => {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        
        if (newAttempts >= 3) {
            // Lockout for 5 minutes after 3 failed attempts
            const lockoutDuration = 5 * 60 * 1000;
            setLockoutTime(Date.now() + lockoutDuration);
            alert("Muitas tentativas incorretas. O login foi bloqueado temporariamente por 5 minutos.");
        } else {
            alert(`Senha incorreta. Tentativa ${newAttempts} de 3.`);
        }
    };

    const handleSendForgotEmail = () => {
        if (!forgotEmail.includes('@')) {
            alert("Digite um e-mail válido.");
            return;
        }
        // Simulate sending
        setTimeout(() => {
            setIsEmailSent(true);
        }, 1000);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-sky-100 via-white to-sky-50 max-w-md mx-auto relative overflow-hidden">
            
            {/* Decorative BG Blob */}
            <div className="absolute top-[-100px] left-[-100px] w-64 h-64 bg-sky-200 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute bottom-[-100px] right-[-100px] w-64 h-64 bg-blue-200 rounded-full blur-3xl opacity-50"></div>

            <div className="w-24 h-24 bg-gradient-to-tr from-sky-400 to-primary rounded-3xl flex items-center justify-center mb-6 shadow-2xl transform rotate-3">
                <AppLogo />
            </div>
            <h1 className="text-3xl font-extrabold text-sky-900 mb-2 text-center tracking-tight">O Que Tem Perto?</h1>
            <p className="text-gray-500 mb-8 text-center font-medium">Acesse sua conta para continuar.</p>
            
            <div className="w-full space-y-4 bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-white shadow-xl">
                {lockoutTime && Date.now() < lockoutTime && (
                    <div className="bg-red-50 border border-red-200 p-3 rounded-xl flex items-center gap-2 text-red-700 text-sm font-bold mb-2 animate-pulse">
                        <Clock size={16} />
                        Login bloqueado temporariamente.
                    </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 ml-1 mb-1 block">E-mail ou Usuário</label>
                    <input 
                        className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" 
                        placeholder="ex: usuario@email.com" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 ml-1 mb-1 block">Senha</label>
                    <input 
                        className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" 
                        placeholder="••••••" 
                        type="password" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                    <div className="flex justify-end mt-2">
                        <button 
                            onClick={() => {
                                setForgotModalOpen(true);
                                setIsEmailSent(false);
                                setForgotEmail('');
                            }}
                            className="text-primary text-xs hover:text-sky-700 font-semibold transition-colors"
                        >
                            Esqueci minha senha
                        </button>
                    </div>
                  </div>
                  
                  <button onClick={handleLogin} className="w-full bg-primary text-white font-bold py-3.5 rounded-xl hover:bg-sky-600 transition shadow-lg shadow-sky-200 mt-2">
                    Entrar
                  </button>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-semibold uppercase">Ou acesse com</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                  </div>

                  <GoogleLoginButton text="Entrar com Google" />
                </div>
            </div>

            <div className="mt-8">
                <Link to="/admin-login" className="text-xs text-gray-400 hover:text-sky-600 flex items-center gap-1 transition-colors">
                     <Shield size={12} /> Acesso Administrativo
                </Link>
            </div>

            {/* Forgot Password Modal */}
            <Modal isOpen={isForgotModalOpen} onClose={() => setForgotModalOpen(false)} title="Recuperar Senha">
                {!isEmailSent ? (
                    <div className="space-y-4">
                        <div className="bg-sky-50 p-4 rounded-lg flex gap-3 items-start">
                            <Mail className="text-primary mt-1 flex-shrink-0" size={20} />
                            <p className="text-sm text-gray-600">
                                Digite seu e-mail abaixo. Enviaremos um link seguro para você redefinir sua senha.
                            </p>
                        </div>
                        <Input 
                            label="Seu E-mail Cadastrado" 
                            placeholder="exemplo@email.com" 
                            value={forgotEmail}
                            onChange={e => setForgotEmail(e.target.value)}
                        />
                        <Button fullWidth onClick={handleSendForgotEmail}>Enviar Link de Recuperação</Button>
                    </div>
                ) : (
                    <div className="text-center space-y-4 py-4">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 mb-2">
                            <CheckCircle size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">E-mail Enviado!</h3>
                        <p className="text-sm text-gray-500">
                            Verifique sua caixa de entrada (e spam) para encontrar as instruções.
                        </p>
                        
                        {/* SIMULATION ONLY: Fake Email Link */}
                        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                            <p className="text-xs text-gray-400 uppercase font-bold mb-2 tracking-wider">Simulação de E-mail</p>
                            <p className="text-sm text-gray-800 mb-3">Olá, clique abaixo para trocar sua senha:</p>
                            <button 
                                onClick={() => {
                                    setForgotModalOpen(false);
                                    navigate(`/reset-password?email=${encodeURIComponent(forgotEmail)}`);
                                }}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 flex items-center justify-center w-full gap-2"
                            >
                                Definir Nova Senha <ArrowRight size={16}/>
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

// --- Layout Wrapper ---
const Layout: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <div className="max-w-md mx-auto bg-gradient-to-br from-sky-100 via-white to-sky-50 min-h-screen relative shadow-2xl overflow-hidden flex flex-col">
            <div className="flex-1 w-full flex flex-col">
              {children}
              <Footer />
            </div>
            <BottomNav />
        </div>
    );
}

// --- Main App ---
export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Initial Data Load
  useEffect(() => {
    const loadData = async () => {
        if(state.vendors.length === 0) {
            const vendors = await generateMockVendors("Campo Largo, Paraná");
            if (vendors.length > 0) {
                // Initialize visibility settings for mock vendors
                const vendorsWithVisibility = vendors.map(v => ({
                    ...v,
                    visibility: { showPhone: true, showAddress: true, showWebsite: true }
                }));
                dispatch({ type: 'SET_VENDORS', payload: vendorsWithVisibility });
            }
        }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Geolocation Init
  useEffect(() => {
    const initLocation = async () => {
        try {
            const loc = await getUserLocation();
            dispatch({ type: 'SET_LOCATION', payload: loc });
        } catch (e) {
            console.log("GPS access denied or unavailable");
        }
    };
    initLocation();
  }, []);

  // Recalculate distances when user location or vendors change
  useEffect(() => {
    if (state.userLocation && state.vendors.length > 0) {
        let hasChanges = false;
        const updatedVendors = state.vendors.map(vendor => {
            if (vendor.latitude && vendor.longitude) {
                const dist = calculateDistance(
                    state.userLocation!.lat, 
                    state.userLocation!.lng, 
                    vendor.latitude, 
                    vendor.longitude
                );
                
                // Only update if distance significantly different to avoid loop
                if (!vendor.distance || Math.abs(vendor.distance - dist) > 0.01) {
                    hasChanges = true;
                    return { ...vendor, distance: dist };
                }
            }
            return vendor;
        });

        // Sort by distance (nearest first)
        updatedVendors.sort((a, b) => (a.distance || 999) - (b.distance || 999));

        if (hasChanges) {
             dispatch({ type: 'SET_VENDORS', payload: updatedVendors });
        }
    }
  }, [state.userLocation, state.vendors.length]); 

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <HashRouter>
        <Layout>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/vendor/:id" element={<VendorDetails />} />
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="/admin-login" element={<AdminLogin />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Layout>
      </HashRouter>
    </AppContext.Provider>
  );
}
