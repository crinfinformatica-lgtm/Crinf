
import React, { createContext, useContext, useReducer, useEffect, ReactNode, useState, Suspense, lazy, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Home as HomeIcon, User, Settings, PlusCircle, Instagram, Shield, Lock, Mail, ArrowRight, CheckCircle, AlertTriangle, Clock, LogOut, ChevronRight, Bell, Moon, KeyRound, Share2, Copy, Edit3, Camera, Upload, X, MapPin } from 'lucide-react';
import { AppState, Vendor, User as UserType, Location as LatLng, UserType as UserEnum, CATEGORIES, SecurityLog } from './types';
import { getUserLocation, calculateDistance } from './services/geoService';
import { TwoFactorModal, Modal, Input, Button, AdminLogo, AppLogo, ImageCropper } from './components/UI';
import { subscribeToUsers, subscribeToVendors, subscribeToBanned, saveUserToFirebase, saveVendorToFirebase, deleteUserFromFirebase, deleteVendorFromFirebase, banItemInFirebase, unbanItemInFirebase, seedInitialData } from './services/firebaseService';

// --- CONSTANTS ---
const CURRENT_DB_VERSION = '2.0'; 

// --- Lazy Loading Pages ---
const HomePage = lazy(() => import('./pages/Home').then(module => ({ default: module.Home })));
const VendorDetails = lazy(() => import('./pages/VendorDetails').then(module => ({ default: module.VendorDetails })));
const Register = lazy(() => import('./pages/Register').then(module => ({ default: module.Register })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));

// --- Loading Component ---
const PageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-sky-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
    <p className="text-sky-600 font-semibold animate-pulse">Conectando ao Firebase...</p>
  </div>
);

// --- State Management ---
// Initial state is mostly empty now, populated by Firebase
const initialState: AppState = {
    version: CURRENT_DB_VERSION,
    currentUser: null,
    users: [],
    vendors: [],
    bannedDocuments: [],
    searchQuery: '',
    selectedCategory: null,
    userLocation: null,
    securityLogs: []
};

type Action = 
  | { type: 'SET_VENDORS'; payload: Vendor[] }
  | { type: 'SET_USERS'; payload: UserType[] }
  | { type: 'SET_BANNED'; payload: string[] }
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
  | { type: 'MASTER_RESET_PASSWORD'; payload: string } 
  | { type: 'CHANGE_OWN_PASSWORD'; payload: { id: string; newPass: string } }
  | { type: 'ADD_SECURITY_LOG'; payload: Omit<SecurityLog, 'id' | 'timestamp'> }
  | { type: 'CLEAR_SECURITY_LOGS' }
  | { type: 'FACTORY_RESET' };

