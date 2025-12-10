
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, Edit3, Upload, Heart, Share2, Bell, Moon, Lock, ChevronRight, Copy, Check, LogOut, MessageSquare, Mail, HelpCircle } from 'lucide-react';
import { useAppContext } from '../App';
import { Button, Input, Modal, ImageCropper, TwoFactorModal, PhotoSelector, TutorialModal } from '../components/UI';
import { UserType as UserEnum, CATEGORIES } from '../types';
import { uploadImageToFirebase, updateVendorPartial, logoutUser } from '../services/firebaseService';
import { ALLOWED_NEIGHBORHOODS } from '../config';
import { APP_CONFIG } from '../config';

// Lazy load admin dashboard
const AdminDashboard = React.lazy(() => import('./AdminDashboard').then(module => ({ default: module.AdminDashboard })));

export const SettingsPage: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const navigate = useNavigate();
    
    // Change Password State
    const [isChangePassOpen, setChangePassOpen] = useState(false);
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');

    // 2FA State for Password Change
    const [is2FAOpen, set2FAOpen] = useState(false);

    // Edit Profile State
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [editName, setEditName] = useState('');
    const [editPhoto, setEditPhoto] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [savingStatus, setSavingStatus] = useState(''); // Text feedback
    
    // Donation State
    const [isDonationOpen, setDonationOpen] = useState(false);
    const [isPixCopied, setIsPixCopied] = useState(false);
    const pixKey = "crinf.negocios@gmail.com";
    
    // Feedback State
    const [isFeedbackOpen, setFeedbackOpen] = useState(false);
    const [feedbackText, setFeedbackText] = useState('');
    const [isSendingFeedback, setIsSendingFeedback] = useState(false);
    
    // Tutorial State
    const [isTutorialOpen, setTutorialOpen] = useState(false);

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
    const [isEditCustomCategory, setIsEditCustomCategory] = useState(false);

    const isAdminOrMaster = state.currentUser?.type === UserEnum.ADMIN || state.currentUser?.type === UserEnum.MASTER;

    useEffect(() => {
        if (state.currentUser && isEditProfileOpen) {
            setEditName(state.currentUser.name);
            setEditPhoto(state.currentUser.photoUrl || '');
            
            const fullAddress = state.currentUser.address || '';
            const parts = fullAddress.split(',');
            if (parts.length >= 2) {
                setEditStreet(parts[0].trim());
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

            if (state.currentUser.type === UserEnum.VENDOR) {
                const vendorData = state.vendors.find(v => v.id === state.currentUser?.id);
                if (vendorData) {
                    setEditPhone(vendorData.phone);
                    setEditDescription(vendorData.description);
                    
                    const currentCat = vendorData.categories[0] || '';
                    setEditCategory(currentCat);

                    // Check if current category is custom (not in standard list)
                    if (currentCat && !CATEGORIES.includes(currentCat)) {
                        setIsEditCustomCategory(true);
                    } else {
                        setIsEditCustomCategory(false);
                    }
                    
                    // Priority: If vendor has a specific photo, use it. If not, fallback to user photo.
                    if (vendorData.photoUrl) {
                         setEditPhoto(vendorData.photoUrl);
                    }
                }
            }
        }
    }, [isEditProfileOpen, state.currentUser, state.vendors]);

    const handleLogout = async () => {
        if(confirm("Tem certeza que deseja sair?")) {
            await logoutUser();
            dispatch({ type: 'LOGOUT' });
            navigate('/');
        }
    };

    const handleShareApp = async () => {
        const shareData = {
            title: 'O Que Tem Perto? - Águas Claras',
            text: 'Descubra os melhores comércios e serviços de Águas Claras e região no app O Que Tem Perto!',
            url: window.location.href.split('#')[0]
        };
    
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                throw new Error("Share API not supported");
            }
        } catch (err) {
            // Fallback to clipboard
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                     await navigator.clipboard.writeText(shareData.url);
                } else {
                     // Fallback for older browsers / http
                     const textArea = document.createElement("textarea");
                     textArea.value = shareData.url;
                     document.body.appendChild(textArea);
                     textArea.focus();
                     textArea.select();
                     document.execCommand('copy');
                     document.body.removeChild(textArea);
                }
                alert('Link do aplicativo copiado para a área de transferência!');
            } catch (clipboardErr) {
                 alert('Não foi possível compartilhar automaticamente. Por favor, copie o link do navegador.');
            }
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
        
        // If Admin or Master, require 2FA confirmation via email
        if (isAdminOrMaster) {
            set2FAOpen(true);
        } else {
            executePasswordChange();
        }
    };

    const executePasswordChange = () => {
        if (!state.currentUser) return;

        dispatch({ 
            type: 'CHANGE_OWN_PASSWORD', 
            payload: { id: state.currentUser.id, newPass } 
        });
        
        alert("Senha alterada com sucesso!");
        setChangePassOpen(false);
        setNewPass('');
        setConfirmPass('');
    };

    const handlePhotoSelection = (data: string) => {
        if (data.startsWith('data:')) {
             setImageToCrop(data);
        } else {
             setEditPhoto(data);
        }
    };

    const handleCropComplete = (croppedBase64: string) => {
        setEditPhoto(croppedBase64);
        setImageToCrop(null);
    };

    const handleSaveProfile = async () => {
        if (!state.currentUser) return;

        if (!editNeighborhood) {
            alert("Por favor, selecione um bairro válido.");
            return;
        }
        
        // Block Google Photos Sharing Links (They break the app)
        if (editPhoto && (editPhoto.includes('photos.app.goo.gl') || editPhoto.includes('drive.google.com'))) {
            alert("Links de compartilhamento do Google Fotos/Drive não funcionam diretamente. \n\nPor favor, faça o download da imagem e use a opção 'Dispositivo / Upload'.");
            return;
        }

        setIsSaving(true);
        setSavingStatus("Iniciando...");
        
        try {
            let finalPhotoUrl = editPhoto;

            // --- STEP 1: UPLOAD TO STORAGE ---
            // We MUST upload first to get the URL. We cannot save Base64 to Firestore (Too big).
            if (editPhoto && editPhoto.startsWith('data:')) {
                setSavingStatus("Enviando imagem para o servidor...");
                // Unique name prevents caching issues
                const fileName = `profile_${Date.now()}.jpg`;
                const path = `users/${state.currentUser.id}/${fileName}`;
                
                try {
                    // UploadBytes -> GetDownloadURL
                    finalPhotoUrl = await uploadImageToFirebase(editPhoto, path);
                } catch(e: any) {
                    console.error("Upload failed", e);
                    alert("Aviso: Falha no envio da foto. " + e.message);
                    // Revert to old photo to avoid saving broken data
                    finalPhotoUrl = state.currentUser.photoUrl || "https://placehold.co/400x300/e0f2fe/1e3a8a?text=Sem+Foto";
                }
            }

            // SAFETY CHECK: Ensure photoUrl is never empty or null
            if (!finalPhotoUrl || finalPhotoUrl.trim() === '') {
                 finalPhotoUrl = state.currentUser.photoUrl || "https://placehold.co/400x300/e0f2fe/1e3a8a?text=Sem+Foto";
            }

            setSavingStatus("Salvando dados...");
            const fullAddress = `${editStreet}, ${editNumber} - ${editNeighborhood} - Campo Largo/PR`;

            // --- STEP 2: PREPARE DATA ---
            const updatedUser: any = {
                ...state.currentUser,
                name: editName,
                address: fullAddress,
                photoUrl: finalPhotoUrl, // Here we use the CLEAN URL, not Base64
            };

            if (state.currentUser.type === UserEnum.VENDOR) {
                updatedUser.phone = editPhone;
                updatedUser.description = editDescription;
                updatedUser.categories = [editCategory];
            }
            
            // --- STEP 3: UPDATE FIRESTORE (USERS COLLECTION) ---
            // This updates the Redux state AND the Database via the Reducer > Service
            dispatch({ type: 'UPDATE_USER', payload: updatedUser });

            // --- STEP 4: SYNC VENDORS COLLECTION ---
            // If user is also a vendor, we must explicitly update the public vendor listing
            if (state.currentUser.type === UserEnum.VENDOR) {
                const vendorUpdates = {
                    name: editName,
                    address: fullAddress,
                    phone: editPhone,
                    description: editDescription,
                    categories: [editCategory],
                    photoUrl: finalPhotoUrl // Ensure Vendor card gets the new photo
                };

                await updateVendorPartial(state.currentUser.id, vendorUpdates);
                
                // Update local state for immediate UI reflection
                const existingVendor = state.vendors.find(v => v.id === state.currentUser?.id);
                if (existingVendor) {
                    const newVendorState = { ...existingVendor, ...vendorUpdates };
                    dispatch({ 
                        type: 'UPDATE_VENDOR', 
                        payload: newVendorState
                    });
                }
            }

            setSavingStatus("Concluído!");
            setTimeout(() => {
                alert("Perfil salvo com sucesso!");
                setIsEditProfileOpen(false);
                setSavingStatus("");
            }, 500);

        } catch (error: any) {
            console.error("Failed to save profile:", error);
            alert(`Erro ao salvar perfil: ${error.message}`);
        } finally {
            setIsSaving(false);
            setSavingStatus("");
        }
    };
    
    const handleCopyPix = () => {
        navigator.clipboard.writeText(pixKey);
        setIsPixCopied(true);
        setTimeout(() => setIsPixCopied(false), 2000);
    };

    const handleSendFeedback = async () => {
        if (!feedbackText.trim()) return;
        setIsSendingFeedback(true);

        const templateParams = {
            to_email: APP_CONFIG.EMAILJS.ADMIN_EMAIL,
            email: state.currentUser?.email || 'Anônimo',
            to_name: 'Admin',
            subject: 'Novo Feedback / Sugestão do App',
            message: `Usuário: ${state.currentUser?.name} (${state.currentUser?.email})\n\nMensagem:\n${feedbackText}`
        };

        try {
            // @ts-ignore
            if (window.emailjs) {
                // @ts-ignore
                await window.emailjs.send(APP_CONFIG.EMAILJS.SERVICE_ID, APP_CONFIG.EMAILJS.TEMPLATE_ID, templateParams, APP_CONFIG.EMAILJS.PUBLIC_KEY);
                alert("Sua sugestão foi enviada com sucesso! Obrigado por contribuir.");
                setFeedbackOpen(false);
                setFeedbackText("");
            } else {
                throw new Error("Email Service Unavailable");
            }
        } catch (error) {
            console.error(error);
            alert("Erro ao enviar sugestão. Tente novamente mais tarde.");
        } finally {
            setIsSendingFeedback(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-sky-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 pb-24">
             <div className="bg-white dark:bg-slate-800 p-6 pb-8 shadow-sm rounded-b-[2rem] mb-6 transition-colors">
                 <h1 className="text-2xl font-bold text-sky-900 dark:text-sky-400 mb-6">Ajustes</h1>
                 
                 {state.currentUser ? (
                     <div className="flex items-center gap-4">
                         <div className="w-16 h-16 bg-sky-100 dark:bg-slate-700 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-600 shadow-md overflow-hidden relative group">
                             {state.currentUser.photoUrl ? (
                                 <img src={state.currentUser.photoUrl} alt="Perfil" className="w-full h-full object-cover" />
                             ) : (
                                 <User size={32} className="text-sky-500" />
                             )}
                         </div>
                         <div className="flex-1">
                             <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">{state.currentUser.name}</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{state.currentUser.email}</p>
                                    <span className="text-[10px] bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300 px-2 py-0.5 rounded-full border border-sky-100 dark:border-sky-800 font-semibold uppercase mt-1 inline-block">
                                        {state.currentUser.type === UserEnum.MASTER ? 'Conta Master' : 
                                        state.currentUser.type === UserEnum.ADMIN ? 'Administrador' : 
                                        state.currentUser.type === UserEnum.VENDOR ? 'Conta Comercial' : 'Cliente'}
                                    </span>
                                </div>
                                <button 
                                    onClick={() => setIsEditProfileOpen(true)}
                                    className="p-2 text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-slate-700 rounded-full hover:bg-sky-100 dark:hover:bg-slate-600 shadow-sm"
                                >
                                    <Edit3 size={18} />
                                </button>
                             </div>
                         </div>
                     </div>
                 ) : (
                     <div className="text-center py-4">
                         <p className="text-gray-500 dark:text-gray-400 mb-4">Você não está logado.</p>
                         <Button onClick={() => navigate('/login')} fullWidth>Entrar na Conta</Button>
                     </div>
                 )}
             </div>

             <div className="px-4 space-y-4">
                {state.currentUser && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors">
                        <div 
                            onClick={() => setChangePassOpen(true)}
                            className="p-4 border-b border-gray-50 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700"
                        >
                            <div className="flex items-center gap-3">
                                <Lock size={20} className="text-gray-400" />
                                <span className="text-gray-700 dark:text-gray-200 font-medium">Alterar Senha</span>
                            </div>
                            <ChevronRight size={16} className="text-gray-300" />
                        </div>
                    </div>
                )}

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors">
                    <div className="p-4 border-b border-gray-50 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700">
                        <div className="flex items-center gap-3">
                            <Bell size={20} className="text-gray-400" />
                            <span className="text-gray-700 dark:text-gray-200 font-medium">Notificações</span>
                        </div>
                        <div className="w-10 h-6 bg-green-500 rounded-full relative">
                            <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                        </div>
                    </div>
                    
                    <div 
                        onClick={handleShareApp}
                        className="p-4 border-b border-gray-50 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700"
                    >
                        <div className="flex items-center gap-3">
                            <Share2 size={20} className="text-gray-400" />
                            <span className="text-gray-700 dark:text-gray-200 font-medium">Compartilhar App</span>
                        </div>
                        <ChevronRight size={16} className="text-gray-300" />
                    </div>

                    {/* Tutorial Button */}
                    <div 
                        onClick={() => setTutorialOpen(true)}
                        className="p-4 border-b border-gray-50 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700"
                    >
                        <div className="flex items-center gap-3">
                            <HelpCircle size={20} className="text-gray-400" />
                            <span className="text-gray-700 dark:text-gray-200 font-medium">Como usar o App (Tutorial)</span>
                        </div>
                        <ChevronRight size={16} className="text-gray-300" />
                    </div>

                    <div 
                        onClick={() => dispatch({ type: 'TOGGLE_THEME' })}
                        className="p-4 border-b border-gray-50 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700"
                    >
                        <div className="flex items-center gap-3">
                            <Moon size={20} className="text-gray-400" />
                            <span className="text-gray-700 dark:text-gray-200 font-medium">Modo Escuro</span>
                        </div>
                        <div className={`w-10 h-6 rounded-full relative transition-colors ${state.darkMode ? 'bg-sky-600' : 'bg-gray-200'}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${state.darkMode ? 'left-5' : 'left-1'}`}></div>
                        </div>
                    </div>

                    {/* Feedback Button */}
                    <div 
                        onClick={() => setFeedbackOpen(true)}
                        className="p-4 border-b border-gray-50 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700"
                    >
                        <div className="flex items-center gap-3">
                            <MessageSquare size={20} className="text-gray-400" />
                            <span className="text-gray-700 dark:text-gray-200 font-medium">Sugestões e Melhorias</span>
                        </div>
                        <ChevronRight size={16} className="text-gray-300" />
                    </div>

                    <div 
                        onClick={() => setDonationOpen(true)}
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 group transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <Heart size={20} className="text-red-400 group-hover:fill-red-400 transition-all" />
                            <span className="text-gray-700 dark:text-gray-200 font-medium group-hover:text-red-500">Apoie o Projeto</span>
                        </div>
                        <ChevronRight size={16} className="text-gray-300" />
                    </div>
                </div>

                {/* --- ADMIN DASHBOARD EMBEDDED --- */}
                {isAdminOrMaster && (
                    <div className="mt-6">
                        <React.Suspense fallback={<div className="p-4 text-center text-gray-400">Carregando painel...</div>}>
                            <AdminDashboard />
                        </React.Suspense>
                    </div>
                )}

                {state.currentUser && (
                    <button 
                        onClick={handleLogout}
                        className="w-full bg-white dark:bg-slate-800 text-red-500 font-semibold p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors mt-6"
                    >
                        <LogOut size={20} />
                        Sair da Conta
                    </button>
                )}
                
                <div className="text-center pt-8 pb-4">
                    <p className="text-xs text-gray-400">Versão do App: {state.version} (PWA)</p>
                </div>
             </div>
             
             {/* Change Password Modal */}
             <Modal isOpen={isChangePassOpen} onClose={() => setChangePassOpen(false)} title="Alterar Senha">
                 <div className="space-y-4">
                     <p className="text-sm text-gray-600">Defina sua nova senha de acesso.</p>
                     {isAdminOrMaster && (
                         <div className="bg-yellow-50 text-yellow-800 p-2 rounded text-xs border border-yellow-200 mb-2">
                             <strong>Segurança:</strong> Como Administrador, será exigido um código de confirmação enviado ao seu e-mail.
                         </div>
                     )}
                     <Input label="Nova Senha" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} />
                     <Input label="Confirmar Senha" type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />
                     <Button fullWidth onClick={handleChangePassword}>Salvar Nova Senha</Button>
                 </div>
             </Modal>

             {/* Feedback Modal */}
             <Modal isOpen={isFeedbackOpen} onClose={() => setFeedbackOpen(false)} title="Sugestões e Feedback">
                <div className="space-y-4">
                    <div className="text-center mb-4">
                        <div className="bg-sky-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                             <Mail size={24} className="text-sky-600" />
                        </div>
                        <p className="text-sm text-gray-600">
                            Encontrou um erro ou tem uma ideia para melhorar o app? Conte para nós!
                        </p>
                    </div>
                    <Input 
                        label="Sua Mensagem" 
                        value={feedbackText} 
                        onChange={e => setFeedbackText(e.target.value)} 
                        multiline
                        placeholder="Escreva sua sugestão aqui..."
                        className="h-32"
                    />
                    <Button fullWidth onClick={handleSendFeedback} disabled={isSendingFeedback || !feedbackText.trim()}>
                        {isSendingFeedback ? 'Enviando...' : 'Enviar Sugestão'}
                    </Button>
                </div>
             </Modal>

             {/* Tutorial Modal */}
             <TutorialModal isOpen={isTutorialOpen} onClose={() => setTutorialOpen(false)} />

             {/* Edit Profile Modal */}
             <Modal isOpen={isEditProfileOpen} onClose={() => setIsEditProfileOpen(false)} title="Editar Meus Dados">
                 <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                     <Input label="Nome" value={editName} onChange={e => setEditName(e.target.value)} />
                     
                     <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Endereço</label>
                        <Input label="Rua / Logradouro" value={editStreet} onChange={e => setEditStreet(e.target.value)} className="bg-white" />
                        <div className="grid grid-cols-2 gap-2">
                             <Input label="Número" value={editNumber} onChange={e => setEditNumber(e.target.value)} className="bg-white" />
                             <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Bairro</label>
                                <select 
                                    value={editNeighborhood} 
                                    onChange={e => setEditNeighborhood(e.target.value)} 
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary text-sm"
                                >
                                    <option value="">Selecione...</option>
                                    {ALLOWED_NEIGHBORHOODS.map(n => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                             </div>
                        </div>
                     </div>

                     {state.currentUser?.type === UserEnum.VENDOR && (
                         <>
                            <Input label="Telefone / WhatsApp" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                            <div className="mb-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                                <select 
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white outline-none"
                                    value={isEditCustomCategory ? 'OTHER' : editCategory}
                                    onChange={(e) => {
                                        if (e.target.value === 'OTHER') {
                                            setIsEditCustomCategory(true);
                                            setEditCategory('');
                                        } else {
                                            setIsEditCustomCategory(false);
                                            setEditCategory(e.target.value);
                                        }
                                    }}
                                >
                                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    <option value="OTHER">+ Outra (Adicionar Nova)</option>
                                </select>
                                {isEditCustomCategory && (
                                    <div className="mt-2 animate-fade-in">
                                        <Input 
                                            label="Digite a nova categoria"
                                            value={editCategory} 
                                            onChange={(e) => setEditCategory(e.target.value)} 
                                            placeholder="Ex: Pet Shop, Artesanato..."
                                            autoFocus
                                        />
                                    </div>
                                )}
                            </div>
                            <Input label="Descrição" multiline value={editDescription} onChange={e => setEditDescription(e.target.value)} />
                         </>
                     )}
                     
                     <div className="mb-2">
                         <PhotoSelector 
                            label="Alterar Foto"
                            currentPhotoUrl={editPhoto}
                            onPhotoSelected={handlePhotoSelection}
                         />
                     </div>
                     
                     <Button fullWidth onClick={handleSaveProfile} disabled={isSaving}>
                         {isSaving ? savingStatus || 'Salvando...' : 'Salvar Alterações'}
                     </Button>
                 </div>
             </Modal>

             {/* Donation Modal */}
             <Modal isOpen={isDonationOpen} onClose={() => setDonationOpen(false)} title="Apoie o Projeto">
                 <div className="text-center space-y-4">
                     <p className="text-sm text-gray-600 leading-relaxed">
                         Contribua com o desenvolvimento do aplicativo realizando qualquer valor de doação.
                     </p>
                     
                     <div className="bg-white p-4 rounded-xl border border-gray-200 inline-block shadow-sm">
                         <img 
                             src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${pixKey}`} 
                             alt="QR Code Pix" 
                             className="w-48 h-48"
                         />
                     </div>
                     
                     <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                         <p className="text-xs text-gray-500 mb-1">Chave Pix (E-mail)</p>
                         <p className="font-mono text-sm font-bold text-gray-800 break-all">{pixKey}</p>
                     </div>

                     <Button 
                        onClick={handleCopyPix} 
                        fullWidth 
                        variant="outline"
                        className={isPixCopied ? "bg-green-50 border-green-200 text-green-700" : ""}
                        icon={isPixCopied ? <Check size={18} /> : <Copy size={18} />}
                     >
                         {isPixCopied ? "Chave Copiada!" : "Copiar Chave Pix"}
                     </Button>
                 </div>
             </Modal>

            {/* 2FA Modal for High Privilege Password Change */}
            <TwoFactorModal 
                isOpen={is2FAOpen} 
                onClose={() => set2FAOpen(false)} 
                onSuccess={executePasswordChange} 
                actionTitle="Alterar Senha"
                destination={state.currentUser?.email}
            />

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
