
import React, { createContext, useContext, useReducer, useEffect, ReactNode, useState, Suspense, lazy, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Home as HomeIcon, User, Settings, PlusCircle, Instagram, Shield, Lock, Mail, ArrowRight, CheckCircle, AlertTriangle, Clock, LogOut, ChevronRight, Bell, Moon, KeyRound, Share2, Copy, Edit3, Camera, Upload, X, MapPin, Heart, Check, FileText } from 'lucide-react';
import { AppState, Vendor, User as UserType, Location as LatLng, UserType as UserEnum, CATEGORIES, SecurityLog, AppConfig } from './types';
import { getUserLocation, calculateDistance } from './services/geoService';
import { TwoFactorModal, Modal, Input, Button, AdminLogo, AppLogo, ImageCropper, GoogleLoginButton } from './components/UI';
import { subscribeToVendors, subscribeToBanned, subscribeToAppConfig, saveUserToFirebase, saveVendorToFirebase, deleteUserFromFirebase, deleteVendorFromFirebase, banItemInFirebase, unbanItemInFirebase, seedInitialData, recordFailedLogin, successfulLogin, unlockUserAccount, getUserByEmail } from './services/firebaseService';
import { APP_CONFIG } from './config';

// --- CONSTANTS ---
const CURRENT_DB_VERSION = APP_CONFIG.VERSION; 

