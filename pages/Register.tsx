import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, User, Store, ShoppingBag, Briefcase, MapPin } from 'lucide-react';
import { Button, Input, ImageCropper, PhotoSelector, GoogleLoginButton } from '../components/UI';
import { useAppContext } from '../App';
import { UserType, CATEGORIES } from '../types';
import { uploadImageToFirebase } from '../services/firebaseService';
import { ALLOWED_NEIGHBORHOODS } from '../config';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation(); 
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
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [isValidLocation, setIsValidLocation] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  
  // Vendor Specific
  const [vendorDoc, setVendorDoc] = useState(''); // CNPJ/CPF
  const [phone, setPhone] = useState('');
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
  
  // Social Link State
  const [linkType, setLinkType] = useState('Instagram');
  const [linkValue, setLinkValue] = useState('');

  const [isGoogleRegister, setIsGoogleRegister] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerStatus, setRegisterStatus] = useState('');

  // Check initial tab from navigation state
  useEffect(() => {
    if (location.state && location.state.initialTab) {
        setActiveTab(location.state.initialTab);
    } else if (state.currentUser) {
        setActiveTab(UserType.VENDOR);
    }
  }, [location.state, state.currentUser]);

  // Pre-fill data if coming from Google Login (redirected from Login page)
  useEffect(() => {
      if (location.state && location.state.googleData) {
          handleGoogleNewUser(location.state.googleData);
      }
  }, [location.state]);

  const handleGoogleSuccess = (user: any) => {
      // If user already exists and clicked Google Button here
      dispatch({ type: 'LOGIN', payload: user });
      navigate('/');
  };

  const handleGoogleNewUser = (googleData: any) => {
      const { name, email, photoUrl } = googleData;
      setName(name || '');
      setEmail(email || '');
      setPhotoPreview(photoUrl || null);
      setIsGoogleRegister(true);
  };

  const normalizeString = (str: string) => {
      return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  };

  const handleBlurCep = async () => {
      const cleanCep = cep.replace(/\D/g, '');
      if (cleanCep.length !== 8) return;

      setIsLoadingCep(true);
      try {
          const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`);
          if (!response.ok) throw new Error("CEP não encontrado");
          
          const data = await response.json();
          
          if (data.city !== 'Campo Largo') {
              alert(`O app atende exclusivamente Campo Largo/PR. O CEP informado pertence a ${data.city}.`);
              setCep('');
              setStreet('');
              setNeighborhood('');
              setIsValidLocation(false);
              return;
          }

          const returnedNeighborhood = normalizeString(data.neighborhood || '');
          const isAllowed = ALLOWED_NEIGHBORHOODS.some(allowed => {
              const normAllowed = normalizeString(allowed);
              return returnedNeighborhood.includes(normAllowed) || normAllowed.includes(returnedNeighborhood);
          });
          const isAguasClaras = returnedNeighborhood.includes('aguas claras');
          
          if (!isAllowed && !isAguasClaras && data.neighborhood) {
              alert(`O bairro detectado (${data.neighborhood}) não faz parte da região atendida pelo app.`);
              setNeighborhood('');
              setStreet('');
              setIsValidLocation(false);
              return;
          }

          setStreet(data.street || '');
          
          if (isAllowed || isAguasClaras) {
              const exactMatch = ALLOWED_NEIGHBORHOODS.find(n => normalizeString(n) === returnedNeighborhood) || 
                                 (isAguasClaras ? "Águas Claras" : "");
              if (exactMatch) setNeighborhood(exactMatch);
          }
          
          setIsValidLocation(true);

      } catch (error) {
          console.error("CEP Error", error);
          alert("Erro ao buscar CEP.");
          setIsValidLocation(false);
      } finally {
          setIsLoadingCep(false);
      }
  };

  const handlePhotoSelection = (data: string) => {
    if (data.startsWith('data:')) {
         setImageToCrop(data);
    } else {
         setPhotoPreview(data);
    }
  };

  const handleCropComplete = (croppedBase64: string) => {
      setPhotoPreview(croppedBase64);
      setImageToCrop(null);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (!name || !email) {
        alert("Preencha nome e e-mail.");
        return;
    }

    if (!neighborhood) {
         alert("Por favor, selecione seu Bairro.");
         return;
    }

    if (!isGoogleRegister && password.length < 6) {
        alert("A senha deve ter no mínimo 6 caracteres.");
        return;
    }

    if (!isGoogleRegister && password !== confirmPassword) {
        alert("As senhas não coincidem.");
        return;
    }

    // Vendor Specific
    if (activeTab === UserType.VENDOR) {
        if (!street || !isValidLocation) {
             alert("Endereço completo e validado pelo CEP é obrigatório para comércios.");
             return;
        }
        if (!vendorDoc || !phone) {
             alert("Documento e Telefone são obrigatórios para comércios.");
             return;
        }
    }

    let fullAddress = '';
    if (activeTab === UserType.VENDOR) {
         fullAddress = `${street}, ${number || 'S/N'} - ${neighborhood} - Campo Largo/PR`;
    } else {
         fullAddress = `${neighborhood} - Campo Largo/PR`;
    }

    // Check Bans
    const documentToCheck = activeTab === UserType.VENDOR ? vendorDoc : null;
    if (documentToCheck && state.bannedDocuments.includes(documentToCheck)) {
        alert("Cadastro bloqueado: Documento banido.");
        return;
    }
    if (state.bannedDocuments.includes(email)) {
        alert("Cadastro bloqueado: E-mail banido.");
        return;
    }

    setIsRegistering(true);
    setRegisterStatus("Iniciando...");

    try {
        const newId = Date.now().toString();

        // 1. CLIENT REGISTRATION
        if (activeTab === UserType.USER) {
            const isDuplicateEmail = state.users.some(u => u.email === email);
            if (isDuplicateEmail && !isGoogleRegister) {
                alert("E-mail já cadastrado.");
                setIsRegistering(false);
                return;
            }

            // Photo Logic
            let finalPhotoUrl = photoPreview;
            if (photoPreview && photoPreview.startsWith('data:')) {
                setRegisterStatus("Enviando foto...");
                finalPhotoUrl = await uploadImageToFirebase(photoPreview, `users/${newId}/profile.jpg`);
            }

            const newUser = {
                id: newId,
                name,
                email,
                cpf: '000.000.000-00', 
                address: fullAddress,
                type: UserType.USER,
                photoUrl: finalPhotoUrl || undefined,
                password: isGoogleRegister ? (password || 'google_auth') : password
            };
            
            setRegisterStatus("Salvando...");
            dispatch({ type: 'ADD_USER', payload: newUser });
            dispatch({ type: 'LOGIN', payload: newUser });
            alert("Cadastro realizado!");
            navigate('/');

        } else {
            // 2. VENDOR REGISTRATION
            const isDuplicateDoc = state.vendors.some(v => v.document === vendorDoc);
            if (isDuplicateDoc) {
                alert("CNPJ/CPF já cadastrado.");
                setIsRegistering(false);
                return;
            }

            const finalCategory = isCustomCategory ? customCategory : category;
            
            let finalWebsite = '';
            if (linkValue) {
                if (linkValue.startsWith('http')) finalWebsite = linkValue;
                else {
                    switch (linkType) {
                        case 'Instagram': finalWebsite = `https://instagram.com/${linkValue.replace(/^@/, '').replace(/.*\//, '')}`; break;
                        case 'Facebook': finalWebsite = `https://facebook.com/${linkValue}`; break;
                        case 'Site': finalWebsite = `https://${linkValue}`; break;
                        default: finalWebsite = linkValue;
                    }
                }
            }
            
            let finalPhotoUrl = `https://placehold.co/400x300/e0f2fe/1e3a8a?text=Sem+Foto&font=roboto`; 
            if (photoPreview) {
                if (photoPreview.startsWith('data:')) {
                    setRegisterStatus("Enviando foto...");
                    finalPhotoUrl = await uploadImageToFirebase(photoPreview, `vendors/${newId}/cover.jpg`);
                } else {
                    finalPhotoUrl = photoPreview;
                }
            }

            setRegisterStatus("Salvando...");

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
                visibility: { showPhone, showAddress, showWebsite },
                subtype: vendorSubtype
            };
            
            dispatch({ type: 'ADD_VENDOR', payload: newVendor });
            
            const vendorUser = {
                id: newVendor.id, 
                name: newVendor.name, 
                email, 
                cpf: vendorDoc, 
                address: newVendor.address, 
                type: UserType.VENDOR,
                password: password,
                photoUrl: finalPhotoUrl,
            };
            
            dispatch({ type: 'ADD_USER', payload: vendorUser });
            dispatch({ type: 'LOGIN', payload: vendorUser });
            alert("Negócio cadastrado!");
            navigate('/');
        }
    } catch (error: any) {
        console.error(error);
        alert("Erro: " + error.message);
    } finally {
        setIsRegistering(false);
        setRegisterStatus("");
    }
  };

  return (
    <div className="min-h-screen bg-white pb-10">
      <div className="px-6 pt-6 pb-2">
          <button onClick={() => navigate('/')} className="flex items-center text-gray-500 hover:text-sky-600 mb-4">
            <ArrowLeft size={20} className="mr-1" /> Voltar
          </button>
      </div>

      {/* CONDICIONAL: Se veio da home (tem initialTab), mostra só o título. Se não, mostra as abas. */}
      {location.state?.initialTab ? (
           <div className="px-6 mb-6 animate-fade-in">
             <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                {activeTab === UserType.USER ? <User className="text-primary" /> : <Store className="text-primary" />}
                {activeTab === UserType.USER ? 'Criar Conta de Cliente' : 'Cadastrar Negócio'}
             </h1>
             <p className="text-gray-500 text-sm mt-1">
                {activeTab === UserType.USER 
                 ? 'Preencha seus dados para acessar.' 
                 : 'Preencha os dados da sua empresa ou serviço.'}
             </p>
          </div>
      ) : (
          <div className="px-6 mb-6">
            <div className="flex bg-gray-100 p-1 rounded-xl">
                <button 
                    onClick={() => setActiveTab(UserType.USER)}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === UserType.USER ? 'bg-white shadow text-sky-700' : 'text-gray-500'}`}
                >
                    <User size={18} /> Cliente
                </button>
                <button 
                    onClick={() => setActiveTab(UserType.VENDOR)}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === UserType.VENDOR ? 'bg-white shadow text-sky-700' : 'text-gray-500'}`}
                >
                    <Store size={18} /> Negócio
                </button>
            </div>
          </div>
      )}

      <form onSubmit={handleRegister} className="px-6 space-y-4">
        
        {/* --- CLIENT TAB WITH GOOGLE --- */}
        {activeTab === UserType.USER && (
            <div className="animate-fade-in space-y-4">
                {/* Google Login Button - Prominent */}
                {!isGoogleRegister && (
                    <div className="mb-4">
                        <GoogleLoginButton onSuccess={handleGoogleSuccess} onNewUser={handleGoogleNewUser} />
                        <div className="relative flex py-4 items-center">
                            <div className="flex-grow border-t border-gray-100"></div>
                            <span className="flex-shrink-0 mx-4 text-gray-400 text-[10px] font-bold uppercase">Ou preencha manualmente</span>
                            <div className="flex-grow border-t border-gray-100"></div>
                        </div>
                    </div>
                )}

                {isGoogleRegister && (
                     <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm flex items-center gap-2 mb-2">
                         <img src={photoPreview || ''} className="w-8 h-8 rounded-full" alt="" />
                         <div>
                             <p className="font-bold">Cadastro com Google</p>
                             <p className="text-xs">Complete as informações abaixo.</p>
                         </div>
                     </div>
                )}

                <Input label="Seu Nome" value={name} onChange={e => setName(e.target.value)} placeholder="João Silva" required />
                <Input label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required disabled={isGoogleRegister} />
                
                <div className="bg-sky-50 p-4 rounded-xl border border-sky-100">
                     <h3 className="font-bold text-sky-900 mb-2 flex items-center gap-2 text-sm">
                         <MapPin size={16} /> Onde você mora?
                     </h3>
                     <select 
                        value={neighborhood} 
                        onChange={(e) => setNeighborhood(e.target.value)} 
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
                        required
                    >
                        <option value="">Selecione seu Bairro...</option>
                        {ALLOWED_NEIGHBORHOODS.map(n => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input label="Senha" type="password" value={password} onChange={e => setPassword(e.target.value)} required={!isGoogleRegister} placeholder="Min. 6 caracteres" />
                    <Input label="Confirmar" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required={!isGoogleRegister} placeholder="Repita a senha" />
                </div>

                {!isGoogleRegister && (
                     <div className="mt-2">
                        <PhotoSelector 
                            label="Foto de Perfil (Opcional)"
                            onPhotoSelected={handlePhotoSelection}
                            currentPhotoUrl={photoPreview}
                        />
                     </div>
                )}
            </div>
        )}

        {/* --- VENDOR TAB (Detailed) --- */}
        {activeTab === UserType.VENDOR && (
            <div className="space-y-4 animate-fade-in">
                <Input label="Nome do Negócio" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Padaria Central" required />
                <Input label="E-mail de Login" type="email" value={email} onChange={e => setEmail(e.target.value)} required />

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Negócio</label>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setVendorSubtype('COMMERCE')} className={`flex-1 py-2 px-3 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 ${vendorSubtype === 'COMMERCE' ? 'bg-sky-100 border-sky-300 text-sky-800' : 'bg-white border-gray-200 text-gray-500'}`}>
                            <ShoppingBag size={16} /> Comércio
                        </button>
                        <button type="button" onClick={() => setVendorSubtype('SERVICE')} className={`flex-1 py-2 px-3 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 ${vendorSubtype === 'SERVICE' ? 'bg-sky-100 border-sky-300 text-sky-800' : 'bg-white border-gray-200 text-gray-500'}`}>
                            <Briefcase size={16} /> Serviço
                        </button>
                    </div>
                </div>

                <Input label="CPF ou CNPJ" value={vendorDoc} onChange={e => setVendorDoc(e.target.value)} required />
                <Input label="Telefone / WhatsApp" value={phone} onChange={e => setPhone(e.target.value)} required />

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria Principal</label>
                    <select className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary" value={isCustomCategory ? 'OTHER' : category} onChange={(e) => {
                            if (e.target.value === 'OTHER') { setIsCustomCategory(true); setCategory(''); } 
                            else { setIsCustomCategory(false); setCategory(e.target.value); }
                    }}>
                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        <option value="OTHER">+ Outra (Digitar)</option>
                    </select>
                    {isCustomCategory && (
                        <div className="mt-2"><Input label="Digite a categoria" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} autoFocus /></div>
                    )}
                </div>
                
                {/* Full Address for Vendor */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h3 className="font-bold text-gray-700 mb-3 text-sm">Endereço do Estabelecimento</h3>
                    <div className="flex gap-2 mb-3">
                        <div className="flex-1">
                             <Input label="CEP" value={cep} onChange={e => setCep(e.target.value)} onBlur={handleBlurCep} placeholder="83600-000" className="mb-0" />
                        </div>
                        {isLoadingCep && <div className="flex items-center pt-6"><div className="animate-spin h-5 w-5 border-2 border-primary rounded-full border-t-transparent"></div></div>}
                    </div>
                    {isValidLocation && (
                        <div className="space-y-3 animate-fade-in">
                            <Input label="Rua" value={street} onChange={e => setStreet(e.target.value)} disabled={!!street} />
                            <div className="grid grid-cols-2 gap-3">
                                <Input label="Número" value={number} onChange={e => setNumber(e.target.value)} />
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                                    <select value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white h-[42px] text-sm">
                                        <option value="">Selecione...</option>
                                        {ALLOWED_NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <Input label="Descrição" multiline value={description} onChange={e => setDescription(e.target.value)} />
                <div className="grid grid-cols-2 gap-4">
                    <Input label="Senha" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                    <Input label="Confirmar" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                </div>

                <PhotoSelector label="Foto de Capa / Logotipo" onPhotoSelected={handlePhotoSelection} currentPhotoUrl={photoPreview} />
                
                {/* Privacy Checkboxes */}
                <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs font-bold text-gray-500 mb-1 uppercase">Privacidade</p>
                    <label className="flex items-center space-x-2 text-sm text-gray-700"><input type="checkbox" checked={showPhone} onChange={e => setShowPhone(e.target.checked)} /><span>Mostrar Telefone</span></label>
                    <label className="flex items-center space-x-2 text-sm text-gray-700"><input type="checkbox" checked={showAddress} onChange={e => setShowAddress(e.target.checked)} /><span>Mostrar Endereço</span></label>
                </div>
            </div>
        )}

        <Button fullWidth disabled={isRegistering} type="submit" className="mt-6 py-4 text-lg shadow-lg shadow-sky-200 mb-8">
            {isRegistering ? registerStatus || 'Criando Conta...' : (activeTab === UserType.VENDOR ? 'Cadastrar Negócio' : 'Criar Conta Grátis')}
        </Button>
      </form>

      {imageToCrop && (
            <ImageCropper imageSrc={imageToCrop} onCropComplete={handleCropComplete} onCancel={() => setImageToCrop(null)} />
      )}
    </div>
  );
};