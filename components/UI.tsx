
import React, { useState, useEffect } from 'react';
import { Star, MapPin, Phone, MessageCircle, X, ShieldCheck, Smartphone, Mail } from 'lucide-react';
import { Vendor } from '../types';

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

// --- Vendor Card ---
export const VendorCard: React.FC<{ vendor: Vendor; onClick: () => void }> = ({ vendor, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all cursor-pointer mb-4"
    >
      <div className="relative h-32 bg-gray-200">
        <img src={vendor.photoUrl} alt={vendor.name} className="w-full h-full object-cover" />
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-bold text-gray-700 shadow-sm">
          {vendor.distance?.toFixed(1) || Math.floor(Math.random() * 5 + 1)} km
        </div>
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

// --- Two Factor Auth Modal ---
interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  actionTitle?: string;
  destination?: string; // Add destination prop to show specific email/phone
}

export const TwoFactorModal: React.FC<TwoFactorModalProps> = ({ isOpen, onClose, onSuccess, actionTitle = "Realizar Ação", destination }) => {
  const [code, setCode] = useState('');
  const [sentCode, setSentCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Simulate sending code when modal opens
  useEffect(() => {
    if (isOpen) {
      setSentCode(null); // Reset
      setCode('');
      const generated = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Simulate network delay then "receive" message (Shortened for UX)
      setTimeout(() => {
          setSentCode(generated);
      }, 500);
    }
  }, [isOpen]);

  const handleVerify = () => {
    setIsLoading(true);
    setTimeout(() => {
      if (code === sentCode) {
        onSuccess();
        onClose();
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

          {/* SIMULATION NOTIFICATION BOX */}
          {sentCode ? (
             <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg animate-fade-in text-left">
                <p className="text-xs font-bold text-green-800 uppercase mb-1 flex items-center gap-1">
                    <Mail size={12} /> Código de Verificação
                </p>
                <p className="text-xs text-green-700 mb-1">
                  {destination ? `Enviado para: ${destination}` : 'Código enviado para o contato cadastrado.'}
                </p>
                <div className="text-sm text-green-900 bg-white/50 p-2 rounded border border-green-100 mt-2 font-mono">
                    Código de Segurança: <br/>
                    <span className="text-lg font-black tracking-widest">{sentCode}</span>
                </div>
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
            <p className="text-xs text-gray-400 mt-2">Digite o código de 6 dígitos acima.</p>
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

// --- App Logo (Public) ---
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

// --- Admin Logo (Private) ---
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
