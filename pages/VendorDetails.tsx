
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, MessageCircle, Share2, MapPin, Globe, Clock, Star, MessageSquare } from 'lucide-react';
import { useAppContext } from '../App';
import { Button, StarRating, Input } from '../components/UI';
import { UserType } from '../types';

export const VendorDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useAppContext();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  
  // Reply State
  const [replyingTo, setReplyingTo] = useState<string | null>(null); // Review ID
  const [replyText, setReplyText] = useState("");

  const vendor = state.vendors.find(v => v.id === id);

  if (!vendor) return <div className="p-8 text-center">Fornecedor não encontrado.</div>;

  const handleCall = () => {
    window.location.href = `tel:${vendor.phone}`;
  };

  const handleWhatsApp = () => {
    const message = `Olá, vi seu anúncio no O Que Tem Perto?. Gostaria de mais informações.`;
    window.open(`https://wa.me/55${vendor.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const submitReview = () => {
    if (!state.currentUser) {
        alert("Você precisa estar logado para avaliar.");
        navigate('/login');
        return;
    }

    const newReview = {
        id: Date.now().toString(),
        userId: state.currentUser.id,
        userName: state.currentUser.name,
        rating: reviewRating,
        comment: reviewComment,
        date: new Date().toLocaleDateString()
    };

    dispatch({
        type: 'ADD_REVIEW',
        payload: { vendorId: vendor.id, review: newReview }
    });
    
    setShowReviewForm(false);
    setReviewComment("");
    setReviewRating(5);
  };

  const submitReply = (reviewId: string) => {
      if(!replyText) return;
      dispatch({ 
          type: 'REPLY_REVIEW', 
          payload: { vendorId: vendor.id, reviewId, replyText } 
      });
      setReplyingTo(null);
      setReplyText("");
  };

  // Check if current user is the owner OR admin/master
  const canReply = state.currentUser && (
      state.currentUser.id === vendor.id || 
      state.currentUser.type === UserType.ADMIN || 
      state.currentUser.type === UserType.MASTER
  );

  return (
    <div className="bg-gradient-to-br from-sky-100 via-white to-sky-50 min-h-screen pb-24 relative">
      {/* Cover Image */}
      <div className="relative h-64 w-full">
        <img src={vendor.photoUrl} className="w-full h-full object-cover" alt={vendor.name} />
        <div className="absolute inset-0 bg-gradient-to-t from-sky-900/80 to-transparent"></div>
        <button 
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <button className="absolute top-4 right-4 bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30 transition-colors">
          <Share2 size={24} />
        </button>
        
        <div className="absolute bottom-4 left-4 text-white">
            <span className="bg-accent text-sky-900 text-xs font-bold px-2 py-1 rounded mb-2 inline-block">
                {vendor.categories[0]}
            </span>
            <h1 className="text-3xl font-bold text-shadow">{vendor.name}</h1>
            <div className="flex items-center mt-1">
                <StarRating rating={vendor.rating} size={18} />
                <span className="ml-2 text-sm text-sky-100">({vendor.reviewCount} avaliações)</span>
            </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-6 rounded-t-3xl -mt-6 bg-white relative z-10 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
        
        {/* Actions - Only show if permitted by visibility settings */}
        {vendor.visibility?.showPhone && (
            <div className="grid grid-cols-2 gap-4 mb-8">
                <Button variant="primary" icon={<Phone size={18} />} onClick={handleCall}>
                    Ligar Agora
                </Button>
                <Button variant="secondary" icon={<MessageCircle size={18} />} onClick={handleWhatsApp}>
                    WhatsApp
                </Button>
            </div>
        )}

        {/* Info */}
        <div className="space-y-6 mb-8">
            <section>
                <h3 className="font-bold text-gray-900 text-lg mb-2">Sobre</h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                    {vendor.description}
                </p>
            </section>

            <section className="space-y-3">
                {vendor.visibility?.showAddress ? (
                    <div className="flex items-start">
                        <MapPin className="text-primary mt-1 mr-3 flex-shrink-0" size={20} />
                        <div>
                            <h4 className="font-semibold text-gray-900">Endereço</h4>
                            <p className="text-gray-600 text-sm">{vendor.address}</p>
                            <p className="text-gray-400 text-xs mt-1">~ {vendor.distance?.toFixed(1) || 2.4} km de você</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-start">
                        <MapPin className="text-gray-400 mt-1 mr-3 flex-shrink-0" size={20} />
                        <div>
                             <h4 className="font-semibold text-gray-500">Localização</h4>
                             <p className="text-gray-400 text-sm">Endereço oculto pelo proprietário</p>
                             <p className="text-gray-400 text-xs mt-1">~ {vendor.distance?.toFixed(1) || 2.4} km de você</p>
                        </div>
                    </div>
                )}

                {vendor.website && vendor.visibility?.showWebsite && (
                    <div className="flex items-center">
                        <Globe className="text-primary mr-3" size={20} />
                        <a href={vendor.website} target="_blank" className="text-blue-600 underline text-sm">Visitar Website</a>
                    </div>
                )}
                <div className="flex items-center">
                    <Clock className="text-primary mr-3" size={20} />
                    <span className="text-gray-600 text-sm">Aberto hoje • 08:00 - 18:00</span>
                </div>
            </section>
        </div>

        {/* Reviews */}
        <section>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-900 text-lg">Avaliações</h3>
                {state.currentUser && !showReviewForm && (
                     <button onClick={() => setShowReviewForm(true)} className="text-primary text-sm font-semibold hover:underline">
                         Avaliar
                     </button>
                )}
            </div>

            {showReviewForm && (
                <div className="bg-sky-50 p-4 rounded-xl mb-4 border border-sky-100 animate-fade-in">
                    <h4 className="font-semibold mb-2 text-sm text-sky-900">Sua Avaliação</h4>
                    <div className="flex space-x-2 mb-4">
                        {[1,2,3,4,5].map(star => (
                            <button key={star} onClick={() => setReviewRating(star)}>
                                <Star 
                                    size={24} 
                                    className={star <= reviewRating ? "fill-accent text-accent" : "text-gray-300"} 
                                />
                            </button>
                        ))}
                    </div>
                    <Input 
                        label="Comentário (Opcional)" 
                        value={reviewComment} 
                        onChange={e => setReviewComment(e.target.value)} 
                        multiline 
                    />
                    <div className="flex space-x-2 mt-2">
                        <Button variant="primary" onClick={submitReview} className="py-2 text-sm">Enviar</Button>
                        <Button variant="outline" onClick={() => setShowReviewForm(false)} className="py-2 text-sm bg-white">Cancelar</Button>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {vendor.reviews.length > 0 ? vendor.reviews.map(review => (
                    <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0">
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-gray-800 text-sm">{review.userName}</span>
                            <span className="text-xs text-gray-400">{review.date}</span>
                        </div>
                        <StarRating rating={review.rating} size={12} />
                        {review.comment && <p className="text-gray-600 text-sm mt-2">{review.comment}</p>}
                        
                        {/* Vendor Reply Display */}
                        {review.reply && (
                            <div className="mt-3 ml-4 bg-gray-50 p-3 rounded-lg border-l-4 border-primary">
                                <div className="flex items-center gap-1 mb-1">
                                    <MessageSquare size={12} className="text-primary" />
                                    <span className="text-xs font-bold text-gray-700">Resposta do Proprietário</span>
                                    <span className="text-[10px] text-gray-400">• {review.replyDate}</span>
                                </div>
                                <p className="text-xs text-gray-600">{review.reply}</p>
                            </div>
                        )}

                        {/* Reply Button for Owner */}
                        {canReply && !review.reply && replyingTo !== review.id && (
                            <button 
                                onClick={() => setReplyingTo(review.id)}
                                className="text-xs text-sky-600 font-semibold mt-2 hover:underline flex items-center gap-1"
                            >
                                <MessageSquare size={12} /> Responder
                            </button>
                        )}

                        {/* Reply Form */}
                        {replyingTo === review.id && (
                            <div className="mt-2 ml-4 animate-fade-in">
                                <Input 
                                    label="Sua Resposta" 
                                    value={replyText} 
                                    onChange={e => setReplyText(e.target.value)} 
                                    multiline
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <Button onClick={() => submitReply(review.id)} className="py-1 px-3 text-xs h-auto">Enviar Resposta</Button>
                                    <Button variant="outline" onClick={() => { setReplyingTo(null); setReplyText(""); }} className="py-1 px-3 text-xs h-auto bg-white">Cancelar</Button>
                                </div>
                            </div>
                        )}
                    </div>
                )) : (
                    <p className="text-gray-400 text-sm italic">Seja o primeiro a avaliar este local.</p>
                )}
            </div>
        </section>
      </div>
    </div>
  );
};
