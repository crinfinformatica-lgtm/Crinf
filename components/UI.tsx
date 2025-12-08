
import React, { useState, useEffect, useRef } from 'react';
import { Star, MapPin, Phone, MessageCircle, X, ShieldCheck, Smartphone, Mail, Share2, Copy, Check, ZoomIn, Move, Save, Upload } from 'lucide-react';
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
      setIsSending(true);
      const generated = Math.floor(100000 + Math.random() * 900000).toString();
      const dest = destination || 'crinf.informatica@gmail.com';
      
      const emailParams = {
        to_email: dest, 
        email: dest, // Add explicit email field for templates that use {{email}}
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
          alert("Erro ao enviar código por e-mail. Verifique sua conexão.");
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
                  Verifique o e-mail: <strong>{destination || 'crinf.informatica@gmail.com'}</strong>
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

// --- App Logo ---
export const AppLogo = () => (
  <svg viewBox="0 0 200 200" className="w-64 h-64 drop-shadow-xl animate-fade-in">
    <defs>
      <path id="curveTop" d="M 24,100 A 76,76 0 0,1 176,100" />
    </defs>
    <circle cx="100" cy="100" r="98" fill="#1e3a8a" /> 
    <path d="M 5,100 A 95,95 0 0,1 195,100 L 195,100 L 5,100 Z" fill="#60a5fa" />
    <path d="M 5,100 A 95,95 0 0,0 195,100 L 195,100 L 5,100 Z" fill="#fcd34d" />
    <line x1="5" y1="100" x2="195" y2="100" stroke="#1e3a8a" strokeWidth="3" />
    <text width="200" textAnchor="middle" fontSize="16" fontWeight="900" fill="white" letterSpacing="2" style={{ fontFamily: 'Arial Black, sans-serif' }}>
       <textPath href="#curveTop" startOffset="50%" textAnchor="middle">
         O QUE TEM PERTO?
       </textPath>
    </text>
    <g transform="translate(100, 95)">
       <text x="0" y="25" textAnchor="middle" fontSize="65" fontWeight="900" fill="white" stroke="#1e3a8a" strokeWidth="2.5" style={{ fontFamily: 'Arial, sans-serif' }}>
         CL
       </text>
    </g>
    <text x="100" y="138" textAnchor="middle" fontSize="13" fontWeight="800" fill="#1e3a8a" letterSpacing="0.5">
        CAMPO LARGO/PR
    </text>
    <g transform="translate(100, 165)" fill="none" stroke="#1e3a8a" strokeWidth="2">
        <path d="M -18,-6 L 18,-6 L 14,-14 L -14,-14 Z" strokeLinejoin="round" fill="#60a5fa" fillOpacity="0.3" />
        <rect x="-14" y="-6" width="28" height="14" fill="white" fillOpacity="0.2" />
        <rect x="-4" y="1" width="8" height="7" />
        <path d="M -7,-14 L -9,-6 M 0,-14 L 0,-6 M 7,-14 L 9,-6" opacity="0.5" />
    </g>
  </svg>
);

// --- Admin Logo ---
export const AdminLogo = () => (
    <svg width="60" height="60" viewBox="0 0 100 100" className="animate-fade-in drop-shadow-md">
        <defs>
            <linearGradient id="adminGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
        </defs>
        <rect x="10" y="20" width="80" height="60" rx="10" fill="url(#adminGrad)" stroke="#38bdf8" strokeWidth="2" />
        <rect x="15" y="25" width="70" height="50" rx="5" fill="#0f172a" opacity="0.8" />
        <path d="M 25,60 A 15,15 0 0,1 55,60" fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
        <line x1="40" y1="60" x2="40" y2="45" stroke="#f43f5e" strokeWidth="2" />
        <rect x="65" y="45" width="5" height="15" fill="#4ade80" />
        <rect x="73" y="35" width="5" height="25" fill="#fbbf24" />
        <circle cx="85" cy="15" r="12" fill="#38bdf8" stroke="#0f172a" strokeWidth="3" />
        <circle cx="85" cy="15" r="4" fill="#0f172a" />
        <path d="M 30,80 L 20,95 L 80,95 L 70,80 Z" fill="#334155" />
    </svg>
);
