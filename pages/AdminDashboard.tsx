
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Store, Trash2, Edit2, Plus, Gavel, Ban, Share2, Check, ShoppingBag, Globe, Copy, Github, AlertTriangle, KeyRound, Lock, ShieldAlert, History, Database, Unlock, Mail, Smartphone, Palette, Upload, X, ZoomIn, RefreshCw, Save, Download, Crown, Zap } from 'lucide-react';
import { useAppContext } from '../App';
import { Button, Input, Modal, TwoFactorModal, PhotoSelector, ImageCropper, AppLogo } from '../components/UI';
import { UserType, User as IUser, Vendor, AppConfig } from '../types';
import { subscribeToUsers, updateAppConfig, updateVendorPartial } from '../services/firebaseService';
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

  // Highlight State
  const [isHighlightModalOpen, setHighlightModalOpen] = useState(false);
  const [highlightingVendor, setHighlightingVendor] = useState<Vendor | null>(null);

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

  const openHighlightModal = (vendor: Vendor) => {
      setHighlightingVendor(vendor);
      setHighlightModalOpen(true);
  };

  const applyHighlight = async (days: number) => {
      if (!highlightingVendor) return;

      let timestamp = 0;
      if (days > 0) {
          timestamp = Date.now() + (days * 24 * 60 * 60 * 1000);
      }

      try {
          // Update via Firebase Service
          await updateVendorPartial(highlightingVendor.id, { featuredUntil: timestamp });
          
          // Update Local State
          const updatedVendor = { ...highlightingVendor, featuredUntil: timestamp };
          dispatch({ type: 'UPDATE_VENDOR', payload: updatedVendor });
          
          dispatch({ 
            type: 'ADD_SECURITY_LOG', 
            payload: { action: 'FEATURE_VENDOR', details: `Destaque aplicado para ${highlightingVendor.name} por ${days} dias.` } 
          });

          alert(days > 0 ? "Destaque aplicado com sucesso!" : "Destaque removido.");
          setHighlightModalOpen(false);
      } catch (error: any) {
          alert("Erro ao aplicar destaque: " + error.message);
      }
  };

  const saveEdit = () => {
      if (!editingItem) return;

      if (editingItem.dataType === 'user') {
          const isEditingSelf = state.currentUser?.id === editingItem.id;
          
          if (editingItem.email === APP_CONFIG.EMAILJS.ADMIN_EMAIL && !isEditingSelf) {
              alert("Não é permitido alterar o usuário Master.");
              return;
          }

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
              appDescription: "Descubra os melhores serviços e comércios da região em um só lugar.",
              descriptionColor: "#64748b",
              logoUrl: null,
              logoWidth: 300,
              primaryColor: "#0ea5e9",
              secondaryColor: "#facc15"
          };
          setTempConfig(defaultConfig);
          updateAppConfig(defaultConfig).then(c => dispatch({ type: 'SET_APP_CONFIG', payload: c }));
      }
  };

  const handleDownloadLogo = () => {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const width = 1000;
        const height = 400; // Aspect ratio of the SVG viewbox (250x100)
        canvas.width = width;
        canvas.height = height;

        const img = new Image();
        img.crossOrigin = "Anonymous";

        let src = "";

        if (tempConfig.logoUrl) {
            src = tempConfig.logoUrl;
        } else {
            // Construct the Default SVG string (Replicating AppLogo Logic)
            const svgData = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="25 20 250 100" width="${width}" height="${height}">
                <defs>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
                    <feOffset dx="1.5" dy="1.5" result="offsetblur"/>
                    <feComponentTransfer>
                    <feFuncA type="linear" slope="0.4"/>
                    </feComponentTransfer>
                    <feMerge> 
                    <feMergeNode/>
                    <feMergeNode in="SourceGraphic"/> 
                    </feMerge>
                </filter>
                </defs>

                <text x="150" y="45" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="26" font-weight="900" fill="${tempConfig.primaryColor}" letter-spacing="0.5">
                    ${tempConfig.appName}
                </text>

                <g transform="translate(105, 55)">
                    <line x1="25" y1="30" x2="25" y2="70" stroke="#0c4a6e" stroke-width="5" />
                    <line x1="25" y1="50" x2="65" y2="50" stroke="#0c4a6e" stroke-width="5" />

                    <g transform="translate(25, 30)">
                        <circle r="19" fill="white" stroke="${tempConfig.secondaryColor}" stroke-width="3" filter="url(#shadow)"/>
                        <g transform="translate(-10, -10) scale(0.8)">
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" fill="${tempConfig.secondaryColor}" opacity="0.2"/>
                            <path d="M16 10a4 4 0 0 1-8 0" stroke="${tempConfig.secondaryColor}" stroke-width="3" fill="none" stroke-linecap="round"/>
                            <path d="M3 6h18" stroke="${tempConfig.secondaryColor}" stroke-width="2"/>
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6z" stroke="${tempConfig.secondaryColor}" stroke-width="2" fill="none"/>
                        </g>
                    </g>

                    <g transform="translate(25, 70)">
                        <circle r="19" fill="white" stroke="${tempConfig.primaryColor}" stroke-width="3" filter="url(#shadow)"/>
                        <g transform="translate(-9, -9) scale(0.75)">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" fill="${tempConfig.primaryColor}"/>
                        </g>
                    </g>

                    <g transform="translate(65, 50)">
                        <circle r="19" fill="white" stroke="#0c4a6e" stroke-width="3" filter="url(#shadow)"/>
                        <g transform="translate(-9, -9) scale(0.75)">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" fill="none" stroke="#0c4a6e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                            <circle cx="12" cy="7" r="4" fill="#0c4a6e"/>
                        </g>
                    </g>
                </g>
            </svg>`;
            src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        }

        img.src = src;
        img.onload = () => {
            if (ctx) {
                // If using custom image, keep aspect ratio
                if (tempConfig.logoUrl) {
                    const aspect = img.width / img.height;
                    canvas.height = canvas.width / aspect;
                    canvas.width = 1000;
                    canvas.height = 1000 / aspect;
                }
                
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const pngUrl = canvas.toDataURL("image/png");
                
                const link = document.createElement('a');
                link.download = `logo-${tempConfig.appName.replace(/\s+/g, '-').toLowerCase()}.png`;
                link.href = pngUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        };
    } catch (e) {
        console.error("Download failed", e);
        alert("Erro ao gerar imagem para download.");
    }
  };

  const isMaster = state.currentUser?.type === UserType.MASTER;
  const lockedUsers = state.users.filter(u => u.lockedUntil && u.lockedUntil > Date.now());

  return (
    <div className="animate-fade-in mt-4 border-t border-gray-100 pt-6">
      {/* ... Header and Tabs ... */}
      <div className="flex items-center gap-3 mb-4 px-2">
          <div className="bg-sky-100 p-2 rounded-lg">
             <ShieldAlert className="text-sky-700" size={24} />
          </div>
          <div>
             <h2 className="text-xl font-bold text-sky-900">Painel de Controle</h2>
             <p className="text-xs text-sky-600">Área Administrativa Integrada</p>
          </div>
      </div>

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
                {/* ... User List ... */}
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
                                    <p className="text-xs text-gray-500">{user.email}</p>
                                    <p className="text-[10px] text-gray-400">{user.type === UserType.VENDOR ? 'Conta Comercial' : 'Cliente Padrão'} • {user.cpf}</p>
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                                {canEdit && (
                                    <>
                                        <button onClick={() => openEditModal(user, 'user')} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleSendResetLink(user)} className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg" title="Enviar link de redefinição de senha">
                                            <Mail size={16} />
                                        </button>
                                    </>
                                )}
                                {isMaster && !isMasterUser && (
                                    <>
                                        <button onClick={() => handleBan(user, 'user')} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Banir Usuário">
                                            <Ban size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(user.id, 'user')} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Excluir">
                                            <Trash2 size={16} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                        );
                    })}
                </div>
            </div>
        )}

        {/* VENDORS TAB */}
        {activeTab === 'vendors' && (
            <div className="space-y-4 animate-fade-in">
                <h3 className="font-bold text-gray-700 mb-2">Gestão de Comércios</h3>
                <div className="space-y-3">
                    {state.vendors.map(vendor => {
                        const isFeatured = vendor.featuredUntil && vendor.featuredUntil > Date.now();
                        return (
                        <div key={vendor.id} className={`bg-white p-3 rounded-xl shadow-sm border flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 ${isFeatured ? 'border-amber-300 bg-amber-50' : 'border-gray-200'}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden">
                                    <img src={vendor.photoUrl} alt={vendor.name} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-gray-800 flex items-center gap-1">
                                        {vendor.name}
                                        {isFeatured && <Crown size={12} className="text-amber-500 fill-amber-500" />}
                                    </h3>
                                    <p className="text-xs text-gray-500">{vendor.categories.join(', ')}</p>
                                    <div className="flex gap-2 mt-1">
                                         <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100">
                                            {vendor.subtype === 'SERVICE' ? 'Serviço' : 'Comércio'}
                                         </span>
                                         <span className="text-xs text-gray-400">{vendor.document}</span>
                                    </div>
                                    {isFeatured && (
                                        <p className="text-[10px] text-amber-600 font-bold mt-1">
                                            Destaque até: {new Date(vendor.featuredUntil!).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => openHighlightModal(vendor)} className={`p-2 rounded-lg ${isFeatured ? 'text-amber-600 bg-amber-100' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'}`} title="Destacar / Promover">
                                    <Crown size={16} />
                                </button>
                                <button onClick={() => openEditModal(vendor, 'vendor')} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                                    <Edit2 size={16} />
                                </button>
                                {isMaster && (
                                    <>
                                        <button onClick={() => handleBan(vendor, 'vendor')} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Banir CNPJ">
                                            <Ban size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(vendor.id, 'vendor')} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                            <Trash2 size={16} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )})}
                </div>
            </div>
        )}
        
        {/* ... Other Tabs (Blocked, Banned, Security, Customization, Distribute) ... */}
        {activeTab === 'blocked' && (
             <div className="space-y-4 animate-fade-in">
                {/* ... Blocked Content ... */}
                <div className="bg-red-50 p-3 rounded-lg border border-red-200 mb-4">
                    <h3 className="text-sm font-bold text-red-800 flex items-center gap-2">
                        <Lock size={16} /> Contas Bloqueadas Temporariamente
                    </h3>
                    <p className="text-xs text-red-600 mt-1">
                        Usuários que erraram a senha 3 vezes consecutivas. O bloqueio dura 5 minutos, mas pode ser removido manualmente aqui.
                    </p>
                </div>

                {lockedUsers.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <Check size={32} className="mx-auto mb-2 text-green-400" />
                        <p className="text-sm">Nenhum usuário bloqueado no momento.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                         {lockedUsers.map(user => (
                             <div key={user.id} className="bg-white p-3 rounded-xl shadow-sm border border-red-200 flex justify-between items-center">
                                 <div>
                                     <h3 className="font-bold text-sm text-gray-800">{user.name}</h3>
                                     <p className="text-xs text-red-500 font-semibold">{user.email}</p>
                                     <p className="text-[10px] text-gray-400 mt-1">
                                         Bloqueado até: {new Date(user.lockedUntil || 0).toLocaleTimeString()}
                                     </p>
                                 </div>
                                 <Button variant="outline" onClick={() => handleUnlockUser(user.id)} className="text-xs h-8 border-red-200 text-red-600 hover:bg-red-50">
                                     <Unlock size={14} className="mr-1" /> Desbloquear
                                 </Button>
                             </div>
                         ))}
                    </div>
                )}
             </div>
        )}

        {activeTab === 'banned' && (
            <div className="space-y-4 animate-fade-in">
                 {/* ... Banned Content ... */}
                 <div className="flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">Lista Negra (Banidos)</h3>
                    <Button onClick={() => setBanModalOpen(true)} className="py-1 px-3 text-xs h-auto bg-red-600 hover:bg-red-700 shadow-none text-white">
                        Bloquear Manualmente
                    </Button>
                 </div>
                 {state.bannedDocuments.length === 0 ? (
                     <p className="text-center text-gray-400 text-sm py-4">Nenhum documento banido.</p>
                 ) : (
                     <div className="space-y-2">
                         {state.bannedDocuments.map((doc, idx) => (
                             <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 flex justify-between items-center">
                                 <span className="text-sm font-mono text-gray-600">{doc}</span>
                                 <button onClick={() => handleUnban(doc)} className="text-xs text-green-600 hover:underline">
                                     Remover Bloqueio
                                 </button>
                             </div>
                         ))}
                     </div>
                 )}
            </div>
        )}

        {activeTab === 'security' && (
             <div className="space-y-6 animate-fade-in">
                 {/* ... Security Content ... */}
                 <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                     <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                         <KeyRound size={18} className="text-purple-600" /> 
                         Alterar Senha Master
                     </h3>
                     <div className="space-y-3">
                         <Input label="Senha Atual" type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} />
                         <Input label="Nova Senha" type="password" value={newMasterPass} onChange={e => setNewMasterPass(e.target.value)} />
                         <Input label="Confirmar Nova Senha" type="password" value={confirmMasterPass} onChange={e => setConfirmMasterPass(e.target.value)} />
                         <Button fullWidth onClick={handleMasterPasswordChange} className="bg-purple-600 hover:bg-purple-700">Atualizar Senha Master</Button>
                     </div>
                 </div>

                 <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                     <div className="flex justify-between items-center mb-4">
                         <h3 className="font-bold text-gray-800 flex items-center gap-2">
                             <History size={18} className="text-gray-600" />
                             Logs de Atividade
                         </h3>
                         <button 
                            onClick={() => dispatch({ type: 'CLEAR_SECURITY_LOGS' })}
                            className="text-xs text-gray-400 hover:text-red-500"
                         >
                             Limpar
                         </button>
                     </div>
                     <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                         {state.securityLogs.length === 0 ? (
                             <p className="text-xs text-gray-400 text-center italic">Nenhum registro de segurança.</p>
                         ) : (
                             state.securityLogs.map((log, idx) => (
                                 <div key={idx} className="text-xs p-2 bg-gray-50 rounded border border-gray-100">
                                     <div className="flex justify-between font-semibold mb-1">
                                         <span className={log.action === 'LOGIN_FAIL' ? 'text-red-500' : 'text-blue-500'}>{log.action}</span>
                                         <span className="text-gray-400">{new Date(log.timestamp).toLocaleString()}</span>
                                     </div>
                                     <p className="text-gray-600">{log.details}</p>
                                 </div>
                             ))
                         )}
                     </div>
                 </div>

                 <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                     <h3 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                         <Database size={18} /> Zona de Perigo
                     </h3>
                     <p className="text-xs text-red-600 mb-4">
                         Ações irreversíveis que afetam todo o banco de dados.
                     </p>
                     <Button variant="danger" fullWidth onClick={handleFactoryReset}>
                         Resetar Banco de Dados (Factory Reset)
                     </Button>
                 </div>
             </div>
        )}
        
        {activeTab === 'customization' && (
            <div className="space-y-6 animate-fade-in">
                {/* ... Customization Content ... */}
                <div className="bg-white p-4 rounded-xl border border-gray-200">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                             <Palette size={18} className="text-sky-600" /> Identidade Visual
                        </h3>
                        <Button variant="outline" onClick={handleResetConfig} className="text-xs h-8">
                            <RefreshCw size={12} className="mr-1" /> Restaurar Padrão
                        </Button>
                     </div>

                     <div className="space-y-4">
                         <Input 
                            label="Nome do Aplicativo" 
                            value={tempConfig.appName} 
                            onChange={e => setTempConfig({...tempConfig, appName: e.target.value})} 
                         />
                         <Input 
                            label="Descrição / Slogan (Aceita várias linhas)" 
                            value={tempConfig.appDescription} 
                            onChange={e => setTempConfig({...tempConfig, appDescription: e.target.value})} 
                            placeholder="Ex: O melhor guia da cidade\nBaixe agora!"
                            multiline
                         />

                         <div>
                             <label className="block text-sm font-medium text-gray-700 mb-2">Logo do App</label>
                             <PhotoSelector 
                                label="Enviar Logo Customizada"
                                currentPhotoUrl={tempConfig.logoUrl}
                                onPhotoSelected={handleLogoUpload}
                             />
                         </div>

                         <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">
                                 Tamanho da Logo: {tempConfig.logoWidth}px
                             </label>
                             <input 
                                type="range" 
                                min="100" 
                                max="500" 
                                value={tempConfig.logoWidth} 
                                onChange={e => setTempConfig({...tempConfig, logoWidth: parseInt(e.target.value)})}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                             />
                         </div>

                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                 <label className="block text-sm font-medium text-gray-700 mb-1">Cor Primária</label>
                                 <div className="flex items-center gap-2">
                                     <input 
                                        type="color" 
                                        value={tempConfig.primaryColor}
                                        onChange={e => setTempConfig({...tempConfig, primaryColor: e.target.value})}
                                        className="h-10 w-10 rounded cursor-pointer border-0"
                                     />
                                     <span className="text-xs text-gray-500 font-mono">{tempConfig.primaryColor}</span>
                                 </div>
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-gray-700 mb-1">Cor Secundária</label>
                                 <div className="flex items-center gap-2">
                                     <input 
                                        type="color" 
                                        value={tempConfig.secondaryColor}
                                        onChange={e => setTempConfig({...tempConfig, secondaryColor: e.target.value})}
                                        className="h-10 w-10 rounded cursor-pointer border-0"
                                     />
                                     <span className="text-xs text-gray-500 font-mono">{tempConfig.secondaryColor}</span>
                                 </div>
                             </div>
                             <div className="col-span-2">
                                 <label className="block text-sm font-medium text-gray-700 mb-1">Cor da Descrição/Slogan</label>
                                 <div className="flex items-center gap-2">
                                     <input 
                                        type="color" 
                                        value={tempConfig.descriptionColor || '#64748b'}
                                        onChange={e => setTempConfig({...tempConfig, descriptionColor: e.target.value})}
                                        className="h-10 w-10 rounded cursor-pointer border-0"
                                     />
                                     <span className="text-xs text-gray-500 font-mono">{tempConfig.descriptionColor || '#64748b'}</span>
                                 </div>
                             </div>
                         </div>
                     </div>
                </div>

                <div className="border border-gray-200 rounded-3xl overflow-hidden relative shadow-xl bg-sky-50 aspect-[9/16] max-w-xs mx-auto flex flex-col">
                    <div className="bg-white/80 backdrop-blur-md p-4 pt-8 text-center border-b border-sky-100">
                         <div className="transform origin-top transition-all duration-300">
                             <AppLogo config={tempConfig} />
                         </div>
                         <p 
                            className="text-[10px] mt-4 px-4 font-medium"
                            style={{ 
                                color: tempConfig.descriptionColor || '#6b7280',
                                whiteSpace: 'pre-wrap'
                            }}
                         >
                            {tempConfig.appDescription}
                         </p>
                    </div>
                    <div className="flex-1 p-4 overflow-hidden">
                        <div className="space-y-3 opacity-50 pointer-events-none">
                             <div className="h-10 bg-white rounded-xl w-full"></div>
                             <div className="flex gap-2">
                                 <div className="h-8 w-20 bg-white rounded-lg"></div>
                                 <div className="h-8 w-20 bg-white rounded-lg"></div>
                             </div>
                             <div className="h-32 bg-white rounded-2xl w-full"></div>
                             <div className="h-32 bg-white rounded-2xl w-full"></div>
                        </div>
                    </div>
                    
                    <div className="absolute bottom-4 left-0 right-0 px-4">
                        <Button fullWidth onClick={handleSaveConfig} disabled={isSavingConfig} icon={<Save size={18} />}>
                            {isSavingConfig ? 'Aplicando...' : 'Salvar Alterações'}
                        </Button>
                    </div>
                </div>

                <div className="text-center pb-4">
                    <p className="text-xs text-gray-400 mb-2">Precisa da logo para marketing?</p>
                    <Button 
                        variant="outline" 
                        onClick={handleDownloadLogo} 
                        icon={<Download size={16} />}
                        className="mx-auto"
                    >
                        Baixar Logo (PNG)
                    </Button>
                    <p className="text-[10px] text-gray-400 mt-1">Alta resolução com fundo transparente</p>
                </div>
            </div>
        )}

        {activeTab === 'distribute' && (
            <div className="space-y-6 animate-fade-in text-center">
                 {/* ... Distribute Content ... */}
                 <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                     <div className="bg-sky-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                         <Share2 size={32} className="text-sky-600" />
                     </div>
                     <h3 className="font-bold text-gray-800 text-lg mb-2">Compartilhe o App</h3>
                     <p className="text-gray-600 text-sm mb-6 max-w-xs mx-auto">
                         Envie o link do aplicativo para clientes e parceiros aumentarem o alcance.
                     </p>

                     <div className="bg-gray-100 p-3 rounded-lg flex items-center justify-between mb-4 border border-gray-200">
                         <span className="text-xs text-gray-600 font-mono truncate mr-2">{window.location.href.split('#')[0]}</span>
                         <button onClick={copyLink} className="text-sky-600 hover:text-sky-700">
                             {copied ? <Check size={16} /> : <Copy size={16} />}
                         </button>
                     </div>

                     <Button fullWidth onClick={handleNativeShare}>
                         Compartilhar Link
                     </Button>
                 </div>
                 
                 <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-4">QR Code de Instalação</h3>
                      <div className="bg-white p-2 inline-block rounded-xl border border-gray-100 shadow-sm">
                           <img 
                             src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${window.location.href.split('#')[0]}`} 
                             alt="QR Code" 
                             className="w-40 h-40"
                           />
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Escaneie para abrir</p>
                 </div>
            </div>
        )}

      </div>

      {/* MODALS */}
      
      {/* Edit User Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title={`Editar ${editingItem?.dataType === 'user' ? 'Usuário' : 'Comércio'}`}>
          <div className="space-y-4">
              <Input label="Nome" value={editName} onChange={e => setEditName(e.target.value)} />
              {editingItem?.dataType === 'user' ? (
                  <>
                      <Input label="E-mail (Login)" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                      <Input label="CPF" value={editDoc} onChange={e => setEditDoc(e.target.value)} />
                      <div className="mb-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Conta</label>
                          <select 
                            value={editType} 
                            onChange={(e) => setEditType(e.target.value as UserType)}
                            className="w-full px-4 py-2 border rounded-lg bg-white"
                          >
                              <option value={UserType.USER}>Usuário Comum</option>
                              <option value={UserType.VENDOR}>Conta Comercial</option>
                              <option value={UserType.ADMIN}>Administrador</option>
                          </select>
                      </div>
                  </>
              ) : (
                  <Input label="Documento (CNPJ/CPF)" value={editDoc} onChange={e => setEditDoc(e.target.value)} />
              )}
              <Input label="Endereço" value={editAddress} onChange={e => setEditAddress(e.target.value)} />
              
              <Button fullWidth onClick={saveEdit}>Salvar Alterações</Button>
          </div>
      </Modal>

      {/* Create User Modal */}
      <Modal isOpen={isCreateUserModalOpen} onClose={() => setCreateUserModalOpen(false)} title="Novo Usuário">
          <div className="space-y-4">
              <Input label="Nome" value={newUserName} onChange={e => setNewUserName(e.target.value)} />
              <Input label="E-mail" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} />
              <div className="mb-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Conta</label>
                  <select 
                    value={newUserType} 
                    onChange={(e) => setNewUserType(e.target.value as UserType)}
                    className="w-full px-4 py-2 border rounded-lg bg-white"
                  >
                      <option value={UserType.USER}>Usuário Comum</option>
                      <option value={UserType.VENDOR}>Conta Comercial</option>
                      <option value={UserType.ADMIN}>Administrador</option>
                  </select>
              </div>
              <p className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
                  A senha padrão será <strong>123</strong>. O usuário deve alterá-la no primeiro acesso.
              </p>
              <Button fullWidth onClick={handleCreateUser}>Criar Usuário</Button>
          </div>
      </Modal>

      {/* Highlight Vendor Modal */}
      <Modal isOpen={isHighlightModalOpen} onClose={() => setHighlightModalOpen(false)} title="Destacar Comércio">
          <div className="space-y-4 text-center">
              <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Crown size={32} className="text-amber-500" />
              </div>
              <p className="text-sm text-gray-600 mb-4">
                  Promover <strong>{highlightingVendor?.name}</strong> para o topo da lista.
              </p>
              
              <div className="grid grid-cols-1 gap-3">
                  <button onClick={() => applyHighlight(2)} className="bg-white border border-gray-200 p-3 rounded-xl hover:bg-amber-50 hover:border-amber-300 flex justify-between items-center group">
                       <span className="font-bold text-gray-700 group-hover:text-amber-700">2 Dias</span>
                       <Zap size={16} className="text-gray-300 group-hover:text-amber-500" />
                  </button>
                  <button onClick={() => applyHighlight(7)} className="bg-white border border-gray-200 p-3 rounded-xl hover:bg-amber-50 hover:border-amber-300 flex justify-between items-center group">
                       <span className="font-bold text-gray-700 group-hover:text-amber-700">1 Semana</span>
                       <Zap size={16} className="text-gray-300 group-hover:text-amber-500" />
                  </button>
                  <button onClick={() => applyHighlight(30)} className="bg-white border border-gray-200 p-3 rounded-xl hover:bg-amber-50 hover:border-amber-300 flex justify-between items-center group">
                       <span className="font-bold text-gray-700 group-hover:text-amber-700">1 Mês</span>
                       <Zap size={16} className="text-gray-300 group-hover:text-amber-500" />
                  </button>
                  
                  {highlightingVendor?.featuredUntil && highlightingVendor.featuredUntil > Date.now() && (
                      <button onClick={() => applyHighlight(0)} className="mt-2 text-red-500 text-sm font-semibold hover:underline">
                          Remover Destaque Atual
                      </button>
                  )}
              </div>
          </div>
      </Modal>

      {/* Manual Ban Modal */}
      <Modal isOpen={isBanModalOpen} onClose={() => setBanModalOpen(false)} title="Bloqueio Manual">
          <div className="space-y-4">
              <p className="text-sm text-gray-600">
                  Digite o CPF, CNPJ ou E-mail que deseja banir permanentemente.
              </p>
              <Input label="Documento ou E-mail" value={manualBanInput} onChange={e => setManualBanInput(e.target.value)} placeholder="000.000.000-00" />
              <Button fullWidth onClick={handleManualBan} variant="danger">Confirmar Bloqueio</Button>
          </div>
      </Modal>

      {/* 2FA Modal */}
      <TwoFactorModal 
         isOpen={is2FAOpen}
         onClose={() => set2FAOpen(false)}
         onSuccess={on2FASuccess}
         actionTitle={actionTitle}
         destination={state.currentUser?.email}
      />
      
      {/* Cropper */}
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
