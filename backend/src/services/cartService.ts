// Tầng: service — business logic Cart. Stock ở đây chỉ là soft check (UX, báo lỗi
// sớm) — check có tính quyết định (authoritative, chống race) nằm ở orderService lúc
// đặt hàng, xem productRepository.decrementStock.
import { Prisma } from "@prisma/client";
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

  // Soft check — chỉ để báo lỗi sớm/UX, KHÔNG chống race (check có tính quyết định nằm ở
  // orderService lúc đặt hàng, xem productRepository.decrementStock). Chấp nhận việc 2
  // request chen nhau hiếm khi khiến giỏ hàng tạm vượt tồn kho hiển thị.
  if (input.quantity > product.stock) {
    throw ApiError.badRequest(`Chỉ còn ${product.stock} sản phẩm trong kho`);
  }

  // Ngược lại, cap MAX_QUANTITY_PER_ITEM là quy tắc nghiệp vụ cứng, không có bước kiểm
  // tra nào khác phía sau bù lại — incrementIfWithinCap atomic hoá cả check lẫn ghi trong
  // 1 câu SQL nên 2 request chen nhau không thể cùng vượt cap (khác bug cũ: đọc quantity
  // rồi mới check, đọc-rồi-ghi không atomic).
  const incremented = await cartRepository.incrementIfWithinCap(
    userId,
    input.productId,
    input.quantity,
    MAX_QUANTITY_PER_ITEM
  );

  if (incremented === 0) {
    try {
      await cartRepository.createItem(userId, input.productId, input.quantity);
    } catch (err) {
      // P2002: dòng vừa được 1 request khác tạo trước (2 lần "thêm lần đầu" cùng sản phẩm
      // chạy song song) — không phải lỗi thật, thử atomic-increment lại giờ dòng đã tồn
      // tại. Nếu vẫn 0 nghĩa là cộng thêm sẽ vượt cap thật.
      if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") {
        throw err;
      }
      const retried = await cartRepository.incrementIfWithinCap(
        userId,
        input.productId,
        input.quantity,
        MAX_QUANTITY_PER_ITEM
      );
      if (retried === 0) {
        throw ApiError.badRequest(`Chỉ được tối đa ${MAX_QUANTITY_PER_ITEM} sản phẩm mỗi loại trong giỏ`);
      }
    }
  }

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
