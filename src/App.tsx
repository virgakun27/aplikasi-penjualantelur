import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Egg, 
  ShoppingCart, 
  TrendingUp, 
  Coins, 
  Users, 
  Settings as SettingsIcon, 
  Database, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Info,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Key,
  Eye,
  EyeOff,
  Shield,
  Edit2,
  Lock,
  UserCheck,
  Copy,
  Check,
  Code,
  FileCode,
  ExternalLink,
  Server,
  Cloud,
  Layers,
  Terminal,
  Sliders,
  Target,
  TableProperties,
  FileSpreadsheet,
  Search,
  Calendar,
  Filter
} from 'lucide-react';
import { 
  generateFullSupabaseSql, 
  generateTablesOnlySql, 
  generateRlsOnlySql, 
  generateSeedOnlySql 
} from './services/supabaseSql';
import { testSupabaseConnection } from './services/supabaseClient';

// --- INTERFACES ---
interface OverallDataRow {
  date: string;
  productionKg: number;
  salesKg: number;
  salesIncome: number;
  expenses: number;
  netProfit: number;
  notes: string;
}
interface ProductionRecord {
  id: string;
  date: string;
  weightKg: number;
  eggsPerKg?: number; // Opsional
  goodEggs?: number;
  brokenEggs?: number;
  feedConsumptionKg?: number;
  notes?: string;
  recordedBy: string;
}

interface SalesRecord {
  id: string;
  date: string;
  customerName: string;
  quantity: number;
  weightKg: number;
  pricePerUnit: number; // per Kg
  totalAmount: number;
  paymentStatus: 'Lunas' | 'Belum Lunas';
  recordedBy: string;
}

interface ExpenseRecord {
  id: string;
  date: string;
  category: string;
  amount: number;
  description: string;
  recordedBy: string;
}

interface CapitalConversion {
  id: string;
  date: string;
  amount: number;
  allocation: string;
  description: string;
  status: 'Rencana' | 'Selesai';
}

interface User {
  id: string;
  name: string;
  username: string;
  password: string;
  role: 'Admin' | 'Pengelola' | 'Kasir';
  status: 'Aktif' | 'Nonaktif';
}

interface AppSettings {
  farmName: string;
  pricePerKg: number;
  dailyTargetKg: number;
  dailyTargetButir?: number; // fallback legacy
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

interface AppState {
  production: ProductionRecord[];
  sales: SalesRecord[];
  expenses: ExpenseRecord[];
  capitalConversions: CapitalConversion[];
  users: User[];
  activeUserId: string;
  settings: AppSettings;
}

// --- INITIAL USERS & DEFAULT STATE ---
const INITIAL_USERS: User[] = [
  { id: 'u1', name: 'Pak Hartono (Owner)', username: 'admin', password: 'admin123', role: 'Admin', status: 'Aktif' },
  { id: 'u2', name: 'Budi (Pengelola Kandang)', username: 'budi', password: 'budi123', role: 'Pengelola', status: 'Aktif' },
  { id: 'u3', name: 'Siti (Kasir Penjualan)', username: 'siti', password: 'siti123', role: 'Kasir', status: 'Aktif' }
];

const INITIAL_STATE: AppState = {
  production: [],
  sales: [],
  expenses: [],
  capitalConversions: [],
  users: INITIAL_USERS,
  activeUserId: 'u1', // Default as Admin
  settings: {
    farmName: 'Peternakan Berkah Jaya',
    pricePerKg: 26000,
    dailyTargetKg: 30.0
  }
};

// --- INTERFACE DELETE TARGET ---
interface DeleteTarget {
  type: 'production' | 'sales' | 'expense' | 'sales_date' | 'user' | 'all_production' | 'all_sales' | 'all_expenses' | 'all_database';
  id?: string;
  title: string;
  description: string;
}

// --- TABLE PAGINATION COMPONENT ---
interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

function TablePagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  // Generate responsive page numbers
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <span className="text-slate-500 font-mono text-[11px]">
          Menampilkan <strong className="text-slate-800">{startItem}</strong> - <strong className="text-slate-800">{endItem}</strong> dari <strong className="text-slate-800">{totalItems}</strong> data
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400">Tampilkan:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-mono font-bold text-slate-700 focus:outline-none cursor-pointer shadow-2xs"
          >
            <option value={10}>10</option>
            <option value={25}>25 (Default)</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-[11px] text-slate-400">baris</span>
        </div>
      </div>

