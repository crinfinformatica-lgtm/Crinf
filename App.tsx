
import React, { createContext, useContext, useReducer, useEffect, ReactNode, useState, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Home as HomeIcon, User, Settings, PlusCircle, Instagram, Shield, Lock, Mail, ArrowRight, CheckCircle, AlertTriangle, Clock, LogOut, ChevronRight, Bell, Moon, KeyRound, Share2, Copy, Edit3, Camera } from 'lucide-react';
import { AppState, Vendor, User as UserType, Location as LatLng, UserType as UserEnum } from './types';
import { getUserLocation, calculateDistance } from './services/geoService';
import { TwoFactorModal, Modal, Input, Button, AdminLogo, AppLogo } from './components/UI';
import { INITIAL_DB } from './database';

// --- Lazy Loading Pages (Code Splitting) ---
const HomePage = lazy(() => import('./pages/Home').then(module => ({ default: module.Home })));
const VendorDetails = lazy(() => import('./pages/VendorDetails').then(module => ({ default: module.VendorDetails })));
const Register = lazy(() => import('./pages/Register').then(module => ({ default: module.Register })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));

// --- Loading Component ---
const PageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-sky-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
    <p className="text-sky-600 font-semibold animate-pulse">Carregando...</p>
  </div>
);

// --- State Management ---
const loadStateFromStorage = (): AppState => {
  try {
    const saved = localStorage.getItem('cl_perto_db_v1');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load state", e);
  }
  // Fallback to Initial DB
  return {
    currentUser: null,
    users: INITIAL_DB.users || [],
    vendors: INITIAL_DB.vendors || [],
    bannedDocuments: INITIAL_DB.bannedDocuments || [],
    searchQuery: '',
    selectedCategory: null,
    userLocation: null
  };
};

const initialState: AppState = loadStateFromStorage();

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
  | { type: 'MASTER_RESET_PASSWORD'; payload: string } // Payload is User ID
  | { type: 'CHANGE_OWN_PASSWORD'; payload: { id: string; newPass: string } };

