
import React, { useState, useEffect, useRef } from 'react';
import { Star, MapPin, Phone, MessageCircle, X, ShieldCheck, Smartphone, Mail, Share2, Copy, Check, ZoomIn, Move, Save, Upload, Link as LinkIcon, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Vendor } from '../types';
import { signInWithGoogle } from '../services/firebaseService';

// --- Star Rating ---
export const StarRating: React.FC<{ rating: number; count?: number; size?: number }> = ({ rating, count, size = 16 }) => {
  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={`${
            star <= Math.round(rating) ? 'fill-accent text-accent' : 'fill-gray-200 text-gray-200'
          }`}
        />
      ))}
      {count !== undefined && (
        <span className="text-xs text-gray-500 ml-1">({count})</span>
      )}
    </div>
  );
};

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, variant = 'primary', fullWidth, icon, className = '', ...props 
}) => {
  const baseStyle = "px-4 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95";
  const variants = {
    primary: "bg-primary text-white hover:bg-teal-700 shadow-md shadow-teal-200",
    secondary: "bg-white text-primary border border-primary hover:bg-teal-50",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-50",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-200"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
};

// --- Photo Selector Component ---
interface PhotoSelectorProps {
    currentPhotoUrl?: string | null;
    onPhotoSelected: (data: string) => void; // Returns Base64 or URL
    label?: string;
}

export const PhotoSelector: React.FC<PhotoSelectorProps> = ({ currentPhotoUrl, onPhotoSelected, label = "Foto" }) => {
    const [mode, setMode] = useState<'UPLOAD' | 'URL'>('UPLOAD');
    const [preview, setPreview] = useState<string | null>(currentPhotoUrl || null);
    const [urlInput, setUrlInput] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setPreview(currentPhotoUrl || null);
    }, [currentPhotoUrl]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert("Aviso: A imagem é maior que 5MB. Por favor, escolha uma menor.");
                e.target.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                const res = reader.result as string;
                setPreview(res);
                onPhotoSelected(res);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUrlBlur = () => {
        if (urlInput) {
            setPreview(urlInput);
            onPhotoSelected(urlInput);
        }
    };

    return (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            
            <div className="flex bg-gray-100 p-1 rounded-lg mb-3">
                <button 
                    type="button"
                    onClick={() => setMode('UPLOAD')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center gap-1 transition-all ${mode === 'UPLOAD' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}
                >
                    <Smartphone size={14} /> Dispositivo / Upload
                </button>
                <button 
                    type="button"
                    onClick={() => setMode('URL')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center gap-1 transition-all ${mode === 'URL' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}
                >
                    <LinkIcon size={14} /> Link da Web
                </button>
            </div>

            <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-all relative overflow-hidden bg-gray-50 ${preview ? 'border-primary' : 'border-gray-300'}`}>
                
                {preview && (
                    <div className="mb-3 relative w-32 h-32 mx-auto rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-white">
                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setPreview(null);
                                setUrlInput('');
                                onPhotoSelected('');
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow hover:bg-red-600"
                        >
                            <X size={12} />
                        </button>
                    </div>
                )}

                {mode === 'UPLOAD' ? (
                    <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer py-4">
                        {!preview && <Upload className="mx-auto text-gray-400 mb-2" />}
                        <p className="text-sm text-gray-600 font-medium">Clique para enviar foto</p>
                        <p className="text-xs text-gray-400 mt-1">Galeria, Câmera ou Google Fotos</p>
                        <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-orange-600 bg-orange-50 inline-block px-2 py-1 rounded">
                             <AlertCircle size={10} /> Máximo: 5MB
                        </div>
                        <input 
                            ref={fileInputRef} 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>
                ) : (
                    <div className="py-2">
                         <div className="flex items-center gap-2 mb-2 justify-center text-xs text-gray-500">
                             <ImageIcon size={14} />
                             <span>Cole o link direto da imagem (Google Fotos, Imgur, etc)</span>
                         </div>
                         <input 
                            type="text" 
                            placeholder="https://exemplo.com/foto.jpg"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            onBlur={handleUrlBlur}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                         />
                         <p className="text-[10px] text-gray-400 mt-2">Dica: Use links diretos que terminem em .jpg ou .png para melhor funcionamento.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Google Login Button ---
interface GoogleLoginButtonProps {
    onSuccess: (user: any) => void;
    onNewUser: (googleData: any) => void;
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({ onSuccess, onNewUser }) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            const { user, isNewUser, googleData } = await signInWithGoogle();
            
            if (isNewUser) {
                onNewUser(googleData);
            } else {
                onSuccess(user);
            }
        } catch (error) {
            console.error(error);
            // Alert already handled in service
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white border border-gray-200 text-gray-700 font-bold py-3.5 rounded-xl shadow-sm hover:bg-gray-50 transition active:scale-95 flex items-center justify-center gap-3 relative overflow-hidden"
        >
            {isLoading ? (
                <div className="animate-spin h-5 w-5 border-2 border-gray-300 rounded-full border-t-blue-500"></div>
            ) : (
                <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                        />
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                        />
                        <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                        />
                    </svg>
                    <span>Entrar com Google</span>
                </>
            )}
        </button>
    );
};

// --- Input ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label: string;
  error?: string;
  multiline?: boolean;
}

export const Input: React.FC<InputProps> = ({ label, error, multiline, className = '', ...props }) => {
  const baseClass = "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all";
  const borderColor = error ? "border-red-500 bg-red-50" : "border-gray-200 bg-white";

  return (
    <div className={`mb-4 ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {multiline ? (
        <textarea 
          className={`${baseClass} ${borderColor}`} 
          rows={3}
          {...(props as any)} 
        />
      ) : (
        <input 
          className={`${baseClass} ${borderColor}`} 
          {...props} 
        />
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};

// --- Modal ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h3 className="font-bold text-lg text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Image Cropper ---
interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedBase64: string) => void;
  onCancel: () => void;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, onCropComplete, onCancel }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    if (!imgRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 300; // Output size
    canvas.width = size;
    canvas.height = size;

    if (ctx) {
      // Clear background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      // Save context
      ctx.save();
      
      // Move to center to apply scale
      ctx.translate(size / 2, size / 2);
      ctx.scale(scale, scale);
      ctx.translate(-size / 2, -size / 2);

      // Draw image with position offset
      const img = imgRef.current;
      
      const aspect = img.naturalWidth / img.naturalHeight;
      let drawWidth = size;
      let drawHeight = size;
      
      if (aspect > 1) {
          drawWidth = size * aspect;
      } else {
          drawHeight = size / aspect;
      }

      const x = (size - drawWidth) / 2 + position.x / scale;
      const y = (size - drawHeight) / 2 + position.y / scale;

      ctx.drawImage(img, x, y, drawWidth, drawHeight);
      
      ctx.restore();
      onCropComplete(canvas.toDataURL('image/jpeg', 0.9));
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden animate-slide-up">
        <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-bold text-gray-800">Ajustar Imagem</h3>
            <button onClick={onCancel}><X size={20} /></button>
        </div>
        
        <div 
          className="relative w-full h-80 bg-gray-100 overflow-hidden cursor-move touch-none flex items-center justify-center"
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
        >
           <img 
             ref={imgRef}
             src={imageSrc} 
             alt="Crop" 
             className="max-w-none select-none pointer-events-none"
             style={{ 
               transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
               height: '300px', // Base height to fit container
               width: 'auto'
             }}
           />
           {/* Overlay Guide */}
           <div className="absolute inset-0 border-[30px] border-black/30 pointer-events-none rounded-full" style={{ borderRadius: '50%' }}></div>
        </div>

        <div className="p-4 bg-white">
           <div className="flex items-center gap-4 mb-4">
              <ZoomIn size={20} className="text-gray-400" />
              <input 
                type="range" 
                min="1" 
                max="3" 
                step="0.1" 
                value={scale} 
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
           </div>
           
           <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel} fullWidth>Cancelar</Button>
              <Button onClick={handleSave} fullWidth icon={<Save size={18} />}>Salvar Foto</Button>
           </div>
        </div>
      </div>
    </div>
  );
};


// --- Vendor Card ---
export const VendorCard: React.FC<{ vendor: Vendor; onClick: () => void }> = ({ vendor, onClick }) => {
  const [isShareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShareOpen(true);
  };

  const getShareLink = () => {
    const baseUrl = window.location.href.split('#')[0];
    return `${baseUrl}#/vendor/${vendor.id}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getShareLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const link = getShareLink();
    const text = `Confira *${vendor.name}* no app O Que Tem Perto! \n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <>
      <div 
        onClick={onClick}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all cursor-pointer mb-4 relative group"
      >
        <div className="relative h-32 bg-gray-200">
          <img src={vendor.photoUrl} alt={vendor.name} className="w-full h-full object-cover" />
          
          <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full text-[10px] font-bold text-white shadow-sm flex items-center gap-1">
            <MapPin size={10} />
            {vendor.distance?.toFixed(1) || Math.floor(Math.random() * 5 + 1)} km
          </div>

          <button 
            onClick={handleShareClick}
            className="absolute top-2 right-2 bg-white p-2 rounded-full text-gray-700 shadow-md hover:bg-sky-50 hover:text-primary transition-colors active:scale-95"
          >
            <Share2 size={16} />
          </button>
        </div>
        <div className="p-4">
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-bold text-gray-900 text-lg truncate pr-2">{vendor.name}</h3>
          </div>
          <p className="text-xs text-primary font-medium mb-2 uppercase tracking-wide">
            {vendor.categories[0]}
          </p>
          <StarRating rating={vendor.rating} count={vendor.reviewCount} />
          <div className="mt-3 flex items-center text-gray-500 text-sm">
            <MapPin size={14} className="mr-1 flex-shrink-0" />
            <span className="truncate">{vendor.address}</span>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {isShareOpen && (
        <div onClick={(e) => e.stopPropagation()}>
           <Modal isOpen={isShareOpen} onClose={() => setShareOpen(false)} title="Compartilhar">
              <div className="space-y-4">
                 <div className="text-center mb-4">
                    <img src={vendor.photoUrl} alt={vendor.name} className="w-16 h-16 rounded-full mx-auto mb-2 object-cover border-2 border-white shadow" />
                    <h4 className="font-bold text-gray-800">{vendor.name}</h4>
                    <p className="text-xs text-gray-500">Compartilhe este negócio com seus amigos</p>
                 </div>

                 <Button 
                    variant="outline" 
                    fullWidth 
                    onClick={handleCopyLink}
                    icon={copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                    className={copied ? "border-green-500 text-green-600 bg-green-50" : ""}
                 >
                    {copied ? "Link Copiado!" : "Copiar Link"}
                 </Button>

                 <Button 
                    fullWidth 
                    onClick={handleWhatsAppShare}
                    icon={<MessageCircle size={18} />}
                    className="bg-[#25D366] hover:bg-[#128C7E] text-white shadow-none border-none"
                 >
                    Enviar via WhatsApp
                 </Button>
              </div>
           </Modal>
        </div>
      )}
    </>
  );
};

// --- Two Factor Auth Modal ---
interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  actionTitle?: string;
  destination?: string;
}

export const TwoFactorModal: React.FC<TwoFactorModalProps> = ({ isOpen, onClose, onSuccess, actionTitle = "Realizar Ação", destination }) => {
  const [code, setCode] = useState('');
  const [sentCode, setSentCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // EmailJS Constants
  const serviceID = 'service_dqxdi2a';
  const templateID = 'template_8cthxoh';
  const publicKey = 'NJZigwymrvB_gdLNP';

  useEffect(() => {
    if (isOpen && !sentCode && !isSending) {
      if (!destination) {
          alert("Erro: E-mail de destino não encontrado para enviar o código.");
          onClose();
          return;
      }
      
      setIsSending(true);
      const generated = Math.floor(100000 + Math.random() * 900000).toString();
      
      const emailParams = {
        to_email: destination, 
        email: destination, // Redundant param for compatibility
        to_name: 'Usuário',
        subject: 'Código de Verificação de 2 Fatores',
        message: `Seu código de verificação é: ${generated}`
      };

      // @ts-ignore
      window.emailjs.send(serviceID, templateID, emailParams, publicKey)
        .then(() => {
          setSentCode(generated);
          setIsSending(false);
        })
        .catch((error: any) => {
          console.error('FAILED...', error);
          alert("Erro ao enviar código por e-mail. Verifique se o serviço de e-mail está ativo.");
          setIsSending(false);
          onClose();
        });
    }
  }, [isOpen, destination, sentCode, isSending]);

  const handleVerify = () => {
    setIsLoading(true);
    setTimeout(() => {
      if (code === sentCode) {
        onSuccess();
        onClose();
        setCode('');
        setSentCode(null);
      } else {
        alert("Código incorreto. Tente novamente.");
      }
      setIsLoading(false);
    }, 800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-slide-up border-t-4 border-accent">
        <div className="p-6 text-center">
          <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
             <ShieldCheck size={32} className="text-green-600" />
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-2">Autenticação de Dois Fatores</h3>
          <p className="text-sm text-gray-500 mb-4">
            Para <strong>{actionTitle.toLowerCase()}</strong>, confirme sua identidade.
          </p>

          {sentCode ? (
             <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg animate-fade-in text-left">
                <p className="text-xs font-bold text-green-800 uppercase mb-1 flex items-center gap-1">
                    <Mail size={12} /> Código Enviado!
                </p>
                <p className="text-xs text-green-700 mb-1">
                  Verifique o e-mail: <strong>{destination}</strong>
                </p>
                <p className="text-[10px] text-gray-400 mt-1 italic">
                    (Verifique também a caixa de Spam)
                </p>
             </div>
          ) : (
            <div className="mb-6 py-4 flex flex-col items-center justify-center text-gray-400">
                <div className="animate-spin h-5 w-5 border-2 border-gray-300 rounded-full border-t-primary mb-2"></div>
                <span className="text-xs">Enviando e-mail...</span>
            </div>
          )}

          <div className="mb-6">
            <div className="relative">
              <input 
                type="text" 
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 text-center text-2xl font-bold tracking-widest border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-0 outline-none transition-colors"
                placeholder="000000"
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">Digite o código de 6 dígitos enviado.</p>
          </div>

          <div className="flex gap-3">
             <Button variant="outline" onClick={onClose} fullWidth>Cancelar</Button>
             <Button 
                variant="primary" 
                onClick={handleVerify} 
                fullWidth 
                className="bg-green-600 hover:bg-green-700 shadow-green-200"
                disabled={!sentCode}
             >
               {isLoading ? 'Verificando...' : 'Confirmar'}
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- NEW APP LOGO (Yellow Wrench + Shop + GUIA text) ---
export const AppLogo = () => (
  <svg viewBox="0 0 200 160" className="w-64 h-64 drop-shadow-xl animate-fade-in">
    <defs>
      <linearGradient id="goldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#facc15" />
        <stop offset="100%" stopColor="#eab308" />
      </linearGradient>
      <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
        <feOffset dx="2" dy="2" result="offsetblur"/>
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.3"/>
        </feComponentTransfer>
        <feMerge> 
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/> 
        </feMerge>
      </filter>
    </defs>

    {/* Group for Icons */}
    <g transform="translate(100, 60)" filter="url(#dropShadow)">
        
        {/* Wrench (Left) - Rotated */}
        <g transform="translate(-45, -10) rotate(-45)">
            <path 
                d="M10 -10 L10 50 C10 58 30 58 30 50 L30 -10 L45 -25 C55 -35 40 -50 30 -40 L20 -30 L10 -40 C0 -50 -15 -35 -5 -25 Z" 
                fill="url(#goldGradient)" 
                stroke="#b45309" 
                strokeWidth="1.5"
            />
            {/* Detail line on handle */}
            <path d="M20 0 L20 40" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        </g>

        {/* Shop (Right) */}
        <g transform="translate(15, -25)">
            {/* Building Body */}
            <rect x="0" y="25" width="50" height="40" rx="3" fill="url(#goldGradient)" stroke="#b45309" strokeWidth="1.5" />
            {/* Door */}
            <rect x="28" y="40" width="14" height="25" fill="#b45309" rx="1" />
            {/* Window */}
            <rect x="8" y="40" width="14" height="14" fill="#fef08a" stroke="#b45309" strokeWidth="1" rx="1" />
            
            {/* Awning */}
            <path d="M-5 25 L55 25 L50 5 L0 5 Z" fill="url(#goldGradient)" stroke="#b45309" strokeWidth="1.5" />
            {/* Awning Stripes */}
            <path d="M10 5 L10 25 M20 5 L20 25 M30 5 L30 25 M40 5 L40 25" stroke="#b45309" strokeWidth="1.5" />
        </g>
    </g>

    {/* TEXT: GUIA */}
    <text 
        x="100" 
        y="140" 
        textAnchor="middle" 
        fontSize="48" 
        fontWeight="900" 
        fill="url(#goldGradient)" 
        stroke="#b45309" 
        strokeWidth="1.5"
        style={{ fontFamily: 'Arial Black, sans-serif', letterSpacing: '2px' }}
        filter="url(#dropShadow)"
    >
        GUIA
    </text>
  </svg>
);

// --- NEW ADMIN LOGO (Aligned Style) ---
export const AdminLogo = () => (
    <svg width="60" height="60" viewBox="0 0 100 100" className="animate-fade-in drop-shadow-md">
        <circle cx="50" cy="50" r="45" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
        <path 
          d="M50 20 C 35 20 25 32 25 45 C 25 65 50 90 50 90 C 50 90 75 65 75 45 C 75 32 65 20 50 20 Z" 
          fill="#38bdf8" 
        />
        <path 
            d="M 40 40 L 40 55 C 40 56 41 57 42 57 L 58 57 C 59 57 60 56 60 55 L 60 40 L 40 40 Z" 
            fill="#1e293b" 
        />
        <path 
            d="M 42 40 L 42 38 C 42 34 58 34 58 38 L 58 40" 
            fill="none" 
            stroke="#1e293b" 
            strokeWidth="2" 
            strokeLinecap="round" 
        />
    </svg>
);