      <div className="flex items-center gap-1 w-full sm:w-auto justify-between sm:justify-end">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed shadow-2xs flex items-center gap-1"
          title="Halaman Sebelumnya"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Prev</span>
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, idx) => (
            p === '...' ? (
              <span key={`dots-${idx}`} className="px-1 text-slate-400 font-mono">…</span>
            ) : (
              <button
                key={`page-${p}`}
                onClick={() => onPageChange(Number(p))}
                className={`w-7 h-7 flex items-center justify-center rounded text-xs font-mono font-bold transition-colors cursor-pointer shadow-2xs ${
                  currentPage === p
                    ? 'bg-amber-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            )
          ))}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed shadow-2xs flex items-center gap-1"
          title="Halaman Berikutnya"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'produksi' | 'penjualan' | 'keuangan' | 'modal' | 'keseluruhan' | 'users' | 'settings' | 'database'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Pagination States (Default 25 data per halaman)
  const [pageProd, setPageProd] = useState(1);
  const [pageSizeProd, setPageSizeProd] = useState(25);

  const [pageSales, setPageSales] = useState(1);
  const [pageSizeSales, setPageSizeSales] = useState(25);

  const [pageExp, setPageExp] = useState(1);
  const [pageSizeExp, setPageSizeExp] = useState(25);

  const [pageConv, setPageConv] = useState(1);
  const [pageSizeConv, setPageSizeConv] = useState(25);

  const [pageOverall, setPageOverall] = useState(1);
  const [pageSizeOverall, setPageSizeOverall] = useState(25);

  // Overall Data Filters (Keseluruhan Data)
  const [overallDateFilter, setOverallDateFilter] = useState<'all' | 'today' | '7days' | 'month' | 'custom'>('all');
  const [overallStartDate, setOverallStartDate] = useState('');
  const [overallEndDate, setOverallEndDate] = useState('');
  const [overallSearchQuery, setOverallSearchQuery] = useState('');

  // Modal view states
  const [showProdModal, setShowProdModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showModalModal, setShowModalModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // User Management State
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({
    name: '',
    username: '',
    password: '',
    role: 'Pengelola' as 'Admin' | 'Pengelola' | 'Kasir',
    status: 'Aktif' as 'Aktif' | 'Nonaktif'
  });
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // Inputs
  const [prodForm, setProdForm] = useState({ date: '', weightKg: 20.0, notes: '' });
  const [saleForm, setSaleForm] = useState({ date: '', weight: 10, price: 26000, status: 'Lunas' as 'Lunas' | 'Belum Lunas' });
  const [expForm, setExpForm] = useState({ date: '', category: 'Pakan', amount: 150000, desc: '' });
  const [capForm, setCapForm] = useState({ date: '', amount: 500000, allocation: 'Bibit Ayam Baru', desc: '', status: 'Rencana' as 'Rencana' | 'Selesai' });

  // Mobile Floating Menu Submenu State (Laporan, Pengaturan)
  const [mobileSubmenu, setMobileSubmenu] = useState<'laporan' | 'pengaturan' | null>(null);

  // Tab Pos Modal: Semua Pos vs Pos Spesifik (Pakan 63%, Ayam 20%, Gaji 12%, Listrik 0.5%, Air 1%, Vaksin 3.5%)
  const [selectedPosTab, setSelectedPosTab] = useState<'semua' | 'pakan' | 'ayam' | 'gaji' | 'listrik' | 'air' | 'vaksin'>('semua');

  // Daily conversion filters & interactive simulation
  const [selectedConversionDate, setSelectedConversionDate] = useState<string>('');
  const [simulatedSalesAmount, setSimulatedSalesAmount] = useState<number>(1000000);

  // Supabase State & Helpers
  const [selectedSqlTab, setSelectedSqlTab] = useState<'all' | 'tables' | 'rls' | 'seed'>('all');
  const [copiedSql, setCopiedSql] = useState(false);
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [supabaseTestResult, setSupabaseTestResult] = useState<{ checked: boolean; success: boolean; message: string } | null>(null);

  // Persistence & User Migration
  useEffect(() => {
    const saved = localStorage.getItem('telur_tracker_db_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.users && parsed.users.length > 0) {
          parsed.users = parsed.users.map((u: any, idx: number) => ({
            ...u,
            username: u.username || (idx === 0 ? 'admin' : idx === 1 ? 'budi' : `user${idx + 1}`),
            password: u.password || (idx === 0 ? 'admin123' : '123456'),
            status: u.status || 'Aktif'
          }));
        } else {
          parsed.users = INITIAL_USERS;
        }

        // Migration dailyTargetButir -> dailyTargetKg
        if (parsed.settings) {
          if (!parsed.settings.dailyTargetKg && parsed.settings.dailyTargetButir) {
            parsed.settings.dailyTargetKg = Math.round((parsed.settings.dailyTargetButir / 16) * 10) / 10;
          } else if (!parsed.settings.dailyTargetKg) {
            parsed.settings.dailyTargetKg = 30.0;
          }
        }
        setState(parsed);
      } catch (e) {
        console.error('Error loading DB state', e);
      }
    }
  }, []);

  const handleCopySql = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSql(true);
    showToast('Skrip SQL Supabase berhasil disalin!', 'success');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleDownloadSql = () => {
    const sql = generateFullSupabaseSql(state.settings.farmName, state.settings.dailyTargetKg || 30);
    const blob = new Blob([sql], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `eggtrack_supabase_schema_${new Date().toISOString().split('T')[0]}.sql`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('File skrip SQL Supabase berhasil diunduh!', 'success');
  };

  const handleTestSupabase = async () => {
    const url = state.settings.supabaseUrl?.trim();
    const key = state.settings.supabaseAnonKey?.trim();
    if (!url || !key) {
      showToast('Masukkan URL Project dan Anon Key Supabase terlebih dahulu!', 'error');
      return;
    }
    setIsTestingSupabase(true);
    const result = await testSupabaseConnection(url, key);
    setIsTestingSupabase(false);
    setSupabaseTestResult({
      checked: true,
      success: result.success,
      message: result.message
    });
    if (result.success) {
      showToast(result.message, 'success');
    } else {
      showToast(result.message, 'error');
    }
  };

  const saveState = (newState: AppState) => {
    setState(newState);
    localStorage.setItem('telur_tracker_db_v2', JSON.stringify(newState));
  };

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const activeUser = state.users.find(u => u.id === state.activeUserId) || state.users[0] || INITIAL_USERS[0];

  // RBAC guard
  const isAllowed = (menu: string) => {
    if (activeUser.role === 'Admin') return true;
    if (activeUser.role === 'Pengelola') return ['dashboard', 'produksi', 'keseluruhan', 'database'].includes(menu);
    if (activeUser.role === 'Kasir') return ['dashboard', 'penjualan', 'keuangan', 'keseluruhan'].includes(menu);
    return false;
  };

  // Switch Active User
  const handleUserSwitch = (id: string) => {
    saveState({ ...state, activeUserId: id });
    const u = state.users.find(x => x.id === id);
    showToast(`Beralih ke sesi pengguna: ${u?.name} (${u?.role})`, 'info');
  };

  // User Management Actions
  const handleOpenAddUser = () => {
    setEditingUserId(null);
    setUserForm({
      name: '',
      username: '',
      password: '',
      role: 'Pengelola',
      status: 'Aktif'
    });
    setShowUserModal(true);
  };

  const handleOpenEditUser = (user: User) => {
    setEditingUserId(user.id);
    setUserForm({
      name: user.name,
      username: user.username,
      password: user.password,
      role: user.role,
      status: user.status
    });
    setShowUserModal(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = userForm.username.trim().toLowerCase().replace(/\s+/g, '_');
    if (!cleanUsername) {
      showToast('Username tidak boleh kosong!', 'error');
      return;
    }
    if (!userForm.password || userForm.password.length < 4) {
      showToast('Password minimal 4 karakter!', 'error');
      return;
    }

    const duplicate = state.users.find(u => u.username?.toLowerCase() === cleanUsername && u.id !== editingUserId);
    if (duplicate) {
      showToast(`Username "${cleanUsername}" sudah dipakai oleh ${duplicate.name}!`, 'error');
      return;
    }

    if (editingUserId) {
      const updatedUsers = state.users.map(u => {
        if (u.id === editingUserId) {
          return {
            ...u,
            name: userForm.name.trim(),
            username: cleanUsername,
            password: userForm.password,
            role: userForm.role,
            status: userForm.status
          };
        }
        return u;
      });
      saveState({ ...state, users: updatedUsers });
      showToast(`Data pengguna "${userForm.name}" berhasil diperbarui!`, 'success');
    } else {
      const newUser: User = {
        id: `u-${Date.now()}`,
        name: userForm.name.trim(),
        username: cleanUsername,
        password: userForm.password,
        role: userForm.role,
        status: userForm.status
      };
      saveState({ ...state, users: [...state.users, newUser] });
      showToast(`Pengguna baru "${newUser.name}" (${newUser.role}) berhasil ditambahkan!`, 'success');
    }

    setShowUserModal(false);
  };

  const handleToggleUserStatus = (user: User) => {
    if (user.id === state.activeUserId && user.status === 'Aktif') {
      showToast('Tidak bisa menonaktifkan pengguna yang sedang aktif dipakai!', 'error');
      return;
    }
    const nextStatus = user.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
    const updatedUsers = state.users.map(u => u.id === user.id ? { ...u, status: nextStatus as any } : u);
    saveState({ ...state, users: updatedUsers });
    showToast(`Status akun ${user.name} diubah menjadi ${nextStatus}.`);
  };

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswordMap(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Data helpers
  const totalProductionBtr = state.production.reduce((a, b) => a + (b.goodEggs || Math.round(b.weightKg * (b.eggsPerKg || 16))), 0);
  const totalProductionKg = state.production.reduce((a, b) => a + b.weightKg, 0);
  const totalSalesBtr = state.sales.reduce((a, b) => a + b.quantity, 0);
  const totalSalesKg = state.sales.reduce((a, b) => a + b.weightKg, 0);
  
  const totalIncome = state.sales.reduce((a, b) => a + b.totalAmount, 0);
  const totalPaidSales = state.sales.filter(s => s.paymentStatus === 'Lunas').reduce((a, b) => a + b.totalAmount, 0);
  const totalPendingSales = state.sales.filter(s => s.paymentStatus === 'Belum Lunas').reduce((a, b) => a + b.totalAmount, 0);
  const totalExpenses = state.expenses.reduce((a, b) => a + b.amount, 0);
  const netProfit = totalIncome - totalExpenses;
  const currentBalance = totalPaidSales - totalExpenses; // Saldo kas riil saat ini (uang masuk lunas - pengeluaran)

  // Daily capital conversion grouped by date based on daily sales
  // Formula: Biaya Pakan (63%), Pembelian Ayam (20%), Gaji Karyawan (12%), Listrik (0.5%), Air (1%), Vaksin (3.5%) -> Total 100%
  const salesByDate = state.sales.reduce((acc, sale) => {
    const d = sale.date || 'Tanpa Tanggal';
    if (!acc[d]) {
      acc[d] = {
        date: d,
        totalSales: 0,
        totalQty: 0,
        totalWeight: 0,
        transactionCount: 0,
        customers: [] as string[],
      };
    }
    acc[d].totalSales += sale.totalAmount;
    acc[d].totalQty += (sale.quantity || Math.round(sale.weightKg * 16));
    acc[d].totalWeight += sale.weightKg;
    acc[d].transactionCount += 1;
    if (sale.customerName && !acc[d].customers.includes(sale.customerName)) {
      acc[d].customers.push(sale.customerName);
    }
    return acc;
  }, {} as Record<string, { date: string; totalSales: number; totalQty: number; totalWeight: number; transactionCount: number; customers: string[] }>);

  const dailyConversions = Object.values(salesByDate)
    .map(d => {
      const pakan = Math.round(d.totalSales * 0.63);
      const ayam = Math.round(d.totalSales * 0.20);
      const gaji = Math.round(d.totalSales * 0.12);
      const listrik = Math.round(d.totalSales * 0.005);
      const air = Math.round(d.totalSales * 0.01);
      const vaksin = Math.round(d.totalSales * 0.035);
      const totalConverted = pakan + ayam + gaji + listrik + air + vaksin;
      return {
        ...d,
        pakan,
        ayam,
        gaji,
        listrik,
        air,
        vaksin,
        totalConverted,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalConvertedAllDays = dailyConversions.reduce((acc, d) => acc + d.totalConverted, 0);
  const totalPakanAllDays = dailyConversions.reduce((acc, d) => acc + d.pakan, 0);
  const totalAyamAllDays = dailyConversions.reduce((acc, d) => acc + d.ayam, 0);
  const totalGajiAllDays = dailyConversions.reduce((acc, d) => acc + d.gaji, 0);
  const totalListrikAllDays = dailyConversions.reduce((acc, d) => acc + d.listrik, 0);
  const totalAirAllDays = dailyConversions.reduce((acc, d) => acc + d.air, 0);
  const totalVaksinAllDays = dailyConversions.reduce((acc, d) => acc + d.vaksin, 0);
  const totalSalesConverted = dailyConversions.reduce((acc, d) => acc + d.totalSales, 0);

  const totalCapitalConverted = totalConvertedAllDays > 0 ? totalConvertedAllDays : state.capitalConversions.reduce((a, b) => a + b.amount, 0);
  const remainingLaba = Math.max(0, netProfit - totalCapitalConverted);

  const stockBtr = Math.max(0, totalProductionBtr - totalSalesBtr);
  const stockKg = Math.max(0, totalProductionKg - totalSalesKg);

  // Target Produksi Harian (Kg)
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayProdKg = state.production
    .filter(p => p.date === todayDateStr)
    .reduce((a, b) => a + b.weightKg, 0);
  const dailyTargetKg = state.settings.dailyTargetKg || 30.0;
  const targetProgressPercent = dailyTargetKg > 0 
    ? Math.min(100, Math.round((todayProdKg / dailyTargetKg) * 100)) 
    : 0;

  // Paginated Data (Default 25 records per view)
  const paginatedProduction = state.production.slice((pageProd - 1) * pageSizeProd, pageProd * pageSizeProd);
  const paginatedSales = state.sales.slice((pageSales - 1) * pageSizeSales, pageSales * pageSizeSales);
  const paginatedExpenses = state.expenses.slice((pageExp - 1) * pageSizeExp, pageExp * pageSizeExp);
  const paginatedConversions = dailyConversions.slice((pageConv - 1) * pageSizeConv, pageConv * pageSizeConv);

  // Overall aggregated daily data (Keseluruhan Data)
  const allUniqueDates = Array.from(
    new Set([
      ...state.production.map(p => p.date),
      ...state.sales.map(s => s.date),
      ...state.expenses.map(e => e.date),
    ])
  ).filter(Boolean).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const overallData: OverallDataRow[] = allUniqueDates.map(d => {
    const prodItems = state.production.filter(p => p.date === d);
    const saleItems = state.sales.filter(s => s.date === d);
    const expItems = state.expenses.filter(e => e.date === d);

    const productionKg = prodItems.reduce((acc, p) => acc + p.weightKg, 0);
    const salesKg = saleItems.reduce((acc, s) => acc + s.weightKg, 0);
    const salesIncome = saleItems.reduce((acc, s) => acc + s.totalAmount, 0);
    const expenses = expItems.reduce((acc, e) => acc + e.amount, 0);
    const netProfit = salesIncome - expenses;

    // Collect all notes
    const notesArr: string[] = [];
    prodItems.forEach(p => {
      if (p.notes && p.notes.trim()) notesArr.push(`Panen: ${p.notes.trim()}`);
    });
    saleItems.forEach(s => {
      if (s.customerName && s.customerName !== 'Penjualan Telur') {
        notesArr.push(`Pelanggan: ${s.customerName}`);
      }
    });
    expItems.forEach(e => {
      if (e.description && e.description.trim()) {
        notesArr.push(`${e.category}: ${e.description.trim()}`);
      }
    });

    return {
      date: d,
      productionKg,
      salesKg,
      salesIncome,
      expenses,
      netProfit,
      notes: notesArr.join(' · ') || '-'
    };
  });

  const filteredOverallData = overallData.filter(item => {
    // Filter search
    if (overallSearchQuery) {
      const q = overallSearchQuery.toLowerCase();
      const matchDate = item.date.toLowerCase().includes(q);
      const matchNotes = item.notes.toLowerCase().includes(q);
      if (!matchDate && !matchNotes) return false;
    }

    // Filter date preset
    const itemTime = new Date(item.date).getTime();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    if (overallDateFilter === 'today') {
      const todayStr = new Date().toISOString().split('T')[0];
      return item.date === todayStr;
    }
    if (overallDateFilter === '7days') {
      const sevenDaysAgo = todayTime - 7 * 24 * 60 * 60 * 1000;
      return itemTime >= sevenDaysAgo;
    }
    if (overallDateFilter === 'month') {
      const thirtyDaysAgo = todayTime - 30 * 24 * 60 * 60 * 1000;
      return itemTime >= thirtyDaysAgo;
    }
    if (overallDateFilter === 'custom') {
      if (overallStartDate && item.date < overallStartDate) return false;
      if (overallEndDate && item.date > overallEndDate) return false;
    }
    return true;
  });

  const paginatedOverall = filteredOverallData.slice((pageOverall - 1) * pageSizeOverall, pageOverall * pageSizeOverall);

  // Totals for filtered overall data
  const totalOverallProdKg = filteredOverallData.reduce((acc, row) => acc + row.productionKg, 0);
  const totalOverallSalesKg = filteredOverallData.reduce((acc, row) => acc + row.salesKg, 0);
  const totalOverallSalesIncome = filteredOverallData.reduce((acc, row) => acc + row.salesIncome, 0);
  const totalOverallExpenses = filteredOverallData.reduce((acc, row) => acc + row.expenses, 0);
  const totalOverallProfit = filteredOverallData.reduce((acc, row) => acc + row.netProfit, 0);

  const handleExportOverallCSV = () => {
    if (filteredOverallData.length === 0) {
      showToast('Tidak ada data keseluruhan untuk diekspor.', 'error');
      return;
    }
    const headers = ['No', 'Tanggal', 'Jumlah Produksi (Kg)', 'Jumlah Penjualan (Kg)', 'Omzet Penjualan (Rp)', 'Total Pengeluaran (Rp)', 'Total Keuntungan (Rp)', 'Catatan'];
    const rows = filteredOverallData.map((d, idx) => [
      idx + 1,
      d.date,
      d.productionKg.toFixed(2),
      d.salesKg.toFixed(2),
      d.salesIncome,
      d.expenses,
      d.netProfit,
      `"${(d.notes || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `rekap_keseluruhan_data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('File CSV Keseluruhan Data berhasil diunduh!', 'success');
  };

  const handleExportConversionCSV = () => {
    if (dailyConversions.length === 0) {
      showToast('Belum ada data penjualan harian untuk diekspor.', 'error');
      return;
    }
    const headers = ['Tanggal', 'Omzet Penjualan (Rp)', 'Pakan 63% (Rp)', 'Pembelian Ayam 20% (Rp)', 'Gaji 12% (Rp)', 'Listrik 0.5% (Rp)', 'Air 1% (Rp)', 'Vaksin 3.5% (Rp)', 'Total Modal Masuk 100% (Rp)', 'Jumlah Transaksi'];
    const rows = dailyConversions.map(d => [
      d.date,
      d.totalSales,
      d.pakan,
      d.ayam,
      d.gaji,
      d.listrik,
      d.air,
      d.vaksin,
      d.totalConverted,
      d.transactionCount,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan_konversi_modal_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Laporan konversi harian CSV berhasil diunduh!', 'success');
  };

  const handleClearData = () => {
    saveState({
      ...INITIAL_STATE,
      production: [],
      sales: [],
      expenses: [],
      capitalConversions: [],
      activeUserId: state.activeUserId,
      settings: state.settings
    });
    setPageProd(1);
    setPageSales(1);
    setPageExp(1);
    setPageConv(1);
    showToast('Seluruh database berhasil dikosongkan.', 'info');
  };

  // Handler Konfirmasi Penghapusan Data (Reliable In-App Deletion)
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'production') {
      saveState({
        ...state,
        production: state.production.filter(x => x.id !== deleteTarget.id)
      });
      showToast('Data log produksi berhasil dihapus!', 'success');
    } else if (deleteTarget.type === 'sales') {
      saveState({
        ...state,
        sales: state.sales.filter(x => x.id !== deleteTarget.id)
      });
      showToast('Transaksi penjualan berhasil dihapus!', 'success');
    } else if (deleteTarget.type === 'expense') {
      saveState({
        ...state,
        expenses: state.expenses.filter(x => x.id !== deleteTarget.id)
      });
      showToast('Pencatatan pengeluaran berhasil dihapus!', 'success');
    } else if (deleteTarget.type === 'sales_date') {
      saveState({
        ...state,
        sales: state.sales.filter(x => x.date !== deleteTarget.id)
      });
      showToast(`Seluruh transaksi penjualan tanggal ${deleteTarget.id} berhasil dihapus!`, 'success');
    } else if (deleteTarget.type === 'user') {
      if (state.users.length <= 1) {
        showToast('Tidak dapat menghapus pengguna terakhir!', 'error');
        setDeleteTarget(null);
        return;
      }
      const newUsers = state.users.filter(x => x.id !== deleteTarget.id);
      const newActiveId = state.activeUserId === deleteTarget.id ? newUsers[0].id : state.activeUserId;
      saveState({
        ...state,
        users: newUsers,
        activeUserId: newActiveId
      });
      showToast('Data pengguna berhasil dihapus!', 'success');
    } else if (deleteTarget.type === 'all_production') {
      saveState({ ...state, production: [] });
      setPageProd(1);
      showToast('Seluruh riwayat produksi berhasil dihapus!', 'success');
    } else if (deleteTarget.type === 'all_sales') {
      saveState({ ...state, sales: [] });
      setPageSales(1);
      setPageConv(1);
      showToast('Seluruh riwayat penjualan berhasil dihapus!', 'success');
    } else if (deleteTarget.type === 'all_expenses') {
      saveState({ ...state, expenses: [] });
      setPageExp(1);
      showToast('Seluruh riwayat pengeluaran berhasil dihapus!', 'success');
    } else if (deleteTarget.type === 'all_database') {
      saveState({
        ...INITIAL_STATE,
        production: [],
        sales: [],
        expenses: [],
        capitalConversions: [],
        activeUserId: state.activeUserId,
        settings: state.settings
      });
      setPageProd(1);
      setPageSales(1);
      setPageExp(1);
      setPageConv(1);
      showToast('Seluruh database berhasil dikosongkan!', 'info');
    }

    setDeleteTarget(null);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", `eggtrack_backup.json`);
    dl.click();
    showToast('File backup berhasil diunduh!', 'success');
  };

  // Submit forms
  const handleAddProduction = (e: React.FormEvent) => {
    e.preventDefault();
    const weight = Number(prodForm.weightKg) || 0;
    if (weight <= 0) {
      showToast('Jumlah telur (Kg) harus lebih dari 0!', 'error');
      return;
    }
    const item: ProductionRecord = {
      id: `p-${Date.now()}`,
      date: prodForm.date || new Date().toISOString().split('T')[0],
      weightKg: weight,
      eggsPerKg: 16,
      goodEggs: Math.round(weight * 16),
      brokenEggs: 0,
      feedConsumptionKg: 0,
      notes: prodForm.notes || '',
      recordedBy: activeUser.name
    };
    saveState({ ...state, production: [item, ...state.production] });
    setPageProd(1);
    setShowProdModal(false);
    showToast('Data produksi telur berhasil disimpan!');
  };

  const handleAddSale = (e: React.FormEvent) => {
    e.preventDefault();
    const weightToSell = Number(saleForm.weight) || 0;
    if (weightToSell <= 0) {
      showToast('Berat telur harus lebih dari 0 Kg!', 'error');
      return;
    }
    // Validasi ketat: Penjualan tidak boleh melebihi stok telur yang tersedia
    if (weightToSell > stockKg) {
      showToast(`Jumlah penjualan (${weightToSell} Kg) tidak boleh melebihi stok telur tersedia (${stockKg.toFixed(1)} Kg)!`, 'error');
      return;
    }
    const amount = Math.round(weightToSell * Number(saleForm.price));
    const item: SalesRecord = {
      id: `s-${Date.now()}`,
      date: saleForm.date || new Date().toISOString().split('T')[0],
      customerName: 'Penjualan Telur',
      quantity: Math.round(weightToSell * 16),
      weightKg: weightToSell,
      pricePerUnit: Number(saleForm.price),
      totalAmount: amount,
      paymentStatus: saleForm.status,
      recordedBy: activeUser.name
    };
    saveState({ ...state, sales: [item, ...state.sales] });
    setPageSales(1);
    setPageConv(1);
    setShowSaleModal(false);
    showToast('Pencatatan transaksi penjualan berhasil!');
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const item: ExpenseRecord = {
      id: `e-${Date.now()}`,
      date: expForm.date || new Date().toISOString().split('T')[0],
      category: expForm.category,
      amount: Number(expForm.amount),
      description: expForm.desc,
      recordedBy: activeUser.name
    };
    saveState({ ...state, expenses: [item, ...state.expenses] });
    setShowExpenseModal(false);
    showToast('Pengeluaran baru berhasil dicatat!');
  };

  const handleAddModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (capForm.amount > remainingLaba) {
      showToast('Dana konversi melebihi sisa laba ditahan!', 'error');
      return;
    }
    const item: CapitalConversion = {
      id: `c-${Date.now()}`,
      date: capForm.date || new Date().toISOString().split('T')[0],
      amount: Number(capForm.amount),
      allocation: capForm.allocation,
      description: capForm.desc,
      status: capForm.status
    };
    saveState({ ...state, capitalConversions: [item, ...state.capitalConversions] });
    setShowModalModal(false);
    showToast('Laba bersih berhasil dialokasikan ke modal kerja!');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800 antialiased">
      
      {/* Toast Notifikasi */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg bg-white border border-slate-200 font-medium transition-all">
          {toast.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-600" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-amber-500" />}
          <span className="text-xs">{toast.msg}</span>
        </div>
      )}

      {/* --- SIDEBAR NAV (DESKTOP ONLY, HIDDEN ON MOBILE) --- */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-white shrink-0 flex-col justify-between border-r border-slate-800">
        <div>
          {/* Logo Brand */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-bold text-slate-900 text-base shadow-sm">
                E
              </div>
              <div>
                <h1 className="font-bold text-sm tracking-tight">EggTrack</h1>
                <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Pencatat Telur</p>
              </div>
            </div>
          </div>

          {/* Menus List */}
          <nav className="p-4 space-y-1">
            <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold px-2 mb-2">Menu Utama</p>
            
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            <button 
              onClick={() => { if(isAllowed('produksi')) { setActiveTab('produksi'); } else { showToast('Akses Ditolak. Khusus Pengelola & Admin.', 'error'); } }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'produksi' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'} ${!isAllowed('produksi') ? 'opacity-30' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Egg className="w-3.5 h-3.5" />
                <span>Produksi Telur</span>
              </div>
              {!isAllowed('produksi') && <span className="text-[8px] bg-slate-800 px-1 py-0.5 rounded text-slate-500">Kunci</span>}
            </button>

            <button 
              onClick={() => { if(isAllowed('penjualan')) { setActiveTab('penjualan'); } else { showToast('Akses Ditolak. Khusus Kasir & Admin.', 'error'); } }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'penjualan' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'} ${!isAllowed('penjualan') ? 'opacity-30' : ''}`}
            >
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Penjualan</span>
              </div>
              {!isAllowed('penjualan') && <span className="text-[8px] bg-slate-800 px-1 py-0.5 rounded text-slate-500">Kunci</span>}
            </button>

            <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold px-2 pt-4 mb-2">Laporan</p>

            <button 
              onClick={() => { if(isAllowed('keseluruhan')) { setActiveTab('keseluruhan'); } else { showToast('Akses Ditolak.', 'error'); } }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'keseluruhan' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'} ${!isAllowed('keseluruhan') ? 'opacity-30' : ''}`}
            >
              <div className="flex items-center gap-3">
                <TableProperties className="w-3.5 h-3.5" />
                <span>Keseluruhan Data</span>
              </div>
              {!isAllowed('keseluruhan') && <span className="text-[8px] bg-slate-800 px-1 py-0.5 rounded text-slate-500">Kunci</span>}
            </button>

            <button 
              onClick={() => { if(isAllowed('keuangan')) { setActiveTab('keuangan'); } else { showToast('Akses Ditolak. Khusus Kasir & Admin.', 'error'); } }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'keuangan' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'} ${!isAllowed('keuangan') ? 'opacity-30' : ''}`}
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Laporan Keuangan</span>
              </div>
              {!isAllowed('keuangan') && <span className="text-[8px] bg-slate-800 px-1 py-0.5 rounded text-slate-500">Kunci</span>}
            </button>

            <button 
              onClick={() => { if(isAllowed('modal')) { setActiveTab('modal'); } else { showToast('Akses Ditolak. Khusus Admin.', 'error'); } }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'modal' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'} ${!isAllowed('modal') ? 'opacity-30' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Coins className="w-3.5 h-3.5" />
                <span>Laporan Konversi Modal</span>
              </div>
              {!isAllowed('modal') && <span className="text-[8px] bg-slate-800 px-1 py-0.5 rounded text-slate-500">Kunci</span>}
            </button>

            <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold px-2 pt-4 mb-2">Pengaturan</p>

            <button 
              onClick={() => { if(isAllowed('users')) { setActiveTab('users'); } else { showToast('Akses Ditolak. Khusus Admin.', 'error'); } }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'users' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'} ${!isAllowed('users') ? 'opacity-30' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-3.5 h-3.5" />
                <span>Manajemen User</span>
              </div>
              {!isAllowed('users') && <span className="text-[8px] bg-slate-800 px-1 py-0.5 rounded text-slate-500">Kunci</span>}
            </button>

            <button 
              onClick={() => { if(isAllowed('settings')) { setActiveTab('settings'); } else { showToast('Akses Ditolak. Khusus Admin.', 'error'); } }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'} ${!isAllowed('settings') ? 'opacity-30' : ''}`}
            >
              <div className="flex items-center gap-3">
                <SettingsIcon className="w-3.5 h-3.5" />
                <span>Pengaturan Aplikasi</span>
              </div>
              {!isAllowed('settings') && <span className="text-[8px] bg-slate-800 px-1 py-0.5 rounded text-slate-500">Kunci</span>}
            </button>

            <button 
              onClick={() => { if(isAllowed('database')) { setActiveTab('database'); } else { showToast('Akses Ditolak. Khusus Admin & Pengelola.', 'error'); } }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'database' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'} ${!isAllowed('database') ? 'opacity-30' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Database className="w-3.5 h-3.5" />
                <span>Pengaturan Database</span>
              </div>
              {!isAllowed('database') && <span className="text-[8px] bg-slate-800 px-1 py-0.5 rounded text-slate-500">Kunci</span>}
            </button>
          </nav>
        </div>

        {/* Profil & Switcher Pengguna */}
        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center font-bold text-[10px] text-white">
              {activeUser.name[0]}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-slate-200 truncate">{activeUser.name}</p>
              <p className="text-[8px] text-amber-500 font-mono uppercase font-bold">{activeUser.role}</p>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/60">
            <label className="block text-[8px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Sesi Pengguna:</label>
            <select 
              value={state.activeUserId}
              onChange={(e) => handleUserSwitch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-[10px] rounded p-1 text-slate-300 focus:outline-none cursor-pointer"
            >
              {state.users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>
        </div>
      </aside>

      {/* --- MAIN PAGE VIEWPORT --- */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Top bar header */}
        <header className="px-6 py-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold uppercase font-mono">
                <span>{state.settings.farmName}</span>
                <span>/</span>
                <span>{activeTab}</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 capitalize leading-tight">
                {activeTab === 'dashboard' && 'Dashboard Analitik Kandang'}
                {activeTab === 'produksi' && 'Pencatatan Produksi Harian'}
                {activeTab === 'penjualan' && 'Transaksi Penjualan Telur'}
                {activeTab === 'keuangan' && 'Laporan Kas Laba & Rugi'}
                {activeTab === 'modal' && 'Konversi Laba Ke Modal Kerja'}
                {activeTab === 'keseluruhan' && 'Rekapitulasi Keseluruhan Data'}
                {activeTab === 'users' && 'Manajemen Pengguna & Hak Akses'}
                {activeTab === 'settings' && 'Pengaturan Standar Peternakan'}
                {activeTab === 'database' && 'Manajemen Database'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/60">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </header>

        {/* Content Wrapper */}
        <section className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto pb-28 md:pb-8">

          {/* --- 1. DASHBOARD MENU --- */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">

              {/* Target Produksi Harian (Kg) Progress Banner */}
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-amber-100">Target Produksi Harian</h4>
                      <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                        {dailyTargetKg} Kg / Hari
                      </span>
                    </div>
                    <p className="text-xs text-amber-50 mt-0.5">
                      Panen Hari Ini: <strong className="font-mono text-white text-sm font-black">{todayProdKg.toFixed(1)} Kg</strong> dari target <span className="font-mono font-bold">{dailyTargetKg} Kg</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 min-w-[240px]">
                  <div className="flex-1">
                    <div className="flex justify-between text-[11px] font-bold text-amber-100 mb-1">
                      <span>Pencapaian Hari Ini</span>
                      <span className="font-mono text-white">{targetProgressPercent}%</span>
                    </div>
                    <div className="w-full bg-black/20 rounded-full h-2.5 overflow-hidden p-0.5">
                      <div 
                        className="bg-white rounded-full h-full transition-all duration-500 ease-out" 
                        style={{ width: `${targetProgressPercent}%` }}
                      ></div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setProdForm({ date: new Date().toISOString().split('T')[0], weightKg: 20.0, notes: '' });
                      setShowProdModal(true);
                    }}
                    className="px-3 py-2 bg-white text-amber-900 hover:bg-amber-50 rounded-xl text-xs font-bold shrink-0 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Catat Panen</span>
                  </button>
                </div>
              </div>

              {/* Stat Cards (6 Cards Grid: Saldo, Omzet, Pengeluaran, Laba, Stok, Modal) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                
                {/* 1. Saldo Saat Ini (Highlight Card) */}
                <div className="bg-emerald-900 text-white p-4 rounded-xl border border-emerald-800 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Saldo Saat Ini</p>
                    <span className="text-[9px] bg-emerald-800 text-emerald-200 px-1.5 py-0.5 rounded font-mono font-semibold">Kas Riil</span>
                  </div>
                  <h3 className="text-xl font-black font-mono mt-1 text-emerald-300">
                    Rp {currentBalance.toLocaleString()}
                  </h3>
                  <div className="text-[10px] text-emerald-200/80 mt-2 pt-2 border-t border-emerald-800/80 flex justify-between font-mono">
                    <span>Kas Masuk:</span>
                    <span className="font-bold">Rp {totalPaidSales.toLocaleString()}</span>
                  </div>
                </div>

                {/* 2. Total Omzet Penjualan */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Total Omzet Penjualan</p>
                  <h3 className="text-xl font-bold font-mono mt-1 text-emerald-600">Rp {totalIncome.toLocaleString()}</h3>
                  <div className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex justify-between font-mono">
                    <span>Terjual:</span>
                    <span>{totalSalesKg} Kg</span>
                  </div>
                </div>

                {/* 3. Total Pengeluaran Operasional (Dashboard Pengeluaran) */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs border-t-2 border-t-rose-500">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Total Pengeluaran</p>
                    <span className="text-[9px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-mono font-bold">{state.expenses.length} Biaya</span>
                  </div>
                  <h3 className="text-xl font-bold font-mono mt-1 text-rose-600">Rp {totalExpenses.toLocaleString()}</h3>
                  <div className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex justify-between font-mono">
                    <span>Kas Keluar:</span>
                    <span className="text-rose-600 font-bold">Operasional</span>
                  </div>
                </div>

                {/* 4. Laba Bersih Usaha */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Laba Bersih Usaha</p>
                  <h3 className={`text-xl font-bold font-mono mt-1 ${netProfit >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>Rp {netProfit.toLocaleString()}</h3>
                  <div className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex justify-between font-mono">
                    <span>Margin:</span>
                    <span className={netProfit >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                      {totalIncome > 0 ? `${Math.round((netProfit / totalIncome) * 100)}%` : '0%'}
                    </span>
                  </div>
                </div>

                {/* 5. Total Sisa Telur (Stok Siap Jual) */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs border-t-2 border-t-amber-500">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Total Sisa Telur</p>
                    <span className="text-[9px] bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded font-mono font-bold">Stok Siap</span>
                  </div>
                  <h3 className="text-xl font-bold font-mono mt-1 text-amber-700">
                    {stockKg.toFixed(1)} <span className="text-xs font-semibold text-amber-600/80 font-sans">Kg</span>
                  </h3>
                  <div className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex justify-between font-mono">
                    <span>Estimasi:</span>
                    <span className="font-bold text-slate-700">{stockBtr.toLocaleString()} Butir</span>
                  </div>
                </div>

                {/* 6. Modal Terkonversi */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Modal Terkonversi</p>
                  <h3 className="text-xl font-bold font-mono mt-1 text-indigo-600">Rp {totalConvertedAllDays.toLocaleString()}</h3>
                  <div className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex justify-between font-mono">
                    <span>Alokasi:</span>
                    <span className="text-slate-700 font-semibold">6 Pos Modal</span>
                  </div>
                </div>

              </div>

              {/* Detail Ringkasan Total Sisa Telur & Pengeluaran */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Panel Total Sisa Telur */}
                <div className="bg-amber-50/50 border border-amber-200/80 p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                          <Egg className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">Total Sisa Telur di Gudang</h4>
                          <p className="text-[11px] text-amber-700">Akumulasi panen dikurangi total penjualan</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full font-mono ${stockKg > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {stockKg > 0 ? 'Stok Tersedia' : 'Stok Kosong'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                      <div className="bg-white p-2.5 rounded-xl border border-amber-100 shadow-2xs">
                        <p className="text-[9px] text-slate-400 uppercase font-semibold">Total Panen</p>
                        <p className="text-sm font-bold font-mono text-slate-800 mt-0.5">{totalProductionKg.toFixed(1)} Kg</p>
                        <p className="text-[9px] font-mono text-slate-400">{totalProductionBtr.toLocaleString()} btr</p>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-amber-100 shadow-2xs">
                        <p className="text-[9px] text-slate-400 uppercase font-semibold">Total Terjual</p>
                        <p className="text-sm font-bold font-mono text-emerald-600 mt-0.5">{totalSalesKg.toFixed(1)} Kg</p>
                        <p className="text-[9px] font-mono text-emerald-500">{totalSalesBtr.toLocaleString()} btr</p>
                      </div>
                      <div className="bg-amber-500 text-white p-2.5 rounded-xl shadow-2xs">
                        <p className="text-[9px] text-amber-100 uppercase font-bold">Sisa Telur</p>
                        <p className="text-sm font-black font-mono mt-0.5">{stockKg.toFixed(1)} Kg</p>
                        <p className="text-[9px] font-mono text-amber-100">{stockBtr.toLocaleString()} btr</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-amber-200/60 flex items-center justify-between text-xs">
                    <span className="text-amber-800 text-[11px]">Rasio Penjualan: <strong>{totalProductionKg > 0 ? ((totalSalesKg / totalProductionKg) * 100).toFixed(1) : 0}%</strong> terjual</span>
                    <button 
                      onClick={() => { setActiveTab('penjualan'); setShowSaleModal(true); }}
                      className="text-[11px] font-bold text-amber-900 bg-white hover:bg-amber-100 px-3 py-1 rounded-lg border border-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <ShoppingCart className="w-3 h-3" />
                      <span>Jual Sisa Telur</span>
                    </button>
                  </div>
                </div>

                {/* Panel Total Pengeluaran & Arus Keuangan */}
                <div className="bg-rose-50/50 border border-rose-200/80 p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900">Total Pengeluaran Operasional</h4>
                          <p className="text-[11px] text-rose-700">Rincian beban biaya operasional dan pemeliharaan</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full font-mono bg-rose-100 text-rose-800">
                        {state.expenses.length} Transaksi
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                      <div className="bg-white p-2.5 rounded-xl border border-rose-100 shadow-2xs">
                        <p className="text-[9px] text-slate-400 uppercase font-semibold">Omzet Penjualan</p>
                        <p className="text-xs sm:text-sm font-bold font-mono text-emerald-600 mt-0.5">Rp {totalIncome.toLocaleString()}</p>
                        <p className="text-[9px] text-slate-400">Total Bruto</p>
                      </div>
                      <div className="bg-rose-500 text-white p-2.5 rounded-xl shadow-2xs">
                        <p className="text-[9px] text-rose-100 uppercase font-bold">Total Pengeluaran</p>
                        <p className="text-xs sm:text-sm font-black font-mono mt-0.5">Rp {totalExpenses.toLocaleString()}</p>
                        <p className="text-[9px] text-rose-100">Beban Usaha</p>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-rose-100 shadow-2xs">
                        <p className="text-[9px] text-slate-400 uppercase font-semibold">Laba Bersih</p>
                        <p className={`text-xs sm:text-sm font-bold font-mono mt-0.5 ${netProfit >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                          Rp {netProfit.toLocaleString()}
                        </p>
                        <p className="text-[9px] text-slate-400">Net Profit</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-rose-200/60 flex items-center justify-between text-xs">
                    <span className="text-rose-800 text-[11px]">Beban Biaya: <strong>{totalIncome > 0 ? ((totalExpenses / totalIncome) * 100).toFixed(1) : 0}%</strong> dari omzet</span>
                    <button 
                      onClick={() => { setActiveTab('keuangan'); setShowExpenseModal(true); }}
                      className="text-[11px] font-bold text-rose-900 bg-white hover:bg-rose-100 px-3 py-1 rounded-lg border border-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Catat Pengeluaran</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Data Lists: 3 Kolom Ringkasan (Produksi, Penjualan, Pengeluaran) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                
                {/* 1. 5 Log Produksi Terakhir */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                      <Egg className="w-3.5 h-3.5 text-amber-600" />
                      <span>Produksi Terakhir</span>
                    </h4>
                    <button 
                      onClick={() => { setActiveTab('produksi'); setShowProdModal(true); }}
                      className="text-[10px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>Panen</span>
                    </button>
                  </div>
                  <div className="space-y-2 text-xs divide-y divide-slate-50">
                    {state.production.slice(0, 5).map(p => (
                      <div key={p.id} className="pt-2 flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-slate-800">{p.weightKg} Kg Telur</p>
                          <p className="text-[9px] text-slate-400">{p.date} · Oleh {p.recordedBy}</p>
                        </div>
                        <span className="text-[9px] font-mono bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold">
                          Panen
                        </span>
                      </div>
                    ))}
                    {state.production.length === 0 && (
                      <p className="text-xs text-slate-400 py-6 text-center">Belum ada data produksi.</p>
                    )}
                  </div>
                </div>

                {/* 2. 5 Log Penjualan Terakhir */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                      <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Penjualan Terakhir</span>
                    </h4>
                    <button 
                      onClick={() => { setActiveTab('penjualan'); setShowSaleModal(true); }}
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>Jual</span>
                    </button>
                  </div>
                  <div className="space-y-2 text-xs divide-y divide-slate-50">
                    {state.sales.slice(0, 5).map(s => (
                      <div key={s.id} className="pt-2 flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-slate-800">{s.weightKg} Kg · <span className="font-mono text-emerald-700 font-bold">Rp {s.totalAmount.toLocaleString()}</span></p>
                          <p className="text-[9px] text-slate-400">Rp {s.pricePerUnit.toLocaleString()}/Kg · {s.date}</p>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${s.paymentStatus === 'Lunas' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          {s.paymentStatus}
                        </span>
                      </div>
                    ))}
                    {state.sales.length === 0 && (
                      <p className="text-xs text-slate-400 py-6 text-center">Belum ada data penjualan.</p>
                    )}
                  </div>
                </div>

                {/* 3. 5 Log Pengeluaran Terakhir (Baru pada Dashboard) */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs sm:col-span-2 lg:col-span-1">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-rose-600" />
                      <span>Pengeluaran Terakhir</span>
                    </h4>
                    <button 
                      onClick={() => { setActiveTab('keuangan'); setShowExpenseModal(true); }}
                      className="text-[10px] font-bold text-rose-700 hover:text-rose-800 flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>Biaya</span>
                    </button>
                  </div>
                  <div className="space-y-2 text-xs divide-y divide-slate-50">
                    {state.expenses.slice(0, 5).map(e => (
                      <div key={e.id} className="pt-2 flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-slate-800">{e.category} · <span className="font-mono text-rose-600 font-bold">Rp {e.amount.toLocaleString()}</span></p>
                          <p className="text-[9px] text-slate-400 truncate max-w-[170px]">{e.description || 'Biaya operasional'} · {e.date}</p>
                        </div>
                        <span className="text-[9px] font-mono bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-bold">
                          Kas Keluar
                        </span>
                      </div>
                    ))}
                    {state.expenses.length === 0 && (
                      <p className="text-xs text-slate-400 py-6 text-center">Belum ada data pengeluaran.</p>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* --- 2. MENU PRODUKSI TELUR --- */}
          {activeTab === 'produksi' && (
            <div className="space-y-6">
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                <div className="text-xs text-slate-500">
                  Menampilkan riwayat pencatatan telur dari kandang.
                </div>
                <div className="flex items-center gap-2">
                  {state.production.length > 0 && (
                    <button 
                      onClick={() => setDeleteTarget({
                        type: 'all_production',
                        title: 'Hapus Seluruh Data Produksi',
                        description: `Yakin ingin mengosongkan seluruh ${state.production.length} baris riwayat produksi telur?`
                      })}
                      className="px-2.5 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Hapus seluruh data produksi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Semua</span>
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setProdForm({ date: new Date().toISOString().split('T')[0], weightKg: 20.0, notes: '' });
                      setShowProdModal(true);
                    }}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log Produksi</span>
                  </button>
                </div>
              </div>

              {/* History Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                      <tr>
                        <th className="px-4 py-3 w-16 text-center">No.</th>
                        <th className="px-4 py-3">Tanggal</th>
                        <th className="px-4 py-3 text-right">Jumlah Telur (Kg)</th>
                        <th className="px-4 py-3 w-20 text-center">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedProduction.map((p, index) => {
                        const rowNumber = ((pageProd - 1) * pageSizeProd) + index + 1;
                        return (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-center font-mono text-slate-400 font-medium">{rowNumber}</td>
                            <td className="px-4 py-3 font-mono font-semibold text-slate-800">{p.date}</td>
                            <td className="px-4 py-3 text-right font-mono text-slate-900 font-bold">{p.weightKg.toLocaleString('id-ID')} Kg</td>
                            <td className="px-4 py-3 text-center">
                              <button 
                                onClick={() => setDeleteTarget({
                                  type: 'production',
                                  id: p.id,
                                  title: 'Hapus Log Produksi',
                                  description: `Yakin ingin menghapus catatan produksi no ${rowNumber} tanggal ${p.date} (${p.weightKg} Kg)?`
                                })}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Hapus baris data produksi ini"
                              >
                                <Trash2 className="w-3.5 h-3.5 mx-auto" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {state.production.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center py-12 text-slate-400">
                            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                            <p className="font-semibold text-xs">Belum Ada Data Produksi</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Catat produksi telur harian menggunakan tombol di atas.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {state.production.length > 0 && (
                  <TablePagination 
                    currentPage={pageProd}
                    totalItems={state.production.length}
                    pageSize={pageSizeProd}
                    onPageChange={setPageProd}
                    onPageSizeChange={setPageSizeProd}
                  />
                )}
              </div>
            </div>
          )}

          {/* --- 3. MENU PENJUALAN --- */}
          {activeTab === 'penjualan' && (
            <div className="space-y-6">
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>Pencatatan transaksi penjualan telur harian.</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold border ${stockKg > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                    Stok Tersedia: {stockKg.toFixed(1)} Kg
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {state.sales.length > 0 && (
                    <button 
                      onClick={() => setDeleteTarget({
                        type: 'all_sales',
                        title: 'Hapus Seluruh Transaksi Penjualan',
                        description: `Yakin ingin mengosongkan seluruh ${state.sales.length} transaksi penjualan telur?`
                      })}
                      className="px-2.5 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Hapus seluruh transaksi penjualan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Semua</span>
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      if (stockKg <= 0) {
                        showToast('Stok telur habis (0 Kg)! Silakan catat produksi panen terlebih dahulu.', 'error');
                        return;
                      }
                      const initialWeight = Math.min(10, Math.round(stockKg * 10) / 10);
                      setSaleForm({ 
                        date: new Date().toISOString().split('T')[0], 
                        weight: initialWeight, 
                        price: state.settings.pricePerKg, 
                        status: 'Lunas' 
                      });
                      setShowSaleModal(true);
                    }}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Transaksi Baru</span>
                  </button>
                </div>
              </div>

              {/* Sales Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600 min-w-[620px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Tanggal</th>
                        <th className="px-4 py-3 text-right">Berat Telur (Kg)</th>
                        <th className="px-4 py-3 text-right">Harga Jual / Kg</th>
                        <th className="px-4 py-3 text-right">Total Bayar</th>
                        <th className="px-4 py-3 text-center">Status Pembayaran</th>
                        <th className="px-4 py-3 text-center">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedSales.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono font-semibold">{s.date}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">{s.weightKg} Kg</td>
                          <td className="px-4 py-3 text-right font-mono">Rp {s.pricePerUnit.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">Rp {s.totalAmount.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center">
                            <button 
                              onClick={() => {
                                const toggle = s.paymentStatus === 'Lunas' ? 'Belum Lunas' : 'Lunas';
                                saveState({
                                  ...state,
                                  sales: state.sales.map(item => item.id === s.id ? { ...item, paymentStatus: toggle } : item)
                                });
                                showToast(`Pembayaran diubah ke ${toggle}`);
                              }}
                              className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border transition-colors ${s.paymentStatus === 'Lunas' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}
                            >
                              {s.paymentStatus}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button 
                              onClick={() => setDeleteTarget({
                                type: 'sales',
                                id: s.id,
                                title: 'Hapus Transaksi Penjualan',
                                description: `Yakin ingin menghapus transaksi tanggal ${s.date} sebesar Rp ${s.totalAmount.toLocaleString()} (${s.weightKg} Kg, ${s.paymentStatus})?`
                              })}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus transaksi penjualan ini"
                            >
                              <Trash2 className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {state.sales.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-slate-400">
                            <ShoppingCart className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                            <p className="font-semibold text-xs">Belum Ada Transaksi</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Catat penjualan pertama melalui tombol transaksi baru.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {state.sales.length > 0 && (
                  <TablePagination 
                    currentPage={pageSales}
                    totalItems={state.sales.length}
                    pageSize={pageSizeSales}
                    onPageChange={setPageSales}
                    onPageSizeChange={setPageSizeSales}
                  />
                )}
              </div>
            </div>
          )}

          {/* --- 4. MENU LAPORAN KEUANGAN --- */}
          {activeTab === 'keuangan' && (
            <div className="space-y-6">
              
              {/* Financial metrics & FCR */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Omzet Masuk</p>
                  <h3 className="text-xl font-bold font-mono text-emerald-600 mt-1">Rp {totalIncome.toLocaleString()}</h3>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Biaya Operasional</p>
                  <h3 className="text-xl font-bold font-mono text-rose-600 mt-1">Rp {totalExpenses.toLocaleString()}</h3>
                </div>

                {/* Feed Conversion Ratio (FCR) */}
                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Feed Conversion Ratio (FCR)</p>
                  {state.production.length === 0 ? (
                    <p className="text-xs text-slate-400 mt-1">Butuh data produksi harian</p>
                  ) : (
                    (() => {
                      const totalPakan = state.production.reduce((a, b) => a + (b.feedConsumptionKg || 0), 0);
                      const fcr = totalProductionKg > 0 ? (totalPakan / totalProductionKg).toFixed(2) : '0';
                      return (
                        <h3 className="text-xl font-bold font-mono text-slate-800 mt-1">
                          {fcr} <span className="text-xs text-slate-400 font-sans font-normal">(Ideal 2.1 - 2.5)</span>
                        </h3>
                      );
                    })()
                  )}
                </div>

              </div>

              {/* Expense Ledger */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Add Expense form */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 h-fit">
                  <h4 className="font-bold text-xs mb-3 text-slate-900 uppercase">Catat Pengeluaran Operasional</h4>
                  <form onSubmit={handleAddExpense} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Tanggal</label>
                      <input 
                        type="date" 
                        required
                        value={expForm.date}
                        onChange={(e) => setExpForm({ ...expForm, date: e.target.value })}
                        className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 focus:outline-none focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Kategori</label>
                      <select 
                        value={expForm.category}
                        onChange={(e) => setExpForm({ ...expForm, category: e.target.value })}
                        className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 focus:outline-none focus:bg-white"
                      >
                        <option value="Pakan">Pakan (Konsentrat/Bekatul)</option>
                        <option value="Bibit Ayam">Bibit Ayam (DOC / Pullet)</option>
                        <option value="Obat/Vitamin">Obat, Vaksin &amp; Vitamin</option>
                        <option value="Gaji Pegawai">Upah Pekerja</option>
                        <option value="Lain-lain">Lain-lain / Operasional</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Biaya (Rp)</label>
                      <input 
                        type="number" 
                        required
                        value={expForm.amount}
                        onChange={(e) => setExpForm({ ...expForm, amount: Number(e.target.value) })}
                        className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-mono focus:outline-none focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Deskripsi</label>
                      <input 
                        type="text" 
                        required
                        value={expForm.desc}
                        onChange={(e) => setExpForm({ ...expForm, desc: e.target.value })}
                        placeholder="Detail pembelian..."
                        className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 focus:outline-none focus:bg-white"
                      />
                    </div>
                    <button type="submit" className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold">
                      Simpan Biaya
                    </button>
                  </form>
                </div>

                {/* Expenses List */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden lg:col-span-2 shadow-xs">
                  <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
                    <span className="font-bold text-xs uppercase text-slate-700">Daftar Buku Pengeluaran</span>
                    {state.expenses.length > 0 && (
                      <button 
                        onClick={() => setDeleteTarget({
                          type: 'all_expenses',
                          title: 'Hapus Seluruh Data Pengeluaran',
                          description: `Yakin ingin mengosongkan seluruh ${state.expenses.length} baris pencatatan pengeluaran operasional?`
                        })}
                        className="px-2.5 py-1 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Hapus seluruh pengeluaran"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Hapus Semua</span>
                      </button>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600 min-w-[550px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Tanggal</th>
                          <th className="px-4 py-3">Kategori</th>
                          <th className="px-4 py-3">Deskripsi</th>
                          <th className="px-4 py-3 text-right">Biaya</th>
                          <th className="px-4 py-3 text-center">Hapus</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedExpenses.map(ex => (
                          <tr key={ex.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-mono">{ex.date}</td>
                            <td className="px-4 py-3 font-semibold text-slate-700">{ex.category}</td>
                            <td className="px-4 py-3 max-w-xs truncate">{ex.description}</td>
                            <td className="px-4 py-3 text-right font-mono text-rose-600 font-semibold">Rp {ex.amount.toLocaleString()}</td>
                            <td className="px-4 py-3 text-center">
                              <button 
                                onClick={() => setDeleteTarget({
                                  type: 'expense',
                                  id: ex.id,
                                  title: 'Hapus Pencatatan Pengeluaran',
                                  description: `Yakin ingin menghapus pengeluaran tanggal ${ex.date} (${ex.category}: ${ex.description}) senilai Rp ${ex.amount.toLocaleString()}?`
                                })}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Hapus pencatatan pengeluaran ini"
                              >
                                <Trash2 className="w-3.5 h-3.5 mx-auto" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {state.expenses.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center py-12 text-slate-400">
                              <p className="text-[11px]">Belum ada data pengeluaran operasional.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {state.expenses.length > 0 && (
                    <TablePagination 
                      currentPage={pageExp}
                      totalItems={state.expenses.length}
                      pageSize={pageSizeExp}
                      onPageChange={setPageExp}
                      onPageSizeChange={setPageSizeExp}
                    />
                  )}
                </div>

              </div>

            </div>
          )}

          {/* --- 5. MENU LAPORAN KONVERSI KE MODAL BERDASARKAN PENJUALAN HARIAN --- */}
          {activeTab === 'modal' && (
            <div className="space-y-6">
              
              {/* Formula info & Action buttons */}
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-mono">
                      Konversi Otomatis Masuk Ke Tabel-Tabel
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Dikonversi langsung 100% dari setiap penjualan harian</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Laporan Konversi Keuntungan Ke Modal Usaha
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                    Setiap penjualan harian dikonversikan otomatis dan masuk ke tabel pos modal: <strong className="text-amber-800">Biaya Pakan (63%)</strong>, <strong className="text-indigo-800">Pembelian Ayam (20%)</strong>, <strong className="text-emerald-800">Gaji Karyawan (12%)</strong>, <strong className="text-amber-700">Listrik (0.5%)</strong>, <strong className="text-sky-800">Air (1%)</strong>, dan <strong className="text-purple-800">Vaksin (3.5%)</strong>.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button 
                    onClick={handleExportConversionCSV}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Ekspor CSV</span>
                  </button>
                  <button 
                    onClick={() => {
                      setSaleForm({ date: new Date().toISOString().split('T')[0], weight: 10, price: state.settings.pricePerKg, status: 'Lunas' });
                      setShowSaleModal(true);
                    }}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Transaksi Penjualan</span>
                  </button>
                </div>
              </div>

              {/* Visual Proportion Bar (100% Total) */}
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800">Distribusi Persentase Alokasi Modal (100% Penjualan)</span>
                  <span className="font-mono text-[10px] text-emerald-600 font-bold">Total Terkonversi: 100.0% Pas</span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-4 sm:h-5 rounded-lg overflow-hidden flex bg-slate-100 text-[9px] font-bold text-white text-center leading-none">
                  <div style={{ width: '63%' }} className="bg-amber-500 flex items-center justify-center truncate px-1" title="Pakan 63%">
                    63% Pakan
                  </div>
                  <div style={{ width: '20%' }} className="bg-indigo-600 flex items-center justify-center truncate px-1" title="Pembelian Ayam 20%">
                    20% Ayam
                  </div>
                  <div style={{ width: '12%' }} className="bg-emerald-600 flex items-center justify-center truncate px-1" title="Gaji Karyawan 12%">
                    12% Gaji
                  </div>
                  <div style={{ width: '3.5%' }} className="bg-purple-600 flex items-center justify-center truncate" title="Vaksin 3.5%">
                    3.5%
                  </div>
                  <div style={{ width: '1%' }} className="bg-sky-500 flex items-center justify-center truncate" title="Air 1%">
                    1%
                  </div>
                  <div style={{ width: '0.5%' }} className="bg-amber-400 text-slate-900 flex items-center justify-center truncate" title="Listrik 0.5%">
                  </div>
                </div>

                {/* Badges Legend */}
                <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                  <div className="flex items-center gap-1.5 bg-amber-50 text-amber-800 px-2 py-1 rounded-md border border-amber-200">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span className="font-semibold">Pakan: 63%</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-800 px-2 py-1 rounded-md border border-indigo-200">
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    <span className="font-semibold">Beli Ayam: 20%</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2 py-1 rounded-md border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    <span className="font-semibold">Gaji Karyawan: 12%</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-purple-50 text-purple-800 px-2 py-1 rounded-md border border-purple-200">
                    <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                    <span className="font-semibold">Vaksin: 3.5%</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-sky-50 text-sky-800 px-2 py-1 rounded-md border border-sky-200">
                    <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                    <span className="font-semibold">Air: 1%</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-yellow-50 text-yellow-800 px-2 py-1 rounded-md border border-yellow-200">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span className="font-semibold">Listrik: 0.5%</span>
                  </div>
                </div>
              </div>

              {/* 7 Responsive Summary KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
                <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Total Penjualan</span>
                  <h4 className="text-sm sm:text-base font-bold font-mono text-slate-900 mt-1 tabular-nums">
                    Rp {totalSalesConverted.toLocaleString()}
                  </h4>
                  <span className="text-[9px] text-slate-400 mt-1 font-mono">100% basis omzet</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-between border-l-4 border-l-amber-500">
                  <span className="text-[10px] font-semibold text-amber-600 uppercase">Pakan (63%)</span>
                  <h4 className="text-sm sm:text-base font-bold font-mono text-amber-700 mt-1 tabular-nums">
                    Rp {totalPakanAllDays.toLocaleString()}
                  </h4>
                  <span className="text-[9px] text-slate-400 mt-1">Modal pakan</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-between border-l-4 border-l-indigo-500">
                  <span className="text-[10px] font-semibold text-indigo-600 uppercase">Beli Ayam (20%)</span>
                  <h4 className="text-sm sm:text-base font-bold font-mono text-indigo-700 mt-1 tabular-nums">
                    Rp {totalAyamAllDays.toLocaleString()}
                  </h4>
                  <span className="text-[9px] text-slate-400 mt-1">Bibit DOC / Pullet</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-between border-l-4 border-l-emerald-500">
                  <span className="text-[10px] font-semibold text-emerald-600 uppercase">Gaji (12%)</span>
                  <h4 className="text-sm sm:text-base font-bold font-mono text-emerald-700 mt-1 tabular-nums">
                    Rp {totalGajiAllDays.toLocaleString()}
                  </h4>
                  <span className="text-[9px] text-slate-400 mt-1">Upah staf kandang</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-between border-l-4 border-l-purple-500">
                  <span className="text-[10px] font-semibold text-purple-600 uppercase">Vaksin (3.5%)</span>
                  <h4 className="text-sm sm:text-base font-bold font-mono text-purple-700 mt-1 tabular-nums">
                    Rp {totalVaksinAllDays.toLocaleString()}
                  </h4>
                  <span className="text-[9px] text-slate-400 mt-1">Obat & vitamin</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-between border-l-4 border-l-sky-400">
                  <span className="text-[10px] font-semibold text-sky-600 uppercase">Air (1%)</span>
                  <h4 className="text-sm sm:text-base font-bold font-mono text-slate-800 mt-1 tabular-nums">
                    Rp {totalAirAllDays.toLocaleString()}
                  </h4>
                  <span className="text-[9px] text-slate-400 mt-1">Minum ternak</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-between border-l-4 border-l-yellow-400">
                  <span className="text-[10px] font-semibold text-amber-600 uppercase">Listrik (0.5%)</span>
                  <h4 className="text-sm sm:text-base font-bold font-mono text-slate-800 mt-1 tabular-nums">
                    Rp {totalListrikAllDays.toLocaleString()}
                  </h4>
                  <span className="text-[9px] text-slate-400 mt-1">Lampu & exhaust</span>
                </div>
              </div>

              {/* TAB SELECTOR: SEMUA POS VS TABEL PER POS */}
              <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
                <button 
                  onClick={() => setSelectedPosTab('semua')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedPosTab === 'semua' ? 'bg-white text-slate-900 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  📋 Semua Pos (Tabel Rekap)
                </button>
                <button 
                  onClick={() => setSelectedPosTab('pakan')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedPosTab === 'pakan' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  🌾 Tabel Pakan (63%)
                </button>
                <button 
                  onClick={() => setSelectedPosTab('ayam')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedPosTab === 'ayam' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  🐔 Tabel Beli Ayam (20%)
                </button>
                <button 
                  onClick={() => setSelectedPosTab('gaji')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedPosTab === 'gaji' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  👥 Tabel Gaji (12%)
                </button>
                <button 
                  onClick={() => setSelectedPosTab('vaksin')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedPosTab === 'vaksin' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  💉 Tabel Vaksin (3.5%)
                </button>
                <button 
                  onClick={() => setSelectedPosTab('air')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedPosTab === 'air' ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  💧 Tabel Air (1%)
                </button>
                <button 
                  onClick={() => setSelectedPosTab('listrik')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedPosTab === 'listrik' ? 'bg-amber-400 text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  ⚡ Tabel Listrik (0.5%)
                </button>
              </div>

              {/* 1. VIEW TABEL SEMUA POS (REKAP GABUNGAN) */}
              {selectedPosTab === 'semua' && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/60">
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wide text-slate-800">
                        Tabel Rekapitulasi Konversi Modal Harian (Semua Pos)
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Setiap penjualan harian terbagi otomatis ke pos Pakan (63%), Beli Ayam (20%), Gaji (12%), Vaksin (3.5%), Air (1%), Listrik (0.5%)
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-2 py-1 rounded w-fit">
                      {dailyConversions.length} Hari Transaksi
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600 min-w-[760px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Tanggal</th>
                          <th className="px-4 py-3 text-right">Penjualan Harian</th>
                          <th className="px-4 py-3 text-right text-amber-700 bg-amber-50/40">Pakan (63%)</th>
                          <th className="px-4 py-3 text-right text-indigo-700 bg-indigo-50/40">Beli Ayam (20%)</th>
                          <th className="px-4 py-3 text-right text-emerald-700 bg-emerald-50/40">Gaji (12%)</th>
                          <th className="px-4 py-3 text-right text-purple-700 bg-purple-50/40">Vaksin (3.5%)</th>
                          <th className="px-4 py-3 text-right text-sky-700 bg-sky-50/40">Air (1%)</th>
                          <th className="px-4 py-3 text-right text-amber-700 bg-amber-50/20">Listrik (0.5%)</th>
                          <th className="px-4 py-3 text-right font-bold text-slate-900 bg-slate-100/50">Total Modal (100%)</th>
                          <th className="px-4 py-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedConversions.map(d => {
                          const isSelected = selectedConversionDate === d.date;
                          return (
                            <tr 
                              key={d.date} 
                              className={`transition-colors hover:bg-slate-50/80 ${isSelected ? 'bg-amber-50/40' : ''}`}
                            >
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="font-mono font-bold text-slate-800">{d.date}</div>
                                <div className="text-[9px] text-slate-400">{d.transactionCount} transaksi ({d.totalWeight.toFixed(1)} kg)</div>
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 tabular-nums whitespace-nowrap">
                                Rp {d.totalSales.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-amber-700 font-semibold tabular-nums bg-amber-50/20 whitespace-nowrap">
                                Rp {d.pakan.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-indigo-700 font-semibold tabular-nums bg-indigo-50/20 whitespace-nowrap">
                                Rp {d.ayam.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-emerald-700 font-semibold tabular-nums bg-emerald-50/20 whitespace-nowrap">
                                Rp {d.gaji.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-purple-700 font-semibold tabular-nums bg-purple-50/20 whitespace-nowrap">
                                Rp {d.vaksin.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-sky-700 font-semibold tabular-nums bg-sky-50/20 whitespace-nowrap">
                                Rp {d.air.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-amber-700 font-semibold tabular-nums bg-amber-50/10 whitespace-nowrap">
                                Rp {d.listrik.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 bg-slate-100/30 tabular-nums whitespace-nowrap">
                                Rp {d.totalConverted.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button 
                                    onClick={() => setSelectedConversionDate(isSelected ? '' : d.date)}
                                    className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${isSelected ? 'bg-amber-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                                  >
                                    {isSelected ? 'Tutup' : 'Rincian'}
                                  </button>
                                  <button 
                                    onClick={() => setDeleteTarget({
                                      type: 'sales_date',
                                      id: d.date,
                                      title: `Hapus Penjualan Tanggal ${d.date}`,
                                      description: `Yakin ingin menghapus seluruh ${d.transactionCount} transaksi penjualan tanggal ${d.date} senilai Rp ${d.totalSales.toLocaleString()}?`
                                    })}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                    title={`Hapus seluruh transaksi penjualan tanggal ${d.date}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {dailyConversions.length === 0 && (
                          <tr>
                            <td colSpan={10} className="text-center py-12 text-slate-400">
                              <div className="max-w-sm mx-auto flex flex-col items-center">
                                <Coins className="w-8 h-8 text-slate-300 mb-2" />
                                <p className="font-bold text-xs text-slate-600">Belum Ada Transaksi Penjualan</p>
                                <p className="text-[11px] text-slate-400 mt-1">
                                  Konversi modal harian dihitung secara otomatis saat Anda mencatat penjualan telur di menu Penjualan.
                                </p>
                                <div className="flex gap-2 mt-4">
                                  <button onClick={() => { setActiveTab('penjualan'); setShowSaleModal(true); }} className="px-3.5 py-1.5 bg-slate-900 text-white text-[11px] font-semibold rounded-lg hover:bg-slate-800 transition-colors">
                                    + Tambah Penjualan
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {dailyConversions.length > 0 && (
                    <TablePagination 
                      currentPage={pageConv}
                      totalItems={dailyConversions.length}
                      pageSize={pageSizeConv}
                      onPageChange={setPageConv}
                      onPageSizeChange={setPageSizeConv}
                    />
                  )}
                </div>
              )}

              {/* 2. VIEW TABEL POS SPESIFIK */}
              {selectedPosTab !== 'semua' && (() => {
                const posMeta = {
                  pakan: { title: 'Tabel Pos Biaya Pakan', rate: 63, pctStr: '63%', color: 'amber', icon: '🌾', total: totalPakanAllDays, desc: 'Dana alokasi pakan konsentrat, bekatul, dan jagung ternak' },
                  ayam: { title: 'Tabel Pos Pembelian Ayam', rate: 20, pctStr: '20%', color: 'indigo', icon: '🐔', total: totalAyamAllDays, desc: 'Dana tabungan pembelian bibit DOC atau ayam pullet periode berikutnya' },
                  gaji: { title: 'Tabel Pos Gaji Karyawan', rate: 12, pctStr: '12%', color: 'emerald', icon: '👥', total: totalGajiAllDays, desc: 'Dana alokasi upah pekerja kandang dan bonus produktivitas' },
                  vaksin: { title: 'Tabel Pos Vaksin & Obat', rate: 3.5, pctStr: '3.5%', color: 'purple', icon: '💉', total: totalVaksinAllDays, desc: 'Dana kesehatan ayam, vaksinasi rutin, desinfektan dan vitamin' },
                  air: { title: 'Tabel Pos Air Bersih', rate: 1, pctStr: '1%', color: 'sky', icon: '💧', total: totalAirAllDays, desc: 'Dana operasional air minum ternak, pencucian kandang & pompa' },
                  listrik: { title: 'Tabel Pos Listrik Operasional', rate: 0.5, pctStr: '0.5%', color: 'yellow', icon: '⚡', total: totalListrikAllDays, desc: 'Dana token listrik untuk lampu penghangat kandang & kipas exhaust' },
                }[selectedPosTab];

                const posRowsWithBalance = [...dailyConversions].reverse().reduce<{ rows: any[], running: number }>((acc, d) => {
                  const posVal = (d[selectedPosTab as keyof typeof d] as number) || 0;
                  const running = acc.running + posVal;
                  acc.rows.push({ ...d, posVal, runningBalance: running });
                  acc.running = running;
                  return acc;
                }, { rows: [], running: 0 }).rows.reverse();

                const paginatedPosRows = posRowsWithBalance.slice((pageConv - 1) * pageSizeConv, pageConv * pageSizeConv);

                return (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">{posMeta.icon}</span>
                          <h4 className="font-bold text-sm text-slate-800">{posMeta.title} ({posMeta.pctStr})</h4>
                          <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">Otomatis dari Penjualan</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">{posMeta.desc}</p>
                      </div>
                      <div className="bg-white px-3.5 py-2 rounded-lg border border-slate-200 text-right shadow-2xs">
                        <span className="text-[10px] text-slate-400 block uppercase font-semibold">Total Saldo Pos Masuk</span>
                        <strong className="text-sm font-mono font-bold text-slate-900">Rp {posMeta.total.toLocaleString()}</strong>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-600 min-w-[680px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                          <tr>
                            <th className="px-4 py-3">No</th>
                            <th className="px-4 py-3">Tanggal Penjualan</th>
                            <th className="px-4 py-3 text-right">Penjualan Hari Itu</th>
                            <th className="px-4 py-3 text-center">Formula Pos</th>
                            <th className="px-4 py-3 text-right font-bold text-slate-900">Alokasi Masuk Pos (Rp)</th>
                            <th className="px-4 py-3 text-right font-bold">Akumulasi Saldo Pos</th>
                            <th className="px-4 py-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedPosRows.map((d, idx) => {
                            const rowNumber = ((pageConv - 1) * pageSizeConv) + idx + 1;
                            return (
                              <tr key={d.date} className="hover:bg-slate-50/80">
                                <td className="px-4 py-3 font-mono text-slate-400">{rowNumber}</td>
                                <td className="px-4 py-3 font-mono font-bold text-slate-800">{d.date}</td>
                                <td className="px-4 py-3 text-right font-mono text-slate-700">Rp {d.totalSales.toLocaleString()}</td>
                                <td className="px-4 py-3 text-center font-mono text-[11px] text-slate-500">{posMeta.pctStr} × Omzet</td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700 tabular-nums">Rp {d.posVal.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 tabular-nums">Rp {d.runningBalance.toLocaleString()}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className="text-[9px] bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                                    Tersedia
                                  </span>
                                </td>
                              </tr>
                            );
                          })}

                          {dailyConversions.length === 0 && (
                            <tr>
                              <td colSpan={7} className="text-center py-12 text-slate-400">
                                <p className="font-semibold text-xs text-slate-600">Belum Ada Transaksi Untuk Pos Ini</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">Catat penjualan harian untuk mengisi saldo tabel {posMeta.title}.</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {dailyConversions.length > 0 && (
                      <TablePagination 
                        currentPage={pageConv}
                        totalItems={dailyConversions.length}
                        pageSize={pageSizeConv}
                        onPageChange={setPageConv}
                        onPageSizeChange={setPageSizeConv}
                      />
                    )}
                  </div>
                );
              })()}

              {/* Rincian Detail Hari Terpilih & Simulator Konversi Cepat */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Panel 1: Rincian Hari Terpilih */}
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                      <div>
                        <h4 className="font-bold text-xs uppercase text-slate-800">Rincian Detail Alokasi Harian</h4>
                        <p className="text-[11px] text-slate-400">Pilih tanggal untuk melihat nota konversi modal spesifik</p>
                      </div>

                      {dailyConversions.length > 0 && (
                        <select 
                          value={selectedConversionDate || (dailyConversions[0]?.date || '')}
                          onChange={(e) => setSelectedConversionDate(e.target.value)}
                          className="bg-slate-50 border border-slate-200 text-xs font-mono rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none"
                        >
                          {dailyConversions.map(d => (
                            <option key={d.date} value={d.date}>{d.date} (Rp {d.totalSales.toLocaleString()})</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {(() => {
                      const currentDetail = dailyConversions.find(d => d.date === (selectedConversionDate || dailyConversions[0]?.date)) || dailyConversions[0];
                      if (!currentDetail) {
                        return (
                          <div className="py-8 text-center text-xs text-slate-400">
                            Silakan catat penjualan harian untuk menampilkan rincian alokasi modal.
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between font-mono">
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase">Omzet Tanggal {currentDetail.date}</span>
                              <strong className="text-base text-emerald-600 font-bold">Rp {currentDetail.totalSales.toLocaleString()}</strong>
                            </div>
                            <div className="text-right text-[11px] text-slate-500">
                              <span>{currentDetail.transactionCount} Transaksi</span> · <span>{currentDetail.totalWeight.toFixed(1)} Kg</span>
                            </div>
                          </div>

                          <div className="space-y-2 text-xs divide-y divide-slate-100">
                            <div className="pt-2 flex justify-between items-center">
                              <span className="text-slate-600 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                <span>Biaya Pakan Ayam (63%)</span>
                              </span>
                              <strong className="font-mono text-amber-700">Rp {currentDetail.pakan.toLocaleString()}</strong>
                            </div>
                            <div className="pt-2 flex justify-between items-center">
                              <span className="text-slate-600 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                <span>Pembelian Ayam / DOC (20%)</span>
                              </span>
                              <strong className="font-mono text-indigo-700">Rp {currentDetail.ayam.toLocaleString()}</strong>
                            </div>
                            <div className="pt-2 flex justify-between items-center">
                              <span className="text-slate-600 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span>Gaji Karyawan (12%)</span>
                              </span>
                              <strong className="font-mono text-emerald-700">Rp {currentDetail.gaji.toLocaleString()}</strong>
                            </div>
                            <div className="pt-2 flex justify-between items-center">
                              <span className="text-slate-600 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                <span>Vaksin &amp; Vitamin (3.5%)</span>
                              </span>
                              <strong className="font-mono text-purple-700">Rp {currentDetail.vaksin.toLocaleString()}</strong>
                            </div>
                            <div className="pt-2 flex justify-between items-center">
                              <span className="text-slate-600 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                                <span>Air Bersih Ternak (1%)</span>
                              </span>
                              <strong className="font-mono text-slate-800">Rp {currentDetail.air.toLocaleString()}</strong>
                            </div>
                            <div className="pt-2 flex justify-between items-center">
                              <span className="text-slate-600 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                                <span>Listrik Operasional (0.5%)</span>
                              </span>
                              <strong className="font-mono text-slate-800">Rp {currentDetail.listrik.toLocaleString()}</strong>
                            </div>
                            <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-slate-900 font-bold">
                              <span>Total Masuk Modal (100%):</span>
                              <strong className="font-mono text-emerald-700">Rp {currentDetail.totalConverted.toLocaleString()}</strong>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <p className="text-[10px] text-slate-400 mt-4 pt-3 border-t border-slate-100">
                    💡 Tips: Alokasikan pundi dana modal ini ke rekening terpisah harian agar arus kas peternakan tetap terjaga.
                  </p>
                </div>

                {/* Panel 2: Simulator & Kalkulator Konversi Cepat */}
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200">
                  <div className="pb-3 mb-3 border-b border-slate-100">
                    <h4 className="font-bold text-xs uppercase text-slate-800">Kalkulator Simulasi Konversi Harian</h4>
                    <p className="text-[11px] text-slate-400">Masukkan estimasi nominal penjualan untuk memproyeksikan alokasi modal</p>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-500 mb-1 font-semibold">Simulasi Omzet Penjualan (Rp)</label>
                      <input 
                        type="number" 
                        min="0"
                        step="50000"
                        value={simulatedSalesAmount}
                        onChange={(e) => setSimulatedSalesAmount(Math.max(0, Number(e.target.value)))}
                        className="w-full p-2.5 border border-slate-200 rounded-lg font-mono text-base font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500"
                      />
                      <div className="flex gap-2 mt-2">
                        {[500000, 1000000, 2000000, 5000000].map(val => (
                          <button 
                            key={val}
                            type="button"
                            onClick={() => setSimulatedSalesAmount(val)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-mono text-slate-600 transition-colors"
                          >
                            {(val / 1000000) >= 1 ? `${val / 1000000} Jt` : `${val / 1000} Rb`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Calculated simulated output */}
                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/70 space-y-2 font-mono text-xs">
                      <div className="flex justify-between items-center text-amber-800">
                        <span>Biaya Pakan (63%):</span>
                        <strong>Rp {Math.round(simulatedSalesAmount * 0.63).toLocaleString()}</strong>
                      </div>
                      <div className="flex justify-between items-center text-indigo-800">
                        <span>Pembelian Ayam (20%):</span>
                        <strong>Rp {Math.round(simulatedSalesAmount * 0.20).toLocaleString()}</strong>
                      </div>
                      <div className="flex justify-between items-center text-emerald-800">
                        <span>Gaji Karyawan (12%):</span>
                        <strong>Rp {Math.round(simulatedSalesAmount * 0.12).toLocaleString()}</strong>
                      </div>
                      <div className="flex justify-between items-center text-purple-800">
                        <span>Vaksin &amp; Obat (3.5%):</span>
                        <strong>Rp {Math.round(simulatedSalesAmount * 0.035).toLocaleString()}</strong>
                      </div>
                      <div className="flex justify-between items-center text-slate-700">
                        <span>Air (1%):</span>
                        <strong>Rp {Math.round(simulatedSalesAmount * 0.01).toLocaleString()}</strong>
                      </div>
                      <div className="flex justify-between items-center text-slate-700">
                        <span>Listrik (0.5%):</span>
                        <strong>Rp {Math.round(simulatedSalesAmount * 0.005).toLocaleString()}</strong>
                      </div>
                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-slate-900 font-bold">
                        <span>Total Terkonversi (100%):</span>
                        <span className="text-emerald-700">Rp {simulatedSalesAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* --- MENU KESELURUHAN DATA --- */}
          {activeTab === 'keseluruhan' && (
            <div className="space-y-6">
              
              {/* Header Card & Quick Actions */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                      <TableProperties className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Rekapitulasi Keseluruhan Data Harian</h3>
                      <p className="text-xs text-slate-400">Pencatatan gabungan Produksi, Penjualan, Pengeluaran, Keuntungan Bersih, dan Catatan.</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleExportOverallCSV}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Ekspor Data (.CSV)</span>
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs border-l-4 border-l-amber-500">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Total Produksi</p>
                  <h4 className="text-base sm:text-lg font-bold font-mono text-amber-700 mt-1">
                    {totalOverallProdKg.toFixed(1)} Kg
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Hasil panen telur</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs border-l-4 border-l-emerald-500">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Total Penjualan</p>
                  <h4 className="text-base sm:text-lg font-bold font-mono text-emerald-700 mt-1">
                    {totalOverallSalesKg.toFixed(1)} Kg
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Omzet: Rp {totalOverallSalesIncome.toLocaleString()}</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs border-l-4 border-l-rose-500">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Total Pengeluaran</p>
                  <h4 className="text-base sm:text-lg font-bold font-mono text-rose-600 mt-1">
                    Rp {totalOverallExpenses.toLocaleString()}
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Biaya operasional</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs border-l-4 border-l-indigo-600 sm:col-span-1 lg:col-span-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">Total Keuntungan Bersih</p>
                    <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-semibold">
                      {filteredOverallData.length} Hari
                    </span>
                  </div>
                  <h4 className={`text-base sm:text-xl font-bold font-mono mt-1 ${totalOverallProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    Rp {totalOverallProfit.toLocaleString()}
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                    (Total Penjualan Rp {totalOverallSalesIncome.toLocaleString()} - Pengeluaran Rp {totalOverallExpenses.toLocaleString()})
                  </p>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  
                  {/* Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1 mr-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>Periode:</span>
                    </span>
                    <button
                      onClick={() => { setOverallDateFilter('all'); setPageOverall(1); }}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer text-xs ${overallDateFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                    >
                      Semua
                    </button>
                    <button
                      onClick={() => { setOverallDateFilter('today'); setPageOverall(1); }}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer text-xs ${overallDateFilter === 'today' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                    >
                      Hari Ini
                    </button>
                    <button
                      onClick={() => { setOverallDateFilter('7days'); setPageOverall(1); }}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer text-xs ${overallDateFilter === '7days' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                    >
                      7 Hari Terakhir
                    </button>
                    <button
                      onClick={() => { setOverallDateFilter('month'); setPageOverall(1); }}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer text-xs ${overallDateFilter === 'month' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                    >
                      30 Hari Terakhir
                    </button>
                    <button
                      onClick={() => { setOverallDateFilter('custom'); setPageOverall(1); }}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer text-xs ${overallDateFilter === 'custom' ? 'bg-amber-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                    >
                      Rentang Kustom
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="relative w-full md:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Cari tanggal atau catatan..."
                      value={overallSearchQuery}
                      onChange={(e) => { setOverallSearchQuery(e.target.value); setPageOverall(1); }}
                      className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-amber-500"
                    />
                    {overallSearchQuery && (
                      <button onClick={() => setOverallSearchQuery('')} className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-600 text-xs font-bold">✕</button>
                    )}
                  </div>
                </div>

                {/* Custom Date Pickers */}
                {overallDateFilter === 'custom' && (
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Dari:</span>
                      <input 
                        type="date"
                        value={overallStartDate}
                        onChange={(e) => { setOverallStartDate(e.target.value); setPageOverall(1); }}
                        className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Sampai:</span>
                      <input 
                        type="date"
                        value={overallEndDate}
                        onChange={(e) => { setOverallEndDate(e.target.value); setPageOverall(1); }}
                        className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
                      />
                    </div>
                    {(overallStartDate || overallEndDate) && (
                      <button
                        onClick={() => { setOverallStartDate(''); setOverallEndDate(''); setPageOverall(1); }}
                        className="text-[11px] text-amber-700 font-bold hover:underline cursor-pointer"
                      >
                        Reset Tanggal
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Data Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600 min-w-[780px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                      <tr>
                        <th className="px-4 py-3.5 text-center w-14">No.</th>
                        <th className="px-4 py-3.5">Tanggal</th>
                        <th className="px-4 py-3.5 text-right text-amber-800 bg-amber-50/40">Jumlah Produksi</th>
                        <th className="px-4 py-3.5 text-right text-emerald-800 bg-emerald-50/40">Jumlah Penjualan</th>
                        <th className="px-4 py-3.5 text-right text-rose-800 bg-rose-50/40">Pengeluaran</th>
                        <th className="px-4 py-3.5 text-right font-bold text-slate-900 bg-slate-100/60">Total Keuntungan</th>
                        <th className="px-4 py-3.5 min-w-[200px]">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {paginatedOverall.map((row, idx) => {
                        const rowNumber = (pageOverall - 1) * pageSizeOverall + idx + 1;
                        return (
                          <tr key={row.date} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-3 text-center font-mono text-[11px] text-slate-400 font-semibold">
                              {rowNumber}
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span>{row.date}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-amber-700 whitespace-nowrap bg-amber-50/20">
                              {row.productionKg > 0 ? `${row.productionKg.toFixed(1)} Kg` : <span className="text-slate-300 font-normal">-</span>}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap bg-emerald-50/20">
                              {row.salesKg > 0 ? (
                                <div>
                                  <span>{row.salesKg.toFixed(1)} Kg</span>
                                  <span className="block text-[10px] text-slate-400 font-normal">Rp {row.salesIncome.toLocaleString()}</span>
                                </div>
                              ) : (
                                <span className="text-slate-300 font-normal">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-semibold text-rose-600 whitespace-nowrap bg-rose-50/20">
                              {row.expenses > 0 ? `Rp ${row.expenses.toLocaleString()}` : <span className="text-slate-300 font-normal">-</span>}
                            </td>
                            <td className={`px-4 py-3 text-right font-mono font-bold whitespace-nowrap bg-slate-100/40 ${row.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              Rp {row.netProfit.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-[11px] text-slate-600 leading-relaxed">
                              {row.notes !== '-' ? (
                                <span className="text-slate-700">{row.notes}</span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {filteredOverallData.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-slate-400">
                            <div className="max-w-sm mx-auto flex flex-col items-center">
                              <TableProperties className="w-8 h-8 text-slate-300 mb-2" />
                              <p className="font-bold text-xs text-slate-600">Belum Ada Data</p>
                              <p className="text-[11px] text-slate-400 mt-1">
                                Data akan otomatis terisi saat Anda mencatat Produksi, Penjualan, atau Pengeluaran.
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredOverallData.length > 0 && (
                  <TablePagination 
                    currentPage={pageOverall}
                    totalItems={filteredOverallData.length}
                    pageSize={pageSizeOverall}
                    onPageChange={setPageOverall}
                    onPageSizeChange={setPageSizeOverall}
                  />
                )}
              </div>

            </div>
          )}

          {/* --- 6. MENU MANAJEMEN USER --- */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              
              {/* Stat Cards Ringkasan Pengguna */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Total Pengguna</p>
                  <h3 className="text-xl font-bold font-mono mt-1 text-slate-900">{state.users.length} Akun</h3>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">Terdaftar di sistem</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Administrator</p>
                  <h3 className="text-xl font-bold font-mono mt-1 text-purple-700">
                    {state.users.filter(u => u.role === 'Admin').length} Akun
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1">Akses penuh sistem</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Pengelola Kandang</p>
                  <h3 className="text-xl font-bold font-mono mt-1 text-amber-700">
                    {state.users.filter(u => u.role === 'Pengelola').length} Akun
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1">Input panen telur</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Kasir Penjualan</p>
                  <h3 className="text-xl font-bold font-mono mt-1 text-emerald-700">
                    {state.users.filter(u => u.role === 'Kasir').length} Akun
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1">Input transaksi penjualan</p>
                </div>
              </div>

              {/* Table Action Header */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wide text-slate-800">Daftar Akun Pengguna</h3>
                  <p className="text-[11px] text-slate-500">Kelola akun, username, password, dan pembagian hak akses staf peternakan.</p>
                </div>
                
                <button 
                  onClick={handleOpenAddUser}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Tambah Pengguna Baru</span>
                </button>
              </div>

              {/* User Management Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600 min-w-[700px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                      <tr>
                        <th className="px-4 py-3 w-12 text-center">No.</th>
                        <th className="px-4 py-3">Nama Pengguna</th>
                        <th className="px-4 py-3">Username</th>
                        <th className="px-4 py-3">Password</th>
                        <th className="px-4 py-3 text-center">Role / Hak Akses</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {state.users.map((u, index) => {
                        const isCurrentActive = state.activeUserId === u.id;
                        const isPasswordVisible = !!showPasswordMap[u.id];

                        return (
                          <tr key={u.id} className={`hover:bg-slate-50/80 transition-colors ${isCurrentActive ? 'bg-amber-50/30' : ''}`}>
                            <td className="px-4 py-3 text-center font-mono text-slate-400 font-medium">
                              {index + 1}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                  u.role === 'Admin' ? 'bg-purple-100 text-purple-800' :
                                  u.role === 'Pengelola' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {u.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <span>{u.name}</span>
                                    {isCurrentActive && (
                                      <span className="text-[9px] bg-amber-500 text-slate-950 font-bold px-1.5 py-0.2 rounded font-mono uppercase tracking-tight">
                                        Sesi Aktif
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400">ID: {u.id}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] font-semibold border border-slate-200">
                                @{u.username}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-semibold text-slate-700 text-xs bg-slate-50 px-2 py-0.5 rounded border border-slate-200/70 select-all">
                                  {isPasswordVisible ? u.password : '••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility(u.id)}
                                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                                  title={isPasswordVisible ? "Sembunyikan password" : "Lihat password"}
                                >
                                  {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                u.role === 'Admin' 
                                  ? 'bg-purple-50 text-purple-700 border-purple-200' 
                                  : u.role === 'Pengelola'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                <Shield className="w-3 h-3" />
                                <span>{u.role}</span>
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleToggleUserStatus(u)}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                                  u.status === 'Aktif'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                    : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
                                }`}
                                title="Klik untuk mengubah status akun"
                              >
                                {u.status}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {!isCurrentActive && (
                                  <button 
                                    onClick={() => handleUserSwitch(u.id)}
                                    className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                    title="Ganti sesi login ke akun ini"
                                  >
                                    <UserCheck className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleOpenEditUser(u)}
                                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  title="Edit data akun pengguna"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => setDeleteTarget({
                                    type: 'user',
                                    id: u.id,
                                    title: 'Hapus Pengguna',
                                    description: `Yakin ingin menghapus akun pengguna "${u.name}" (@${u.username}) dengan role ${u.role}?`
                                  })}
                                  disabled={state.users.length <= 1}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer"
                                  title="Hapus pengguna ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Role Permission Matrix Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 text-xs">
                <h4 className="font-bold uppercase tracking-wider text-slate-700 text-[11px] flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-amber-500" />
                  <span>Matriks Hak Akses Pengguna (Role-Based Access Control)</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  <div className="p-3.5 rounded-lg bg-purple-50/70 border border-purple-100">
                    <p className="font-bold text-purple-900 text-xs mb-1">1. Administrator (Owner)</p>
                    <p className="text-[11px] text-purple-700/90 leading-relaxed">
                      Memiliki akses penuh 100% ke seluruh menu: Dashboard, Produksi Panen, Penjualan, Laporan Kas &amp; FCR, Konversi Modal, Manajemen User, dan Konfigurasi Database.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-100">
                    <p className="font-bold text-amber-900 text-xs mb-1">2. Pengelola Kandang</p>
                    <p className="text-[11px] text-amber-700/90 leading-relaxed">
                      Dikhususkan untuk staf kandang: mencatat produksi panen telur harian, memantau stok, dan mengelola cadangan database.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-100">
                    <p className="font-bold text-emerald-900 text-xs mb-1">3. Kasir Penjualan</p>
                    <p className="text-[11px] text-emerald-700/90 leading-relaxed">
                      Dikhususkan untuk kasir: mencatat transaksi penjualan telur, status lunas/piutang, dan memantau pembukuan arus kas harian.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* --- 7. MENU PENGATURAN APLIKASI --- */}
          {activeTab === 'settings' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 max-w-2xl space-y-6">
              <div>
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Ubah Pengaturan Default Peternakan</h3>
                <p className="text-xs text-slate-400 mt-1">Sesuaikan konfigurasi standar operasional kandang dan harga telur.</p>
              </div>
              
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  showToast('Konfigurasi peternakan berhasil diperbarui!', 'success');
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="block text-slate-700 mb-1.5 font-semibold">Nama Peternakan Ayam Petelur</label>
                  <input 
                    type="text" 
                    required
                    value={state.settings.farmName}
                    onChange={(e) => saveState({ ...state, settings: { ...state.settings, farmName: e.target.value } })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="Contoh: Peternakan Berkah Jaya"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 mb-1.5 font-semibold">Harga default per 1 Kg Telur (Rp)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-xs">Rp</span>
                      <input 
                        type="number" 
                        required
                        min="1000"
                        step="500"
                        value={state.settings.pricePerKg}
                        onChange={(e) => saveState({ ...state, settings: { ...state.settings, pricePerKg: Number(e.target.value) } })}
                        className="w-full pl-9 p-2.5 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1.5 font-semibold">Target Produksi Harian (Kg)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        required
                        min="0.5"
                        step="0.5"
                        value={state.settings.dailyTargetKg || 30.0}
                        onChange={(e) => saveState({ ...state, settings: { ...state.settings, dailyTargetKg: Number(e.target.value) } })}
                        className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      />
                      <span className="absolute right-3 top-2.5 text-slate-400 text-xs font-semibold">Kg / Hari</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">Standar target berat panen harian peternakan</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button type="submit" className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs shadow-sm transition-colors cursor-pointer">
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* --- 8. MENU PENGATURAN DATABASE & SUPABASE --- */}
          {activeTab === 'database' && (
            <div className="space-y-6">
              
              {/* Header Info Supabase */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-6 rounded-2xl border border-slate-700 shadow-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                        <Database className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-sm tracking-wide text-white uppercase">Pengaturan Database Supabase &amp; SQL Migration</h3>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                      Integrasikan sistem database PostgreSQL Supabase dengan pembuatan 6 tabel otomatis, relasi UUID, timestamp, index performa, publikasi Realtime, serta kebijakan keamanan <strong>Row Level Security (RLS)</strong>.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleCopySql(
                        selectedSqlTab === 'all' 
                          ? generateFullSupabaseSql(state.settings.farmName, state.settings.dailyTargetKg || 30)
                          : selectedSqlTab === 'tables' 
                          ? generateTablesOnlySql()
                          : selectedSqlTab === 'rls'
                          ? generateRlsOnlySql()
                          : generateSeedOnlySql(state.settings.farmName, state.settings.dailyTargetKg || 30)
                      )}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer ${
                        copiedSql 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
                      }`}
                    >
                      {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedSql ? 'Skrip SQL Tersalin!' : 'Salin Skrip SQL'}</span>
                    </button>

                    <button
                      onClick={handleDownloadSql}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-emerald-400" />
                      <span>Unduh File .sql</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 1. Koneksi Supabase Cloud */}
              <div className="bg-white p-6 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-emerald-600" />
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">Koneksi Supabase Cloud API</h4>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold border border-slate-200">
                    {state.settings.supabaseUrl ? 'Terkonfigurasi' : 'Belum Terhubung'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-600 mb-1.5 font-semibold">Supabase Project URL</label>
                    <input 
                      type="url"
                      placeholder="https://xyzprojectid.supabase.co"
                      value={state.settings.supabaseUrl || ''}
                      onChange={(e) => saveState({ ...state, settings: { ...state.settings, supabaseUrl: e.target.value } })}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 font-mono text-xs focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Dapat ditemukan di Dashboard Supabase &gt; Project Settings &gt; API</span>
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1.5 font-semibold">Supabase Anon Key (Public Key)</label>
                    <input 
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={state.settings.supabaseAnonKey || ''}
                      onChange={(e) => saveState({ ...state, settings: { ...state.settings, supabaseAnonKey: e.target.value } })}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 font-mono text-xs focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">API Key "anon public" untuk koneksi aman frontend</span>
                  </div>
                </div>

                {supabaseTestResult && (
                  <div className={`mt-4 p-3 rounded-lg text-xs flex items-center gap-2.5 ${
                    supabaseTestResult.success 
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                      : 'bg-rose-50 border border-rose-200 text-rose-800'
                  }`}>
                    {supabaseTestResult.success ? (
                      <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    )}
                    <span className="leading-tight">{supabaseTestResult.message}</span>
                  </div>
                )}

                <div className="pt-4 mt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[11px] text-slate-500">
                    Simpan kredensial Supabase untuk mengaktifkan sinkronisasi otomatis multi-perangkat.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isTestingSupabase}
                      onClick={handleTestSupabase}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTestingSupabase ? 'animate-spin text-amber-600' : ''}`} />
                      <span>{isTestingSupabase ? 'Menguji...' : 'Tes Koneksi'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => showToast('Pengaturan URL & Key Supabase berhasil disimpan!', 'success')}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      Simpan Kredensial
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. SQL Schema & RLS Generator */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <Code className="w-4 h-4 text-amber-600" />
                      <span>Skrip SQL Otomatis (Tabel, RLS &amp; Realtime)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Jalankan skrip ini di SQL Editor Supabase untuk membuat seluruh skema database dalam 1 kali klik.
                    </p>
                  </div>

                  {/* SQL Tab Selector */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-[11px] font-semibold">
                    <button
                      onClick={() => setSelectedSqlTab('all')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${selectedSqlTab === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Semua (Lengkap)
                    </button>
                    <button
                      onClick={() => setSelectedSqlTab('tables')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${selectedSqlTab === 'tables' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Tabel Saja
                    </button>
                    <button
                      onClick={() => setSelectedSqlTab('rls')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${selectedSqlTab === 'rls' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      RLS Policies
                    </button>
                    <button
                      onClick={() => setSelectedSqlTab('seed')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${selectedSqlTab === 'seed' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Data Awal
                    </button>
                  </div>
                </div>

                {/* SQL Code Box with syntax styling */}
                <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 font-mono text-xs">
                  <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                      <span className="ml-2 font-mono text-[10px] text-slate-300">eggtrack_supabase_migration.sql</span>
                    </div>
                    <button
                      onClick={() => handleCopySql(
                        selectedSqlTab === 'all' 
                          ? generateFullSupabaseSql(state.settings.farmName, state.settings.dailyTargetKg || 30)
                          : selectedSqlTab === 'tables' 
                          ? generateTablesOnlySql()
                          : selectedSqlTab === 'rls'
                          ? generateRlsOnlySql()
                          : generateSeedOnlySql(state.settings.farmName, state.settings.dailyTargetKg || 30)
                      )}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-sans font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                      <span>{copiedSql ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>

                  <pre className="p-4 max-h-72 overflow-y-auto overflow-x-auto text-[11px] leading-relaxed text-emerald-300 font-mono select-all">
                    {selectedSqlTab === 'all' && generateFullSupabaseSql(state.settings.farmName, state.settings.dailyTargetKg || 30)}
                    {selectedSqlTab === 'tables' && generateTablesOnlySql()}
                    {selectedSqlTab === 'rls' && generateRlsOnlySql()}
                    {selectedSqlTab === 'seed' && generateSeedOnlySql(state.settings.farmName, state.settings.dailyTargetKg || 30)}
                  </pre>
                </div>

                {/* Step by step instructions */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
                  <h5 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-amber-600" />
                    <span>Langkah Mudah Menjalankan di Supabase:</span>
                  </h5>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-600 text-[11px] leading-relaxed">
                    <li>Buka dashboard project Anda di <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-amber-700 font-bold underline inline-flex items-center gap-0.5">supabase.com <ExternalLink className="w-2.5 h-2.5" /></a></li>
                    <li>Pilih menu <strong>SQL Editor</strong> pada sidebar kiri Supabase.</li>
                    <li>Klik tombol <strong>+ New Query</strong>, lalu tempelkan (Paste) skrip SQL yang telah Anda salin di atas.</li>
                    <li>Klik tombol hijau <strong>RUN</strong> di sudut kanan bawah editor Supabase.</li>
                    <li>Selesai! 6 Tabel (<code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">users</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">production</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">sales</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">expenses</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">capital_conversions</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">settings</code>) beserta kebijakan <strong>Row Level Security (RLS)</strong> otomatis terbuat dan siap digunakan.</li>
                  </ol>
                </div>
              </div>

              {/* 3. Database Stats & Local Backup */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Database summary stats */}
                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-xs uppercase text-slate-400 mb-3">Statistik Database Penyimpanan</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500">Record Produksi</span>
                      <strong className="font-mono">{state.production.length} baris</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500">Record Penjualan</span>
                      <strong className="font-mono">{state.sales.length} baris</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500">Record Pengeluaran</span>
                      <strong className="font-mono">{state.expenses.length} baris</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500">Pengguna Terdaftar</span>
                      <strong className="font-mono">{state.users.length} akun</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Penyimpanan Media</span>
                      <strong className="font-mono text-emerald-600">Local Browser &amp; Supabase Ready</strong>
                    </div>
                  </div>
                </div>

                {/* Import/Export Backup Action */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-xs uppercase text-slate-400 mb-2">Pencadangan File JSON</h4>
                    <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                      Mengekspor seluruh file database cadangan yang tersimpan di browser Anda ke file .json untuk dipindahkan atau diamankan secara berkala.
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={handleExportJSON}
                      className="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Ekspor Cadangan JSON</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* 4. Reset database area */}
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-5">
                <h4 className="font-bold text-rose-800 text-xs uppercase mb-1">Hapus Permanen &amp; Reset Data</h4>
                <p className="text-xs text-rose-700 mb-4 leading-relaxed">
                  Tindakan ini akan mengosongkan seluruh isi data yang telah Anda catat sebelumnya (Pencatatan produksi telur ayam, riwayat pesanan/penjualan, pembukuan kas pengeluaran, konversi alokasi modal).
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button 
                    onClick={() => setDeleteTarget({
                      type: 'all_database',
                      title: 'Kosongkan Seluruh Database',
                      description: 'Apakah Anda yakin ingin mengosongkan seluruh database? Seluruh riwayat produksi, transaksi penjualan, pengeluaran, dan alokasi modal akan dihapus permanen.'
                    })}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Kosongkan Seluruh Menu Database</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </section>
      </main>

      {/* --- FORM MODALS --- */}

      {/* 1. Modal Log Produksi */}
      {showProdModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-xs uppercase text-slate-700">Form Log Produksi</h3>
              <button onClick={() => setShowProdModal(false)} className="text-slate-400 font-bold hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleAddProduction} className="p-4 space-y-4 text-xs">
              
              {/* 1. Tanggal */}
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Tanggal Produksi</label>
                <input 
                  type="date" 
                  required
                  value={prodForm.date}
                  onChange={(e) => setProdForm({ ...prodForm, date: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* 2. Jumlah Telur (Kg) */}
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Jumlah Telur (Kg)</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0.1"
                  required
                  placeholder="Contoh: 25.5"
                  value={prodForm.weightKg}
                  onChange={(e) => setProdForm({ ...prodForm, weightKg: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-800 font-mono font-bold focus:outline-none focus:border-amber-500 text-sm"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Hasil timbangan berat telur panen</span>
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setShowProdModal(false)} 
                  className="px-3.5 py-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors font-semibold"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-sm transition-colors text-xs"
                >
                  Simpan Produksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Log Penjualan */}
      {showSaleModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-xs uppercase text-slate-700">Form Transaksi Penjualan</h3>
              <button onClick={() => setShowSaleModal(false)} className="text-slate-400 font-bold hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleAddSale} className="p-4 space-y-4 text-xs">
              
              {/* Info Stok Telur Tersedia */}
              <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                stockKg <= 0 
                  ? 'bg-rose-50 border-rose-200 text-rose-800' 
                  : Number(saleForm.weight) > stockKg
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              }`}>
                <div>
                  <span className="font-bold text-[11px] block">Stok Telur Tersedia Saat Ini:</span>
                  <span className="text-[10px] text-slate-500">Batas maksimal transaksi penjualan</span>
                </div>
                <div className="text-right">
                  <span className={`font-mono font-black text-base ${stockKg <= 0 ? 'text-rose-600' : 'text-emerald-800'}`}>
                    {stockKg.toFixed(1)} Kg
                  </span>
                </div>
              </div>

              {/* Alert jika melebihi stok */}
              {Number(saleForm.weight) > stockKg && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>
                    Jumlah transaksi ({Number(saleForm.weight)} Kg) melebihi stok telur tersedia ({stockKg.toFixed(1)} Kg)!
                  </span>
                </div>
              )}

              {stockKg <= 0 && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>
                    Stok telur habis (0 Kg). Silakan catat produksi panen terlebih dahulu.
                  </span>
                </div>
              )}

              {/* 1. Tanggal */}
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Tanggal Penjualan</label>
                <input 
                  type="date" 
                  required
                  value={saleForm.date}
                  onChange={(e) => setSaleForm({ ...saleForm, date: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* 2. Berat Telur & 3. Harga Jual */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">
                    Berat Telur (Kg)
                    {stockKg > 0 && <span className="text-[10px] text-slate-400 font-normal ml-1">(Maks {stockKg.toFixed(1)} Kg)</span>}
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0.1"
                    max={stockKg > 0 ? stockKg : 0}
                    required
                    value={saleForm.weight}
                    onChange={(e) => setSaleForm({ ...saleForm, weight: Number(e.target.value) })}
                    className={`w-full p-2.5 border rounded-lg bg-white text-slate-800 font-mono font-bold focus:outline-none text-sm ${
                      Number(saleForm.weight) > stockKg 
                        ? 'border-rose-400 focus:border-rose-500 text-rose-700 bg-rose-50/30' 
                        : 'border-slate-300 focus:border-amber-500'
                    }`}
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Timbangan riil (Kg)</span>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Harga Jual / Kg (Rp)</label>
                  <input 
                    type="number" 
                    min="1000"
                    step="500"
                    required
                    value={saleForm.price}
                    onChange={(e) => setSaleForm({ ...saleForm, price: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-800 font-mono font-bold focus:outline-none focus:border-amber-500 text-sm"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Harga per Kilogram</span>
                </div>
              </div>

              {/* 4. Status Pembayaran */}
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Status Pembayaran</label>
                <select 
                  value={saleForm.status}
                  onChange={(e) => setSaleForm({ ...saleForm, status: e.target.value as any })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-amber-500 font-medium"
                >
                  <option value="Lunas">Lunas (Sudah Bayar)</option>
                  <option value="Belum Lunas">Belum Lunas (Piutang)</option>
                </select>
              </div>

              {/* 5. Total Otomatis */}
              <div className="bg-emerald-50 border-2 border-emerald-300 p-3.5 rounded-xl shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">Total Otomatis</span>
                    <span className="text-[10px] text-emerald-600 font-mono">{saleForm.weight || 0} Kg × Rp {(saleForm.price || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-lg text-emerald-700">
                      Rp {Math.round((saleForm.weight || 0) * (saleForm.price || 0)).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setShowSaleModal(false)} 
                  className="px-3.5 py-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={Number(saleForm.weight) > stockKg || Number(saleForm.weight) <= 0 || stockKg <= 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-sm transition-colors text-xs cursor-pointer"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal Konfirmasi Hapus Data */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 text-center">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-800 mb-1.5">{deleteTarget.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed px-2">
                {deleteTarget.description}
              </p>
            </div>
            <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button 
                type="button" 
                onClick={() => setDeleteTarget(null)} 
                className="px-4 py-2 border border-slate-200 hover:bg-white text-slate-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button 
                type="button" 
                onClick={handleConfirmDelete} 
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- FLOATING MOBILE NAVIGATION BAR (dashboard, panen, penjualan, laporan, pengaturan) --- */}
      <div className="md:hidden fixed bottom-3 inset-x-3 z-40">
        {/* Mobile Submenu Popover for Laporan & Pengaturan */}
        {mobileSubmenu === 'laporan' && (
          <div className="mb-2 bg-white/95 backdrop-blur-md rounded-2xl p-2.5 shadow-2xl border border-slate-200 flex flex-col gap-1.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-3 py-1 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Pilih Laporan</span>
              <button onClick={() => setMobileSubmenu(null)} className="text-slate-400 hover:text-slate-600 font-bold p-0.5 cursor-pointer">✕</button>
            </div>
            <button 
              onClick={() => { setActiveTab('keseluruhan'); setMobileSubmenu(null); }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === 'keseluruhan' ? 'bg-amber-600 text-white shadow-sm' : 'hover:bg-slate-100 text-slate-700'}`}
            >
              <TableProperties className="w-4 h-4 text-amber-500" />
              <div className="text-left">
                <p className="leading-tight font-bold">Keseluruhan Data (Rekap)</p>
                <p className={`text-[10px] ${activeTab === 'keseluruhan' ? 'text-amber-100' : 'text-slate-400'}`}>Produksi, Penjualan, Keuntungan, Pengeluaran &amp; Catatan</p>
              </div>
            </button>
            <button 
              onClick={() => { setActiveTab('modal'); setMobileSubmenu(null); }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === 'modal' ? 'bg-amber-600 text-white shadow-sm' : 'hover:bg-slate-100 text-slate-700'}`}
            >
              <Coins className="w-4 h-4 text-amber-500" />
              <div className="text-left">
                <p className="leading-tight font-bold">Konversi Modal (Otomatis)</p>
                <p className={`text-[10px] ${activeTab === 'modal' ? 'text-amber-100' : 'text-slate-400'}`}>Pakan 63%, Ayam 20%, Gaji 12%, Vaksin 3.5%, Air 1%, Listrik 0.5%</p>
              </div>
            </button>
            <button 
              onClick={() => { setActiveTab('keuangan'); setMobileSubmenu(null); }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === 'keuangan' ? 'bg-amber-600 text-white shadow-sm' : 'hover:bg-slate-100 text-slate-700'}`}
            >
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <div className="text-left">
                <p className="leading-tight font-bold">Laporan Kas &amp; FCR</p>
                <p className={`text-[10px] ${activeTab === 'keuangan' ? 'text-emerald-100' : 'text-slate-400'}`}>Arus kas operasional &amp; rasio konsumsi pakan</p>
              </div>
            </button>
          </div>
        )}

        {mobileSubmenu === 'pengaturan' && (
          <div className="mb-2 bg-white/95 backdrop-blur-md rounded-2xl p-2.5 shadow-2xl border border-slate-200 flex flex-col gap-1.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-3 py-1 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Pilih Pengaturan</span>
              <button onClick={() => setMobileSubmenu(null)} className="text-slate-400 hover:text-slate-600 font-bold p-0.5">✕</button>
            </div>
            <button 
              onClick={() => { setActiveTab('settings'); setMobileSubmenu(null); }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold ${activeTab === 'settings' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-700'}`}
            >
              <SettingsIcon className="w-4 h-4 text-slate-500" />
              <span>Pengaturan Aplikasi</span>
            </button>
            <button 
              onClick={() => { setActiveTab('users'); setMobileSubmenu(null); }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold ${activeTab === 'users' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-700'}`}
            >
              <Users className="w-4 h-4 text-slate-500" />
              <span>Manajemen User (RBAC)</span>
            </button>
            <button 
              onClick={() => { setActiveTab('database'); setMobileSubmenu(null); }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold ${activeTab === 'database' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-700'}`}
            >
              <Database className="w-4 h-4 text-slate-500" />
              <span>Pengaturan Database</span>
            </button>
          </div>
        )}

        {/* Floating Dock Navigation Bar */}
        <nav className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-800/80 shadow-2xl rounded-2xl px-2 py-1.5 flex items-center justify-around">
          {/* 1. Dashboard */}
          <button 
            onClick={() => { setActiveTab('dashboard'); setMobileSubmenu(null); }}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${activeTab === 'dashboard' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <LayoutDashboard className={`w-5 h-5 mb-0.5 ${activeTab === 'dashboard' ? 'text-amber-400' : 'text-slate-400'}`} />
            <span className="text-[10px] leading-tight">Dashboard</span>
          </button>

          {/* 2. Panen */}
          <button 
            onClick={() => { setActiveTab('produksi'); setMobileSubmenu(null); }}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${activeTab === 'produksi' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Egg className={`w-5 h-5 mb-0.5 ${activeTab === 'produksi' ? 'text-amber-400' : 'text-slate-400'}`} />
            <span className="text-[10px] leading-tight">Panen</span>
          </button>

          {/* 3. Penjualan */}
          <button 
            onClick={() => { setActiveTab('penjualan'); setMobileSubmenu(null); }}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${activeTab === 'penjualan' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <ShoppingCart className={`w-5 h-5 mb-0.5 ${activeTab === 'penjualan' ? 'text-amber-400' : 'text-slate-400'}`} />
            <span className="text-[10px] leading-tight">Penjualan</span>
          </button>

          {/* 4. Laporan */}
          <button 
            onClick={() => setMobileSubmenu(mobileSubmenu === 'laporan' ? null : 'laporan')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${['modal', 'keuangan', 'keseluruhan'].includes(activeTab) ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Coins className={`w-5 h-5 mb-0.5 ${['modal', 'keuangan', 'keseluruhan'].includes(activeTab) ? 'text-amber-400' : 'text-slate-400'}`} />
            <span className="text-[10px] leading-tight flex items-center gap-0.5">
              <span>Laporan</span>
              <span className="text-[8px]">▾</span>
            </span>
          </button>

          {/* 5. Pengaturan */}
          <button 
            onClick={() => setMobileSubmenu(mobileSubmenu === 'pengaturan' ? null : 'pengaturan')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${['settings', 'users', 'database'].includes(activeTab) ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <SettingsIcon className={`w-5 h-5 mb-0.5 ${['settings', 'users', 'database'].includes(activeTab) ? 'text-amber-400' : 'text-slate-400'}`} />
            <span className="text-[10px] leading-tight flex items-center gap-0.5">
              <span>Pengaturan</span>
              <span className="text-[8px]">▾</span>
            </span>
          </button>
        </nav>
      </div>

    </div>
  );
}
