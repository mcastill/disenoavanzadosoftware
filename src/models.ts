export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  imageUrl: string;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface User {
  username: string;
  password?: string; // Not stored in currentUser signal after login
  role: 'admin' | 'seller';
  name: string;
}
