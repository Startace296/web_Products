// Tầng: service — business logic Cart. Stock ở đây chỉ là soft check (UX, báo lỗi
// sớm) — check có tính quyết định (authoritative, chống race) nằm ở orderService lúc
// đặt hàng, xem productRepository.decrementStock.
import { cartRepository } from "../repositories/cartRepository";
import { productRepository } from "../repositories/productRepository";
import { ApiError } from "../utils/ApiError";
import { MAX_QUANTITY_PER_ITEM } from "../validations/cartValidation";
import type { AddCartItemInput, UpdateCartItemInput } from "../validations/cartValidation";

export interface CartItemView {
  productId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  category: string;
  price: number;
  stock: number;
  quantity: number;
  subtotal: number;
}

export interface CartSummary {
  items: CartItemView[];
  totalItems: number;
  totalAmount: number;
}

const getCart = async (userId: string): Promise<CartSummary> => {
  const rows = await cartRepository.findManyByUser(userId);

  // subtotal tính live theo Product.price hiện tại, KHÔNG snapshot — snapshot chỉ
  // xảy ra khi tạo Order (xem orderService), giỏ hàng luôn phản ánh giá mới nhất.
  const items: CartItemView[] = rows.map((row) => ({
    productId: row.productId,
    name: row.product.name,
    slug: row.product.slug,
    imageUrl: row.product.imageUrl,
    category: row.product.category,
    price: row.product.price,
    stock: row.product.stock,
    quantity: row.quantity,
    subtotal: row.product.price * row.quantity,
  }));

  return {
    items,
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: items.reduce((sum, item) => sum + item.subtotal, 0),
  };
};

const addItem = async (userId: string, input: AddCartItemInput): Promise<CartSummary> => {
  const product = await productRepository.findById(input.productId);
  if (!product) {
    throw ApiError.notFound("Product not found");
  }

  const existing = await cartRepository.findByUserAndProduct(userId, input.productId);
  const nextQuantity = (existing?.quantity ?? 0) + input.quantity;

  if (nextQuantity > MAX_QUANTITY_PER_ITEM) {
    throw ApiError.badRequest(`Chỉ được tối đa ${MAX_QUANTITY_PER_ITEM} sản phẩm mỗi loại trong giỏ`);
  }
  if (nextQuantity > product.stock) {
    throw ApiError.badRequest(`Chỉ còn ${product.stock} sản phẩm trong kho`);
  }

  await cartRepository.upsertItem(userId, input.productId, input.quantity);
  return getCart(userId);
};

const updateItem = async (userId: string, productId: string, input: UpdateCartItemInput): Promise<CartSummary> => {
  const existing = await cartRepository.findByUserAndProduct(userId, productId);
  if (!existing) {
    throw ApiError.notFound("Item not in cart");
  }

  if (input.quantity === 0) {
    await cartRepository.removeItem(userId, productId);
    return getCart(userId);
  }

  const product = await productRepository.findById(productId);
  if (!product) {
    throw ApiError.notFound("Product not found");
  }
  if (input.quantity > product.stock) {
    throw ApiError.badRequest(`Chỉ còn ${product.stock} sản phẩm trong kho`);
  }

  await cartRepository.setQuantity(userId, productId, input.quantity);
  return getCart(userId);
};

const removeItem = async (userId: string, productId: string): Promise<CartSummary> => {
  const existing = await cartRepository.findByUserAndProduct(userId, productId);
  if (!existing) {
    throw ApiError.notFound("Item not in cart");
  }

  await cartRepository.removeItem(userId, productId);
  return getCart(userId);
};

export const cartService = {
  getCart,
  addItem,
  updateItem,
  removeItem,
};
