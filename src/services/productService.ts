/**
 * NamasteMart Product Service
 * Clean service for product catalog, validation, and real-time operations.
 */

export {
  subscribeToProducts,
  addProductToFirestore,
  updateProductInFirestore,
  deleteProductFromFirestore,
  duplicateProductInFirestore,
  validateProduct,
  calculateFinalPrice,
  validateStockForCheckout,
  decrementStockForOrder,
} from './firestore';
