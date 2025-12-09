
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, User, Store, Upload, X, MapPin, Briefcase, ShoppingBag } from 'lucide-react';
import { Button, Input, ImageCropper } from '../components/UI';
import { useAppContext } from '../App';
import { UserType, CATEGORIES } from '../types';
import { uploadImageToFirebase } from '../services/firebaseService';
import { ALLOWED_NEIGHBORHOODS } from '../config';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Hook to get data passed from Login
  const { state, dispatch } = useAppContext();
  const [activeTab, setActiveTab] = useState<UserType>(UserType.USER);

  // Vendor Subtype State
  const [vendorSubtype, setVendorSubtype] = useState<'COMMERCE' | 'SERVICE'>('COMMERCE');

  // Common State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Address State (Separated)
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  
  // User Specific
  const [userCPF, setUserCPF] = useState('');
  
  // Vendor Specific
  const [vendorDoc, setVendorDoc] = useState(''); // CNPJ/CPF
  const [phone, setPhone] = useState('');
  
  // Category State
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  const [description, setDescription] = useState('');
  
  // Privacy Settings (Visibility)
  const [showPhone, setShowPhone] = useState(true);
  const [showAddress, setShowAddress] = useState(true);
  const [showWebsite, setShowWebsite] = useState(true);
  
  // Photo State
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Social Link State
  const [linkType, setLinkType] = useState('Instagram');
  const [linkValue, setLinkValue] = useState('');

  const [isGoogleRegister, setIsGoogleRegister] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerStatus, setRegisterStatus] = useState('');

  // Effect: If user is already logged in, force Vendor tab and hide User tab
  useEffect(() => {
      if (state.currentUser) {
          setActiveTab(UserType.VENDOR);
      }
  }, [state.currentUser]);

  // Pre-fill data if coming from Google Login
  useEffect(() => {
      if (location.state && location.state.googleData) {
          const { name, email, photoUrl } = location.state.googleData;
          setName(name || '');
          setEmail(email || '');
          setPhotoPreview(photoUrl || null);
          setIsGoogleRegister(true);
      }
  }, [location.state]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    // Reset file input to allow same file selection again
    e.target.value = '';
  };

  const handleCropComplete = (croppedBase64: string) => {
      setPhotoPreview(croppedBase64);
      setImageToCrop(null);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoPreview(null);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!name || !email || !street || !neighborhood || !password) {
        alert("Preencha todos os campos obrigatórios e selecione o bairro.");
        return;
    }

    if (password.length < 6) {
        alert("A senha deve ter no mínimo 6 caracteres.");
        return;
    }

    if (password !== confirmPassword) {
        alert("As senhas não coincidem.");
        return;
    }

    // Address Composition
    const fullAddress = `${street}, ${number || 'S/N'} - ${neighborhood} - Campo Largo/PR`;

    // --- CHECK 1: Banned Documents OR Emails ---
    const documentToCheck = activeTab === UserType.USER ? userCPF : vendorDoc;
    
    // Check if Document is provided (mandatory)
    if (activeTab === UserType.USER && !userCPF) {
        alert("O CPF é obrigatório.");
        return;
    }
    if (activeTab === UserType.VENDOR && !vendorDoc) {
        alert("O Documento (CNPJ/CPF) é obrigatório.");
        return;
    }

    if (state.bannedDocuments.includes(documentToCheck)) {
        alert("Cadastro bloqueado: Este documento (CPF/CNPJ) foi banido pelo administrador.");
        return;
    }

    if (state.bannedDocuments.includes(email)) {
        alert("Cadastro bloqueado: Este e-mail foi banido pelo administrador.");
        return;
    }

    setIsRegistering(true);
    setRegisterStatus("Iniciando...");

    try {
        const newId = Date.now().toString();

        if (activeTab === UserType.USER) {
            // --- CHECK 2: Duplicate Users ---
            const isDuplicateEmail = state.users.some(u => u.email === email);
            const isDuplicateCPF = state.users.some(u => u.cpf === userCPF);
            
            if (isDuplicateEmail && !isGoogleRegister) {
                alert("Erro: Já existe um usuário cadastrado com este e-mail.");
                setIsRegistering(false);
                return;
            }
            if (isDuplicateCPF) {
                alert("Erro: Já existe um usuário cadastrado com este CPF.");
                setIsRegistering(false);
                return;
            }

            // Upload Photo if exists
            let finalPhotoUrl = photoPreview;
            if (photoPreview && photoPreview.startsWith('data:')) {
                setRegisterStatus("Enviando foto...");
                finalPhotoUrl = await uploadImageToFirebase(photoPreview, `users/${newId}/profile.jpg`);
            }

            const newUser = {
                id: newId,
                name,
                email,
                cpf: userCPF,
                address: fullAddress,
                type: UserType.USER,
                photoUrl: finalPhotoUrl || undefined,
                password: password
            };
            
            setRegisterStatus("Salvando conta...");
            dispatch({ type: 'ADD_USER', payload: newUser });
            dispatch({ type: 'LOGIN', payload: newUser });
            alert("Cadastro realizado com sucesso!");
            navigate('/');
        } else {
            // --- CHECK 3: Duplicate Vendors ---
            const isDuplicateDoc = state.vendors.some(v => v.document === vendorDoc);
            
            if (isDuplicateDoc) {
                alert("Erro: Já existe um comércio cadastrado com este CNPJ/CPF.");
                setIsRegistering(false);
                return;
            }

            // Determine final category
            const finalCategory = isCustomCategory ? customCategory : category;
            if (!finalCategory) {
                alert("Por favor, selecione ou digite uma categoria.");
                setIsRegistering(false);
                return;
            }

            // Format Link
            let finalWebsite = '';
            if (linkValue) {
                if (linkValue.startsWith('http')) {
                    finalWebsite = linkValue;
                } else {
                    switch (linkType) {
                        case 'Instagram':
                            finalWebsite = `https://instagram.com/${linkValue.replace(/^@/, '').replace(/.*\//, '')}`;
                            break;
                        case 'Facebook':
                            finalWebsite = `https://facebook.com/${linkValue}`;
                            break;
                        case 'Site':
                            finalWebsite = `https://${linkValue}`;
                            break;
                        default:
                            finalWebsite = linkValue;
                    }
                }
            }
            
            // Upload Photo for Vendor
            // Fallback to a seeded URL to avoid "random dancing images"
            // Using ID ensures it stays the same for this user
            let finalPhotoUrl = `https://placehold.co/400x300/e0f2fe/1e3a8a?text=Sem+Foto&font=roboto`; 
            
            if (photoPreview && photoPreview.startsWith('data:')) {
                try {
                    setRegisterStatus("Enviando foto da loja...");
                    finalPhotoUrl = await uploadImageToFirebase(photoPreview, `vendors/${newId}/cover.jpg`);
                } catch(e) {
                    console.error("Foto upload fail", e);
                    alert("Aviso: Falha ao enviar a foto. Usando imagem padrão.");
                }
            } else if (isGoogleRegister && photoPreview) {
                 // If using Google Photo
                 finalPhotoUrl = photoPreview;
            }

            setRegisterStatus("Salvando perfil...");

            const newVendor = {
                id: newId,
                name,
                document: vendorDoc,
                phone,
                address: fullAddress,
                categories: [finalCategory],
                description,
                website: finalWebsite, 
                photoUrl: finalPhotoUrl,
                rating: 0,
                reviewCount: 0,
                reviews: [],
                distance: 0.5,
                visibility: {
                    showPhone,
                    showAddress,
                    showWebsite
                },
                subtype: vendorSubtype // Save subtype to differentiate in Admin Panel
            };
            
            // Add as vendor AND as a login user
            dispatch({ type: 'ADD_VENDOR', payload: newVendor });
            
            // Create a user entry so they can login
            const vendorUser = {
                id: newVendor.id, 
                name: newVendor.name, 
                email, 
                cpf: vendorDoc, 
                address: newVendor.address, 
                type: UserType.VENDOR,
                password: password,
                photoUrl: finalPhotoUrl
            };
            
            const isDuplicateEmailUser = state.users.some(u => u.email === email);
            if(!isDuplicateEmailUser) {
                dispatch({ type: 'ADD_USER', payload: vendorUser });
            }

            // --- NOTIFY ADMIN VIA EMAIL ---
            const sendAdminNotification = () => {
                const serviceID = 'service_dqxdi2a';
                const templateID = 'template_8cthxoh';
                const publicKey = 'NJZigwymrvB_gdLNP';

                const messageBody = `Novo cadastro de Comércio/Serviço:
                
                Nome: ${newVendor.name}
                Documento: ${newVendor.document}
                Categoria: ${newVendor.categories[0]}
                Email: ${email}
                Telefone: ${newVendor.phone}
                Endereço: ${newVendor.address}
                
                Verifique no Painel Administrativo.`;

                const templateParams = {
                    to_email: 'crinf.informatica@gmail.com',
                    email: 'crinf.informatica@gmail.com',
                    to_name: 'Admin',
                    subject: 'Novo Comércio Cadastrado - O Que Tem Perto?',
                    message: messageBody
                };

                // @ts-ignore
                if (window.emailjs) {
                    // @ts-ignore
                    window.emailjs.send(serviceID, templateID, templateParams, publicKey)
                        .then(() => console.log("Notificação de cadastro enviada ao admin."))
                        .catch((err: any) => console.error("Falha ao notificar admin", err));
                }
            };

            sendAdminNotification();

            dispatch({ type: 'LOGIN', payload: vendorUser });
            alert("Cadastro realizado com sucesso!");
            navigate('/');
        }
    } catch (error: any) {
        console.error("Registration Error", error);
        alert(`Erro no cadastro: ${error.message}`);
    } finally {
        setIsRegistering(false);
        setRegisterStatus("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-sky-50 p-4 pb-10">
      <button onClick={() => navigate('/')} className="mb-6 flex items-center text-gray-500 hover:text-primary transition-colors">
        <ArrowLeft size={20} className="mr-1" /> Voltar
      </button>

      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-sky-900">
                {state.currentUser ? "Cadastrar Negócio" : "Crie sua conta"}
            </h1>
            <p className="text-gray-500">Faça parte do O Que Tem Perto?</p>
            <p className="text-xs text-sky-600 font-bold mt-1">Região do Águas Claras</p>
        </div>

        {/* Top Tabs - Only show if user NOT logged in */}
        {!state.currentUser && (
            <div className="flex bg-white p-1 rounded-xl shadow-sm mb-6 border border-gray-100">
                <button 
                    className={`flex-1 py-3 rounded-lg text-sm font-semibold flex items-center justify-center transition-all ${activeTab === UserType.USER ? 'bg-primary text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                    onClick={() => setActiveTab(UserType.USER)}
                >
                    <User size={18} className="mr-2" /> Sou Cliente
                </button>
                <button 
                    className={`flex-1 py-3 rounded-lg text-sm font-semibold flex items-center justify-center transition-all ${activeTab === UserType.VENDOR ? 'bg-primary text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                    onClick={() => setActiveTab(UserType.VENDOR)}
                >
                    <Store size={18} className="mr-2" /> Sou Negócio
                </button>
            </div>
        )}

        {/* If user IS logged in, show info message */}
        {state.currentUser && (
            <div className="mb-6 bg-blue-50 border border-blue-100 p-4 rounded-xl text-center">
                <p className="text-sm text-blue-800">
                    Você já está logado como <strong>{state.currentUser.name}</strong>.
                </p>
                <p className="text-xs text-blue-600 mt-1">
                    Preencha os dados abaixo para registrar seu comércio ou serviço.
                </p>
            </div>
        )}

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 space-y-4">
            
            <form onSubmit={handleRegister} className="animate-slide-up">
                
                {/* Vendor Subtype Selection */}
                {activeTab === UserType.VENDOR && (
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Qual seu tipo de atividade?</label>
                        <div className="grid grid-cols-2 gap-3">
                            <div 
                                onClick={() => setVendorSubtype('COMMERCE')}
                                className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center justify-center transition-all ${vendorSubtype === 'COMMERCE' ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-gray-200 hover:border-sky-200'}`}
                            >
                                <ShoppingBag size={24} className="mb-1" />
                                <span className="text-xs font-bold">Comércio / Loja</span>
                            </div>
                            <div 
                                onClick={() => setVendorSubtype('SERVICE')}
                                className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center justify-center transition-all ${vendorSubtype === 'SERVICE' ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-gray-200 hover:border-sky-200'}`}
                            >
                                <Briefcase size={24} className="mb-1" />
                                <span className="text-xs font-bold">Prestador de Serviço</span>
                            </div>
                        </div>
                    </div>
                )}

                <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                    {activeTab === UserType.VENDOR 
                        ? (vendorSubtype === 'COMMERCE' ? 'Dados da Loja' : 'Dados do Profissional') 
                        : 'Dados Pessoais'}
                </h3>

                {/* Name & Email */}
                <Input 
                    label={activeTab === UserType.VENDOR 
                        ? (vendorSubtype === 'COMMERCE' ? "Nome Fantasia da Loja" : "Nome do Profissional / Serviço") 
                        : "Nome Completo"} 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    required 
                />
                
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail de Acesso</label>
                    <input 
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${isGoogleRegister ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white border-gray-200'}`}
                        type="email" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        required 
                        readOnly={isGoogleRegister} // Lock email if coming from Google
                    />
                    {isGoogleRegister && <p className="text-xs text-sky-600 mt-1">E-mail vinculado à conta Google.</p>}
                </div>
                
                {/* Passwords - Required even for Google (backup access) */}
                <div className="grid grid-cols-2 gap-4">
                    <Input label="Senha (Backup)" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 dígitos" required />
                    <Input label="Confirmar Senha" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                </div>

                {/* User Specific */}
                {activeTab === UserType.USER && (
                    <Input label="CPF" placeholder="000.000.000-00" value={userCPF} onChange={e => setUserCPF(e.target.value)} required />
                )}

                {/* Vendor Specific */}
                {activeTab === UserType.VENDOR && (
                    <>
                        <Input 
                            label={vendorSubtype === 'COMMERCE' ? "CNPJ" : "CPF ou CNPJ"} 
                            placeholder="Documento oficial" 
                            value={vendorDoc} 
                            onChange={e => setVendorDoc(e.target.value)} 
                            required 
                        />
                        <Input label="Telefone / WhatsApp" placeholder="(41) 99999-9999" value={phone} onChange={e => setPhone(e.target.value)} required />
                        
                        {/* Categories */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria Principal</label>
                            <select 
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary mb-2"
                                value={isCustomCategory ? 'OTHER' : category}
                                onChange={(e) => {
                                    if (e.target.value === 'OTHER') {
                                        setIsCustomCategory(true);
                                        setCategory('');
                                    } else {
                                        setIsCustomCategory(false);
                                        setCategory(e.target.value);
                                    }
                                }}
                            >
                                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                <option value="OTHER">+ Outra (Adicionar Nova)</option>
                            </select>
                            
                            {isCustomCategory && (
                                <div className="animate-fade-in">
                                    <Input 
                                        label="Digite a nova categoria" 
                                        value={customCategory} 
                                        onChange={e => setCustomCategory(e.target.value)} 
                                        placeholder="Ex: Pet Shop, Academia..."
                                        autoFocus
                                    />
                                </div>
                            )}
                        </div>

                        {/* Social Links */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Link Principal (Opcional)</label>
                            <div className="flex rounded-lg shadow-sm">
                                <select
                                    value={linkType}
                                    onChange={(e) => setLinkType(e.target.value)}
                                    className="px-3 py-2 bg-gray-50 border border-gray-200 border-r-0 rounded-l-lg text-gray-600 text-sm focus:ring-2 focus:ring-primary outline-none cursor-pointer hover:bg-gray-100"
                                >
                                    <option value="Instagram">Instagram</option>
                                    <option value="Facebook">Facebook</option>
                                    <option value="Site">Site</option>
                                </select>
                                <input
                                    type="text"
                                    value={linkValue}
                                    onChange={(e) => setLinkValue(e.target.value)}
                                    placeholder={linkType === 'Instagram' ? '@seu.perfil' : linkType === 'Facebook' ? 'sua.pagina' : 'www.seusite.com.br'}
                                    className="flex-1 w-full px-4 py-2 border border-gray-200 rounded-r-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* ADDRESS SECTION - SEPARATED */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4 mt-2">
                    <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <MapPin size={16} /> Endereço Local
                    </h4>
                    
                    <Input 
                        label="Rua / Logradouro" 
                        placeholder="Ex: Rua XV de Novembro" 
                        value={street} 
                        onChange={e => setStreet(e.target.value)} 
                        required 
                        className="bg-white"
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Número" 
                            placeholder="Ex: 100" 
                            value={number} 
                            onChange={e => setNumber(e.target.value)} 
                            className="bg-white"
                        />
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                            <select 
                                value={neighborhood} 
                                onChange={e => setNeighborhood(e.target.value)} 
                                required 
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="">Selecione...</option>
                                {ALLOWED_NEIGHBORHOODS.map(n => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2 text-sky-700 text-xs font-medium">
                        <div className="w-2 h-2 rounded-full bg-sky-500"></div>
                        Cidade fixa: <strong>Campo Largo - PR</strong>
                    </div>
                </div>
                
                {activeTab === UserType.VENDOR && (
                    <>
                        {/* PRIVACY SETTINGS */}
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
                            <h4 className="text-sm font-bold text-blue-900 mb-2">Privacidade</h4>
                            <div className="space-y-2">
                                <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                                    <input type="checkbox" checked={showPhone} onChange={e => setShowPhone(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                                    <span>Exibir Telefone</span>
                                </label>
                                <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                                    <input type="checkbox" checked={showAddress} onChange={e => setShowAddress(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                                    <span>Exibir Endereço Completo</span>
                                </label>
                                <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                                    <input type="checkbox" checked={showWebsite} onChange={e => setShowWebsite(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                                    <span>Exibir Site/Link</span>
                                </label>
                            </div>
                        </div>

                        <Input label="Descrição Curta" placeholder="Descreva seus serviços ou produtos..." multiline value={description} onChange={e => setDescription(e.target.value)} />
                        
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Foto do Local ou Perfil</label>
                            <div 
                                onClick={triggerFileInput}
                                className={`border-2 border-dashed rounded-lg p-2 text-center cursor-pointer transition-all relative overflow-hidden h-40 flex flex-col items-center justify-center ${photoPreview ? 'border-primary' : 'border-gray-200 hover:bg-gray-50'}`}
                            >
                                {photoPreview ? (
                                    <>
                                        <img src={photoPreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                                        <button 
                                            onClick={removePhoto}
                                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow hover:bg-red-600 z-10"
                                        >
                                            <X size={16} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="mx-auto text-gray-400 mb-2" />
                                        <span className="text-sm text-gray-500 block">Clique para enviar e ajustar</span>
                                        <span className="text-xs text-gray-400 block mt-1">(JPG, PNG - Máx 5MB)</span>
                                    </>
                                )}
                                <input 
                                    ref={fileInputRef} 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                />
                            </div>
                        </div>
                    </>
                )}
                
                {activeTab === UserType.USER && (
                     <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Foto de Perfil (Opcional)</label>
                        <div 
                            onClick={triggerFileInput}
                            className={`border-2 border-dashed rounded-lg p-2 text-center cursor-pointer transition-all relative overflow-hidden h-24 flex flex-col items-center justify-center ${photoPreview ? 'border-primary' : 'border-gray-200 hover:bg-gray-50'}`}
                        >
                            {photoPreview ? (
                                <>
                                    <img src={photoPreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                                    <button onClick={removePhoto} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow z-10"><X size={14} /></button>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-gray-400">
                                    <div className="flex items-center gap-2">
                                        <Upload size={20} /> <span className="text-sm">Enviar e Ajustar Foto</span>
                                    </div>
                                    <span className="text-[10px] mt-1">(Máx 5MB)</span>
                                </div>
                            )}
                            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handlePhotoChange}/>
                        </div>
                     </div>
                )}

                <Button fullWidth type="submit" className="mt-4 py-4 text-lg shadow-lg shadow-sky-200" disabled={isRegistering}>
                    {isRegistering ? registerStatus || 'Processando...' : (activeTab === UserType.VENDOR ? 'Finalizar Cadastro' : 'Criar Conta')}
                </Button>
            </form>
        </div>
      </div>

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
