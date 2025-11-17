import { Component, ChangeDetectionStrategy, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product, CartItem, User } from './models';
import { GeminiService } from './services/gemini.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule],
})
export class AppComponent {
  private geminiService = inject(GeminiService);

  // --- State Signals ---
  private users = signal<User[]>([
    { username: 'mariocas', password: '123', role: 'admin', name: 'Mario Casas' },
    { username: 'jabuitrago', password: '123', role: 'seller', name: 'J. A. Buitrago' },
    { username: 'jleal', password: '123', role: 'seller', name: 'J. Leal' },
    { username: 'jpineda', password: '123', role: 'seller', name: 'J. Pineda' },
    { username: 'kgonzales', password: '123', role: 'seller', name: 'K. Gonzales' },
  ]);
  
  products = signal<Product[]>([
    { id: 'p1', name: 'Café Colombiano', price: 15.50, stock: 50, imageUrl: 'https://picsum.photos/id/1060/400/300' },
    { id: 'p2', name: 'Teclado Mecánico', price: 120.00, stock: 25, imageUrl: 'https://picsum.photos/id/5/400/300' },
    { id: 'p3', name: 'Libreta de Notas', price: 8.75, stock: 100, imageUrl: 'https://picsum.photos/id/24/400/300' },
    { id: 'p4', name: 'Audífonos Inalámbricos', price: 85.25, stock: 40, imageUrl: 'https://picsum.photos/id/1075/400/300' },
    { id: 'p5', name: 'Botella de Agua', price: 22.00, stock: 80, imageUrl: 'https://picsum.photos/id/1025/400/300' },
    { id: 'p6', name: 'Mochila Urbana', price: 75.00, stock: 30, imageUrl: 'https://picsum.photos/id/10/400/300' },
  ]);
  cart = signal<CartItem[]>(this.loadCartFromStorage());
  
  selectedProduct = signal<Product | null>(null);
  isModalOpen = signal(false);
  isAddProductModalOpen = signal(false);
  isManageSellersModalOpen = signal(false);
  
  aiDescription = signal('');
  isGeneratingDescription = signal(false);
  aiError = this.geminiService.error;

  newProduct = signal<{name: string; price: number | null; stock: number | null; imageUrl: string}>({
    name: '',
    price: null,
    stock: null,
    imageUrl: ''
  });

  // Auth State
  currentUser = signal<User | null>(this.loadUserFromStorage());
  loginUsername = signal('');
  loginPassword = signal('');
  loginError = signal<string | null>(null);
  
  // New Seller State
  newSeller = signal<{ name: string; username: string }>({ name: '', username: '' });
  addSellerError = signal<string | null>(null);


  constructor() {
    // Save cart to localStorage whenever it changes
    effect(() => {
      this.saveCartToStorage(this.cart());
    });
    // Save user session to localStorage whenever it changes
    effect(() => {
      this.saveUserToStorage(this.currentUser());
    });
  }

  // --- Computed Signals ---
  cartTotal = computed(() => this.cart().reduce((acc, item) => acc + item.price * item.quantity, 0));
  cartItemCount = computed(() => this.cart().reduce((acc, item) => acc + item.quantity, 0));
  sellers = computed(() => this.users().filter(u => u.role === 'seller'));

  isNewProductFormValid = computed(() => {
    const p = this.newProduct();
    return (
      p.name.trim() !== '' &&
      p.price != null && p.price > 0 &&
      p.stock != null && p.stock >= 0 &&
      p.imageUrl.trim() !== ''
    );
  });
  
  isNewSellerFormValid = computed(() => {
    const s = this.newSeller();
    return s.name.trim() !== '' && s.username.trim() !== '';
  });
  
  // --- Methods ---

  // Storage
  private saveCartToStorage(cart: CartItem[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem('poliMarketCart', JSON.stringify(cart));
    } catch (e) {
      console.error('Error saving cart to localStorage', e);
    }
  }

  private loadCartFromStorage(): CartItem[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const savedCart = localStorage.getItem('poliMarketCart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (e) {
      console.error('Error loading cart from localStorage', e);
      return [];
    }
  }

  private saveUserToStorage(user: User | null): void {
    if (typeof localStorage === 'undefined') return;
    try {
      if (user) {
        localStorage.setItem('poliMarketUser', JSON.stringify(user));
      } else {
        localStorage.removeItem('poliMarketUser');
      }
    } catch (e) {
      console.error('Error saving user to localStorage', e);
    }
  }

