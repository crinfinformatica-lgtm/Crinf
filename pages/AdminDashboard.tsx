
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, User, Store, Trash2, Edit2, Plus, Gavel, Ban, Share2, Check, ShoppingBag, Globe, Copy, Github, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../App';
import { Button, Input, Modal, TwoFactorModal, AdminLogo } from '../components/UI';
import { UserType, User as IUser, Vendor } from '../types';

export const AdminDashboard: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'vendors' | 'banned' | 'distribute'>('users');
  
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

  // Form State
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDoc, setEditDoc] = useState(''); // CPF/CNPJ
  const [editAddress, setEditAddress] = useState('');
  const [editType, setEditType] = useState<UserType>(UserType.USER);
  
  // Copy State
  const [copied, setCopied] = useState(false);

  // Define on2FASuccess handler
  const on2FASuccess = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    set2FAOpen(false);
  };

  // Redirect if not admin or master
  React.useEffect(() => {
    if (!state.currentUser) {
        navigate('/admin-login'); // Redirect to specific admin login
    } else if (state.currentUser.type !== UserType.ADMIN && state.currentUser.type !== UserType.MASTER) {
        navigate('/'); // Regular users go home
    }
  }, [state.currentUser, navigate]);

  const handleDelete = (id: string, type: 'user' | 'vendor') => {
    // Exclusão direta sem 2FA conforme solicitado
    if (type === 'user') {
        dispatch({ type: 'DELETE_USER', payload: id });
    } else {
        dispatch({ type: 'DELETE_VENDOR', payload: id });
    }
  };

  const handleBan = (item: IUser | Vendor, type: 'user' | 'vendor') => {
      const doc = type === 'user' ? (item as IUser).cpf : (item as Vendor).document;
      const email = type === 'user' ? (item as IUser).email : null;
      
      // Execução direta para garantir funcionamento (removido window.confirm que pode falhar)
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

  const openEditModal = (item: any, type: 'user' | 'vendor') => {
      setEditingItem({ ...item, dataType: type });
      setEditName(item.name);
      setEditEmail(item.email || ''); // Vendors might not have email in this simplified model
      setEditDoc(type === 'user' ? item.cpf : item.document);
      setEditAddress(item.address);
      setEditType(item.type || UserType.USER);
      setEditModalOpen(true);
  };

  const saveEdit = () => {
      if (!editingItem) return;

      if (editingItem.dataType === 'user') {
          // Master Protection check
          if (editingItem.email === 'crinf.informatica@gmail.com') {
              alert("Não é permitido alterar o usuário Master.");
              return;
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
      } else {
          const updatedVendor = {
              ...editingItem,
              name: editName,
              document: editDoc,
              address: editAddress
              // In a real app we would edit all fields
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
          cpf: '000.000.000-00', // Placeholder
          address: 'Criado pelo Admin',
          type: newUserType,
          password: '123' // Default password
      };
      
      dispatch({ type: 'ADD_USER', payload: newUser });
      setCreateUserModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
  };

  const copyLink = () => {
      const url = window.location.href.replace('#/admin', '');
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const isMaster = state.currentUser?.type === UserType.MASTER;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-sky-50 pb-20">
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        
        <div className="flex justify-between items-center relative z-10">
            <div className="flex items-center gap-3">
                <div className="bg-slate-800 p-2 rounded-xl border border-slate-700 shadow-sm">
                    <AdminLogo />
                </div>
                <div>
                    <h1 className="text-xl font-bold">Painel de Controle</h1>
                    <p className="text-slate-400 text-xs flex items-center gap-1">
                        <Shield size={10} className="text-sky-400" /> 
                        {isMaster ? 'Acesso Master (Crinf)' : 'Acesso Administrador'}
                    </p>
                </div>
            </div>
            <button 
                onClick={() => navigate('/settings')}
                className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg text-slate-300 transition-colors"
            >
                Sair
            </button>
        </div>

        {/* Navigation Tabs - Changed to flex-wrap to ensure visibility on all screens */}
        <div className="flex mt-8 gap-2 flex-wrap pb-2 pr-4">
            {[
                { id: 'users', icon: User, label: 'Usuários' },
                { id: 'vendors', icon: Store, label: 'Comércios' },
                { id: 'banned', icon: Ban, label: 'Banidos' },
                { id: 'distribute', icon: Share2, label: 'Distribuição' }
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex-grow sm:flex-grow-0 justify-center ${activeTab === tab.id ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                    <tab.icon size={16} />
                    <span>{tab.label}</span>
                </button>
            ))}
        </div>
      </div>

      <div className="p-4 max-w-6xl mx-auto">
        
        {/* USERS TAB */}
        {activeTab === 'users' && (
            <div className="space-y-4 animate-fade-in">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Usuários Cadastrados</h2>
                        <p className="text-xs text-gray-500">Gerencie clientes e administradores</p>
                    </div>
                    <Button onClick={() => setCreateUserModalOpen(true)} className="py-2 px-4 text-xs h-auto gap-1">
                        <Plus size={16} /> Novo
                    </Button>
                </div>

                <div className="space-y-3">
                    {state.users.map(user => (
                        <div key={user.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center group hover:shadow-md transition-all">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${user.type === UserType.MASTER ? 'bg-purple-600' : user.type === UserType.ADMIN ? 'bg-sky-600' : 'bg-gray-400'}`}>
                                    {user.name[0]}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-gray-800">{user.name}</h3>
                                        {user.type === UserType.MASTER && <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded font-bold border border-purple-200">MASTER</span>}
                                        {user.type === UserType.ADMIN && <span className="bg-sky-100 text-sky-700 text-[10px] px-1.5 py-0.5 rounded font-bold border border-sky-200">ADMIN</span>}
                                    </div>
                                    <p className="text-xs text-gray-500">{user.email}</p>
                                    <p className="text-[10px] text-gray-400 font-mono">CPF: {user.cpf}</p>
                                </div>
                            </div>
                            
                            {/* Actions - Protect Master User */}
                            {user.email !== 'crinf.informatica@gmail.com' && (
                                <div className="flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => openEditModal(user, 'user')}
                                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                                        title="Editar"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button 
                                        onClick={() => handleBan(user, 'user')}
                                        className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100"
                                        title="Banir"
                                    >
                                        <Ban size={16} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(user.id, 'user')}
                                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                                        title="Excluir"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* VENDORS TAB */}
        {activeTab === 'vendors' && (
            <div className="space-y-4 animate-fade-in">
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800">Comércios & Serviços</h2>
                    <p className="text-xs text-gray-500">Gerencie os anúncios da plataforma</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    {state.vendors.map(vendor => (
                        <div key={vendor.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between group hover:border-primary/30 transition-all">
                            <div className="flex items-start gap-3 mb-4">
                                <img src={vendor.photoUrl} alt={vendor.name} className="w-12 h-12 rounded-lg object-cover bg-gray-100" />
                                <div>
                                    <h3 className="font-bold text-gray-800 line-clamp-1">{vendor.name}</h3>
                                    <span className="text-[10px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-bold border border-sky-100">
                                        {vendor.categories[0]}
                                    </span>
                                    <p className="text-[10px] text-gray-400 font-mono mt-1">Doc: {vendor.document}</p>
                                </div>
                            </div>
                            
                            <div className="flex gap-2 justify-end border-t border-gray-50 pt-3">
                                <button 
                                    onClick={() => openEditModal(vendor, 'vendor')}
                                    className="flex-1 py-1.5 bg-blue-50 text-blue-700 rounded-md text-xs font-bold hover:bg-blue-100 flex items-center justify-center gap-1"
                                >
                                    <Edit2 size={12} /> Editar
                                </button>
                                <button 
                                    onClick={() => handleBan(vendor, 'vendor')}
                                    className="flex-1 py-1.5 bg-orange-50 text-orange-700 rounded-md text-xs font-bold hover:bg-orange-100 flex items-center justify-center gap-1"
                                >
                                    <Ban size={12} /> Banir
                                </button>
                                <button 
                                    onClick={() => handleDelete(vendor.id, 'vendor')}
                                    className="py-1.5 px-3 bg-red-50 text-red-700 rounded-md text-xs font-bold hover:bg-red-100"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* BANNED TAB */}
        {activeTab === 'banned' && (
             <div className="space-y-4 animate-fade-in">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Lista Negra</h2>
                        <p className="text-xs text-gray-500">Documentos e E-mails impedidos de acessar</p>
                    </div>
                    <Button onClick={() => setBanModalOpen(true)} variant="danger" className="py-2 px-4 text-xs h-auto gap-1">
                        <Gavel size={16} /> Bloqueio Manual
                    </Button>
                </div>

                {state.bannedDocuments.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
                        <Check className="mx-auto text-green-500 mb-2" size={32} />
                        <p className="text-gray-500 font-medium">Nenhum banimento ativo.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                        {state.bannedDocuments.map((doc, idx) => (
                            <div key={idx} className="p-4 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="bg-red-100 p-2 rounded-full">
                                        <Ban size={16} className="text-red-600" />
                                    </div>
                                    <span className="font-mono text-gray-700 font-medium">{doc}</span>
                                </div>
                                <button 
                                    onClick={() => handleUnban(doc)}
                                    className="text-xs font-bold text-green-600 hover:text-green-700 hover:underline"
                                >
                                    Remover Bloqueio
                                </button>
                            </div>
                        ))}
                    </div>
                )}
             </div>
        )}

        {/* DISTRIBUTE TAB */}
        {activeTab === 'distribute' && (
             <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
                 <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Distribuição do App</h2>
                    <p className="text-gray-500">Torne o aplicativo acessível para todos</p>
                 </div>

                 {/* GitHub Pages Guide */}
                 <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-800 relative overflow-hidden text-left">
                     <div className="absolute top-0 right-0 bg-gray-800 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">GRÁTIS</div>
                     <div className="flex items-center gap-4 mb-4">
                         <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-800">
                             <Github size={24} />
                         </div>
                         <div>
                             <h3 className="font-bold text-gray-800 text-lg">Hospedagem Grátis no GitHub</h3>
                             <p className="text-sm text-gray-500">Publique seu site sem custo em minutos</p>
                         </div>
                     </div>
                     
                     <ol className="space-y-4 mb-6 list-decimal list-inside text-sm text-gray-700">
                        <li>
                            <strong>Crie um Repositório:</strong> Acesse o <a href="https://github.com/new" target="_blank" className="text-blue-600 underline">GitHub</a> e crie um repositório "Public".
                        </li>
                        <li>
                            <strong>Upload dos Arquivos:</strong>
                            <ul className="pl-6 mt-1 space-y-1 list-disc text-gray-600 text-xs">
                                <li>Se você usa este editor online: Baixe o projeto (Download ZIP).</li>
                                <li>Faça o "Build" (se necessário) ou pegue os arquivos da pasta raiz.</li>
                                <li>Faça o upload dos arquivos (index.html, manifest.json, etc) para o GitHub.</li>
                            </ul>
                        </li>
                        <li>
                            <strong>Ative o Pages:</strong>
                            <ul className="pl-6 mt-1 space-y-1 list-disc text-gray-600 text-xs">
                                <li>No seu repositório, vá em <strong>Settings</strong> {'>'} <strong>Pages</strong>.</li>
                                <li>Em "Source", selecione a branch <strong>main</strong> e clique em Save.</li>
                            </ul>
                        </li>
                        <li>
                            <strong>Pronto!</strong> Aguarde alguns segundos e seu link estará disponível (ex: <i>seu-user.github.io/seu-repo</i>).
                        </li>
                     </ol>

                     <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                         <p className="text-xs text-gray-600">
                             <strong>Nota Técnica:</strong> O app já foi configurado com caminhos relativos (./) para funcionar perfeitamente em subpastas do GitHub Pages.
                         </p>
                     </div>
                 </div>

                 {/* Play Store Guide */}
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-sky-100 relative overflow-hidden text-left">
                     <div className="flex items-center gap-4 mb-4">
                         <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center text-sky-600">
                             <ShoppingBag size={24} />
                         </div>
                         <div>
                             <h3 className="font-bold text-gray-800 text-lg">Publicar na Play Store</h3>
                             <p className="text-sm text-gray-500">Gerar APK/AAB para Android</p>
                         </div>
                     </div>
                     
                     <div className="space-y-3 mb-6">
                         <div className="flex gap-3 items-start">
                             <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">1</div>
                             <p className="text-sm text-gray-600">
                                <strong>Pegue o Link:</strong> Copie o link final do seu site (Hospedado no GitHub, Vercel ou Netlify).
                             </p>
                         </div>
                         <div className="flex gap-3 items-start">
                             <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">2</div>
                             <p className="text-sm text-gray-600">
                                <strong>PWABuilder:</strong> Cole o link no site <a href="https://www.pwabuilder.com" target="_blank" className="text-blue-600 underline font-bold">PWABuilder.com</a>.
                             </p>
                         </div>
                         <div className="flex gap-3 items-start">
                             <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">3</div>
                             <p className="text-sm text-gray-600">
                                <strong>Download:</strong> Baixe o pacote gerado e envie para o Google Play Console.
                             </p>
                         </div>
                     </div>
                 </div>

                 {/* Direct Link Share */}
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                     <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                         <Globe size={18} className="text-gray-400" /> Link Direto (PWA)
                     </h3>
                     
                     <div className="flex gap-2 mb-4">
                         <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-600 truncate font-mono">
                             {window.location.href.split('#')[0]}
                         </div>
                         <button 
                            onClick={copyLink}
                            className={`px-4 rounded-lg font-bold transition-all ${copied ? 'bg-green-500 text-white' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                         >
                             {copied ? <Check size={20} /> : <Copy size={20} />}
                         </button>
                     </div>

                     <Button 
                        fullWidth 
                        variant="primary" 
                        icon={<Share2 size={18} />}
                        onClick={() => {
                            const text = `Instale o app O Que Tem Perto e encontre tudo em Campo Largo! Acesse: ${window.location.href.split('#')[0]}`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                        }}
                        className="bg-green-600 hover:bg-green-700 shadow-green-200"
                     >
                         Enviar via WhatsApp
                     </Button>
                 </div>
             </div>
        )}

      </div>

      {/* --- MODALS --- */}

      {/* Edit Modal */}
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
                            disabled={editEmail === 'crinf.informatica@gmail.com'}
                        >
                            <option value={UserType.USER}>Usuário Comum</option>
                            <option value={UserType.ADMIN}>Administrador</option>
                            {/* Master cannot be created via UI, only via code config */}
                        </select>
                    </div>
                  </>
              )}
              {editingItem?.dataType === 'vendor' && (
                  <Input label="Documento (CNPJ/CPF)" value={editDoc} onChange={e => setEditDoc(e.target.value)} />
              )}
              <Input label="Endereço" value={editAddress} onChange={e => setEditAddress(e.target.value)} />
              
              <Button onClick={saveEdit} fullWidth>Salvar Alterações</Button>
          </div>
      </Modal>

      {/* Create User Modal */}
      <Modal isOpen={isCreateUserModalOpen} onClose={() => setCreateUserModalOpen(false)} title="Criar Novo Usuário">
          <div className="space-y-4">
              <Input label="Nome Completo" value={newUserName} onChange={e => setNewUserName(e.target.value)} />
              <Input label="E-mail" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} />
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Permissão</label>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setNewUserType(UserType.USER)}
                        className={`flex-1 py-2 rounded border text-sm font-bold ${newUserType === UserType.USER ? 'bg-primary text-white border-primary' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                    >
                        Usuário
                    </button>
                    <button 
                        onClick={() => setNewUserType(UserType.ADMIN)}
                        className={`flex-1 py-2 rounded border text-sm font-bold ${newUserType === UserType.ADMIN ? 'bg-sky-600 text-white border-sky-600' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                    >
                        Admin
                    </button>
                </div>
              </div>

              <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 border border-yellow-200 mb-2">
                  <AlertTriangle size={14} className="inline mr-1 mb-0.5" />
                  A senha padrão será <strong>123</strong>. O usuário deve alterá-la no primeiro acesso.
              </div>
              
              <Button onClick={handleCreateUser} fullWidth>Criar Conta</Button>
          </div>
      </Modal>

      {/* Manual Ban Modal */}
      <Modal isOpen={isBanModalOpen} onClose={() => setBanModalOpen(false)} title="Bloqueio Manual">
          <div className="space-y-4">
              <div className="bg-red-50 p-3 rounded-lg border border-red-100 flex gap-2">
                  <Ban className="text-red-500 flex-shrink-0" size={20} />
                  <p className="text-sm text-red-700">
                      Insira um <strong>E-mail</strong>, <strong>CPF</strong> ou <strong>CNPJ</strong> para bloquear o acesso permanentemente.
                  </p>
              </div>
              <Input 
                label="Identificador para Banir" 
                placeholder="ex: 000.000.000-00 ou email@exemplo.com" 
                value={manualBanInput} 
                onChange={e => setManualBanInput(e.target.value)} 
              />
              <Button onClick={handleManualBan} variant="danger" fullWidth>Confirmar Bloqueio</Button>
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
    </div>
  );
};
