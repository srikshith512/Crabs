"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  DollarSign,
  Edit2,
  Eye,
  FileText,
  Loader2,
  Plus,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { API_BASE } from "@/lib/api-config";

type Project = {
  id: string;
  name: string;
  client_name: string | null;
  created_at: string;
};

type Order = {
  id: string;
  project_id: string;
  order_code: string;
  title: string;
  description: string;
  created_at: string;
  item_count?: number;
  total_amount?: number;
};



// In-memory cache for instant client-side navigations (bypasses hydration mismatch)
const memoryCache = {
  projects: {} as Record<string, Project>,
  orders: {} as Record<string, Order[]>,
};

export default function OrdersPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = params?.projectId as string;

  const [projectState, setProjectState] = useState<Project | null>(null);
  const [ordersState, setOrdersState] = useState<Order[]>([]);
  const [isLoadingState, setIsLoadingState] = useState(true);

  // Derived state: instantly prefer memory cache over React state if available.
  // This bypasses React state delays if `projectId` is populated slightly after initial render 
  // during Next.js router view transitions.
  const cachedProject = projectId ? memoryCache.projects[projectId] : null;
  const project = cachedProject || projectState;
  const orders = cachedProject ? memoryCache.orders[projectId] : ordersState;
  const isLoading = cachedProject ? false : isLoadingState;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [orderCode, setOrderCode] = useState("");
  const [orderTitle, setOrderTitle] = useState("");
  const [orderDescription, setOrderDescription] = useState("");

  const orderSummary = useMemo(
    () => ({
      totalOrders: orders.length,
      totalAmount: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
      totalItems: orders.reduce((sum, o) => sum + (o.item_count || 0), 0),
    }),
    [orders],
  );

  useEffect(() => {
    if (!projectId) return;
    void loadData();
  }, [projectId]);

  const getSessionToken = () => {
    const sessionString = localStorage.getItem("session");
    if (!sessionString || sessionString === "null") {
      router.push("/login");
      return null;
    }
    const session = JSON.parse(sessionString);
    return session?.access_token as string | null;
  };

  const loadData = async () => {
    const token = getSessionToken();
    if (!token) return;

    try {
      const [projectRes, ordersRes] = await Promise.all([
        fetch(`${API_BASE}/projects/${projectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/orders/project/${projectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (projectRes.status === 401 || ordersRes.status === 401) {
        localStorage.removeItem("session");
        localStorage.removeItem("user");
        router.push("/login");
        return;
      }

      const projectData = await projectRes.json();
      const ordersData = await ordersRes.json();

      if (!projectRes.ok) throw new Error(projectData.error || "Failed to load project");
      if (!ordersRes.ok) throw new Error(ordersData.error || "Failed to load orders");

      const freshProject = projectData.project || null;
      const freshOrders = ordersData.orders || [];

      setProjectState(freshProject);
      setOrdersState(freshOrders);

      // Save to fast in-memory cache
      if (projectId) {
        memoryCache.projects[projectId] = freshProject;
        memoryCache.orders[projectId] = freshOrders;
      }
    } catch (error: any) {
      if (!memoryCache.projects[projectId]) {
        alert(error.message || "Failed to load orders page");
      }
    } finally {
      setIsLoadingState(false);
    }
  };

  const resetForm = () => {
    setOrderCode("");
    setOrderTitle("");
    setOrderDescription("");
  };

  const handleCreateOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const token = getSessionToken();
    if (!token) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/orders/project/${projectId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          order_code: orderCode,
          title: orderTitle,
          description: orderDescription,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create order");

      setIsOrderModalOpen(false);
      resetForm();
      await loadData();
    } catch (error: any) {
      alert(error.message || "Failed to create order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (order: Order) => {
    setSelectedOrder(order);
    setOrderCode(order.order_code);
    setOrderTitle(order.title);
    setOrderDescription(order.description || "");
    setIsEditModalOpen(true);
  };

  const handleUpdateOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const token = getSessionToken();
    if (!token || !selectedOrder) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/orders/${selectedOrder.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          order_code: orderCode,
          title: orderTitle,
          description: orderDescription,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update order");

      setIsEditModalOpen(false);
      setSelectedOrder(null);
      resetForm();
      await loadData();
    } catch (error: any) {
      alert(error.message || "Failed to update order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrder = async () => {
    const token = getSessionToken();
    if (!token || !selectedOrder) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/orders/${selectedOrder.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete order");

      setIsDeleteModalOpen(false);
      setSelectedOrder(null);
      await loadData();
    } catch (error: any) {
      alert(error.message || "Failed to delete order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ─── Create Order Modal ─── */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start p-6 pb-2">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Create New Order</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Add a new order to this project workspace.
                </p>
              </div>
              <button
                onClick={() => { setIsOrderModalOpen(false); resetForm(); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
                disabled={isSubmitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateOrder} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Order Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={orderCode}
                  onChange={(e) => setOrderCode(e.target.value)}
                  placeholder="e.g., ORD-001"
                  required
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white transition-all shadow-sm disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={orderTitle}
                  onChange={(e) => setOrderTitle(e.target.value)}
                  placeholder="e.g., Foundation Work Order"
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white transition-all shadow-sm disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Description
                </label>
                <textarea
                  value={orderDescription}
                  onChange={(e) => setOrderDescription(e.target.value)}
                  placeholder="Optional description for this order..."
                  rows={3}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white transition-all shadow-sm resize-none disabled:opacity-50"
                />
              </div>
              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setIsOrderModalOpen(false); resetForm(); }}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Edit Order Modal ─── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start p-6 pb-2">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Edit Order</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Update details for this order.
                </p>
              </div>
              <button
                onClick={() => { setIsEditModalOpen(false); setSelectedOrder(null); resetForm(); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
                disabled={isSubmitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateOrder} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Order Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={orderCode}
                  onChange={(e) => setOrderCode(e.target.value)}
                  placeholder="e.g., ORD-001"
                  required
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white transition-all shadow-sm disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={orderTitle}
                  onChange={(e) => setOrderTitle(e.target.value)}
                  placeholder="Order title"
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white transition-all shadow-sm disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Description
                </label>
                <textarea
                  value={orderDescription}
                  onChange={(e) => setOrderDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white transition-all shadow-sm resize-none disabled:opacity-50"
                />
              </div>
              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setIsEditModalOpen(false); setSelectedOrder(null); resetForm(); }}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete Order</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedOrder?.title}</span>?
              This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => { setIsDeleteModalOpen(false); setSelectedOrder(null); }}
                className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteOrder}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Page Header ─── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
        <div>
          <Link
            href="/dashboard/projects"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">
            {project?.name || "Project"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Orders for {project?.client_name || "this project"}
          </p>
        </div>
        <button
          onClick={() => setIsOrderModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          Add Order
        </button>
      </div>

      {/* ─── Orders List ─── */}
      <div className="space-y-4 mb-10">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 animate-pulse h-52" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 border-dashed rounded-2xl flex flex-col items-center justify-center p-16 text-center">
            <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 mb-4">
              <ShoppingCart className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No orders yet</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6">
              Create your first order to start tracking work items and billing.
            </p>
            <button
              onClick={() => setIsOrderModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create Order
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:shadow-md transition-all group flex flex-col"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg line-clamp-1">{order.title}</h3>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full ml-3 flex-shrink-0 border border-slate-200 dark:border-slate-700">
                    Active
                  </span>
                </div>

                {/* Order Code */}
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">
                  Order #{order.order_code}
                </p>

                {/* Description */}
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-1">
                  {order.description || "No description provided."}
                </p>

                {/* Stats */}
                <div className="flex gap-10 mb-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">Items</p>
                    <p className="text-base font-bold text-slate-900 dark:text-white">{order.item_count || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">Amount</p>
                    <p className="text-base font-bold text-blue-600 dark:text-blue-400">
                      ₹{(order.total_amount || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 mt-auto">
                  <Link
                    href={`/dashboard/projects/${projectId}/orders/${order.id}/items`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View Items
                  </Link>
                  <button
                    onClick={() => openEdit(order)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => { setSelectedOrder(order); setIsDeleteModalOpen(true); }}
                    className="ml-auto p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Created date */}
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
                  Created {new Date(order.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Summary Stats ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none mb-0.5">
              {orderSummary.totalOrders}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Total Orders</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none mb-0.5">
              ₹{orderSummary.totalAmount.toLocaleString("en-IN")}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Total Amount</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center flex-shrink-0">
            <ShoppingCart className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none mb-0.5">
              {orderSummary.totalItems}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Total Items</p>
          </div>
        </div>
      </div>
    </div>
  );
}