  private loadUserFromStorage(): User | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const savedUser = localStorage.getItem('poliMarketUser');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      console.error('Error loading user from localStorage', e);
      return null;
    }
  }
  
  // Auth
  login(): void {
    const user = this.users().find(
      u => u.username === this.loginUsername() && u.password === this.loginPassword()
    );

    if (user) {
      const { password, ...userWithoutPassword } = user;
      this.currentUser.set(userWithoutPassword);
      this.loginError.set(null);
      this.loginUsername.set('');
      this.loginPassword.set('');
    } else {
      this.loginError.set('Usuario o contraseña incorrectos.');
    }
  }

  logout(): void {
    this.currentUser.set(null);
  }
  
  onLoginUsernameChange(event: Event): void {
    this.loginUsername.set((event.target as HTMLInputElement).value);
  }

  onLoginPasswordChange(event: Event): void {
    this.loginPassword.set((event.target as HTMLInputElement).value);
  }

  // Cart Management
  addToCart(product: Product): void {
    if (product.stock <= 0) return;

    const existingItem = this.cart().find(item => item.productId === product.id);

    if (existingItem) {
      this.cart.update(items =>
        items.map(item =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      this.cart.update(items => [...items, { productId: product.id, name: product.name, price: product.price, quantity: 1 }]);
    }
  }

  updateQuantity(productId: string, change: number): void {
    this.cart.update(items => {
      const updatedItems = items.map(item => {
        if (item.productId === productId) {
          const newQuantity = item.quantity + change;
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
        }
        return item;
      }).filter(Boolean) as CartItem[];
      return updatedItems;
    });
  }

  checkout(): void {
    if (this.cart().length === 0) return;

    this.products.update(products => {
      return products.map(p => {
        const cartItem = this.cart().find(item => item.productId === p.id);
        if (cartItem) {
          return { ...p, stock: p.stock - cartItem.quantity };
        }
        return p;
      });
    });

    alert(`Venta registrada por un total de $${this.cartTotal().toFixed(2)}!`);
    this.cart.set([]);
  }

  // Modals and AI
  openModal(product: Product): void {
    this.selectedProduct.set(product);
    this.aiDescription.set('');
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedProduct.set(null);
  }

  async generateDescription(): Promise<void> {
    const product = this.selectedProduct();
    if (!product) return;

    this.isGeneratingDescription.set(true);
    this.aiDescription.set('');

    const description = await this.geminiService.generateProductDescription(product.name);
    
    this.aiDescription.set(description);
    this.isGeneratingDescription.set(false);
  }

  // Add Product Functionality
  openAddProductModal(): void {
    this.isAddProductModalOpen.set(true);
  }

  closeAddProductModal(): void {
    this.isAddProductModalOpen.set(false);
    this.newProduct.set({ name: '', price: null, stock: null, imageUrl: '' });
  }
  
  onNewProductNameChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.newProduct.update(p => ({ ...p, name: value }));
  }

  onNewProductPriceChange(event: Event): void {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    this.newProduct.update(p => ({ ...p, price: isNaN(value) ? null : value }));
  }

  onNewProductStockChange(event: Event): void {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    this.newProduct.update(p => ({ ...p, stock: isNaN(value) ? null : value }));
  }

  onNewProductImageUrlChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.newProduct.update(p => ({ ...p, imageUrl: value }));
  }

  addProduct(): void {
    if (!this.isNewProductFormValid()) return;

    const p = this.newProduct();
    const productToAdd: Product = {
      id: `p${Date.now()}`,
      name: p.name!,
      price: p.price!,
      stock: p.stock!,
      imageUrl: p.imageUrl!,
    };

    this.products.update(currentProducts => [productToAdd, ...currentProducts]);
    this.closeAddProductModal();
  }

  // Manage Sellers (Admin)
  openManageSellersModal(): void {
    this.addSellerError.set(null); // Reset on open
    this.isManageSellersModalOpen.set(true);
  }

  closeManageSellersModal(): void {
    this.isManageSellersModalOpen.set(false);
  }
  
  onNewSellerNameChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.newSeller.update(s => ({ ...s, name: value }));
    this.addSellerError.set(null);
  }

  onNewSellerUsernameChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.newSeller.update(s => ({ ...s, username: value }));
     this.addSellerError.set(null);
  }

  addSeller(): void {
    if (!this.isNewSellerFormValid()) return;
    const { name, username } = this.newSeller();

    if (this.users().some(u => u.username.toLowerCase() === username.toLowerCase())) {
      this.addSellerError.set('El nombre de usuario ya existe.');
      return;
    }

    const sellerToAdd: User = {
      name,
      username,
      password: '123', // Default password
      role: 'seller',
    };
    this.users.update(currentUsers => [...currentUsers, sellerToAdd]);
    this.newSeller.set({ name: '', username: '' });
    this.addSellerError.set(null);
  }

  deleteSeller(usernameToDelete: string): void {
    this.users.update(currentUsers =>
      currentUsers.filter(u => u.username !== usernameToDelete)
    );
  }
}