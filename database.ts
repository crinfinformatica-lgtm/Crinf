import { User, Vendor, UserType, AppState } from './types';

// Usuário Master Fixo
export const MASTER_USER: User = {
  id: 'master_crinf',
  name: 'Administrador Crinf',
  email: 'crinf.informatica@gmail.com',
  cpf: '000.000.000-00',
  address: 'Sede Administrativa',
  type: UserType.MASTER,
  password: '123', // Senha interna de fallback, o login valida hardcoded no App.tsx
  photoUrl: 'https://cdn-icons-png.flaticon.com/512/2942/2942813.png'
};

// Dados Iniciais (Seed)
export const INITIAL_DB: Partial<AppState> = {
  users: [
    MASTER_USER,
    { 
      id: 'user_demo_1', 
      name: 'Maria Silva', 
      email: 'maria@email.com', 
      cpf: '111.111.111-11', 
      address: 'Centro, Campo Largo', 
      type: UserType.USER, 
      password: '123' 
    }
  ],
  vendors: [
    {
      id: 'vendor_demo_1',
      name: 'Padaria Central',
      document: '12.345.678/0001-90',
      phone: '(41) 99999-9999',
      address: 'Rua Xavier da Silva, 100 - Centro',
      categories: ['Padaria', 'Café'],
      description: 'A melhor padaria da cidade, pães fresquinhos a toda hora.',
      photoUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
      rating: 4.8,
      reviewCount: 124,
      reviews: [],
      distance: 1.2,
      latitude: -25.4594,
      longitude: -49.5292,
      visibility: { showPhone: true, showAddress: true, showWebsite: true }
    },
    {
      id: 'vendor_demo_2',
      name: 'Mecânica do João',
      document: '98.765.432/0001-10',
      phone: '(41) 98888-8888',
      address: 'Av. Bom Jesus, 500',
      categories: ['Mecânica', 'Automotivo'],
      description: 'Especialista em suspensão e freios.',
      photoUrl: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80',
      rating: 4.5,
      reviewCount: 42,
      reviews: [],
      distance: 3.5,
      latitude: -25.4600,
      longitude: -49.5300,
      visibility: { showPhone: true, showAddress: true, showWebsite: false }
    }
  ],
  bannedDocuments: []
};