const reducer = (state: AppState, action: Action): AppState => {
  let newState = state;
  switch (action.type) {
    case 'SET_VENDORS':
      newState = { ...state, vendors: action.payload };
      break;
    case 'ADD_VENDOR':
      newState = { ...state, vendors: [action.payload, ...state.vendors] };
      break;
    case 'ADD_USER':
      newState = { ...state, users: [...state.users, action.payload] };
      break;
    case 'UPDATE_USER':
      // Update in list
      const updatedUsers = state.users.map(u => u.id === action.payload.id ? action.payload : u);
      // Update currentUser if it's the same person (to reflect changes immediately in UI)
      const updatedCurrentUser = state.currentUser && state.currentUser.id === action.payload.id 
          ? { ...state.currentUser, ...action.payload } 
          : state.currentUser;
          
      newState = { ...state, users: updatedUsers, currentUser: updatedCurrentUser };
      break;
    case 'UPDATE_VENDOR':
      newState = { ...state, vendors: state.vendors.map(v => v.id === action.payload.id ? { ...v, ...action.payload } : v) };
      break;
    case 'DELETE_USER':
      newState = { ...state, users: state.users.filter(u => u.id !== action.payload) };
      break;
    case 'DELETE_VENDOR':
      newState = { ...state, vendors: state.vendors.filter(v => v.id !== action.payload) };
      break;
    case 'BAN_DOCUMENT':
      newState = { 
        ...state, 
        bannedDocuments: [...state.bannedDocuments, action.payload],
        users: state.users.filter(u => u.cpf !== action.payload && u.email !== action.payload),
        vendors: state.vendors.filter(v => v.document !== action.payload)
      };
      break;
    case 'UNBAN_DOCUMENT':
      newState = { ...state, bannedDocuments: state.bannedDocuments.filter(d => d !== action.payload) };
      break;
    case 'LOGIN':
      newState = { ...state, currentUser: action.payload };
      break;
    case 'LOGOUT':
      newState = { ...state, currentUser: null };
      break;
    case 'SET_SEARCH':
      newState = { ...state, searchQuery: action.payload };
      break;
    case 'SET_CATEGORY':
      newState = { ...state, selectedCategory: action.payload };
      break;
    case 'SET_LOCATION':
      newState = { ...state, userLocation: action.payload };
      break;
    case 'ADD_REVIEW':
      newState = {
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
      break;
    case 'REPLY_REVIEW':
      newState = {
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
      break;
    case 'MASTER_RESET_PASSWORD':
      const defaultPass = '123456';
      newState = {
          ...state,
          users: state.users.map(u => u.id === action.payload ? { ...u, password: defaultPass } as any : u)
      };
      break;
    case 'CHANGE_OWN_PASSWORD':
      newState = {
          ...state,
          users: state.users.map(u => u.id === action.payload.id ? { ...u, password: action.payload.newPass } as any : u),
          currentUser: state.currentUser && state.currentUser.id === action.payload.id ? { ...state.currentUser, password: action.payload.newPass } : state.currentUser
      };
      break;
    default:
      return state;
  }
  return newState;
};

const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
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
  
  // Hide nav on specific pages
  if (['/register', '/login', '/admin', '/admin-login'].includes(location.pathname)) return null;

  const navClass = (path: string) => 
    `flex flex-col items-center p-2 text-xs font-medium transition-colors ${location.pathname === path ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 py-2 pb-safe px-6 flex justify-between items-center z-50 max-w-md mx-auto">
      <Link to="/" className={navClass('/')}>
        <HomeIcon size={24} className="mb-1" />
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
    
    // Change Password State
    const [isChangePassOpen, setChangePassOpen] = useState(false);
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');

    // Edit Profile State
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [editName, setEditName] = useState('');
    const [editAddress, setEditAddress] = useState('');
    const [editPhoto, setEditPhoto] = useState('');

    // Load user data into edit modal
    useEffect(() => {
        if (state.currentUser && isEditProfileOpen) {
            setEditName(state.currentUser.name);
            setEditAddress(state.currentUser.address);
            setEditPhoto(state.currentUser.photoUrl || '');
        }
    }, [isEditProfileOpen, state.currentUser]);

    const handleLogout = () => {
        if(confirm("Tem certeza que deseja sair?")) {
            dispatch({ type: 'LOGOUT' });
            navigate('/');
        }
    };

    const handleShareApp = async () => {
        const shareData = {
            title: 'O Que Tem Perto?',
            text: 'Descubra os melhores comércios e serviços de Campo Largo no app O Que Tem Perto!',
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
    
    const handleChangePassword = () => {
        if (!state.currentUser) return;
        if (newPass.length < 4) {
            alert("A senha deve ter pelo menos 4 caracteres.");
            return;
        }
        if (newPass !== confirmPass) {
            alert("As senhas não conferem.");
            return;
        }
        
        dispatch({ 
            type: 'CHANGE_OWN_PASSWORD', 
            payload: { id: state.currentUser.id, newPass } 
        });
        
        alert("Senha alterada com sucesso!");
        setChangePassOpen(false);
        setNewPass('');
        setConfirmPass('');
    };

    const handleSaveProfile = () => {
        if (!state.currentUser) return;
        
        const updatedUser = {
            ...state.currentUser,
            name: editName,
            address: editAddress,
            photoUrl: editPhoto
        };
        
        dispatch({ type: 'UPDATE_USER', payload: updatedUser });
        alert("Perfil atualizado com sucesso!");
        setIsEditProfileOpen(false);
    };

    const isAdminOrMaster = state.currentUser?.type === UserEnum.ADMIN || state.currentUser?.type === UserEnum.MASTER;

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-sky-50 pb-24">
             <div className="bg-white p-6 pb-8 shadow-sm rounded-b-[2rem] mb-6">
                 <h1 className="text-2xl font-bold text-sky-900 mb-6">Ajustes</h1>
                 
                 {state.currentUser ? (
                     <div className="flex items-center gap-4">
                         <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center border-4 border-white shadow-md overflow-hidden relative group">
                             {state.currentUser.photoUrl ? (
                                 <img src={state.currentUser.photoUrl} alt="Perfil" className="w-full h-full object-cover" />
                             ) : (
                                 <User size={32} className="text-sky-500" />
                             )}
                         </div>
                         <div className="flex-1">
                             <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-800">{state.currentUser.name}</h2>
                                    <p className="text-sm text-gray-500">{state.currentUser.email}</p>
                                    <span className="text-[10px] bg-sky-50 text-sky-600 px-2 py-0.5 rounded-full border border-sky-100 font-semibold uppercase mt-1 inline-block">
                                        {state.currentUser.type === UserEnum.MASTER ? 'Conta Master' : 
                                        state.currentUser.type === UserEnum.ADMIN ? 'Administrador' : 
                                        state.currentUser.type === UserEnum.VENDOR ? 'Conta Comercial' : 'Cliente'}
                                    </span>
                                </div>
                                <button 
                                    onClick={() => setIsEditProfileOpen(true)}
                                    className="p-2 text-sky-600 bg-sky-50 rounded-full hover:bg-sky-100"
                                >
                                    <Edit3 size={18} />
                                </button>
                             </div>
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
                
                {/* User Settings - Change Password */}
                {state.currentUser && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div 
                            onClick={() => setChangePassOpen(true)}
                            className="p-4 border-b border-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                        >
                            <div className="flex items-center gap-3">
                                <Lock size={20} className="text-gray-400" />
                                <span className="text-gray-700 font-medium">Alterar Senha</span>
                            </div>
                            <ChevronRight size={16} className="text-gray-300" />
                        </div>
                    </div>
                )}

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
                    
                    <div 
                        onClick={handleShareApp}
                        className="p-4 border-b border-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                    >
                        <div className="flex items-center gap-3">
                            <Share2 size={20} className="text-gray-400" />
                            <span className="text-gray-700 font-medium">Compartilhar App</span>
                        </div>
                        <ChevronRight size={16} className="text-gray-300" />
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
                    <p className="text-xs text-gray-400">Versão do App: 1.7.0 (PWA)</p>
                </div>
             </div>
             
             {/* Change Password Modal */}
             <Modal isOpen={isChangePassOpen} onClose={() => setChangePassOpen(false)} title="Alterar Senha">
                 <div className="space-y-4">
                     <p className="text-sm text-gray-600 mb-2">Defina sua nova senha de acesso.</p>
                     <Input label="Nova Senha" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} />
                     <Input label="Confirmar Senha" type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />
                     <Button fullWidth onClick={handleChangePassword}>Salvar Nova Senha</Button>
                 </div>
             </Modal>

             {/* Edit Profile Modal */}
             <Modal isOpen={isEditProfileOpen} onClose={() => setIsEditProfileOpen(false)} title="Editar Meus Dados">
                 <div className="space-y-4">
                     <Input label="Nome Completo" value={editName} onChange={e => setEditName(e.target.value)} />
                     <Input label="Endereço" value={editAddress} onChange={e => setEditAddress(e.target.value)} />
                     
                     <div className="mb-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">URL da Foto</label>
                        <div className="flex gap-2">
                            <input 
                                className="flex-1 w-full px-4 py-2 border border-gray-200 rounded-lg outline-none"
                                value={editPhoto}
                                onChange={e => setEditPhoto(e.target.value)}
                                placeholder="https://..."
                            />
                            {editPhoto && <img src={editPhoto} className="w-10 h-10 rounded object-cover border" alt="Prev" />}
                        </div>
                     </div>
                     <p className="text-xs text-gray-500 mb-4">* Para alterar e-mail ou documento, entre em contato com o suporte.</p>
                     
                     <Button fullWidth onClick={handleSaveProfile}>Salvar Alterações</Button>
                 </div>
             </Modal>
        </div>
    );
};

// --- Dedicated Admin Login (Manual Only) ---
const AdminLogin: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Check DB first for Master User (allows custom password)
        const dbMaster = state.users.find(u => u.email === 'crinf.informatica@gmail.com');
        
        if (dbMaster) {
            if (dbMaster.password === password) {
                dispatch({ type: 'LOGIN', payload: dbMaster });
                navigate('/admin');
                return;
            }
        } 
        
        // 2. Fallback check for Master default credentials (if not in DB or password mismatch handled above but double check for safety)
        if (email === 'crinf.informatica@gmail.com' && password === 'Crinf!2025#') {
             const masterUser: UserType = {
                id: 'master_crinf',
                name: 'Administrador Crinf',
                email: 'crinf.informatica@gmail.com',
                cpf: '000.000.000-00',
                address: 'Sede Administrativa',
                type: UserEnum.MASTER,
                photoUrl: undefined,
                password: 'Crinf!2025#'
            };
            // If logging in via hardcode, sync to DB so future edits work
            dispatch({ type: 'ADD_USER', payload: masterUser });
            dispatch({ type: 'LOGIN', payload: masterUser });
            navigate('/admin');
            return;
        }

        // 3. OTHER ADMINS CHECK
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

    const handleSendForgotEmail = async () => {
        const serviceID = 'service_dtvvjp8';
        const templateID = 'template_8cthxoh';
        const publicKey = 'NJZigwymrvB_gdLNP'; // YOUR_PUBLIC_KEY

        const templateParams = {
            to_email: 'crinf.informatica@gmail.com',
            to_name: 'Master Crinf',
            message: 'Você solicitou a redefinição de senha do painel administrativo. Acesse o painel para definir uma nova senha se possível ou contate o suporte técnico.'
        };

        try {
            // @ts-ignore
            await window.emailjs.send(serviceID, templateID, templateParams, publicKey);
            alert("Um link de recuperação foi enviado para o seu e-mail (crinf.informatica@gmail.com). Verifique sua caixa de entrada.");
        } catch (error) {
            console.error('FAILED...', error);
            alert("Erro ao enviar e-mail. Verifique o console ou a configuração do EmailJS.");
        }
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
                        
                        <button type="submit" className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-sky-900 mt-2">
                            Acessar Painel
                        </button>
                    </form>
                    
                    <button 
                        onClick={handleSendForgotEmail}
                        className="w-full mt-4 text-xs text-slate-500 hover:text-sky-400 underline transition-colors"
                    >
                        Esqueci a senha
                    </button>

                    <div className="mt-8 text-center border-t border-slate-700 pt-6">
                        <button 
                            onClick={() => navigate('/login')}
                            className="text-slate-500 hover:text-sky-400 text-xs font-medium transition-colors flex items-center justify-center gap-1 mx-auto"
                        >
                            <ArrowRight size={12} className="rotate-180" /> Voltar para Login Comum
                        </button>
                    </div>
                </div>
             </div>
        </div>
    );
};

// --- Login Page (Standard) ---
const Login: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [lockoutTime, setLockoutTime] = useState<number | null>(null);

    const checkLockout = () => {
        if (lockoutTime) {
            if (Date.now() < lockoutTime) {
                const remaining = Math.ceil((lockoutTime - Date.now()) / 60000);
                alert(`Muitas tentativas falhas. Por segurança, aguarde ${remaining} minutos para tentar novamente.`);
                return true; 
            } else {
                setLockoutTime(null);
                setFailedAttempts(0);
                return false;
            }
        }
        return false;
    };

    const handleLogin = () => {
        if (checkLockout()) return;

        if (email.toLowerCase() === 'crinf.informatica@gmail.com') {
            alert("Esta conta possui privilégios elevados. Por favor, utilize a área de 'Acesso Administrativo'.");
            navigate('/admin-login');
            return;
        }

        const foundUser = state.users.find(u => u.email === email) as any;
        
        if (foundUser) {
            if (state.bannedDocuments.includes(foundUser.cpf) || state.bannedDocuments.includes(foundUser.email)) {
                alert("Acesso negado: Esta conta foi banida permanentemente pelo administrador.");
                return;
            }

            const storedPass = foundUser.password || '123'; 

            if (password === storedPass) {
                if (password === '123456') {
                    alert("Sua senha foi redefinida pelo administrador para '123456'. Recomendamos alterá-la em Ajustes.");
                }
                dispatch({ type: 'LOGIN', payload: foundUser });
                navigate('/');
            } else {
                handleFailedAttempt();
            }
        } else {
             handleFailedAttempt();
        }
    };

    const handleFailedAttempt = () => {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        if (newAttempts >= 3) {
            const lockoutDuration = 5 * 60 * 1000;
            setLockoutTime(Date.now() + lockoutDuration);
            alert("Muitas tentativas incorretas. O login foi bloqueado temporariamente por 5 minutos.");
        } else {
            alert(`Senha incorreta ou Usuário não encontrado. Tentativa ${newAttempts} de 3.`);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-sky-100 via-white to-sky-50 max-w-md mx-auto relative overflow-hidden">
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
                    <input className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary transition-all" placeholder="ex: usuario@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 ml-1 mb-1 block">Senha</label>
                    <input className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary transition-all" placeholder="••••••" type="password" value={password} onChange={e => setPassword(e.target.value)} />
                  </div>
                  
                  <button onClick={handleLogin} className="w-full bg-primary text-white font-bold py-3.5 rounded-xl hover:bg-sky-600 transition shadow-lg shadow-sky-200 mt-2">
                    Entrar
                  </button>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                       <p className="text-sm text-gray-600 mb-2">Não tem uma conta?</p>
                       <Link to="/register" className="text-primary font-bold hover:underline">
                           Criar nova conta
                       </Link>
                  </div>
                </div>
            </div>

            <div className="mt-8">
                <Link to="/admin-login" className="text-xs text-gray-400 hover:text-sky-600 flex items-center gap-1 transition-colors">
                     <Shield size={12} /> Acesso Administrativo
                </Link>
            </div>
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

  // Persistence: Save state to LocalStorage whenever it changes
  useEffect(() => {
    const stateToSave = {
        ...state,
        currentUser: null, // Don't persist logged user for security (or optional)
        searchQuery: '',
        userLocation: null
    };
    localStorage.setItem('cl_perto_db_v1', JSON.stringify(stateToSave));
  }, [state]);

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

  // Recalculate distances
  useEffect(() => {
    if (state.userLocation && state.vendors.length > 0) {
        let hasChanges = false;
        const updatedVendors = state.vendors.map(vendor => {
            if (vendor.latitude && vendor.longitude) {
                const dist = calculateDistance(state.userLocation!.lat, state.userLocation!.lng, vendor.latitude, vendor.longitude);
                if (!vendor.distance || Math.abs(vendor.distance - dist) > 0.01) {
                    hasChanges = true;
                    return { ...vendor, distance: dist };
                }
            }
            return vendor;
        });
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
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/vendor/:id" element={<VendorDetails />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/admin-login" element={<AdminLogin />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
        </Layout>
      </HashRouter>
    </AppContext.Provider>
  );
}
