
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Store, Upload, X, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { Button, Input } from '../components/UI';
import { useAppContext, GoogleLoginButton } from '../App';
import { UserType, CATEGORIES } from '../types';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useAppContext();
  const [activeTab, setActiveTab] = useState<UserType>(UserType.USER);

  // --- Step Control ---
  // Step 1: Authentication (Google Only)
  // Step 2: Details (CPF, Address, etc)
  const [step, setStep] = useState<1 | 2>(1);
  const [googleData, setGoogleData] = useState<{name: string, email: string, photoUrl: string} | null>(null);

  // Common State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  // Password is removed as auth is via Google only
  const [address, setAddress] = useState('');
  
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Social Link State
  const [linkType, setLinkType] = useState('Instagram');
  const [linkValue, setLinkValue] = useState('');

  // Handle Google Success
  const handleGoogleSuccess = (data: any) => {
      setGoogleData(data);
      setName(data.name);
      setEmail(data.email);
      setPhotoPreview(data.photoUrl);
      setStep(2);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoPreview(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!name || !email || !address) {
        alert("Preencha todos os campos obrigatórios.");
        return;
    }

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

    if (activeTab === UserType.USER) {
        // --- CHECK 2: Duplicate Users ---
        const isDuplicateEmail = state.users.some(u => u.email === email);
        const isDuplicateCPF = state.users.some(u => u.cpf === userCPF);
        
        if (isDuplicateEmail) {
            alert("Erro: Já existe um usuário cadastrado com este e-mail.");
            return;
        }
        if (isDuplicateCPF) {
            alert("Erro: Já existe um usuário cadastrado com este CPF.");
            return;
        }

        const newUser = {
            id: Date.now().toString(),
            name,
            email,
            cpf: userCPF,
            address,
            type: UserType.USER,
            photoUrl: photoPreview || undefined,
            password: 'google_auth_secure' // Placeholder for internal logic
        };
        dispatch({ type: 'ADD_USER', payload: newUser });
        dispatch({ type: 'LOGIN', payload: newUser });
        navigate('/');
    } else {
        // --- CHECK 3: Duplicate Vendors ---
        const isDuplicateDoc = state.vendors.some(v => v.document === vendorDoc);
        
        if (isDuplicateDoc) {
            alert("Erro: Já existe um comércio cadastrado com este CNPJ/CPF.");
            return;
        }

        // Determine final category
        const finalCategory = isCustomCategory ? customCategory : category;
        if (!finalCategory) {
            alert("Por favor, selecione ou digite uma categoria.");
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

        const newVendor = {
            id: Date.now().toString(),
            name,
            document: vendorDoc,
            phone,
            address,
            categories: [finalCategory],
            description,
            website: finalWebsite, 
            photoUrl: photoPreview || "https://picsum.photos/400/300",
            rating: 0,
            reviewCount: 0,
            reviews: [],
            distance: 0.5,
            visibility: {
                showPhone,
                showAddress,
                showWebsite
            }
        };
        
        dispatch({ type: 'ADD_VENDOR', payload: newVendor });
        dispatch({ type: 'LOGIN', payload: { 
            id: newVendor.id, 
            name: newVendor.name, 
            email, 
            cpf: vendorDoc, 
            address, 
            type: UserType.VENDOR 
        }});
        navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-sky-50 p-4 pb-10">
      <button onClick={() => navigate('/')} className="mb-6 flex items-center text-gray-500 hover:text-primary transition-colors">
        <ArrowLeft size={20} className="mr-1" /> Voltar
      </button>

      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-sky-900">Crie sua conta</h1>
            <p className="text-gray-500">Faça parte do O Que Tem Perto?</p>
        </div>

        {/* Tabs - Only clickable in Step 1 */}
        <div className="flex bg-white p-1 rounded-xl shadow-sm mb-6 border border-gray-100">
            <button 
                className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center transition-all ${activeTab === UserType.USER ? 'bg-primary text-white shadow' : 'text-gray-500 hover:bg-gray-50'} ${step === 2 ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => step === 1 && setActiveTab(UserType.USER)}
            >
                <User size={16} className="mr-2" /> Sou Cliente
            </button>
            <button 
                className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center transition-all ${activeTab === UserType.VENDOR ? 'bg-primary text-white shadow' : 'text-gray-500 hover:bg-gray-50'} ${step === 2 ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => step === 1 && setActiveTab(UserType.VENDOR)}
            >
                <Store size={16} className="mr-2" /> Sou Negócio
            </button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 space-y-4">
            
            {/* STEP 1: AUTHENTICATION */}
            {step === 1 && (
                <div className="text-center py-6 animate-fade-in">
                    <div className="w-16 h-16 bg-sky-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <img 
                            src="https://cdn-icons-png.flaticon.com/512/2991/2991148.png" 
                            alt="Google" 
                            className="w-8 h-8"
                        />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Autenticação Segura</h3>
                    <p className="text-gray-500 text-sm mb-6">
                        Para garantir a segurança da plataforma, o cadastro é realizado <strong>exclusivamente</strong> através da sua Conta Google.
                    </p>
                    
                    <GoogleLoginButton 
                        text={activeTab === UserType.VENDOR ? "Cadastrar Negócio com Google" : "Cadastrar Cliente com Google"} 
                        onSuccess={handleGoogleSuccess}
                    />
                </div>
            )}

            {/* STEP 2: DETAILS FORM */}
            {step === 2 && (
                <form onSubmit={handleRegister} className="animate-slide-up">
                    <div className="mb-6 flex items-center gap-3 bg-green-50 p-3 rounded-xl border border-green-100">
                        {googleData?.photoUrl && (
                            <img src={googleData.photoUrl} alt="User" className="w-10 h-10 rounded-full border border-green-200" />
                        )}
                        <div className="flex-1 overflow-hidden">
                            <p className="text-xs text-green-700 font-bold uppercase flex items-center gap-1">
                                <CheckCircle size={10} /> Conta Vinculada
                            </p>
                            <p className="text-sm font-semibold text-gray-800 truncate">{googleData?.name}</p>
                            <p className="text-xs text-gray-500 truncate">{googleData?.email}</p>
                        </div>
                    </div>

                    <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">
                        {activeTab === UserType.VENDOR ? 'Detalhes do Negócio' : 'Complete seu Perfil'}
                    </h3>

                    {/* Common Fields */}
                    {activeTab === UserType.VENDOR && (
                         <Input label="Nome do Negócio (Fantasia)" value={name} onChange={e => setName(e.target.value)} required />
                    )}
                    
                    {/* User Specific */}
                    {activeTab === UserType.USER && (
                        <Input label="CPF" placeholder="000.000.000-00" value={userCPF} onChange={e => setUserCPF(e.target.value)} required />
                    )}

                    {/* Vendor Specific */}
                    {activeTab === UserType.VENDOR && (
                        <>
                            <Input label="CNPJ ou CPF (Autônomo)" placeholder="Documento do negócio" value={vendorDoc} onChange={e => setVendorDoc(e.target.value)} required />
                            <Input label="Telefone / WhatsApp" placeholder="(00) 00000-0000" value={phone} onChange={e => setPhone(e.target.value)} required />
                            
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

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Link Principal</label>
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

                    <Input label="Endereço Completo" placeholder="Rua, Número, Bairro, Cidade" value={address} onChange={e => setAddress(e.target.value)} required />
                    
                    {activeTab === UserType.VENDOR && (
                        <>
                            {/* PRIVACY SETTINGS */}
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
                                <h4 className="text-sm font-bold text-blue-900 mb-2">Configurações de Privacidade</h4>
                                <p className="text-xs text-blue-700 mb-3">Escolha quais dados serão visíveis publicamente na busca:</p>
                                
                                <div className="space-y-2">
                                    <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                                        <input type="checkbox" checked={showPhone} onChange={e => setShowPhone(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                                        <span>Exibir meu Telefone/WhatsApp</span>
                                    </label>
                                    <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                                        <input type="checkbox" checked={showAddress} onChange={e => setShowAddress(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                                        <span>Exibir meu Endereço no Perfil</span>
                                    </label>
                                    <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                                        <input type="checkbox" checked={showWebsite} onChange={e => setShowWebsite(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                                        <span>Exibir meu Link/Site</span>
                                    </label>
                                </div>
                            </div>

                            <Input label="Descrição Curta" multiline value={description} onChange={e => setDescription(e.target.value)} />
                            
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Foto do Local</label>
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
                                            <span className="text-sm text-gray-500 block">Clique para enviar uma foto</span>
                                            <span className="text-xs text-gray-400 block mt-1">(JPG, PNG)</span>
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

                    <div className="pt-4 flex gap-3">
                         <Button type="button" variant="outline" onClick={() => setStep(1)} fullWidth>Cancelar</Button>
                         <Button fullWidth type="submit">
                            {activeTab === UserType.VENDOR ? 'Concluir Cadastro' : 'Finalizar'}
                         </Button>
                    </div>
                </form>
            )}
        </div>
      </div>
    </div>
  );
};
