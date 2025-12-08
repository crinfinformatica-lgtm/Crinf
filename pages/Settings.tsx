
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, Edit3, Upload, Heart, Share2, Bell, Moon, Lock, ChevronRight, Copy, Check, LogOut } from 'lucide-react';
import { useAppContext } from '../App';
import { Button, Input, Modal, ImageCropper, TwoFactorModal } from '../components/UI';
import { UserType as UserEnum, CATEGORIES } from '../types';
import { uploadImageToFirebase, updateVendorPartial } from '../services/firebaseService';

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

    const fileInputRef = useRef<HTMLInputElement>(null);
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

    const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert("A foto selecionada é muito grande. O limite máximo é de 5MB.");
                e.target.value = '';
                return;
            }

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

    const handleSaveProfile = async () => {
        if (!state.currentUser) return;
        setIsSaving(true);
        setSavingStatus("Iniciando...");
        
        try {
            let finalPhotoUrl = editPhoto;

            // 1. Upload image if it is base64 (new upload)
            if (editPhoto && editPhoto.startsWith('data:')) {
                setSavingStatus("Enviando imagem...");
                const fileName = `profile_${Date.now()}.jpg`;
                // Use consistent path logic
                const path = `users/${state.currentUser.id}/${fileName}`;
                
                // Wait for upload to get the fixed URL
                finalPhotoUrl = await uploadImageToFirebase(editPhoto, path);
            }

            setSavingStatus("Atualizando dados...");
            const fullAddress = `${editStreet}, ${editNumber} - ${editNeighborhood} - Campo Largo/PR`;

            // 2. Prepare User Object (Login/Header)
            const updatedUser: any = {
                ...state.currentUser,
                name: editName,
                address: fullAddress,
                photoUrl: finalPhotoUrl,
            };

            if (state.currentUser.type === UserEnum.VENDOR) {
                updatedUser.phone = editPhone;
                updatedUser.description = editDescription;
                updatedUser.categories = [editCategory];
            }
            
            // 3. Dispatch User Update (Saves to users collection)
            dispatch({ type: 'UPDATE_USER', payload: updatedUser });

            // 4. Explicitly Update Vendor Record (Public List) using direct DB call
            if (state.currentUser.type === UserEnum.VENDOR) {
                const vendorUpdates = {
                    name: editName,
                    address: fullAddress,
                    phone: editPhone,
                    description: editDescription,
                    categories: [editCategory],
                    photoUrl: finalPhotoUrl // CRITICAL: Force the new URL here
                };

                console.log("Saving Vendor Data:", vendorUpdates);

                // Use direct update service to guarantee DB write without relying on full local state
                await updateVendorPartial(state.currentUser.id, vendorUpdates);
                
                // 5. Update Local State for Vendor List immediately so UI reflects change without refresh
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
        }
    };
    
    const handleCopyPix = () => {
        navigator.clipboard.writeText(pixKey);
        setIsPixCopied(true);
        setTimeout(() => setIsPixCopied(false), 2000);
    };

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

                    <div className="p-4 border-b border-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                            <Moon size={20} className="text-gray-400" />
                            <span className="text-gray-700 font-medium">Modo Escuro</span>
                        </div>
                        <div className="w-10 h-6 bg-gray-200 rounded-full relative">
                            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                        </div>
                    </div>

                    <div 
                        onClick={() => setDonationOpen(true)}
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-red-50 group transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <Heart size={20} className="text-red-400 group-hover:fill-red-400 transition-all" />
                            <span className="text-gray-700 font-medium group-hover:text-red-500">Apoie o Projeto</span>
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
                        className="w-full bg-white text-red-500 font-semibold p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-center gap-2 hover:bg-red-50 transition-colors mt-6"
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
                     <p className="text-sm text-gray-600 mb-2">Defina sua nova senha de acesso.</p>
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
                                <p className="text-[10px] text-gray-400 mt-1 text-center">Tamanho máximo: 5MB</p>
                            </div>
                        </div>
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
