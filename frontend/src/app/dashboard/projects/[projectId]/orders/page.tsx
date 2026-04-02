"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Loader2,
  Plus,
  ShoppingCart,
  X,
} from "lucide-react";

type Project = {
  id: string;
  name: string;
  client_name: string | null;
  created_at: string;
};

type Order = {
  id: string;
  project_id: string;
  order_number: string;
  date: string;
  status: string;
  created_at: string;
};

const API_BASE = "http://localhost:5000/api";

export default function OrdersPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = params?.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [orderNumber, setOrderNumber] = useState("");
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("draft");

  const orderSummary = useMemo(
    () => ({
      totalOrders: orders.length,
      draftOrders: orders.filter((order) => order.status === "draft").length,
      activeOrders: orders.filter((order) => order.status === "active").length,
    }),
    [orders],
  );

  useEffect(() => {
    if (!projectId) return;
    void loadData();
  }, [projectId]);

  const getSessionToken = () => {
    const sessionString = localStorage.getItem("session");
    if (!sessionString) {
      router.push("/login");
      return null;
    }

    const session = JSON.parse(sessionString);
    return session.access_token as string;
  };

  const loadData = async () => {
    const token = getSessionToken();
    if (!token) return;

    setIsLoading(true);
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

      setProject(projectData.project || null);
      setOrders(ordersData.orders || []);
    } catch (error: any) {
      alert(error.message || "Failed to load orders page");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setOrderNumber("");
    setOrderDate(new Date().toISOString().split("T")[0]);
    setStatus("draft");
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
          order_number: orderNumber,
          date: orderDate,
          status,
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
    setOrderNumber(order.order_number);
    setOrderDate(order.date);
    setStatus(order.status || "draft");
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
          order_number: orderNumber,
          date: orderDate,
          status,
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 relative h-full flex flex-col">
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start p-6 pb-2">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Create New Order</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Add a work order under this project. You can attach items later.
                </p>
              </div>
              <button
                onClick={() => setIsOrderModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
                disabled={isSubmitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Order Number</label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="e.g., ORD-001"
                  disabled={isSubmitting}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white transition-all shadow-sm disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Order Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white transition-all shadow-sm disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white transition-all shadow-sm disabled:opacity-50"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
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

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start p-6 pb-2">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Edit Order</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Update order details for this project.
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
                disabled={isSubmitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateOrder} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Order Number</label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="e.g., ORD-001"
                  disabled={isSubmitting}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white transition-all shadow-sm disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Order Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white transition-all shadow-sm disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-600 outline-none text-slate-900 dark:text-white transition-all shadow-sm disabled:opacity-50"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
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
                  Update Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete Order</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Are you sure you want to delete order {selectedOrder.order_number}? This cannot be undone.
              </p>
              <div className="pt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteOrder}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Delete Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">{project?.name || "Orders"}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Orders for {project?.client_name || "this project"}</p>
        </div>
        <button
          onClick={() => setIsOrderModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          Add Order
        </button>
      </div>

      {isLoading ? (
        <div className="flex-1 bg-slate-50/50 dark:bg-slate-900/20 border-2 border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center p-12 animate-pulse min-h-[320px]" />
      ) : orders.length === 0 ? (
        <div className="flex-1 bg-slate-50/50 dark:bg-slate-900/20 border-2 border-slate-200 dark:border-slate-800 border-dashed rounded-3xl flex flex-col items-center justify-center p-12 text-center min-h-[320px]">
          <div className="mb-6 text-slate-400">
            <ShoppingCart className="w-16 h-16 stroke-[1.5]" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">No Orders Yet</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-8">
            Add your first order for this project to start organizing item-level work.
          </p>
          <button
            onClick={() => setIsOrderModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-sm shadow-blue-600/20 hover:shadow-md hover:shadow-blue-600/30 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Create First Order
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Orders</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{orderSummary.totalOrders}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400">Draft Orders</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{orderSummary.draftOrders}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400">Active Orders</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{orderSummary.activeOrders}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 hover:shadow-md transition-all group flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <FileText className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 capitalize">
                    {order.status}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 dark:text-white text-xl mb-1.5 line-clamp-1">Order #{order.order_number}</h3>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 line-clamp-1 mb-6 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(order.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm">
                  <button
                    onClick={() => openEdit(order)}
                    className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
                  >
                    Edit Order
                  </button>
                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setIsDeleteModalOpen(true);
                    }}
                    className="text-red-600 dark:text-red-400 font-medium hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
