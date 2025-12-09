
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { APP_CONFIG } from '../config';

export const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white p-6 pb-24">
      <button 
        onClick={() => navigate('/')} 
        className="mb-6 flex items-center text-gray-500 hover:text-sky-600 transition-colors"
      >
        <ArrowLeft size={20} className="mr-1" /> Voltar
      </button>

      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
            <div className="bg-sky-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield size={32} className="text-sky-600" />
            </div>
            <h1 className="text-2xl font-bold text-sky-900">Política de Privacidade</h1>
            <p className="text-gray-500 text-sm">Última atualização: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="space-y-6 text-gray-700 text-sm leading-relaxed text-justify">
            <section>
                <h2 className="font-bold text-lg text-gray-900 mb-2">1. Introdução</h2>
                <p>
                    O aplicativo <strong>{APP_CONFIG.NAME}</strong> respeita sua privacidade e se compromete a proteger os dados pessoais que você compartilha conosco. Esta política descreve como coletamos, usamos e protegemos suas informações.
                </p>
            </section>

            <section>
                <h2 className="font-bold text-lg text-gray-900 mb-2">2. Dados Coletados</h2>
                <p>Para o funcionamento adequado dos serviços, coletamos os seguintes dados:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li><strong>Dados de Cadastro:</strong> Nome, e-mail, senha (criptografada) e CPF (para usuários clientes) ou CNPJ (para comércios).</li>
                    <li><strong>Localização:</strong> Coletamos sua latitude e longitude apenas quando você utiliza a funcionalidade de busca por proximidade ("O que tem perto?").</li>
                    <li><strong>Imagens:</strong> Fotos de perfil ou do estabelecimento comercial enviadas voluntariamente.</li>
                </ul>
            </section>

            <section>
                <h2 className="font-bold text-lg text-gray-900 mb-2">3. Uso das Informações</h2>
                <p>Utilizamos seus dados para:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Permitir o login e autenticação na plataforma.</li>
                    <li>Exibir comércios e serviços próximos à sua localização atual.</li>
                    <li>Entrar em contato para fins de suporte ou notificações de segurança (2FA).</li>
                    <li>Garantir a segurança da plataforma e prevenir fraudes.</li>
                </ul>
            </section>

            <section>
                <h2 className="font-bold text-lg text-gray-900 mb-2">4. Compartilhamento de Dados</h2>
                <p>
                    Não vendemos seus dados pessoais. As informações públicas de comércios (Nome, Endereço, Telefone) são exibidas abertamente para cumprir o propósito do guia comercial. Dados sensíveis como CPF e Senha permanecem confidenciais.
                </p>
            </section>

            <section>
                <h2 className="font-bold text-lg text-gray-900 mb-2">5. Segurança</h2>
                <p>
                    Adotamos medidas de segurança adequadas para proteger contra acesso não autorizado, alteração ou destruição de dados. Utilizamos criptografia e autenticação segura via Google Firebase.
                </p>
            </section>

            <section>
                <h2 className="font-bold text-lg text-gray-900 mb-2">6. Seus Direitos</h2>
                <p>
                    Você tem o direito de solicitar o acesso, correção ou exclusão de seus dados pessoais a qualquer momento. Para exercer esses direitos ou excluir sua conta, acesse a área de "Ajustes" no aplicativo ou entre em contato com o suporte.
                </p>
            </section>

            <section>
                <h2 className="font-bold text-lg text-gray-900 mb-2">7. Contato</h2>
                <p>
                    Em caso de dúvidas sobre esta política, entre em contato através do e-mail: <strong>{APP_CONFIG.EMAILJS.ADMIN_EMAIL}</strong>.
                </p>
            </section>
        </div>
      </div>
    </div>
  );
};
