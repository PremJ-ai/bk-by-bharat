import { apiClient } from "./client";
import type { ProductViewModel } from "@/components/product/product.types";

export interface DetailedProductModel extends ProductViewModel {
  sku: string;
  description: string;
  longDescription?: string;
  galleryImages: string[];
  sizes: {
    id?: string;
    sku: string;
    size: string;
    stock: number;
    available: boolean;
    pricePaise: number;
  }[];
  colors: { name: string; hex: string }[];
  details: string[];
  careInstructions: string[];
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  createdAt?: string;
  updatedAt?: string;
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  description?: string;
  displayOrder: number;
  productCount: number;
}

export async function getStorefrontProducts(params?: {
  category?: string;
  material?: string;
  size?: string;
  inStock?: boolean;
  search?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: ProductViewModel[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.category && params.category !== "all") searchParams.set("category", params.category);
  if (params?.material && params.material !== "all") searchParams.set("material", params.material);
  if (params?.size && params.size !== "all") searchParams.set("size", params.size);
  if (params?.inStock) searchParams.set("inStock", "true");
  if (params?.search) searchParams.set("search", params.search);
  if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const queryStr = searchParams.toString();
  const endpoint = `/products${queryStr ? `?${queryStr}` : ""}`;
  const res = await apiClient<ProductViewModel[]>(endpoint);

  return {
    items: res.data || [],
    total: res.pagination?.total || (res.data || []).length,
  };
}

export async function getStorefrontProductBySlug(
  slug: string
): Promise<DetailedProductModel> {
  const res = await apiClient<DetailedProductModel>(`/products/${slug}`);
  return res.data;
}

export async function getStorefrontCategories(): Promise<CategorySummary[]> {
  const res = await apiClient<CategorySummary[]>("/categories");
  return res.data || [];
}

// -----------------------------------------------------------------------------
// Admin Catalog Operations
// -----------------------------------------------------------------------------

export async function getAdminProducts(params?: {
  status?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: any[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.category && params.category !== "all") searchParams.set("category", params.category);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const queryStr = searchParams.toString();
  const endpoint = `/admin/products${queryStr ? `?${queryStr}` : ""}`;
  const res = await apiClient<any[]>(endpoint);

  return {
    items: res.data || [],
    total: res.pagination?.total || (res.data || []).length,
  };
}

export async function getAdminProductById(id: string): Promise<any> {
  const res = await apiClient<any>(`/admin/products/${id}`);
  return res.data;
}

export async function createAdminProduct(payload: any): Promise<any> {
  const res = await apiClient<any>("/admin/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateAdminProduct(id: string, payload: any): Promise<any> {
  const res = await apiClient<any>(`/admin/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function publishAdminProduct(id: string): Promise<any> {
  const res = await apiClient<any>(`/admin/products/${id}/publish`, {
    method: "PATCH",
  });
  return res.data;
}

export async function unpublishAdminProduct(id: string): Promise<any> {
  const res = await apiClient<any>(`/admin/products/${id}/unpublish`, {
    method: "PATCH",
  });
  return res.data;
}

export async function archiveAdminProduct(id: string): Promise<any> {
  const res = await apiClient<any>(`/admin/products/${id}/archive`, {
    method: "PATCH",
  });
  return res.data;
}