// --- Lazy Loading Pages ---
const HomePage = lazy(() => import('./pages/Home').then(module => ({ default: module.Home })));
const VendorDetails = lazy(() => import('./pages/VendorDetails').then(module => ({ default: module.VendorDetails })));
const Register = lazy(() => import('./pages/Register').then(module => ({ default: module.Register })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy').then(module => ({ default: module.PrivacyPolicy })));

// --- Loading Component ---
const PageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-sky-50 dark:bg-slate-900">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
    <p className="text-sky-600 dark:text-sky-400 font-semibold animate-pulse">Conectando ao Firebase...</p>
  </div>
);

// --- State Management ---
const initialState: AppState = {
    version: CURRENT_DB_VERSION,
    currentUser: null,
    users: [], 
    vendors: [],
    bannedDocuments: [],
    searchQuery: '',
    selectedCategory: null,
    userLocation: null,
    securityLogs: [],
    darkMode: localStorage.getItem('theme') === 'dark',
    appConfig: {
        appName: "O QUE TEM PERTO?",
        logoUrl: null, // Default
        logoWidth: 300,
        primaryColor: "#0ea5e9", // Sky 500
        secondaryColor: "#facc15" // Yellow 400
    }
};

type Action = 
  | { type: 'SET_VENDORS'; payload: Vendor[] }
  | { type: 'SET_USERS'; payload: UserType[] }
  | { type: 'SET_BANNED'; payload: string[] }
  | { type: 'SET_APP_CONFIG'; payload: AppConfig }
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
  | { type: 'UNLOCK_USER'; payload: string }
  | { type: 'FACTORY_RESET' }
  | { type: 'TOGGLE_THEME' };

const reducer = (state: AppState, action: Action): AppState => {
  let newState = state;
  switch (action.type) {
    case 'TOGGLE_THEME':
      const newMode = !state.darkMode;
      localStorage.setItem('theme', newMode ? 'dark' : 'light');
      newState = { ...state, darkMode: newMode };
      break;
    case 'SET_APP_CONFIG':
      newState = { ...state, appConfig: action.payload };
      break;
    case 'SET_USERS':
      newState = { ...state, users: action.payload };
      break;
    case 'SET_VENDORS':
      newState = { ...state, vendors: action.payload };
      break;
    case 'SET_BANNED':
      newState = { ...state, bannedDocuments: action.payload };
      break;
    case 'ADD_VENDOR':
      saveVendorToFirebase(action.payload);
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
    case 'UNLOCK_USER':
       unlockUserAccount(action.payload);
       break;
    case 'ADD_SECURITY_LOG':
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
      <div className="flex justify-center gap-4 mt-2">
          <a 
            href="https://instagram.com/crinfinformatica" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300 text-[11px] font-semibold transition-colors"
          >
            <Instagram size={12} />
            @crinfinformatica
          </a>
          <Link to="/privacy" className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-[11px] font-medium transition-colors">
              <FileText size={12} /> Política de Privacidade
          </Link>
      </div>
    </div>
  );
};

// --- Mobile Navigation ---
const BottomNav = () => {
  const location = useLocation();
  const { state } = useAppContext();
  
  if (['/register', '/login', '/admin-login', '/reset-password', '/privacy'].includes(location.pathname)) return null;

  const navClass = (path: string) => 
    `flex flex-col items-center p-2 text-xs font-medium transition-colors ${location.pathname === path ? 'text-primary' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'}`;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-gray-200 dark:border-slate-800 py-2 pb-safe px-6 flex justify-between items-center z-50 max-w-md mx-auto">
      <Link to="/" className={navClass('/')}>
        <HomeIcon size={24} className="mb-1" />
        Início
      </Link>
      
      {!state.currentUser ? (
        <Link to="/register" className="flex flex-col items-center -mt-6">
            <div className="bg-accent text-sky-900 p-3 rounded-full shadow-lg border-2 border-white dark:border-slate-900 hover:scale-105 transition-transform">
                <PlusCircle size={28} />
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">Cadastrar</span>
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

// --- Reset Password Page ---
const ResetPasswordPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const { state, dispatch } = useAppContext();
    const navigate = useNavigate();
    const [pass, setPass] = useState('');
    const [confirm, setConfirm] = useState('');
    
    // Get ID from URL
    const userId = searchParams.get('id');

    const handleSubmit = () => {
        if (!pass || !confirm) {
            alert("Preencha todos os campos.");
            return;
        }
        if (pass !== confirm) {
            alert("As senhas não conferem.");
            return;
        }
        if (!userId) {
            alert("Link inválido. Solicite novamente.");
            return;
        }

        dispatch({
            type: 'CHANGE_OWN_PASSWORD',
            payload: { id: userId, newPass: pass }
        });

        alert("Senha redefinida com sucesso! Faça login.");
        navigate('/login');
    };

    if (!userId) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-sky-50 dark:bg-slate-900">
                <p className="text-gray-600 dark:text-gray-400">Link de redefinição inválido ou expirado.</p>
                <Button onClick={() => navigate('/login')} className="mt-4">Voltar</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-sky-100 via-white to-sky-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            <div className="w-full max-w-md bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700">
                <h1 className="text-xl font-bold text-sky-900 dark:text-sky-400 mb-4 text-center">Criar Nova Senha</h1>
                <Input label="Nova Senha" type="password" value={pass} onChange={e => setPass(e.target.value)} />
                <Input label="Confirmar Nova Senha" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} />
                <Button fullWidth onClick={handleSubmit} className="mt-2">Salvar Senha</Button>
                <button onClick={() => navigate('/login')} className="w-full text-center mt-4 text-sm text-gray-500 hover:text-primary dark:text-gray-400">Cancelar</button>
            </div>
        </div>
    );
};

// --- Settings Page ---
const SettingsPage = lazy(() => import('./pages/Settings').then(module => ({ default: module.SettingsPage })));

// --- Dedicated Admin Login (Manual Only) ---
const AdminLogin: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [lockedUntil, setLockedUntil] = useState<number | null>(null);
    
    useEffect(() => {
        const checkSecurity = () => {
            if (!state.securityLogs) return;
            const recentFailures = state.securityLogs.filter(log => 
                log.action === 'LOGIN_FAIL' && 
                log.timestamp > Date.now() - 15 * 60 * 1000 // Last 15 min
            );
            if (recentFailures.length >= 5) {
                const lastFail = recentFailures[0].timestamp;
                setLockedUntil(lastFail + 15 * 60 * 1000);
            }
        };
        checkSecurity();
    }, [state.securityLogs]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (lockedUntil) {
            if (Date.now() < lockedUntil) {
                const remaining = Math.ceil((lockedUntil - Date.now()) / 60000);
                alert(`Sistema Bloqueado por Segurança. Tente novamente em ${remaining} minutos.`);
                return;
            } else {
                setLockedUntil(null);
            }
        }

        let success = false;
        let loggedUser: UserType | null = null;
        
        try {
            const foundUser = await getUserByEmail(email);

            if (foundUser) {
                 if (foundUser.type !== UserEnum.ADMIN && foundUser.type !== UserEnum.MASTER) {
                     alert("Esta conta não possui privilégios administrativos.");
                     return;
                 }
                 if (foundUser.password === password) {
                     success = true;
                     loggedUser = foundUser;
                 }
            } else if (email === APP_CONFIG.EMAILJS.ADMIN_EMAIL && password === 'Crinf!2025#') {
                 const masterUser: UserType = {
                    id: 'master_crinf',
                    name: 'Administrador Crinf',
                    email: APP_CONFIG.EMAILJS.ADMIN_EMAIL,
                    cpf: '000.000.000-00',
                    address: 'Sede Administrativa',
                    type: UserEnum.MASTER,
                    photoUrl: undefined,
                    password: 'Crinf!2025#'
                };
                dispatch({ type: 'ADD_USER', payload: masterUser });
                success = true;
                loggedUser = masterUser;
            }

            if (success && loggedUser) {
                dispatch({ type: 'LOGIN', payload: loggedUser });
                dispatch({ 
                    type: 'ADD_SECURITY_LOG', 
                    payload: { action: 'LOGIN_SUCCESS', details: `Acesso Admin realizado por ${loggedUser.email}` } 
                });
                navigate('/settings'); 
            } else {
                dispatch({ 
                    type: 'ADD_SECURITY_LOG', 
                    payload: { action: 'LOGIN_FAIL', details: `Falha de login Admin para o e-mail: ${email}` } 
                });
                alert("Senha incorreta ou acesso não autorizado.");
            }
        } catch(err) {
            console.error(err);
            alert("Erro ao tentar login. Verifique sua conexão.");
        }
    };

    const handleSendForgotEmail = async () => {
        const templateParams = {
            to_email: APP_CONFIG.EMAILJS.ADMIN_EMAIL,
            email: APP_CONFIG.EMAILJS.ADMIN_EMAIL,
            to_name: 'Master Crinf',
            subject: 'Recuperação de Acesso',
            message: `Você solicitou a redefinição de senha. 
            
            Para redefinir sua senha, acesse o link abaixo:
            ${window.location.href.split('#')[0]}#/settings`
        };

        try {
            // @ts-ignore
            if (!window.emailjs) {
                throw new Error("Biblioteca de email não carregada.");
            }
            // @ts-ignore
            await window.emailjs.send(APP_CONFIG.EMAILJS.SERVICE_ID, APP_CONFIG.EMAILJS.TEMPLATE_ID, templateParams, APP_CONFIG.EMAILJS.PUBLIC_KEY);
            alert("Um link de recuperação foi enviado para o seu e-mail administrativo. Verifique sua caixa de entrada.");
        } catch (error: any) {
            console.error('FAILED...', error);
            let msg = "Erro ao enviar e-mail.";
            if (error.text) msg += ` Detalhes: ${error.text}`;
            alert(msg + " Tente novamente mais tarde.");
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
    const [isForgotOpen, setForgotOpen] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [isSendingForgot, setIsSendingForgot] = useState(false);

    const handleLogin = async () => {
        if (email.toLowerCase() === APP_CONFIG.EMAILJS.ADMIN_EMAIL) {
            alert("Esta conta possui privilégios elevados. Por favor, utilize a área de 'Acesso Administrativo'.");
            navigate('/admin-login');
            return;
        }

        try {
            const foundUser = await getUserByEmail(email) as any;
            
            if (foundUser) {
                if (state.bannedDocuments.includes(foundUser.cpf) || state.bannedDocuments.includes(foundUser.email)) {
                    alert("Acesso negado: Esta conta foi banida permanentemente pelo administrador.");
                    return;
                }

                if (foundUser.lockedUntil && foundUser.lockedUntil > Date.now()) {
                    const remaining = Math.ceil((foundUser.lockedUntil - Date.now()) / 60000);
                    alert(`Conta bloqueada por excesso de tentativas. Tente novamente em ${remaining} minutos ou contate o suporte.`);
                    return;
                }

                const storedPass = foundUser.password || '123'; 

                if (password === storedPass) {
                    await successfulLogin(foundUser); 
                    if (password === '123456') {
                        alert("Sua senha foi redefinida pelo administrador para '123456'. Recomendamos alterá-la em Ajustes.");
                    }
                    dispatch({ type: 'LOGIN', payload: foundUser });
                    navigate('/');
                } else {
                    const attempts = await recordFailedLogin(foundUser);
                    if (attempts && attempts >= 3) {
                        alert("Muitas tentativas incorretas. Sua conta foi bloqueada por 5 minutos.");
                    } else {
                        alert(`Senha incorreta. Tentativa ${attempts || 1} de 3.`);
                    }
                }
            } else {
                alert("Usuário não encontrado ou senha incorreta.");
            }
        } catch(err) {
            console.error("Login error", err);
            alert("Erro ao realizar login. Verifique sua conexão.");
        }
    };
    
    const handleGoogleSuccess = (user: any) => {
        if (state.bannedDocuments.includes(user.email)) {
             alert("Acesso negado: Este e-mail foi banido.");
             return;
        }
        dispatch({ type: 'LOGIN', payload: user });
        navigate('/');
    };

    const handleGoogleNewUser = (googleData: any) => {
        navigate('/register', { state: { googleData } });
    };

    const handleForgotPassword = async () => {
        if (!forgotEmail) {
            alert("Digite seu e-mail.");
            return;
        }
        const userExists = await getUserByEmail(forgotEmail);
        
        if (!userExists) {
            alert("E-mail não encontrado no sistema.");
            return;
        }

        setIsSendingForgot(true);
        const resetLink = `${window.location.href.split('#')[0]}#/reset-password?id=${userExists.id}`;

        const templateParams = {
            to_email: userExists.email,
            email: userExists.email,
            to_name: userExists.name,
            subject: 'Recuperação de Senha',
            message: `Você solicitou a recuperação de senha. 
            
            Clique no link abaixo para criar uma nova senha:
            ${resetLink}`
        };

        try {
            // @ts-ignore
            if (!window.emailjs) throw new Error("Biblioteca de email não carregada.");
            // @ts-ignore
            await window.emailjs.send(APP_CONFIG.EMAILJS.SERVICE_ID, APP_CONFIG.EMAILJS.TEMPLATE_ID, templateParams, APP_CONFIG.EMAILJS.PUBLIC_KEY);
            alert(`E-mail enviado para ${forgotEmail}. Verifique sua caixa de entrada.`);
            setForgotOpen(false);
            setForgotEmail('');
        } catch (error: any) {
            console.error('FAILED...', error);
            let msg = "Erro ao enviar e-mail.";
            if (error.text) msg += ` Detalhes: ${error.text}`;
            alert(msg + " Tente novamente mais tarde.");
        } finally {
            setIsSendingForgot(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-sky-100 via-white to-sky-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 max-w-md mx-auto relative overflow-hidden">
            <div className="absolute top-[-100px] left-[-100px] w-64 h-64 bg-sky-200 dark:bg-sky-900/30 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute bottom-[-100px] right-[-100px] w-64 h-64 bg-blue-200 dark:bg-blue-900/30 rounded-full blur-3xl opacity-50"></div>

            <div className="mb-6 w-full flex justify-center transform hover:scale-105 transition-transform">
                <AppLogo />
            </div>
            
            <p className="text-gray-500 dark:text-gray-400 mb-8 text-center font-medium">Acesse sua conta para continuar.</p>
            
            <div className="w-full space-y-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-6 rounded-3xl border border-white dark:border-slate-700 shadow-xl">
                
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1 mb-1 block">E-mail ou Usuário</label>
                    <input className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 px-4 py-3 rounded-xl text-gray-800 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary transition-all" placeholder="ex: usuario@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1 mb-1 block">Senha</label>
                    <input className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 px-4 py-3 rounded-xl text-gray-800 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary transition-all" placeholder="••••••" type="password" value={password} onChange={e => setPassword(e.target.value)} />
                    <div className="text-right mt-1">
                        <button onClick={() => setForgotOpen(true)} className="text-xs text-sky-600 dark:text-sky-400 font-semibold hover:underline">Esqueci minha senha</button>
                    </div>
                  </div>
                  
                  <button onClick={handleLogin} className="w-full bg-primary text-white font-bold py-3.5 rounded-xl hover:bg-sky-600 transition shadow-lg shadow-sky-200 dark:shadow-sky-900 mt-2">
                    Entrar
                  </button>
                  
                  <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-gray-200 dark:border-slate-700"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold uppercase">Ou acesse com</span>
                        <div className="flex-grow border-t border-gray-200 dark:border-slate-700"></div>
                  </div>
                  
                  {/* Google Login Button */}
                  <GoogleLoginButton onSuccess={handleGoogleSuccess} onNewUser={handleGoogleNewUser} />
                  
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 text-center">
                       <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Não tem uma conta?</p>
                       <Link to="/register" className="text-primary font-bold hover:underline">
                           Criar nova conta
                       </Link>
                  </div>
                </div>
            </div>

            <div className="mt-8 text-center space-y-2">
                <Link to="/admin-login" className="text-xs text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 flex items-center justify-center gap-1 transition-colors">
                     <Shield size={12} /> Acesso Administrativo
                </Link>
                <div className="text-[10px] text-gray-300 dark:text-slate-600">
                    Ao entrar, você concorda com nossa <Link to="/privacy" className="underline hover:text-sky-500">Política de Privacidade</Link>.
                </div>
            </div>

            {/* Forgot Password Modal */}
            <Modal isOpen={isForgotOpen} onClose={() => setForgotOpen(false)} title="Recuperar Senha">
                 <div className="space-y-4">
                     <p className="text-sm text-gray-600">Digite seu e-mail cadastrado. Enviaremos um link para você criar uma nova senha.</p>
                     <Input label="E-mail" type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="seu@email.com" />
                     <Button fullWidth onClick={handleForgotPassword} disabled={isSendingForgot}>
                         {isSendingForgot ? 'Enviando...' : 'Enviar Link de Recuperação'}
                     </Button>
                 </div>
            </Modal>
        </div>
    );
};

// --- Layout Wrapper ---
const Layout: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <div className="max-w-md mx-auto bg-gradient-to-br from-sky-100 via-white to-sky-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 min-h-screen relative shadow-2xl overflow-hidden flex flex-col transition-colors duration-300">
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

  useEffect(() => {
     console.log("Inicializando Firebase...");
     seedInitialData();
  }, []);

  // Update HTML class for dark mode
  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.darkMode]);

  // Load App Configuration on Start
  useEffect(() => {
      const unsubscribe = subscribeToAppConfig((config) => {
          if (config) {
              dispatch({ type: 'SET_APP_CONFIG', payload: config });
          }
      });
      return () => unsubscribe();
  }, []);

  // Apply Dynamic CSS Variables for Colors
  useEffect(() => {
      const root = document.documentElement;
      if (state.appConfig) {
          root.style.setProperty('--app-primary', state.appConfig.primaryColor);
          root.style.setProperty('--app-secondary', state.appConfig.secondaryColor);
          
          // Note: Full Tailwind override requires different config, 
          // but we can use these vars in inline styles for specific elements
      }
  }, [state.appConfig]);

  useEffect(() => {
      const unsubscribe = subscribeToVendors((vendors) => {
          dispatch({ type: 'SET_VENDORS', payload: vendors });
      });
      return () => unsubscribe();
  }, []);

  useEffect(() => {
      const unsubscribe = subscribeToBanned((list) => {
          dispatch({ type: 'SET_BANNED', payload: list });
      });
      return () => unsubscribe();
  }, []);

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
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
        </Layout>
      </HashRouter>
    </AppContext.Provider>
  );
}