const reducer = (state: AppState, action: Action): AppState => {
  let newState = state;
  switch (action.type) {
    case 'SET_USERS':
      newState = { ...state, users: action.payload };
      break;
    case 'SET_VENDORS':
      newState = { ...state, vendors: action.payload };
      break;
    case 'SET_BANNED':
      newState = { ...state, bannedDocuments: action.payload };
      break;
    // For ADD/UPDATE/DELETE actions, we now trigger Firebase saves, 
    // but we can optimistically update state or wait for the listener to fire.
    // For simplicity, we'll let the listener update the lists, but we handle side effects in the component.
    case 'ADD_VENDOR':
      // Optimistic or Firebase Trigger
      saveVendorToFirebase(action.payload);
      // State will update via listener
      break;
    case 'ADD_USER':
      saveUserToFirebase(action.payload);
      break;
    case 'UPDATE_USER':
      saveUserToFirebase(action.payload);
      if (state.currentUser && state.currentUser.id === action.payload.id) {
          newState = { ...state, currentUser: action.payload };
      }
      break;
    case 'UPDATE_VENDOR':
      saveVendorToFirebase(action.payload);
      break;
    case 'DELETE_USER':
      deleteUserFromFirebase(action.payload);
      break;
    case 'DELETE_VENDOR':
      deleteVendorFromFirebase(action.payload);
      break;
    case 'BAN_DOCUMENT':
      banItemInFirebase(action.payload);
      break;
    case 'UNBAN_DOCUMENT':
      unbanItemInFirebase(action.payload);
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
      const vendorToReview = state.vendors.find(v => v.id === action.payload.vendorId);
      if (vendorToReview) {
          const newReviews = [action.payload.review, ...vendorToReview.reviews];
          const newCount = newReviews.length;
          const newRating = newReviews.reduce((acc: any, r: any) => acc + r.rating, 0) / newCount;
          const updatedV = { ...vendorToReview, reviews: newReviews, reviewCount: newCount, rating: newRating };
          saveVendorToFirebase(updatedV);
      }
      break;
    case 'REPLY_REVIEW':
       const vendorToReply = state.vendors.find(v => v.id === action.payload.vendorId);
       if(vendorToReply) {
          const updatedReviews = vendorToReply.reviews.map(r => {
                if (r.id === action.payload.reviewId) {
                    return { ...r, reply: action.payload.replyText, replyDate: new Date().toLocaleDateString() };
                }
                return r;
            });
          saveVendorToFirebase({ ...vendorToReply, reviews: updatedReviews });
       }
      break;
    case 'MASTER_RESET_PASSWORD':
       const u = state.users.find(u => u.id === action.payload);
       if(u) saveUserToFirebase({...u, password: '123456'});
       break;
    case 'CHANGE_OWN_PASSWORD':
       const u2 = state.users.find(u => u.id === action.payload.id);
       if(u2) saveUserToFirebase({...u2, password: action.payload.newPass});
       if (state.currentUser && state.currentUser.id === action.payload.id) {
           newState = { ...state, currentUser: { ...state.currentUser, password: action.payload.newPass } };
       }
       break;
    case 'ADD_SECURITY_LOG':
       // Security logs typically go to a separate collection, simplified here
       newState = { ...state, securityLogs: [action.payload as any, ...state.securityLogs] };
       break;
    case 'CLEAR_SECURITY_LOGS':
       newState = { ...state, securityLogs: [] };
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
    const [editPhoto, setEditPhoto] = useState('');
    
    // Cropper State
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    
    // Separated Address Edit
    const [editStreet, setEditStreet] = useState('');
    const [editNumber, setEditNumber] = useState('');
    const [editNeighborhood, setEditNeighborhood] = useState('');

    // Vendor Specific Edit
    const [editPhone, setEditPhone] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editCategory, setEditCategory] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load user data into edit modal
    useEffect(() => {
        if (state.currentUser && isEditProfileOpen) {
            setEditName(state.currentUser.name);
            setEditPhoto(state.currentUser.photoUrl || '');
            
            // Try to parse existing address string back to fields
            const fullAddress = state.currentUser.address || '';
            const parts = fullAddress.split(',');
            if (parts.length >= 2) {
                setEditStreet(parts[0].trim());
                // Handle Number and Neighborhood
                const rest = parts.slice(1).join(',');
                const dashParts = rest.split('-');
                if (dashParts.length >= 1) {
                    setEditNumber(dashParts[0].trim());
                }
                if (dashParts.length >= 2) {
                    setEditNeighborhood(dashParts[1].trim());
                }
            } else {
                setEditStreet(fullAddress);
            }

            // Load Vendor specific data if available
            if (state.currentUser.type === UserEnum.VENDOR) {
                const vendorData = state.vendors.find(v => v.id === state.currentUser?.id);
                if (vendorData) {
                    setEditPhone(vendorData.phone);
                    setEditDescription(vendorData.description);
                    setEditCategory(vendorData.categories[0] || '');
                }
            }
        }
    }, [isEditProfileOpen, state.currentUser, state.vendors]);

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

    const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageToCrop(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const handleCropComplete = (croppedBase64: string) => {
        setEditPhoto(croppedBase64);
        setImageToCrop(null);
    };

    const handleSaveProfile = () => {
        if (!state.currentUser) return;
        
        const fullAddress = `${editStreet}, ${editNumber} - ${editNeighborhood} - Campo Largo/PR`;

        const updatedUser: any = {
            ...state.currentUser,
            name: editName,
            address: fullAddress,
            photoUrl: editPhoto,
        };

        if (state.currentUser.type === UserEnum.VENDOR) {
            updatedUser.phone = editPhone;
            updatedUser.description = editDescription;
            updatedUser.categories = [editCategory];
        }
        
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
                                    className="p-2 text-sky-600 bg-sky-50 rounded-full hover:bg-sky-100 shadow-sm"
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
                    <p className="text-xs text-gray-400">Versão do App: {CURRENT_DB_VERSION} (PWA)</p>
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
                 <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                     <Input label="Nome" value={editName} onChange={e => setEditName(e.target.value)} />
                     
                     <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Endereço</label>
                        <Input label="Rua / Logradouro" value={editStreet} onChange={e => setEditStreet(e.target.value)} className="bg-white" />
                        <div className="grid grid-cols-2 gap-2">
                             <Input label="Número" value={editNumber} onChange={e => setEditNumber(e.target.value)} className="bg-white" />
                             <Input label="Bairro" value={editNeighborhood} onChange={e => setEditNeighborhood(e.target.value)} className="bg-white" />
                        </div>
                     </div>

                     {state.currentUser?.type === UserEnum.VENDOR && (
                         <>
                            <Input label="Telefone / WhatsApp" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                            <div className="mb-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                                <select 
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white outline-none"
                                    value={editCategory}
                                    onChange={(e) => setEditCategory(e.target.value)}
                                >
                                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            <Input label="Descrição" multiline value={editDescription} onChange={e => setEditDescription(e.target.value)} />
                         </>
                     )}
                     
                     <div className="mb-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Alterar Foto</label>
                        <div className="flex gap-2 items-center">
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0">
                                {editPhoto ? (
                                    <img src={editPhoto} className="w-full h-full object-cover" alt="Prev" />
                                ) : (
                                    <User className="w-full h-full p-4 text-gray-300" />
                                )}
                            </div>
                            <div className="flex-1">
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center justify-center gap-2"
                                >
                                    <Upload size={16} /> Carregar e Ajustar
                                </button>
                                <input 
                                    ref={fileInputRef} 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={handlePhotoFileChange}
                                />
                            </div>
                        </div>
                     </div>
                     
                     <Button fullWidth onClick={handleSaveProfile}>Salvar Alterações</Button>
                 </div>
             </Modal>

             {/* Image Cropper Overlay */}
             {imageToCrop && (
                 <ImageCropper 
                    imageSrc={imageToCrop}
                    onCropComplete={handleCropComplete}
                    onCancel={() => setImageToCrop(null)}
                 />
             )}
        </div>
    );
};

// --- Dedicated Admin Login (Manual Only) ---
const AdminLogin: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [lockedUntil, setLockedUntil] = useState<number | null>(null);
    
    // Check security logs for brute force protection
    useEffect(() => {
        const checkSecurity = () => {
            if (!state.securityLogs) return;
            const recentFailures = state.securityLogs.filter(log => 
                log.action === 'LOGIN_FAIL' && 
                log.timestamp > Date.now() - 15 * 60 * 1000 // Last 15 min
            );
            if (recentFailures.length >= 5) {
                // Determine remaining time
                const lastFail = recentFailures[0].timestamp;
                setLockedUntil(lastFail + 15 * 60 * 1000);
            }
        };
        checkSecurity();
    }, [state.securityLogs]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();

        // BRUTE FORCE CHECK
        if (lockedUntil) {
            if (Date.now() < lockedUntil) {
                const remaining = Math.ceil((lockedUntil - Date.now()) / 60000);
                alert(`Sistema Bloqueado por Segurança. Tente novamente em ${remaining} minutos.`);
                return;
            } else {
                setLockedUntil(null); // Reset
            }
        }

        // 1. Check DB first for Master User
        const dbMaster = state.users.find(u => u.email === 'crinf.informatica@gmail.com');
        
        let success = false;
        let loggedUser: UserType | null = null;

        if (dbMaster) {
            if (dbMaster.password === password) {
                success = true;
                loggedUser = dbMaster;
            }
        } else if (email === 'crinf.informatica@gmail.com' && password === 'Crinf!2025#') {
             // Fallback
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
            dispatch({ type: 'ADD_USER', payload: masterUser });
            success = true;
            loggedUser = masterUser;
        } else {
            // Check other admins
            const foundUser = state.users.find(u => u.email === email && u.type === UserEnum.ADMIN);
            if (foundUser && foundUser.password === password) {
                success = true;
                loggedUser = foundUser;
            }
        }

        if (success && loggedUser) {
            dispatch({ type: 'LOGIN', payload: loggedUser });
            dispatch({ 
                type: 'ADD_SECURITY_LOG', 
                payload: { action: 'LOGIN_SUCCESS', details: `Acesso realizado por ${loggedUser.email}` } 
            });
            navigate('/admin');
        } else {
            dispatch({ 
                type: 'ADD_SECURITY_LOG', 
                payload: { action: 'LOGIN_FAIL', details: `Falha de login para o e-mail: ${email}` } 
            });
            alert("Senha incorreta ou acesso não autorizado.");
        }
    };

    const handleSendForgotEmail = async () => {
        const serviceID = 'service_dtvvjp8';
        const templateID = 'template_8cthxoh';
        const publicKey = 'NJZigwymrvB_gdLNP'; // YOUR_PUBLIC_KEY

        const templateParams = {
            to_email: 'crinf.informatica@gmail.com',
            to_name: 'Master Crinf',
            subject: 'Recuperação de Acesso',
            message: `Você solicitou a redefinição de senha. 
            
            Para redefinir sua senha, acesse o link abaixo:
            ${window.location.href.split('#')[0]}#/settings`
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

                    {lockedUntil && Date.now() < lockedUntil && (
                        <div className="bg-red-900/50 border border-red-500 p-3 rounded-lg mb-4 flex items-center gap-2">
                             <Shield size={20} className="text-red-400" />
                             <p className="text-xs text-red-200">
                                 <strong>Proteção Ativa:</strong> Acesso bloqueado temporariamente devido a múltiplas tentativas falhas.
                             </p>
                        </div>
                    )}

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
                        
                        <button 
                            type="submit" 
                            disabled={!!(lockedUntil && Date.now() < lockedUntil)}
                            className={`w-full font-bold py-3.5 rounded-xl transition shadow-lg shadow-sky-900 mt-2 ${lockedUntil && Date.now() < lockedUntil ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-500 text-white'}`}
                        >
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

    const handleSendForgotEmail = async () => {
        const serviceID = 'service_dtvvjp8';
        const templateID = 'template_8cthxoh';
        const publicKey = 'NJZigwymrvB_gdLNP'; // YOUR_PUBLIC_KEY

        const templateParams = {
            to_email: email,
            to_name: 'Usuário',
            subject: 'Recuperação de Acesso',
            message: `Solicitação de recuperação de acesso. 
            
            Se você solicitou a troca de senha, clique no link abaixo para acessar sua conta e realizar a alteração em Ajustes:
            ${window.location.href.split('#')[0]}#/settings`
        };

        try {
            // @ts-ignore
            await window.emailjs.send(serviceID, templateID, templateParams, publicKey);
            alert("Um link de recuperação foi enviado para o seu e-mail. Verifique sua caixa de entrada.");
        } catch (error) {
            console.error('FAILED...', error);
            alert("Erro ao enviar e-mail. Verifique se o e-mail está correto.");
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

  // --- FIREBASE SYNC: REPLACE LOCALSTORAGE WITH REALTIME LISTENERS ---
  
  // 1. Initialize Seed Data (If Empty)
  useEffect(() => {
     seedInitialData();
  }, []);

  // 2. Listen for Users
  useEffect(() => {
      const unsubscribe = subscribeToUsers((users) => {
          dispatch({ type: 'SET_USERS', payload: users });
      });
      return () => unsubscribe();
  }, []);

  // 3. Listen for Vendors
  useEffect(() => {
      const unsubscribe = subscribeToVendors((vendors) => {
          dispatch({ type: 'SET_VENDORS', payload: vendors });
      });
      return () => unsubscribe();
  }, []);

  // 4. Listen for Banned List
  useEffect(() => {
      const unsubscribe = subscribeToBanned((list) => {
          dispatch({ type: 'SET_BANNED', payload: list });
      });
      return () => unsubscribe();
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
        // We do NOT dispatch SET_VENDORS here to avoid infinite loops with Firebase listener
        // In a real app, distance is a UI computed property, not stored in DB
        // For this hybrid approach, we accept that distance sorting happens in the Home view
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
