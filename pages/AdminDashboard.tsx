
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Store, Trash2, Edit2, Plus, Gavel, Ban, Share2, Check, ShoppingBag, Globe, Copy, Github, AlertTriangle, KeyRound, Lock, ShieldAlert, History, Database, Unlock, Mail, Smartphone, Palette, Upload, X, ZoomIn } from 'lucide-react';
import { useAppContext } from '../App';
import { Button, Input, Modal, TwoFactorModal, PhotoSelector, ImageCropper, AppLogo } from '../components/UI';
import { UserType, User as IUser, Vendor, AppConfig } from '../types';
import { subscribeToUsers, updateAppConfig } from '../services/firebaseService';
import { APP_CONFIG } from '../config';

export const AdminDashboard: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'vendors' | 'blocked' | 'banned' | 'distribute' | 'security' | 'customization'>('users');
  
  // Session Timeout State
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Editing state
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Create User State
  const [isCreateUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserType, setNewUserType] = useState<UserType>(UserType.USER);

  // Manual Ban State
  const [isBanModalOpen, setBanModalOpen] = useState(false);
  const [manualBanInput, setManualBanInput] = useState('');

  // 2FA State
  const [is2FAOpen, set2FAOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [actionTitle, setActionTitle] = useState('');

  // Master Security State
  const [currentPass, setCurrentPass] = useState('');
  const [newMasterPass, setNewMasterPass] = useState('');
  const [confirmMasterPass, setConfirmMasterPass] = useState('');

  // Branding Customization State
  const [tempConfig, setTempConfig] = useState<AppConfig>(state.appConfig);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Form State
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDoc, setEditDoc] = useState(''); // CPF/CNPJ
  const [editAddress, setEditAddress] = useState('');
  const [editType, setEditType] = useState<UserType>(UserType.USER);
  
  // Copy State
  const [copied, setCopied] = useState(false);

  // FETCH USERS ONLY WHEN ADMIN DASHBOARD MOUNTS
  // This solves the scalability issue of downloading everyone at app startup
  useEffect(() => {
      console.log("Admin Dashboard: Subscribing to user list...");
      const unsubscribe = subscribeToUsers((users) => {
          dispatch({ type: 'SET_USERS', payload: users });
      });
      return () => unsubscribe();
  }, [dispatch]);

  // Sync tempConfig when global config changes
  useEffect(() => {
      setTempConfig(state.appConfig);
  }, [state.appConfig]);

  // Define on2FASuccess handler
  const on2FASuccess = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    set2FAOpen(false);
  };

  // Session Timeout Monitor (10 Minutes)
  useEffect(() => {
      const timeout = 10 * 60 * 1000; // 10 minutes
      
      const checkActivity = setInterval(() => {
          if (Date.now() - lastActivity > timeout) {
              alert("Sessão administrativa expirada por inatividade.");
              dispatch({ type: 'LOGOUT' });
              navigate('/admin-login');
          }
      }, 30000); // Check every 30s

      const updateActivity = () => setLastActivity(Date.now());
      
      window.addEventListener('mousemove', updateActivity);
      window.addEventListener('keypress', updateActivity);
      window.addEventListener('click', updateActivity);

      return () => {
          clearInterval(checkActivity);
          window.removeEventListener('mousemove', updateActivity);
          window.removeEventListener('keypress', updateActivity);
          window.removeEventListener('click', updateActivity);
      };
  }, [lastActivity, dispatch, navigate]);

  const handleDelete = (id: string, type: 'user' | 'vendor') => {
    if (type === 'user') {
        dispatch({ type: 'DELETE_USER', payload: id });
    } else {
        dispatch({ type: 'DELETE_VENDOR', payload: id });
    }
  };

  const handleBan = (item: IUser | Vendor, type: 'user' | 'vendor') => {
      const doc = type === 'user' ? (item as IUser).cpf : (item as Vendor).document;
      const email = type === 'user' ? (item as IUser).email : null;
      
      if (doc) dispatch({ type: 'BAN_DOCUMENT', payload: doc });
      if (email) dispatch({ type: 'BAN_DOCUMENT', payload: email });
      
      alert(`${item.name} foi banido e removido da lista.`);
  };

  const handleManualBan = () => {
      if (!manualBanInput) return;
      dispatch({ type: 'BAN_DOCUMENT', payload: manualBanInput });
      setBanModalOpen(false);
      setManualBanInput('');
      alert("Bloqueio manual efetuado.");
  };

  const handleUnban = (doc: string) => {
      dispatch({ type: 'UNBAN_DOCUMENT', payload: doc });
  };

  const handleUnlockUser = (userId: string) => {
      if (confirm("Deseja desbloquear este usuário imediatamente?")) {
          dispatch({ type: 'UNLOCK_USER', payload: userId });
          dispatch({ 
              type: 'ADD_SECURITY_LOG', 
              payload: { action: 'UNLOCK_USER', details: `Usuário ${userId} desbloqueado pelo Admin.` } 
          });
          alert("Usuário desbloqueado com sucesso.");
      }
  };
  
  const handleSendResetLink = async (targetUser: IUser) => {
      if (!confirm(`Enviar link de redefinição de senha para ${targetUser.email}?`)) return;

      // Construct the reset link
      const resetLink = `${window.location.href.split('#')[0]}#/reset-password?id=${targetUser.id}`;

      const templateParams = {
          to_email: targetUser.email,
          email: targetUser.email,
          to_name: targetUser.name,
          subject: 'Redefinição de Senha Solicitada pelo Admin',
          message: `O administrador solicitou a redefinição da sua senha.
          
          Clique no link abaixo para criar uma nova senha:
          ${resetLink}
          
          Se não foi você, contate o suporte.`
      };

      try {
          // @ts-ignore
          await window.emailjs.send(APP_CONFIG.EMAILJS.SERVICE_ID, APP_CONFIG.EMAILJS.TEMPLATE_ID, templateParams, APP_CONFIG.EMAILJS.PUBLIC_KEY);
          alert(`Link enviado com sucesso para ${targetUser.email}.`);
          dispatch({ 
            type: 'ADD_SECURITY_LOG', 
            payload: { action: 'PASSWORD_CHANGE', details: `Admin enviou link de reset para ${targetUser.email}` } 
          });
      } catch (error) {
          console.error("Erro email:", error);
          alert("Erro ao enviar o e-mail. Verifique se o serviço está configurado.");
      }
  };

  const openEditModal = (item: any, type: 'user' | 'vendor') => {
      setEditingItem({ ...item, dataType: type });
      setEditName(item.name);
      setEditEmail(item.email || ''); 
      setEditDoc(type === 'user' ? item.cpf : item.document);
      setEditAddress(item.address);
      setEditType(item.type || UserType.USER);
      setEditModalOpen(true);
  };

  const saveEdit = () => {
      if (!editingItem) return;

      if (editingItem.dataType === 'user') {
          const isEditingSelf = state.currentUser?.id === editingItem.id;
          
          // 1. Proteger usuário Master de edições externas, mas permitir que ele se edite
          if (editingItem.email === APP_CONFIG.EMAILJS.ADMIN_EMAIL && !isEditingSelf) {
              alert("Não é permitido alterar o usuário Master.");
              return;
          }

          // 2. Validação de Email Duplicado
          if (editEmail !== editingItem.email) {
              const emailExists = state.users.some(u => u.email.toLowerCase() === editEmail.toLowerCase() && u.id !== editingItem.id);
              if (emailExists) {
                  alert("Erro: Este e-mail já está cadastrado para outro usuário.");
                  return;
              }
              if (!confirm(`ATENÇÃO: Você está alterando o e-mail de login de ${editingItem.name}.\n\nDe: ${editingItem.email}\nPara: ${editEmail}\n\nO usuário precisará usar o NOVO e-mail para entrar. Continuar?`)) {
                  return;
              }
          }

          const updatedUser = {
              ...editingItem,
              name: editName,
              email: editEmail,
              cpf: editDoc,
              address: editAddress,
              type: editType
          };
          
          dispatch({ type: 'UPDATE_USER', payload: updatedUser });
          
          if (editEmail !== editingItem.email) {
             dispatch({ 
                type: 'ADD_SECURITY_LOG', 
                payload: { action: 'PASSWORD_CHANGE', details: `Admin alterou email de ${editingItem.email} para ${editEmail}` } 
             });
          }

      } else {
          const updatedVendor = {
              ...editingItem,
              name: editName,
              document: editDoc,
              address: editAddress
          };
          dispatch({ type: 'UPDATE_VENDOR', payload: updatedVendor });
      }
      setEditModalOpen(false);
  };

  const handleCreateUser = () => {
      if(!newUserName || !newUserEmail) return;
      
      const newUser: IUser = {
          id: `new_${Date.now()}`,
          name: newUserName,
          email: newUserEmail,
          cpf: '000.000.000-00', 
          address: 'Criado pelo Admin',
          type: newUserType,
          password: '123'
      };
      
      dispatch({ type: 'ADD_USER', payload: newUser });
      setCreateUserModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
  };

  const handleMasterPasswordChange = () => {
      if (!state.currentUser) return;
      if (state.currentUser.type !== UserType.MASTER) {
          alert("Apenas o Master pode alterar esta senha.");
          return;
      }
      if (state.currentUser.password !== currentPass) {
          alert("A senha atual está incorreta.");
          return;
      }
      if (newMasterPass.length < 6) {
          alert("A nova senha deve ter no mínimo 6 caracteres.");
          return;
      }
      if (newMasterPass !== confirmMasterPass) {
          alert("A nova senha e a confirmação não coincidem.");
          return;
      }

      const executeChange = () => {
          if(!state.currentUser) return;
          dispatch({ 
              type: 'CHANGE_OWN_PASSWORD', 
              payload: { id: state.currentUser.id, newPass: newMasterPass } 
          });
          dispatch({
              type: 'ADD_SECURITY_LOG',
              payload: { action: 'PASSWORD_CHANGE', details: 'O Master alterou sua própria senha.' }
          });
          alert("Senha Master atualizada com sucesso.");
          setCurrentPass('');
          setNewMasterPass('');
          setConfirmMasterPass('');
      };

      // Trigger 2FA
      setActionTitle("Alterar Senha Master");
      setPendingAction(() => executeChange);
      set2FAOpen(true);
  };

  const handleFactoryReset = () => {
      if(confirm("ATENÇÃO: Isso apagará TODOS os usuários e comércios cadastrados e restaurará o banco de dados inicial. Deseja continuar?")) {
          if(prompt("Digite 'CONFIRMAR' para apagar tudo:") === 'CONFIRMAR') {
              dispatch({ type: 'FACTORY_RESET' });
              alert("Banco de dados resetado com sucesso.");
              window.location.reload();
          }
      }
  };

  // Robust Copy Link Function
  const copyLink = async () => {
      const url = window.location.href.split('#')[0];
      
      try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(url);
              setCopied(true);
          } else {
              const textArea = document.createElement("textarea");
              textArea.value = url;
              document.body.appendChild(textArea);
              textArea.focus();
              textArea.select();
              try {
                  document.execCommand('copy');
                  setCopied(true);
              } catch (err) {
                  console.error('Fallback copy failed', err);
                  alert('Não foi possível copiar. Selecione e copie o link acima.');
              }
              document.body.removeChild(textArea);
          }
      } catch (err) {
          console.error('Copy failed', err);
          alert('Erro ao copiar link.');
      }
      
      setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
      const shareData = {
          title: APP_CONFIG.NAME,
          text: 'Gerencie ou acesse o aplicativo O Que Tem Perto.',
          url: window.location.href.split('#')[0]
      };

      if (navigator.share) {
          try {
              await navigator.share(shareData);
          } catch (err) {
              console.log('Error sharing', err);
          }
      } else {
          copyLink();
          alert('Compartilhamento nativo não suportado. Link copiado!');
      }
  };

  // Branding Handlers
  const handleLogoUpload = (data: string) => {
      if (data.startsWith('data:')) {
          setImageToCrop(data);
      } else {
          setTempConfig({ ...tempConfig, logoUrl: data });
      }
  };

  const handleLogoCrop = (cropped: string) => {
      setTempConfig({ ...tempConfig, logoUrl: cropped });
      setImageToCrop(null);
  };

  const handleSaveConfig = async () => {
      setIsSavingConfig(true);
      try {
          const newConfig = await updateAppConfig(tempConfig);
          dispatch({ type: 'SET_APP_CONFIG', payload: newConfig });
          dispatch({
              type: 'ADD_SECURITY_LOG',
              payload: { action: 'CONFIG_UPDATE', details: 'Alteração de identidade visual do app.' }
          });
          alert("Configurações salvas com sucesso!");
      } catch (error: any) {
          alert("Erro ao salvar: " + error.message);
      } finally {
          setIsSavingConfig(false);
      }
  };

  const handleResetConfig = () => {
      if (confirm("Voltar para a identidade padrão?")) {
          const defaultConfig = {
              appName: "O QUE TEM PERTO?",
              logoUrl: null,
              logoWidth: 300,
              primaryColor: "#0ea5e9",
              secondaryColor: "#facc15"
          };
          setTempConfig(defaultConfig);
          updateAppConfig(defaultConfig).then(c => dispatch({ type: 'SET_APP_CONFIG', payload: c }));
      }
  };

  const isMaster = state.currentUser?.type === UserType.MASTER;
  const lockedUsers = state.users.filter(u => u.lockedUntil && u.lockedUntil > Date.now());

  return (
    <div className="animate-fade-in mt-4 border-t border-gray-100 pt-6">
      <div className="flex items-center gap-3 mb-4 px-2">
          <div className="bg-sky-100 p-2 rounded-lg">
             <ShieldAlert className="text-sky-700" size={24} />
          </div>
          <div>
             <h2 className="text-xl font-bold text-sky-900">Painel de Controle</h2>
             <p className="text-xs text-sky-600">Área Administrativa Integrada</p>
          </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 flex-wrap pb-2 mb-4">
            {[
                { id: 'users', icon: User, label: 'Usuários' },
                { id: 'vendors', icon: Store, label: 'Comércios' },
                { id: 'blocked', icon: Lock, label: 'Bloqueados' },
                { id: 'banned', icon: Ban, label: 'Banidos' },
                { id: 'security', icon: ShieldAlert, label: 'Segurança' },
                { id: 'customization', icon: Palette, label: 'Personalização' },
                { id: 'distribute', icon: Share2, label: 'Distribuição' }
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex-grow sm:flex-grow-0 justify-center border ${activeTab === tab.id ? 'bg-sky-500 border-sky-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                    <tab.icon size={14} />
                    <span>{tab.label}</span>
                </button>
            ))}
      </div>

      <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 shadow-inner">
        {/* USERS TAB */}
        {activeTab === 'users' && (
            <div className="space-y-4 animate-fade-in">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-gray-700">Gestão de Usuários</h3>
                    <Button onClick={() => setCreateUserModalOpen(true)} className="py-1 px-3 text-xs h-auto gap-1">
                        <Plus size={14} /> Novo
                    </Button>
                </div>
                <div className="space-y-3">
                    {state.users.map(user => {
                        const isMasterUser = user.email === APP_CONFIG.EMAILJS.ADMIN_EMAIL;
                        const canEdit = !isMasterUser || (isMasterUser && state.currentUser?.id === user.id);
                        const isLocked = user.lockedUntil && user.lockedUntil > Date.now();

                        return (
                        <div key={user.id} className={`bg-white p-3 rounded-xl shadow-sm border flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 ${isLocked ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${user.type === UserType.MASTER ? 'bg-purple-600' : user.type === UserType.ADMIN ? 'bg-sky-600' : 'bg-gray-400'}`}>
                                    {user.name[0]}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-sm text-gray-800">{user.name}</h3>
                                        {user.type === UserType.MASTER && <span className="bg-purple-100 text-purple-700 text-[10px] px-1 rounded font-bold border border-purple-200">MASTER</span>}
                                        {user.type === UserType.ADMIN && <span className="bg-sky-100 text-sky-700 text-[10px] px-1 rounded font-bold border border-sky-200">ADMIN</span>}
                                        {isLocked && <span className="bg-red-100 text-red-700 text-[10px] px-1 rounded font-bold border border-red-200 flex items-center gap-1"><Lock size={8}/> BLOQUEADO</span>}
                                    </div>
                                    <p className="text-[10px] text-gray-500">{user.email}</p>
                                </div>
                            </div>
                            
                            <div className="flex gap-2 justify-end">
                                {isMaster && !isMasterUser && (
                                    <button onClick={() => handleSendResetLink(user)} className="p-1.5 bg-yellow-50 text-yellow-600 rounded hover:bg-yellow-100" title="Enviar Link de Senha"><Mail size={14} /></button>
                                )}
                                {canEdit && (
                                    <button onClick={() => openEditModal(user, 'user')} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"><Edit2 size={14} /></button>
                                )}
                                {!isMasterUser && (
                                    <>
                                        <button onClick={() => handleBan(user, 'user')} className="p-1.5 bg-orange-50 text-orange-600 rounded hover:bg-orange-100"><Ban size={14} /></button>
                                        <button onClick={() => handleDelete(user.id, 'user')} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100"><Trash2 size={14} /></button>
                                    </>
                                )}
                            </div>
                        </div>
                    )})}
                </div>
            </div>
        )}

        {/* LOCKED USERS TAB */}
        {activeTab === 'blocked' && (
             <div className="space-y-4 animate-fade-in">
                <h3 className="font-bold text-gray-700">Usuários Bloqueados</h3>
                {lockedUsers.length === 0 ? (
                    <div className="text-center py-6 bg-white rounded-xl border border-dashed border-gray-300">
                        <Check className="mx-auto text-green-500 mb-1" size={24} />
                        <p className="text-xs text-gray-500">Nenhum usuário bloqueado no momento.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {lockedUsers.map(user => (
                            <div key={user.id} className="bg-red-50 p-3 rounded-xl shadow-sm border border-red-200 flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-red-800 text-sm">{user.name}</h4>
                                    <p className="text-xs text-red-600">{user.email}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">Tentativas Falhas: {user.failedLoginAttempts}</p>
                                </div>
                                <Button onClick={() => handleUnlockUser(user.id)} className="py-1 px-3 text-xs h-auto bg-green-600 hover:bg-green-700 shadow-none" icon={<Unlock size={14} />}>Desbloquear</Button>
                            </div>
                        ))}
                    </div>
                )}
             </div>
        )}

        {/* VENDORS TAB */}
        {activeTab === 'vendors' && (
            <div className="space-y-4 animate-fade-in">
                 <h3 className="font-bold text-gray-700 mb-2">Gestão de Comércios</h3>
                <div className="space-y-3">
                    {state.vendors.map(vendor => (
                        <div key={vendor.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-200">
                            <div className="flex items-center gap-3 mb-2">
                                <img src={vendor.photoUrl} alt={vendor.name} className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                                <div>
                                    <h3 className="font-bold text-sm text-gray-800 line-clamp-1">{vendor.name}</h3>
                                    <span className="text-[10px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-bold border border-sky-100">{vendor.categories[0]}</span>
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end border-t border-gray-50 pt-2">
                                <button onClick={() => openEditModal(vendor, 'vendor')} className="flex-1 py-1 bg-blue-50 text-blue-700 rounded text-[10px] font-bold hover:bg-blue-100 flex items-center justify-center gap-1"><Edit2 size={12} /> Editar</button>
                                <button onClick={() => handleBan(vendor, 'vendor')} className="flex-1 py-1 bg-orange-50 text-orange-700 rounded text-[10px] font-bold hover:bg-orange-100 flex items-center justify-center gap-1"><Ban size={12} /> Banir</button>
                                <button onClick={() => handleDelete(vendor.id, 'vendor')} className="px-3 bg-red-50 text-red-700 rounded text-[10px] font-bold hover:bg-red-100"><Trash2 size={12} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* BANNED TAB */}
        {activeTab === 'banned' && (
             <div className="space-y-4 animate-fade-in">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">Banimentos</h3>
                    <Button onClick={() => setBanModalOpen(true)} variant="danger" className="py-1 px-3 text-xs h-auto gap-1"><Gavel size={14} /> Novo</Button>
                </div>
                {state.bannedDocuments.length === 0 ? (
                    <div className="text-center py-6 bg-white rounded-xl border border-dashed border-gray-300">
                        <Check className="mx-auto text-green-500 mb-1" size={24} />
                        <p className="text-xs text-gray-500">Nenhum banimento ativo.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
                        {state.bannedDocuments.map((doc, idx) => (
                            <div key={idx} className="p-3 flex justify-between items-center">
                                <span className="font-mono text-xs text-gray-700">{doc}</span>
                                <button onClick={() => handleUnban(doc)} className="text-[10px] font-bold text-green-600 hover:underline border border-green-200 bg-green-50 px-2 py-1 rounded">Liberar</button>
                            </div>
                        ))}
                    </div>
                )}
             </div>
        )}

        {/* BRANDING CUSTOMIZATION TAB */}
        {activeTab === 'customization' && (
            <div className="space-y-6 animate-fade-in">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-sm text-gray-800 mb-4 border-b pb-2">Identidade Visual</h3>
                    
                    {/* Preview Area */}
                    <div className="mb-6 p-6 bg-gray-50 rounded-xl border border-gray-200 flex justify-center overflow-hidden relative">
                         <div className="absolute top-2 left-2 text-[10px] text-gray-400 font-bold uppercase">Preview</div>
                         <AppLogo customUrl={tempConfig.logoUrl} />
                    </div>

                    <div className="space-y-4">
                        <Input 
                            label="Nome do Aplicativo (Título)" 
                            value={tempConfig.appName} 
                            onChange={(e) => setTempConfig({...tempConfig, appName: e.target.value})} 
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cor Primária (Texto/Ícone)</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="color" 
                                        value={tempConfig.primaryColor}
                                        onChange={(e) => setTempConfig({...tempConfig, primaryColor: e.target.value})}
                                        className="h-10 w-10 rounded cursor-pointer border-0"
                                    />
                                    <input 
                                        type="text" 
                                        value={tempConfig.primaryColor}
                                        readOnly
                                        className="flex-1 border rounded px-2 text-xs text-gray-600 bg-gray-50"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cor Secundária (Destaque)</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="color" 
                                        value={tempConfig.secondaryColor}
                                        onChange={(e) => setTempConfig({...tempConfig, secondaryColor: e.target.value})}
                                        className="h-10 w-10 rounded cursor-pointer border-0"
                                    />
                                    <input 
                                        type="text" 
                                        value={tempConfig.secondaryColor}
                                        readOnly
                                        className="flex-1 border rounded px-2 text-xs text-gray-600 bg-gray-50"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tamanho da Logo ({tempConfig.logoWidth}px)</label>
                            <input 
                                type="range" 
                                min="100" 
                                max="500" 
                                value={tempConfig.logoWidth} 
                                onChange={(e) => setTempConfig({...tempConfig, logoWidth: parseInt(e.target.value)})}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        <div>
                            <PhotoSelector 
                                label="Upload de Nova Logo (Imagem)" 
                                currentPhotoUrl={tempConfig.logoUrl}
                                onPhotoSelected={handleLogoUpload}
                            />
                            {tempConfig.logoUrl && (
                                <button 
                                    onClick={() => setTempConfig({...tempConfig, logoUrl: null})}
                                    className="text-xs text-red-500 hover:underline mt-1"
                                >
                                    Remover logo personalizada (Usar padrão)
                                </button>
                            )}
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button fullWidth onClick={handleSaveConfig} disabled={isSavingConfig}>
                                {isSavingConfig ? 'Salvando...' : 'Aplicar Alterações'}
                            </Button>
                            <Button variant="outline" onClick={handleResetConfig} disabled={isSavingConfig}>
                                Restaurar Padrão
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* SECURITY TAB */}
        {activeTab === 'security' && (
            <div className="space-y-6 animate-fade-in">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-sm text-gray-800 mb-2">Alterar Senha Master</h3>
                    <div className="space-y-2">
                        <Input className="text-sm" label="Senha Atual" type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} />
                        <Input className="text-sm" label="Nova Senha" type="password" value={newMasterPass} onChange={e => setNewMasterPass(e.target.value)} />
                        <Input className="text-sm" label="Confirmar" type="password" value={confirmMasterPass} onChange={e => setConfirmMasterPass(e.target.value)} />
                        <Button fullWidth onClick={handleMasterPasswordChange} className="py-2 text-sm mt-2">Atualizar</Button>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                     <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-sm text-gray-800">Log de Acessos</h3>
                        <button onClick={() => dispatch({ type: 'CLEAR_SECURITY_LOGS' })} className="text-[10px] text-red-500 underline">Limpar</button>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                        {state.securityLogs && state.securityLogs.length > 0 ? (
                            state.securityLogs.map((log) => (
                                <div key={log.id} className="text-[10px] border-l-2 border-gray-200 pl-2 py-0.5">
                                    <span className={`font-bold ${log.action === 'LOGIN_SUCCESS' ? 'text-green-600' : 'text-gray-600'}`}>
                                        {log.action === 'LOGIN_SUCCESS' ? 'Login' : log.action}
                                    </span>
                                    <span className="text-gray-400 ml-2">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                    <p className="text-gray-500 truncate">{log.details}</p>
                                </div>
                            ))
                        ) : <p className="text-xs text-gray-400 italic">Vazio.</p>}
                    </div>
                    {isMaster && (
                         <Button variant="danger" fullWidth className="mt-4 py-2 text-xs" onClick={handleFactoryReset} icon={<Database size={14} />}>Resetar Banco de Dados</Button>
                     )}
                </div>
            </div>
        )}

        {/* DISTRIBUTE TAB */}
        {activeTab === 'distribute' && (
             <div className="space-y-4 animate-fade-in">
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                     <h3 className="font-bold text-gray-800 text-sm mb-2 flex items-center gap-2">
                         <Github size={16} /> GitHub Pages
                     </h3>
                     <p className="text-xs text-gray-500 mb-2">O app está pronto para hospedagem.</p>
                     <div className="text-xs bg-gray-50 p-2 rounded text-gray-600">
                        Faça upload dos arquivos para um repositório GitHub e ative o <strong>Pages</strong> na branch main.
                     </div>
                 </div>
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                     <h3 className="font-bold text-gray-800 text-sm mb-2 flex items-center gap-2">
                         <Globe size={16} /> Link & Compartilhamento
                     </h3>
                     <div className="flex gap-2 mb-2">
                         <div className="flex-1 bg-gray-50 border border-gray-200 rounded px-2 py-2 text-xs text-gray-600 truncate font-mono">
                             {window.location.href.split('#')[0]}
                         </div>
                         <button onClick={copyLink} className={`px-3 rounded font-bold transition-all text-xs text-white flex items-center gap-1 ${copied ? 'bg-green-500' : 'bg-gray-800'}`}>
                             {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copiado' : 'Copiar'}
                         </button>
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                         <Button variant="primary" icon={<Smartphone size={14} />} onClick={handleNativeShare} className="py-2 text-xs bg-blue-600 hover:bg-blue-700">Compartilhar App</Button>
                         <Button variant="primary" icon={<Share2 size={14} />} onClick={() => {
                                const text = `Acesse nosso app: ${window.location.href.split('#')[0]}`;
                                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                            }} className="py-2 text-xs bg-green-600 hover:bg-green-700">WhatsApp</Button>
                     </div>
                 </div>
             </div>
        )}
      </div>

      {/* --- MODALS --- */}
      <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title="Editar Registro">
          <div className="space-y-4">
              <Input label="Nome" value={editName} onChange={e => setEditName(e.target.value)} />
              {editingItem?.dataType === 'user' && (
                  <>
                    <Input label="E-mail" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                    <Input label="CPF" value={editDoc} onChange={e => setEditDoc(e.target.value)} />
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Acesso</label>
                        <select 
                            value={editType} 
                            onChange={(e) => setEditType(e.target.value as UserType)}
                            className="w-full border border-gray-300 rounded-lg p-2"
                            disabled={editEmail === APP_CONFIG.EMAILJS.ADMIN_EMAIL}
                        >
                            <option value={UserType.USER}>Usuário Comum</option>
                            <option value={UserType.ADMIN}>Administrador</option>
                        </select>
                    </div>
                  </>
              )}
              {editingItem?.dataType === 'vendor' && (
                  <Input label="Documento (CNPJ/CPF)" value={editDoc} onChange={e => setEditDoc(e.target.value)} />
              )}
              <Input label="Endereço" value={editAddress} onChange={e => setEditAddress(e.target.value)} />
              <Button onClick={saveEdit} fullWidth>Salvar</Button>
          </div>
      </Modal>

      <Modal isOpen={isCreateUserModalOpen} onClose={() => setCreateUserModalOpen(false)} title="Criar Novo Usuário">
          <div className="space-y-4">
              <Input label="Nome" value={newUserName} onChange={e => setNewUserName(e.target.value)} />
              <Input label="E-mail" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} />
              <div className="flex gap-2">
                    <button onClick={() => setNewUserType(UserType.USER)} className={`flex-1 py-2 rounded border text-xs font-bold ${newUserType === UserType.USER ? 'bg-primary text-white' : 'bg-gray-50'}`}>Usuário</button>
                    <button onClick={() => setNewUserType(UserType.ADMIN)} className={`flex-1 py-2 rounded border text-xs font-bold ${newUserType === UserType.ADMIN ? 'bg-sky-600 text-white' : 'bg-gray-50'}`}>Admin</button>
              </div>
              <Button onClick={handleCreateUser} fullWidth>Criar Conta</Button>
          </div>
      </Modal>

      <Modal isOpen={isBanModalOpen} onClose={() => setBanModalOpen(false)} title="Bloqueio Manual">
          <div className="space-y-4">
              <Input label="E-mail, CPF ou CNPJ" value={manualBanInput} onChange={e => setManualBanInput(e.target.value)} />
              <Button onClick={handleManualBan} variant="danger" fullWidth>Banir</Button>
          </div>
      </Modal>

      <TwoFactorModal isOpen={is2FAOpen} onClose={() => set2FAOpen(false)} onSuccess={on2FASuccess} actionTitle={actionTitle} destination={state.currentUser?.email} />

      {imageToCrop && (
          <ImageCropper 
            imageSrc={imageToCrop}
            onCropComplete={handleLogoCrop}
            onCancel={() => setImageToCrop(null)}
          />
      )}
    </div>
  );
};
